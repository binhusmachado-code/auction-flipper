import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Membership, MembershipStatus } from '../types/membership'

const emptyMembership: Membership = {
  status: 'none',
  plan: null,
  currentPeriodEnd: null,
  active: false,
  accessSource: null,
  manualAccessUntil: null,
}

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
    Promise.all([
      supabase
        .from('subscriptions')
        .select('status, plan, current_period_end')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('role, account_status, manual_access_until')
        .eq('id', userId)
        .maybeSingle(),
    ]).then(([subscriptionResult, profileResult]) => {
        if (cancelled) return
        const subscription = subscriptionResult.data
        const profile = profileResult.data
        const status = String(subscription?.status ?? 'none') as MembershipStatus
        const manualAccessUntil = profile?.manual_access_until ? String(profile.manual_access_until) : null
        const manualActive = profile?.account_status !== 'suspended'
          && Boolean(manualAccessUntil && new Date(manualAccessUntil) > new Date())
        const adminActive = profile?.account_status !== 'suspended' && profile?.role === 'admin'
        const subscriptionActive = profile?.account_status !== 'suspended'
          && (status === 'active' || status === 'trialing')
          && Boolean(subscription?.current_period_end && new Date(subscription.current_period_end) > new Date())

        setMembership({
          status,
          plan: subscription?.plan === 'monthly' || subscription?.plan === 'yearly' ? subscription.plan : null,
          currentPeriodEnd: subscription?.current_period_end ? String(subscription.current_period_end) : null,
          active: adminActive || manualActive || subscriptionActive,
          accessSource: adminActive || manualActive ? 'manual' : subscriptionActive ? 'subscription' : null,
          manualAccessUntil,
        })
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [userId])

  return { membership, loading }
}
