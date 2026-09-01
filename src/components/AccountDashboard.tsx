import { useEffect, useState } from 'react'
import { Bell, BookOpen, Calculator, Gavel, Heart, KeyRound, LayoutDashboard, Loader2, LockKeyhole, LogOut, ShieldCheck, UsersRound, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AccountProfile } from '../types/account'
import type { Property } from '../types/property'
import { useToast } from './ToastProvider'
import AdminCustomerManager from './AdminCustomerManager'
import BidCenter from './BidCenter'
import type { StoredDealAnalysis } from '../lib/propertyAnalysis'

interface Props {
  user: User
  profile: AccountProfile
  properties: Property[]
  favoriteIds: string[]
  savedAnalyses: Record<string, StoredDealAnalysis>
  onClose: () => void
  onOpenGuide: () => void
  onOpenCalculator: (property: Property) => void
}

function formatDate(value: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export default function AccountDashboard({ user, profile, properties, favoriteIds, savedAnalyses, onClose, onOpenGuide, onOpenCalculator }: Props) {
  const { showToast } = useToast()
  const [tab, setTab] = useState<'account' | 'bid' | 'manage'>('account')
  const [counts, setCounts] = useState({ favorites: 0, alerts: 0, scenarios: 0 })
  const [password, setPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

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
            <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-emerald-500 text-zinc-950"><ShieldCheck className="h-5 w-5" /></div>
            <div className="min-w-0"><h2 className="truncate text-base font-extrabold text-white">Owner workspace</h2><p className="truncate text-xs text-zinc-500">{user.email}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dashboard" className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex min-h-[720px] flex-col md:flex-row">
          <aside className="border-b border-zinc-800 bg-zinc-900/35 p-3 md:w-56 md:flex-none md:border-b-0 md:border-r md:p-4">
            <nav className="flex gap-2 md:flex-col" aria-label="Dashboard sections">
              <button type="button" onClick={() => setTab('account')} className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold md:flex-none ${tab === 'account' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}><LayoutDashboard className="h-4 w-4 flex-none" /><span className="truncate">My account</span></button>
              <button type="button" onClick={() => setTab('bid')} className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold md:flex-none ${tab === 'bid' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}><Gavel className="h-4 w-4 flex-none" /><span className="truncate">Bid Center</span></button>
              <button type="button" onClick={() => setTab('manage')} className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold md:flex-none ${tab === 'manage' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}><UsersRound className="h-4 w-4 flex-none" /><span className="truncate">Manage</span></button>
            </nav>
            <button type="button" onClick={async () => { await supabase.auth.signOut(); showToast('Signed out', 'info'); onClose() }} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-800 hover:text-white md:mt-8"><LogOut className="h-4 w-4" />Sign out</button>
          </aside>

          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            {tab === 'bid' ? (
              <BidCenter
                userId={user.id}
                properties={properties}
                favoriteIds={favoriteIds}
                savedAnalyses={savedAnalyses}
                onOpenGuide={onOpenGuide}
                onOpenCalculator={onOpenCalculator}
              />
            ) : tab === 'manage' ? (
              <AdminCustomerManager ownerId={user.id} />
            ) : (
              <div className="mx-auto max-w-4xl">
                <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end">
                  <div><h3 className="text-xl font-extrabold text-white">Welcome{profile.displayName ? `, ${profile.displayName}` : ''}</h3><p className="mt-1 text-sm text-zinc-500">Manage your private research and account security.</p></div>
                  <span className="inline-flex w-fit rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-400">Private access active</span>
                </div>

                <section className="py-6" aria-labelledby="private-access-title">
                  <div className="flex flex-col justify-between gap-5 rounded-lg border border-zinc-800 bg-zinc-900/45 p-5 sm:flex-row sm:items-center">
                    <div><div className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-emerald-400" /><h4 id="private-access-title" className="font-bold text-white">Private owner access</h4></div><p className="mt-2 text-sm text-zinc-400">Only the active owner administrator can open property records, saved work, calculations, and auction-source research.</p></div>
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
                      <div className="flex justify-between gap-4 py-3"><dt className="text-zinc-500">Role</dt><dd className="text-right font-semibold text-zinc-300">Owner administrator</dd></div>
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
