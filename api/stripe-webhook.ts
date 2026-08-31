import Stripe from 'stripe'
import { adminClient, rawBody, type ApiRequest, type ApiResponse } from './_lib/server.js'

export const config = { api: { bodyParser: false } }

function customerId(subscription: Stripe.Subscription) {
  return typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
}

function membershipForPrice(priceId: string | null) {
  const prices = [
    { id: process.env.STRIPE_PRICE_INVESTOR_MONTHLY, tier: 'investor', interval: 'month', plan: 'investor_monthly' },
    { id: process.env.STRIPE_PRICE_INVESTOR_YEARLY, tier: 'investor', interval: 'year', plan: 'investor_yearly' },
    { id: process.env.STRIPE_PRICE_PRO_MONTHLY, tier: 'pro', interval: 'month', plan: 'pro_monthly' },
    { id: process.env.STRIPE_PRICE_PRO_YEARLY, tier: 'pro', interval: 'year', plan: 'pro_yearly' },
  ]
  return prices.find((price) => price.id && price.id === priceId) ?? null
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  const secret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.headers['stripe-signature']
  if (!secret || !webhookSecret || typeof signature !== 'string') return res.status(503).send('Webhook is not configured')

  let event: Stripe.Event
  try {
    event = new Stripe(secret).webhooks.constructEvent(await rawBody(req), signature, webhookSecret)
  } catch (error) {
    console.error('stripe-webhook signature', error)
    return res.status(400).send('Invalid signature')
  }

  try {
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const userId = subscription.metadata.supabase_user_id
      if (!userId) throw new Error(`Subscription ${subscription.id} has no Supabase user ID`)
      const priceId = subscription.items.data[0]?.price.id ?? null
      const membership = membershipForPrice(priceId)
      if (!membership) throw new Error(`Subscription ${subscription.id} uses an unknown Stripe price`)
      const periodEnd = subscription.items.data[0]?.current_period_end

      const { error } = await adminClient().from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: customerId(subscription),
        stripe_subscription_id: subscription.id,
        price_id: priceId,
        plan: membership.plan,
        tier: membership.tier,
        billing_interval: membership.interval,
        status: subscription.status,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (error) throw error
    }
    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('stripe-webhook processing', error)
    return res.status(500).send('Webhook processing failed')
  }
}
