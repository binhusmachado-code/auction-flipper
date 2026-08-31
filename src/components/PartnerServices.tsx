import { FileSearch, Footprints, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface Props { userId: string | null; propertyId: string; }

export default function PartnerServices({ userId, propertyId }: Props) {
  const [loading, setLoading] = useState<'title_search' | 'skip_trace' | null>(null)
  const [message, setMessage] = useState('')
  const request = async (serviceType: 'title_search' | 'skip_trace') => {
    if (!userId) { setMessage('Sign in to request a service referral.'); return }
    if (!isSupabaseConfigured) { setMessage('Service requests are not configured for this deployment.'); return }
    setLoading(serviceType); setMessage('')
    const { error } = await supabase.from('service_requests').insert({ user_id: userId, property_id: propertyId, service_type: serviceType, details: 'Requested from the property research workspace' })
    setLoading(null)
    setMessage(error ? 'Unable to save the request. Try again.' : 'Request saved. We will show next steps here when a partner is available.')
  }
  return <section className="mt-7 border-t border-slate-200 pt-5"><div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Optional research help</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void request('title_search')} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-300"><FileSearch className="mt-0.5 h-5 w-5 text-emerald-800" /><span><span className="block text-sm font-black">Request a title-search referral</span><span className="mt-1 block text-xs leading-5 text-slate-500">A future-ready handoff for professional title research. No result is implied.</span></span>{loading === 'title_search' && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}</button><button type="button" onClick={() => void request('skip_trace')} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-300"><Footprints className="mt-0.5 h-5 w-5 text-emerald-800" /><span><span className="block text-sm font-black">Request a skip-trace referral</span><span className="mt-1 block text-xs leading-5 text-slate-500">A compliance-minded lead for locating parties when lawful and appropriate.</span></span>{loading === 'skip_trace' && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}</button></div>{message && <p className="mt-3 text-xs font-bold text-emerald-800">{message}</p>}</section>
}
