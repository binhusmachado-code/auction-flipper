import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { AccountProfile, AdminDashboardData } from '../types/account'

const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const emptyProfile = (userId: string, email: string): AccountProfile => ({
  id: userId,
  email,
  displayName: '',
  role: 'member',
  accountStatus: 'active',
  manualAccessUntil: null,
  createdAt: null,
})

export function useAccountProfile(userId: string | null, email = '') {
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loading, setLoading] = useState(Boolean(userId))

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setProfile(userId ? emptyProfile(userId, email) : null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, account_status, manual_access_until, created_at')
      .eq('id', userId)
      .maybeSingle()

    setProfile(data ? {
      id: String(data.id),
      email: String(data.email ?? email),
      displayName: String(data.display_name ?? ''),
      role: data.role === 'admin' ? 'admin' : 'member',
      accountStatus: data.account_status === 'suspended' ? 'suspended' : 'active',
      manualAccessUntil: data.manual_access_until ? String(data.manual_access_until) : null,
      createdAt: data.created_at ? String(data.created_at) : null,
    } : emptyProfile(userId, email))
    setLoading(false)
  }, [email, userId])

  useEffect(() => { void refresh() }, [refresh])

  return { profile, loading, refresh }
}

async function adminFetch(method: 'GET' | 'POST', body?: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Please sign in again')

  if (isSupabaseConfigured) {
    const { data: result, error } = await supabase.functions.invoke<AdminDashboardData & { error?: string; message?: string }>(
      'admin-customers',
      { method, body },
    )

    if (error) {
      const context = (error as { context?: Response }).context
      const details = context
        ? await context.clone().json().catch(() => ({})) as { error?: string }
        : {}
      throw new Error(details.error || error.message || 'Admin request failed')
    }

    return result ?? {} as AdminDashboardData & { message?: string }
  }

  const response = await fetch(`${apiBase}/api/admin-customers`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json().catch(() => ({})) as AdminDashboardData & { error?: string; message?: string }
  if (!response.ok) throw new Error(result.error || 'Admin request failed')
  return result
}

export function loadAdminDashboard() {
  return adminFetch('GET') as Promise<AdminDashboardData>
}

export function runAdminAction(body: Record<string, unknown>) {
  return adminFetch('POST', body) as Promise<AdminDashboardData & { message?: string }>
}
