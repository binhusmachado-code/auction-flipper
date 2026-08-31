import { ArrowUpRight, CalendarDays } from 'lucide-react'
import { useMemo } from 'react'
import type { Property } from '../types/property'

interface Props { properties: Property[]; onOpen: (property: Property) => void }

export default function AuctionCalendar({ properties, onOpen }: Props) {
  const groups = useMemo(() => {
    const byDate = new Map<string, Property[]>()
    properties.filter((property) => property.auctionDate).forEach((property) => {
      const date = property.auctionDate as string
      byDate.set(date, [...(byDate.get(date) ?? []), property])
    })
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 24)
  }, [properties])
  return <section><div className="mb-6"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-800"><CalendarDays className="h-4 w-4" />Upcoming schedule</div><h2 className="mt-2 text-3xl font-black tracking-tight">Auction calendar</h2><p className="mt-2 text-sm text-slate-600">Dates are research reminders. Recheck the official source for postponements, removals, and rule changes.</p></div><div className="grid gap-4 lg:grid-cols-2">{groups.map(([day, items]) => <article key={day} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-lg font-black">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${day}T12:00:00`))}</div><div className="mt-1 text-xs font-semibold text-slate-500">{items.length} {items.length === 1 ? 'property' : 'properties'} across {new Set(items.map((item) => item.county)).size} counties</div></div><a href={items[0].sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-2 text-emerald-800"><ArrowUpRight className="h-4 w-4" /></a></div><div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">{items.slice(0, 4).map((property) => <button key={property.id} type="button" onClick={() => onOpen(property)} className="flex w-full items-center justify-between gap-4 py-3 text-left"><div><div className="text-sm font-black text-slate-900">{property.address}</div><div className="text-xs text-slate-500">{property.county} County · {property.saleType}</div></div><span className="text-xs font-black text-emerald-800">Research →</span></button>)}</div></article>)}</div>{groups.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500">No matching auction dates are currently available.</div>}</section>
}
