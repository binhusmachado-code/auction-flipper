import { useState } from 'react'
import { Check, CreditCard, Loader2, Lock, Mail, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { openBillingPortal, startCheckout } from '../lib/billing'
import { MEMBERSHIP_PRICING } from '../lib/pricing'
import { useSupabaseAuth } from '../hooks/useSupabase'
import { useMembership } from '../hooks/useMembership'
import { useToast } from './ToastProvider'

interface Props {
  onClose: () => void
}

type AuthMode = 'sign-in' | 'sign-up' | 'reset'

export default function AuthModal({ onClose }: Props) {
  const { user } = useSupabaseAuth()
  const { membership } = useMembership(user?.id ?? null)
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [yearly, setYearly] = useState(false)
  const { showToast } = useToast()
  const billingEnabled = import.meta.env.VITE_BILLING_ENABLED === 'true'

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isSupabaseConfigured) return
    setLoading('auth')
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href })
        if (error) throw error
        showToast('Password reset link sent', 'success')
      } else if (mode === 'sign-up') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        showToast('Account created. Check your email if confirmation is required.', 'success')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        showToast('Welcome back', 'success')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Account request failed', 'error')
    } finally {
      setLoading(null)
    }
  }

  const billingAction = async () => {
    if (!billingEnabled || !isSupabaseConfigured) {
      showToast('Secure membership checkout is being connected', 'info')
      return
    }
    setLoading('billing')
    try {
      if (membership.active) await openBillingPortal()
      else await startCheckout(yearly ? 'yearly' : 'monthly')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Billing request failed', 'error')
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="grid max-h-[96vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl lg:grid-cols-2" onClick={(event) => event.stopPropagation()}>
        <section className="border-b border-zinc-800 p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-4">
            <div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Membership</div><h2 className="mt-1 text-2xl font-extrabold text-white">Research with a repeatable process</h2></div>
            <button type="button" onClick={onClose} aria-label="Close membership" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white lg:hidden"><X className="h-5 w-5" /></button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">Official auction discovery, guided due diligence, saved work, alerts, and conservative maximum-bid scenarios.</p>

          <div className="mt-6 inline-flex rounded-lg border border-zinc-700 bg-zinc-950 p-1">
            <button type="button" onClick={() => setYearly(false)} className={`rounded-md px-3 py-2 text-xs font-bold ${!yearly ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Monthly</button>
            <button type="button" onClick={() => setYearly(true)} className={`rounded-md px-3 py-2 text-xs font-bold ${yearly ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Yearly</button>
          </div>

          <div className="mt-5"><span className="text-4xl font-extrabold text-white">${yearly ? MEMBERSHIP_PRICING.yearly : MEMBERSHIP_PRICING.monthly}</span><span className="text-sm text-zinc-500">/{yearly ? 'year' : 'month'}</span></div>
          {yearly && <div className="mt-1 text-xs font-semibold text-emerald-400">Save ${MEMBERSHIP_PRICING.yearlySavings} per year</div>}
          <ul className="mt-6 space-y-3 text-sm text-zinc-300">
            {['Full supported-county auction inventory', 'Maximum-bid and cost scenarios', 'Saved properties, notes, and alerts', 'Beginner learning path and checklists', 'Direct links to every official source'].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-emerald-400" />{item}</li>)}
          </ul>

          <button type="button" onClick={billingAction} disabled={loading !== null || (!user && isSupabaseConfigured)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">
            {loading === 'billing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {membership.active ? 'Manage billing' : user ? 'Start membership' : isSupabaseConfigured ? 'Sign in to continue' : 'Membership opening soon'}
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-600">Recurring subscription. Cancel through the billing portal. Research and education only, not legal, title, appraisal, tax, or investment advice.</p>
        </section>

        <section className="relative p-5 sm:p-7">
          <button type="button" onClick={onClose} aria-label="Close membership" className="absolute right-4 top-4 hidden rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white lg:block"><X className="h-5 w-5" /></button>
          {user ? (
            <div className="flex min-h-[360px] flex-col justify-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Your account</div>
              <h3 className="mt-2 text-xl font-bold text-white">Signed in as {user.email}</h3>
              <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="text-xs text-zinc-500">Membership status</div>
                <div className={`mt-1 text-sm font-bold ${membership.active ? 'text-emerald-400' : 'text-amber-400'}`}>{membership.active ? `${membership.plan ?? 'Paid'} membership active` : 'No active membership'}</div>
              </div>
              <button type="button" onClick={async () => { await supabase.auth.signOut(); showToast('Signed out', 'info') }} className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-700">Sign out</button>
            </div>
          ) : !isSupabaseConfigured ? (
            <div className="flex min-h-[360px] flex-col justify-center">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5"><div className="font-bold text-amber-400">Secure accounts are being connected</div><p className="mt-2 text-sm leading-relaxed text-zinc-400">The auction calendar and current official properties remain available while account access and payment processing are finalized. No payment is being collected yet.</p></div>
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col justify-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Customer access</div>
              <h3 className="mt-2 text-xl font-bold text-white">{mode === 'sign-up' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in'}</h3>
              <form onSubmit={submitAuth} className="mt-5 space-y-3">
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Email</span><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input id="account-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500" /></div></label>
                {mode !== 'reset' && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Password</span><div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input id="account-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500" /></div></label>}
                <button type="submit" disabled={loading !== null} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">{loading === 'auth' && <Loader2 className="h-4 w-4 animate-spin" />}{mode === 'sign-up' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button>
              </form>
              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-semibold">
                {mode !== 'sign-in' && <button type="button" onClick={() => setMode('sign-in')} className="text-emerald-400 hover:text-emerald-300">Sign in</button>}
                {mode !== 'sign-up' && <button type="button" onClick={() => setMode('sign-up')} className="text-emerald-400 hover:text-emerald-300">Create account</button>}
                {mode !== 'reset' && <button type="button" onClick={() => setMode('reset')} className="text-zinc-500 hover:text-zinc-300">Forgot password</button>}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
