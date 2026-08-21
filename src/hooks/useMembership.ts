import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Membership, MembershipStatus } from '../types/membership'

const emptyMembership: Membership = { status: 'none', plan: null, currentPeriodEnd: null, active: false }

export function useMembership(userId: string | null) {
  const [membership, setMembership] = useState<Membership>(emptyMembership)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setMembership(emptyMembership)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    supabase
      .from('subscriptions')
      .select('status, plan, current_period_end')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setMembership(emptyMembership)
        } else {
          const status = String(data.status ?? 'none') as MembershipStatus
          setMembership({
            status,
            plan: data.plan === 'monthly' || data.plan === 'yearly' ? data.plan : null,
            currentPeriodEnd: data.current_period_end ? String(data.current_period_end) : null,
            active: status === 'active' || status === 'trialing',
          })
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [userId])

  return { membership, loading }
}
