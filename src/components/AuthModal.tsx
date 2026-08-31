import { useState } from 'react'
import { ArrowLeft, KeyRound, Loader2, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useToast } from './ToastProvider'

type AuthMode = 'sign-in' | 'sign-up' | 'reset'

interface Props {
  initialMode?: 'sign-in' | 'sign-up'
  onBack?: () => void
}
export default function AuthModal({ initialMode = 'sign-up', onBack }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const accountRedirect = `${window.location.origin}${window.location.pathname}#/account`

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isSupabaseConfigured) {
      showToast('Account access is not configured for this deployment', 'error')
      return
    }
    setLoading(true)
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: accountRedirect })
        if (error) throw error
        showToast('Password reset link sent', 'success')
        setMode('sign-in')
      } else if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: accountRedirect, data: { display_name: displayName.trim() } },
        })
        if (error) throw error
        showToast(data.session ? 'Your free workspace is ready' : 'Check your email to confirm your free account', 'success')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        showToast('Welcome back', 'success')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Account request failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'reset' ? 'Reset your password' : mode === 'sign-up' ? 'Start researching for free' : 'Welcome back'
  const subtitle = mode === 'sign-up'
    ? 'Preview upcoming auctions, track five properties, and follow the guided learning path.'
    : 'Open your saved searches, tracked properties, research, and auction deadlines.'

  return (
    <main className="grid min-h-screen place-items-center bg-emerald-50/60 px-4 py-10">
      <div className="w-full max-w-md">
        {onBack && <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-black text-emerald-900"><ArrowLeft className="h-4 w-4" />Back to Tax Deed &amp; Lien Hunter</button>}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-emerald-950/10 sm:p-8" aria-labelledby="account-title">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-800 text-white"><ShieldCheck className="h-5 w-5" /></div><div><div className="font-black text-emerald-950">Tax Deed &amp; Lien Hunter</div><div className="text-xs text-slate-500">Auction research workspace</div></div></div>
          <h1 id="account-title" className="mt-7 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{mode === 'reset' ? 'We will email you a secure password-reset link.' : subtitle}</p>

          {!isSupabaseConfigured ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Authentication is not configured for this deployment.</div> : (
            <form onSubmit={submitAuth} className="mt-6 space-y-4">
              {mode === 'sign-up' && <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Name</span><div className="relative"><UserRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input autoComplete="name" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></div></label>}
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Email</span><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input id="account-email" autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></div></label>
              {mode !== 'reset' && <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Password</span><div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input id="account-password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></div><span className="mt-1 block text-[11px] text-slate-500">At least 8 characters</span></label>}
              <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-black text-white hover:bg-emerald-900 disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{mode === 'reset' ? 'Send reset link' : mode === 'sign-up' ? 'Create free account' : 'Sign in'}</button>
            </form>
          )}

          <div className="mt-5 border-t border-slate-200 pt-5 text-center">
            {mode === 'reset' ? <button type="button" onClick={() => setMode('sign-in')} className="inline-flex items-center gap-2 text-xs font-black text-emerald-800"><ArrowLeft className="h-3.5 w-3.5" />Back to sign in</button> : <div className="space-y-3"><button type="button" onClick={() => setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')} className="text-sm font-bold text-slate-600">{mode === 'sign-up' ? 'Already have an account? ' : 'New to Tax Deed & Lien Hunter? '}<span className="text-emerald-800">{mode === 'sign-up' ? 'Sign in' : 'Start free'}</span></button>{mode === 'sign-in' && <div><button type="button" onClick={() => setMode('reset')} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Forgot password?</button></div>}</div>}
          </div>
          {mode === 'sign-up' && <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">By creating an account, you agree to use auction data as a research aid and verify every official source before bidding.</p>}
        </section>
      </div>
    </main>
  )
}
