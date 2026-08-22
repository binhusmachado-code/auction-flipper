import { useEffect, useState } from 'react'
import { Bell, BookOpen, Calculator, CreditCard, Gavel, Heart, KeyRound, LayoutDashboard, Loader2, LogOut, ShieldCheck, UserRound, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { openBillingPortal, startCheckout } from '../lib/billing'
import { supabase } from '../lib/supabase'
import { useMembership } from '../hooks/useMembership'
import type { AccountProfile } from '../types/account'
import type { Property } from '../types/property'
import { useToast } from './ToastProvider'
import AdminCustomerManager from './AdminCustomerManager'
import BidCenter from './BidCenter'

interface Props {
  user: User
  profile: AccountProfile
  properties: Property[]
  favoriteIds: string[]
  onClose: () => void
  onOpenGuide: () => void
  onOpenCalculator: (property: Property) => void
}

function formatDate(value: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export default function AccountDashboard({ user, profile, properties, favoriteIds, onClose, onOpenGuide, onOpenCalculator }: Props) {
  const { showToast } = useToast()
  const { membership, loading: membershipLoading } = useMembership(user.id)
  const [tab, setTab] = useState<'account' | 'bid' | 'admin'>(profile.role === 'admin' ? 'admin' : 'account')
  const [counts, setCounts] = useState({ favorites: 0, alerts: 0, scenarios: 0 })
  const [password, setPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [billing, setBilling] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('user_favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('user_alerts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('calculator_scenarios').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([favorites, alerts, scenarios]) => {
      if (!cancelled) setCounts({ favorites: favorites.count ?? 0, alerts: alerts.count ?? 0, scenarios: scenarios.count ?? 0 })
    })
    return () => { cancelled = true }
  }, [user.id])

  const billingAction = async () => {
    if (import.meta.env.VITE_BILLING_ENABLED !== 'true') {
      showToast('Secure membership checkout is being connected', 'info')
      return
    }
    setBilling(true)
    try {
      if (membership.accessSource === 'subscription') await openBillingPortal()
      else await startCheckout('monthly')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Billing is unavailable', 'error')
      setBilling(false)
    }
  }

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 8) return
    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })
    setChangingPassword(false)
    if (error) showToast(error.message, 'error')
    else {
      setPassword('')
      showToast('Password updated', 'success')
    }
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/85 p-2 backdrop-blur-sm sm:p-4">
      <div className="mx-auto min-h-[calc(100vh-1rem)] w-full max-w-7xl rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl sm:min-h-0 sm:max-h-[calc(100vh-2rem)] sm:overflow-y-auto" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-emerald-500 text-zinc-950">{profile.role === 'admin' ? <ShieldCheck className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</div>
            <div className="min-w-0"><h2 className="truncate text-base font-extrabold text-white">{profile.role === 'admin' ? 'Owner operations' : 'Customer dashboard'}</h2><p className="truncate text-xs text-zinc-500">{user.email}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dashboard" className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex min-h-[720px] flex-col md:flex-row">
          <aside className="border-b border-zinc-800 bg-zinc-900/35 p-3 md:w-56 md:flex-none md:border-b-0 md:border-r md:p-4">
            <nav className="flex gap-2 md:flex-col" aria-label="Dashboard sections">
              <button type="button" onClick={() => setTab('account')} className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold md:flex-none ${tab === 'account' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}><LayoutDashboard className="h-4 w-4 flex-none" /><span className="truncate">My account</span></button>
              <button type="button" onClick={() => setTab('bid')} className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold md:flex-none ${tab === 'bid' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}><Gavel className="h-4 w-4 flex-none" /><span className="truncate">Bid Center</span></button>
              {profile.role === 'admin' && <button type="button" onClick={() => setTab('admin')} className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold md:flex-none ${tab === 'admin' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}><ShieldCheck className="h-4 w-4 flex-none" /><span className="truncate">Owner dashboard</span></button>}
            </nav>
            <button type="button" onClick={async () => { await supabase.auth.signOut(); showToast('Signed out', 'info'); onClose() }} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-800 hover:text-white md:mt-8"><LogOut className="h-4 w-4" />Sign out</button>
          </aside>

          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            {tab === 'admin' && profile.role === 'admin' ? <AdminCustomerManager ownerId={user.id} /> : tab === 'bid' ? (
              <BidCenter
                userId={user.id}
                properties={properties}
                favoriteIds={favoriteIds}
                membershipActive={membership.active}
                onOpenGuide={onOpenGuide}
                onOpenCalculator={onOpenCalculator}
              />
            ) : (
              <div className="mx-auto max-w-4xl">
                <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end">
                  <div><h3 className="text-xl font-extrabold text-white">Welcome{profile.displayName ? `, ${profile.displayName}` : ''}</h3><p className="mt-1 text-sm text-zinc-500">Manage your access, saved research, and account security.</p></div>
                  <span className={`inline-flex w-fit rounded-md border px-2.5 py-1.5 text-xs font-bold ${membership.active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>{membershipLoading ? 'Checking access' : membership.active ? 'Access active' : 'No active access'}</span>
                </div>

                <section className="py-6" aria-labelledby="membership-summary-title">
                  <div className="flex flex-col justify-between gap-5 rounded-lg border border-zinc-800 bg-zinc-900/45 p-5 sm:flex-row sm:items-center">
                    <div><div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-emerald-400" /><h4 id="membership-summary-title" className="font-bold text-white">Membership access</h4></div><p className="mt-2 text-sm text-zinc-400">{profile.role === 'admin' ? 'Owner administrator access' : membership.accessSource === 'manual' ? `Owner-granted access through ${formatDate(membership.manualAccessUntil)}` : membership.accessSource === 'subscription' ? `${membership.plan ?? 'Paid'} plan through ${formatDate(membership.currentPeriodEnd)}` : 'Choose a membership plan to unlock the complete property inventory.'}</p></div>
                    {profile.role !== 'admin' && <button type="button" onClick={billingAction} disabled={billing} className="flex h-10 flex-none items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">{billing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}{membership.accessSource === 'subscription' ? 'Manage billing' : 'Start membership'}</button>}
                  </div>
                </section>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Saved', value: counts.favorites, icon: Heart },
                    { label: 'Alerts', value: counts.alerts, icon: Bell },
                    { label: 'Scenarios', value: counts.scenarios, icon: Calculator },
                  ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900/35 p-4"><div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-500"><span>{label}</span><Icon className="h-4 w-4" /></div><div className="mt-2 text-2xl font-extrabold text-white">{value}</div></div>)}
                </div>

                <div className="mt-7 grid gap-7 border-t border-zinc-800 pt-6 lg:grid-cols-2">
                  <section aria-labelledby="account-details-title">
                    <h4 id="account-details-title" className="text-sm font-bold text-white">Account details</h4>
                    <dl className="mt-3 divide-y divide-zinc-800 border-y border-zinc-800 text-sm">
                      <div className="flex justify-between gap-4 py-3"><dt className="text-zinc-500">Email</dt><dd className="truncate text-right font-semibold text-zinc-300">{user.email}</dd></div>
                      <div className="flex justify-between gap-4 py-3"><dt className="text-zinc-500">Role</dt><dd className="text-right font-semibold text-zinc-300">{profile.role === 'admin' ? 'Owner administrator' : 'Customer'}</dd></div>
                      <div className="flex justify-between gap-4 py-3"><dt className="text-zinc-500">Account created</dt><dd className="text-right font-semibold text-zinc-300">{formatDate(profile.createdAt)}</dd></div>
                    </dl>
                    <button type="button" onClick={onOpenGuide} className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white"><BookOpen className="h-4 w-4" />Open buyer guide</button>
                  </section>

                  <section aria-labelledby="password-title">
                    <h4 id="password-title" className="text-sm font-bold text-white">Change password</h4>
                    <form onSubmit={changePassword} className="mt-3">
                      <label className="block"><span className="mb-1.5 block text-xs font-semibold text-zinc-500">New password</span><div className="relative"><KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500" /></div></label>
                      <button type="submit" disabled={changingPassword || password.length < 8} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">{changingPassword && <Loader2 className="h-4 w-4 animate-spin" />}Update password</button>
                    </form>
                  </section>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
