import { useState } from 'react'
import { ArrowLeft, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useToast } from './ToastProvider'

type AuthMode = 'sign-in' | 'reset'

export default function AuthModal() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const accountRedirect = `${window.location.origin}${window.location.pathname}#/account`

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isSupabaseConfigured) {
      showToast('Secure owner login is not configured', 'error')
      return
    }

    setLoading(true)
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: accountRedirect })
        if (error) throw error
        showToast('Password reset link sent', 'success')
        setMode('sign-in')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        showToast('Owner access unlocked', 'success')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Owner login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500 text-zinc-950"><ShieldCheck className="h-5 w-5" /></div>
          <div><div className="font-extrabold text-white">Tax Lien Hunter</div><div className="text-xs text-zinc-500">Private owner workspace</div></div>
        </div>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl sm:p-8" aria-labelledby="owner-login-title">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Owner access only</div>
          <h1 id="owner-login-title" className="mt-2 text-2xl font-extrabold text-white">{mode === 'reset' ? 'Reset your password' : 'Sign in to your dashboard'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">Property records, saved research, calculations, and the national county directory stay behind this login.</p>

          {!isSupabaseConfigured ? (
            <div className="mt-6 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-300">Owner authentication is not configured for this deployment.</div>
          ) : (
            <form onSubmit={submitAuth} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-zinc-400">Email</span>
                <div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input id="account-email" autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500" /></div>
              </label>
              {mode === 'sign-in' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-zinc-400">Password</span>
                  <div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input id="account-password" autoComplete="current-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500" /></div>
                </label>
              )}
              <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {mode === 'reset' ? 'Send reset link' : 'Sign in'}
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            {mode === 'reset' ? (
              <button type="button" onClick={() => setMode('sign-in')} className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300"><ArrowLeft className="h-3.5 w-3.5" />Back to sign in</button>
            ) : (
              <button type="button" onClick={() => setMode('reset')} className="text-xs font-semibold text-zinc-500 hover:text-zinc-300">Forgot password?</button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
