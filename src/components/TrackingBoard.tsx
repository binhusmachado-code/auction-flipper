import { CalendarClock, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import type { Property } from '../types/property'
import type { PropertyTracker, PropertyTrackingStatus } from '../types/product'

interface Props {
  properties: Property[]
  trackers: PropertyTracker[]
  onOpen: (property: Property) => void
  onUpdate: (propertyId: string, status: PropertyTrackingStatus) => Promise<void>
}

const STATUSES: Array<{ id: PropertyTrackingStatus; label: string; description: string }> = [
  { id: 'watching', label: 'Watching', description: 'Early screening' },
  { id: 'researching', label: 'Researching', description: 'Records in progress' },
  { id: 'due_diligence', label: 'Due diligence', description: 'Title and condition' },
  { id: 'ready', label: 'Ready', description: 'Bid limit documented' },
  { id: 'won', label: 'Won', description: 'Award and payment' },
  { id: 'paid', label: 'Paid', description: 'Post-sale follow-through' },
]

export default function TrackingBoard({ properties, trackers, onOpen, onUpdate }: Props) {
  const propertyById = useMemo(() => new Map(properties.map((property) => [property.id, property])), [properties])
  return <section><div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Research pipeline</div><h2 className="mt-2 text-3xl font-black tracking-tight">Property trackers</h2><p className="mt-2 text-sm text-slate-600">Move each opportunity through a clear lifecycle so deadlines and unfinished research stay visible.</p></div><div className="mt-7 grid gap-4 xl:grid-cols-3">{STATUSES.map((status) => { const items = trackers.filter((tracker) => tracker.status === status.id); return <article key={status.id} className="min-h-56 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between"><div><h3 className="text-sm font-black">{status.label}</h3><p className="mt-1 text-xs text-slate-500">{status.description}</p></div><span className="grid h-7 min-w-7 place-items-center rounded-full bg-white px-2 text-xs font-black text-slate-600 shadow-sm">{items.length}</span></div><div className="mt-4 space-y-3">{items.map((tracker) => { const property = propertyById.get(tracker.propertyId); if (!property) return null; const nextStatus = STATUSES[Math.min(STATUSES.findIndex((item) => item.id === status.id) + 1, STATUSES.length - 1)]?.id; return <div key={tracker.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><button type="button" onClick={() => onOpen(property)} className="text-left"><div className="text-sm font-black text-slate-900">{property.address}</div><div className="mt-1 text-xs text-slate-500">{property.county} County · {property.auctionDate ?? 'Date pending'}</div></button>{tracker.dueAt && <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-amber-800"><CalendarClock className="h-3.5 w-3.5" />Due {new Date(tracker.dueAt).toLocaleDateString()}</div>}{nextStatus !== status.id && <button type="button" onClick={() => void onUpdate(property.id, nextStatus)} className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-emerald-800">Move forward <ChevronRight className="h-3 w-3" /></button>}</div>})}{items.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-500">No properties here</div>}</div></article> })}</div></section>
}
