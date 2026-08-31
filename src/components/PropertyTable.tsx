import { ArrowUpRight, CircleDot } from 'lucide-react'
import { getListedBidAmount } from '../lib/propertyBudget'
import type { Property } from '../types/property'
import type { PropertyTracker } from '../types/product'

interface Props {
  properties: Property[]
  trackers: Map<string, PropertyTracker>
  onOpen: (property: Property) => void
}

const money = (value: number) => value > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) : 'Verify'
const date = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'Pending'

export default function PropertyTable({ properties, trackers, onOpen }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[980px] w-full border-collapse text-left">
        <thead><tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><th className="px-5 py-3">Property</th><th className="px-4 py-3">Sale</th><th className="px-4 py-3">Opening bid</th><th className="px-4 py-3">Auction</th><th className="px-4 py-3">Research</th><th className="px-4 py-3">Tracking</th><th className="px-4 py-3">Source</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{properties.map((property) => { const tracker = trackers.get(property.id); return <tr key={property.id} className="group hover:bg-emerald-50/40"><td className="px-5 py-4"><button type="button" onClick={() => onOpen(property)} className="text-left"><div className="text-sm font-black text-slate-900 group-hover:text-emerald-900">{property.address}</div><div className="mt-1 text-xs text-slate-500">{property.city}, {property.state} · {property.county} County</div></button></td><td className="px-4 py-4 text-sm font-semibold text-slate-700">{property.saleType ?? property.auctionType}</td><td className="px-4 py-4 text-sm font-black text-slate-900">{money(getListedBidAmount(property))}</td><td className="px-4 py-4 text-sm text-slate-700">{date(property.auctionDate)}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${property.valuationVerified ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{property.valuationVerified ? 'Value verified' : 'Needs review'}</span></td><td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-xs font-bold capitalize text-slate-600"><CircleDot className="h-3.5 w-3.5 text-emerald-700" />{tracker?.status.replace('_', ' ') ?? 'Not tracked'}</span></td><td className="px-4 py-4"><a href={property.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-emerald-800">Official <ArrowUpRight className="h-3 w-3" /></a></td></tr> })}</tbody>
      </table>
    </div>
  )
}
