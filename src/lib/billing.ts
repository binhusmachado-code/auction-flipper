import { supabase } from './supabase'

const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function authenticatedPost(path: string, body: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Please sign in first.')

  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({})) as { url?: string; error?: string }
  if (!response.ok || !result.url) throw new Error(result.error || 'Billing is not available yet.')
  window.location.assign(result.url)
}

export function startCheckout(plan: 'monthly' | 'yearly') {
  return authenticatedPost('/api/create-checkout', { plan })
}

export function openBillingPortal() {
  return authenticatedPost('/api/create-portal')
}
