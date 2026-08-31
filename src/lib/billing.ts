import { supabase } from './supabase'
import type { BillingInterval, PlanTier } from '../types/product'

const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function billingRequest(path: string, body?: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Please sign in to manage membership')

  const response = await fetch(`${apiBase}/api/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json().catch(() => ({})) as { url?: string; error?: string }
  if (!response.ok || !result.url) throw new Error(result.error || 'Billing is temporarily unavailable')
  return result.url
}

export function startCheckout(tier: Exclude<PlanTier, 'free'>, interval: BillingInterval) {
  return billingRequest('create-checkout', { tier, interval })
}

export function openBillingPortal() {
  return billingRequest('create-portal')
}
