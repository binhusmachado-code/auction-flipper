import Stripe from 'stripe'
import { adminClient, authenticatedUser, requestOrigin, type ApiRequest, type ApiResponse } from './_lib/server.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await authenticatedUser(req)
    const plan = req.body?.plan === 'yearly' ? 'yearly' : req.body?.plan === 'monthly' ? 'monthly' : null
    if (!plan) return res.status(400).json({ error: 'Choose a valid membership plan' })

    const secret = process.env.STRIPE_SECRET_KEY
    const priceId = plan === 'yearly' ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY
    if (!secret || !priceId) return res.status(503).json({ error: 'Membership checkout is not configured yet' })

    const stripe = new Stripe(secret)
    const expectedPrice = plan === 'yearly'
      ? { amount: 55_000, interval: 'year' }
      : { amount: 8_900, interval: 'month' }
    const configuredPrice = await stripe.prices.retrieve(priceId)
    if (
      !configuredPrice.active ||
      configuredPrice.currency !== 'usd' ||
      configuredPrice.unit_amount !== expectedPrice.amount ||
      configuredPrice.recurring?.interval !== expectedPrice.interval
    ) {
      return res.status(503).json({ error: `The configured ${plan} Stripe price does not match the published membership price` })
    }

    const admin = adminClient()
    const { data: existing } = await admin
      .from('subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing?.status === 'active' || existing?.status === 'trialing') {
      return res.status(409).json({ error: 'This account already has an active membership. Use Manage billing instead.' })
    }

    let customerId = existing?.stripe_customer_id as string | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await admin.from('subscriptions').upsert({ user_id: user.id, stripe_customer_id: customerId, status: 'incomplete' })
    }

    const origin = requestOrigin(req)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/#/membership?checkout=success`,
      cancel_url: `${origin}/#/membership?checkout=cancelled`,
      subscription_data: { metadata: { supabase_user_id: user.id, plan } },
      metadata: { supabase_user_id: user.id, plan },
    })

    if (!session.url) throw new Error('Stripe did not return a checkout URL')
    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('create-checkout', error)
    const message = error instanceof Error && /Authentication|required|session/i.test(error.message)
      ? error.message
      : 'Unable to start checkout'
    return res.status(message.includes('Authentication') || message.includes('session') ? 401 : 500).json({ error: message })
  }
}
