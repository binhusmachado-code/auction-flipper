import { Bell, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PLAN_DEFINITIONS } from '../lib/plans'
import type { DealFilter } from '../types/property'
import type { AlertFrequency, PlanTier, SavedSearch } from '../types/product'

interface Props {
  searches: SavedSearch[]
  currentFilter: DealFilter
  tier: PlanTier
  onSave: (name: string, filter: DealFilter, frequency: AlertFrequency) => Promise<void>
  onApply: (filter: DealFilter) => void
  onRemove: (id: string) => Promise<void>
}

export default function SavedSearchesPanel({ searches, currentFilter, tier, onSave, onApply, onRemove }: Props) {
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<AlertFrequency>(tier === 'pro' ? 'instant' : tier === 'investor' ? 'daily' : 'none')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    if (!name.trim()) { setError('Name this search first'); return }
    setSaving(true); setError('')
    try { await onSave(name, currentFilter, frequency); setName('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save search') } finally { setSaving(false) }
  }
  const plan = PLAN_DEFINITIONS[tier]
  return <section><div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Repeatable discovery</div><h2 className="mt-2 text-3xl font-black tracking-tight">Saved searches & alerts</h2><p className="mt-2 text-sm text-slate-600">Save the filters you use repeatedly. Alert delivery depends on your plan and the data-refresh schedule.</p><div className="mt-7 space-y-3">{searches.map((search) => <article key={search.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><Search className="h-4 w-4 text-emerald-800" /><h3 className="text-sm font-black">{search.name}</h3></div><p className="mt-2 text-xs text-slate-500">{[search.filters.state, search.filters.county, search.filters.saleType, search.filters.propertyType].filter(Boolean).join(' · ') || 'All current properties'}</p><span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800"><Bell className="h-3 w-3" />{search.alertFrequency === 'none' ? 'No delivery' : `${search.alertFrequency} alert`}</span></div><div className="flex gap-2"><button type="button" onClick={() => onApply(search.filters)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700">Apply</button><button type="button" onClick={() => void onRemove(search.id)} aria-label={`Delete ${search.name}`} className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></article>)}{searches.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">No saved searches yet</p><p className="mt-1 text-xs text-slate-500">Set filters in Discover, then save them here.</p></div>}</div></div><aside className="h-fit rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-black">Save current filters</h3><span className="text-xs font-bold text-slate-500">{searches.length}/{plan.savedSearchLimit}</span></div><label className="mt-5 block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Search name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Florida deed sales" maxLength={80} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700" /></label><label className="mt-4 block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Alert delivery</span><select value={frequency} onChange={(event) => setFrequency(event.target.value as AlertFrequency)} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"><option value="none">No alert</option><option value="daily" disabled={plan.alertFrequency === 'none'}>Daily digest{plan.alertFrequency === 'none' ? ' — upgrade' : ''}</option><option value="instant" disabled={plan.alertFrequency !== 'instant'}>Instant{plan.alertFrequency !== 'instant' ? ' — Pro' : ''}</option></select></label>{error && <p className="mt-3 text-xs font-bold text-red-600">{error}</p>}<button type="button" disabled={saving || searches.length >= plan.savedSearchLimit} onClick={() => void save()} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 text-sm font-black text-white disabled:opacity-50"><Plus className="h-4 w-4" />Save search</button><p className="mt-3 text-[11px] leading-5 text-slate-500">Alert timing describes the delivery target; official-source availability and refresh timing can vary.</p></aside></div></section>
}
