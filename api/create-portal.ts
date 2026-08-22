import Stripe from 'stripe'
import { adminClient, allowAppOrigin, authenticatedUser, requestOrigin, type ApiRequest, type ApiResponse } from './_lib/server.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!allowAppOrigin(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await authenticatedUser(req)
    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) return res.status(503).json({ error: 'Billing portal is not configured yet' })

    const { data } = await adminClient()
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!data?.stripe_customer_id) return res.status(404).json({ error: 'No billing account was found' })

    const session = await new Stripe(secret).billingPortal.sessions.create({
      customer: String(data.stripe_customer_id),
      return_url: requestOrigin(req),
    })
    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('create-portal', error)
    const unauthorized = error instanceof Error && /Authentication|required|session/i.test(error.message)
    return res.status(unauthorized ? 401 : 500).json({ error: unauthorized ? error.message : 'Unable to open billing portal' })
  }
}
