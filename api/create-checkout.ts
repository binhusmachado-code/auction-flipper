import Stripe from 'stripe'
import { adminClient, allowAppOrigin, authenticatedUser, requestOrigin, type ApiRequest, type ApiResponse } from './_lib/server.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!allowAppOrigin(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await authenticatedUser(req)
    const tier = req.body?.tier === 'investor' || req.body?.tier === 'pro' ? req.body.tier : null
    const interval = req.body?.interval === 'month' || req.body?.interval === 'year' ? req.body.interval : null
    if (!tier || !interval) return res.status(400).json({ error: 'Choose a valid membership plan' })
    const plan = `${tier}_${interval === 'month' ? 'monthly' : 'yearly'}` as const

    const secret = process.env.STRIPE_SECRET_KEY
    const priceKey = `STRIPE_PRICE_${tier.toUpperCase()}_${interval === 'month' ? 'MONTHLY' : 'YEARLY'}`
    const priceId = process.env[priceKey]
    if (!secret || !priceId) return res.status(503).json({ error: 'Membership checkout is not configured yet' })

    const stripe = new Stripe(secret)
    const expectedAmounts = {
      investor: { month: 2_900, year: 29_000 },
      pro: { month: 6_900, year: 69_000 },
    }
    const expectedPrice = { amount: expectedAmounts[tier][interval], interval }
    const configuredPrice = await stripe.prices.retrieve(priceId)
    if (
      !configuredPrice.active ||
      configuredPrice.currency !== 'usd' ||
      configuredPrice.unit_amount !== expectedPrice.amount ||
      configuredPrice.recurring?.interval !== expectedPrice.interval
    ) {
      return res.status(503).json({ error: `The configured ${tier} ${interval} price does not match the published membership price` })
    }

    const admin = adminClient()
    const { data: existing } = await admin
      .from('subscriptions')
      .select('stripe_customer_id, status, tier, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle()
    const existingPaidActive = (existing?.tier === 'investor' || existing?.tier === 'pro')
      && (existing?.status === 'active' || existing?.status === 'trialing')
      && Boolean(existing?.current_period_end && new Date(existing.current_period_end).getTime() > Date.now())
    if (existingPaidActive) {
      return res.status(409).json({ error: 'This account already has an active membership. Use Manage billing instead.' })
    }

    let customerId = existing?.stripe_customer_id as string | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await admin.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        tier: 'free',
        status: 'incomplete',
      })
    }

    const origin = requestOrigin(req)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/#/pricing?checkout=success`,
      cancel_url: `${origin}/#/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
      subscription_data: { metadata: { supabase_user_id: user.id, plan, tier, billing_interval: interval } },
      metadata: { supabase_user_id: user.id, plan, tier, billing_interval: interval },
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
