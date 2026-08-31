import { useState, type ReactNode } from 'react'
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Grid2X2,
  Heart,
  Landmark,
  LogOut,
  MapPin,
  Menu,
  Search,
  Settings,
  SlidersHorizontal,
  Target,
  Table2,
  Tag,
  X,
} from 'lucide-react'
import type { DealFilter, Property } from '../types/property'
import type { PlanEntitlements, PropertyTracker, SavedSearch } from '../types/product'
import { getListedBidAmount } from '../lib/propertyBudget'
import PropertyMedia from './PropertyMedia'

export type WorkspaceView = 'all' | 'table' | 'calendar' | 'trackers' | 'alerts' | 'learn' | 'directory' | 'pricing' | 'map' | 'favorites'

interface Deadline {
  date: string
  county: string
  source: string
  sourceUrl: string
  count: number
}

interface Props {
  filter: DealFilter
  states: string[]
  counties: string[]
  onFilterChange: (filter: DealFilter) => void
  filteredProperties: Property[]
  trackers: Map<string, PropertyTracker>
  savedSearches: SavedSearch[]
  entitlements: PlanEntitlements
  upcomingAuctions: Deadline[]
  membershipTier: string
  hasOwnerAccess: boolean
  favoriteIds: string[]
  onOpenProperty: (property: Property) => void
  onToggleFavorite: (propertyId: string) => void
  onViewChange: (view: WorkspaceView) => void
  onOpenAccount: () => void
  onSignOut: () => void
  exportControl: ReactNode
}

const money = (value: number) => value > 0
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  : 'Verify'

const date = (value?: string) => value
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
  : 'Pending'

const navItems: Array<{ view: WorkspaceView; label: string; icon: typeof Search }> = [
  { view: 'table', label: 'Discover', icon: Search },
  { view: 'calendar', label: 'Calendar', icon: CalendarDays },
  { view: 'trackers', label: 'Trackers', icon: Target },
  { view: 'favorites', label: 'Saved', icon: Heart },
  { view: 'alerts', label: 'Alerts', icon: Bell },
  { view: 'learn', label: 'Learn', icon: BookOpen },
]

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5">
      <svg aria-hidden="true" viewBox="0 0 42 42" className="h-10 w-10 shrink-0 text-emerald-800" fill="none">
        <circle cx="21" cy="21" r="12" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="21" cy="21" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M21 2v10M21 30v10M2 21h10M30 21h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <div className="leading-[0.9] text-[17px] font-black tracking-[0.06em] text-emerald-900">
        <div>TAX DEED</div>
        <div>&amp; LIEN</div>
        <div>HUNTER</div>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, icon: Icon }: { label: string; value: string; onChange: (value: string) => void; options: string[]; icon: typeof MapPin }) {
  return (
    <label className="relative min-w-0">
      <span className="sr-only">{label}</span>
      <Icon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-[13px] font-semibold text-slate-800 outline-none transition-colors focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10">
        {options.map((option) => <option key={option} value={option === label ? '' : option}>{option}</option>)}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </label>
  )
}

function StatusBadge({ property, tracker }: { property: Property; tracker?: PropertyTracker }) {
  const status = tracker?.status?.replace('_', ' ') ?? (property.valuationVerified ? 'Watching' : 'New')
  const style = status === 'due diligence' ? 'bg-sky-100 text-sky-800' : status === 'researching' ? 'bg-amber-100 text-amber-900' : status === 'new' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-900'
  return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ${style}`}>{status}</span>
}

function PropertyTable({ properties, trackers, favoriteIds, onOpen, onToggleFavorite }: { properties: Property[]; trackers: Map<string, PropertyTracker>; favoriteIds: string[]; onOpen: (property: Property) => void; onToggleFavorite: (propertyId: string) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const totalPages = Math.max(1, Math.ceil(properties.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const visible = properties.slice(start, start + pageSize)
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const firstSelected = properties.find((property) => property.id === selected[0])

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Property listings table">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-700">
            <tr>
              <th className="w-12 px-4 py-3"><input type="checkbox" aria-label="Select all visible properties" checked={visible.length > 0 && selected.length === visible.length} onChange={() => setSelected(selected.length === visible.length ? [] : visible.map((property) => property.id))} className="h-4 w-4 rounded border-slate-300 accent-emerald-700" /></th>
              <th className="px-3 py-3">Property <span className="ml-1 text-slate-400">↕</span></th>
              <th className="px-3 py-3">Sale <span className="ml-1 text-slate-400">↕</span></th>
              <th className="px-3 py-3">Opening bid <span className="ml-1 text-slate-400">↕</span></th>
              <th className="px-3 py-3">Auction <span className="ml-1 text-slate-400">↕</span></th>
              <th className="px-3 py-3">Research</th>
              <th className="px-3 py-3">Tracking</th>
              <th className="px-3 py-3">Source</th>
              <th className="w-20 px-3 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((property) => {
              const tracker = trackers.get(property.id)
              const selectedRow = selected.includes(property.id)
              return (
                <tr key={property.id} className={`group transition-colors hover:bg-emerald-50/35 ${selectedRow ? 'bg-emerald-50/50' : ''}`}>
                  <td className="px-4 py-3.5 align-middle"><input type="checkbox" aria-label={`Select ${property.address}`} checked={selectedRow} onChange={() => toggle(property.id)} className="h-4 w-4 rounded border-slate-300 accent-emerald-700" /></td>
                  <td className="px-3 py-3.5 align-middle">
                    <button type="button" onClick={() => onOpen(property)} className="text-left">
                      <div className="max-w-[200px] truncate text-[13px] font-extrabold text-slate-950 group-hover:text-emerald-800">{property.address}</div>
                      <div className="mt-0.5 max-w-[220px] truncate text-[12px] text-slate-500">{property.city}, {property.state} {property.zip}</div>
                    </button>
                  </td>
                  <td className="px-3 py-3.5 align-middle text-[13px] font-semibold text-slate-700">{property.saleType ?? property.auctionType}</td>
                  <td className="px-3 py-3.5 align-middle text-[13px] font-semibold text-slate-900">{money(getListedBidAmount(property))}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 align-middle text-[13px] text-slate-700">{date(property.auctionDate)}</td>
                  <td className="px-3 py-3.5 align-middle"><button type="button" onClick={() => onOpen(property)} className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-bold text-emerald-800 hover:text-emerald-600"><Search className="h-3.5 w-3.5" />Quick screen</button></td>
                  <td className="px-3 py-3.5 align-middle"><StatusBadge property={property} tracker={tracker} /></td>
                  <td className="px-3 py-3.5 align-middle"><span className="whitespace-nowrap text-[12px] text-slate-600">Official source</span></td>
                  <td className="px-3 py-3.5 align-middle"><div className="flex items-center gap-3"><button type="button" onClick={() => onToggleFavorite(property.id)} aria-label={`${favoriteIds.includes(property.id) ? 'Remove' : 'Save'} ${property.address}`} className="text-slate-700 hover:text-emerald-800"><Heart className={`h-4 w-4 ${favoriteIds.includes(property.id) ? 'fill-emerald-700 text-emerald-700' : ''}`} /></button><a href={property.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open source for ${property.address}`} className="text-slate-700 hover:text-emerald-800"><Download className="h-4 w-4 rotate-180" /></a></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-[12px] text-slate-600">
        <span>Showing {properties.length ? start + 1 : 0} to {Math.min(start + visible.length, properties.length).toLocaleString()} of {properties.length.toLocaleString()} properties</span>
        <div className="flex items-center gap-1.5">
          <button type="button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:text-slate-300" aria-label="Previous page">‹</button>
          {[1, 2, 3].filter((pageNumber) => pageNumber <= totalPages).map((pageNumber) => <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`grid h-9 w-9 place-items-center rounded-lg border font-bold ${safePage === pageNumber ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700'}`}>{pageNumber}</button>)}
          {totalPages > 3 && <span className="px-1 text-slate-400">…</span>}
          <button type="button" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:text-slate-300" aria-label="Next page">›</button>
          <select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} className="ml-3 h-9 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-700"><option value={25}>25 per page</option><option value={50}>50 per page</option></select>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3 text-[12px] text-slate-600"><span>{selected.length} selected</span><div className="flex items-center gap-2"><button type="button" disabled={!firstSelected} onClick={() => firstSelected && onOpen(firstSelected)} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Track property</button><button type="button" disabled={!firstSelected} onClick={() => firstSelected && onOpen(firstSelected)} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Open property</button><span className="ml-2 hidden text-slate-500 sm:inline">Select a property to take action.</span></div></div>
    </section>
  )
}

function PropertyGrid({ properties, favoriteIds, onOpen, onToggleFavorite }: { properties: Property[]; favoriteIds: string[]; onOpen: (property: Property) => void; onToggleFavorite: (propertyId: string) => void }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{properties.slice(0, 12).map((property) => <article key={property.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white"><PropertyMedia property={property} /><div className="p-4"><div className="flex items-start justify-between gap-3"><button type="button" onClick={() => onOpen(property)} className="min-w-0 text-left"><div className="truncate text-sm font-black text-slate-950">{property.address}</div><div className="mt-1 truncate text-xs text-slate-500">{property.city}, {property.state} {property.zip}</div></button><button type="button" onClick={() => onToggleFavorite(property.id)} aria-label={`${favoriteIds.includes(property.id) ? 'Remove' : 'Save'} ${property.address}`} className="text-slate-600 hover:text-emerald-800"><Heart className={`h-4 w-4 ${favoriteIds.includes(property.id) ? 'fill-emerald-700 text-emerald-700' : ''}`} /></button></div><div className="mt-4 flex items-center justify-between text-xs"><span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-800">{property.saleType ?? property.auctionType}</span><span className="font-black text-slate-900">{money(getListedBidAmount(property))}</span></div><button type="button" onClick={() => onOpen(property)} className="mt-4 h-10 w-full rounded-lg bg-emerald-800 text-xs font-bold text-white hover:bg-emerald-700">Review property</button></div></article>)}</div>
}

export default function CommandCenterLayout({ filter, states, counties, onFilterChange, filteredProperties, trackers, savedSearches, entitlements, upcomingAuctions, membershipTier, hasOwnerAccess, favoriteIds, onOpenProperty, onToggleFavorite, onViewChange, onOpenAccount, onSignOut, exportControl }: Props) {
  const [mobileNav, setMobileNav] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [layoutMode, setLayoutMode] = useState<'table' | 'grid'>('table')
  const update = (partial: Partial<DealFilter>) => onFilterChange({ ...filter, ...partial })
  const clear = () => onFilterChange({ state: '', county: '', city: '', minPrice: 0, maxPrice: 10_000_000, propertyType: '', saleType: '', auctionType: '', minInterestRate: 0, maxRedemptionPeriod: 60, keyword: '', analysisStatus: '', dealGrade: '', verifiedValueOnly: false, mappedOnly: false, auctionDateKnownOnly: false, sortBy: 'auction-soonest' })
  const hasFilters = Boolean(filter.state || filter.county || filter.propertyType || filter.saleType || filter.keyword || filter.minPrice || filter.maxPrice < 10_000_000 || filter.verifiedValueOnly || filter.mappedOnly)

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[216px] border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-[88px] items-center border-b border-slate-200"><Brand /></div>
        <nav className="flex-1 space-y-1 px-2.5 py-6" aria-label="Primary navigation">
          {navItems.map(({ view, label, icon: Icon }) => <button key={view} type="button" onClick={() => onViewChange(view)} className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[15px] font-semibold transition-colors ${view === 'table' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-900'}`}><Icon className="h-5 w-5" />{label}</button>)}
        </nav>
        <div className="space-y-1 border-t border-slate-200 px-2.5 py-5"><button type="button" onClick={() => onViewChange('learn')} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[14px] font-semibold text-slate-700 hover:bg-slate-50"><CircleHelp className="h-5 w-5" />Help center</button><button type="button" onClick={() => onViewChange('pricing')} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[14px] font-semibold text-slate-700 hover:bg-slate-50"><Settings className="h-5 w-5" />Settings</button><button type="button" onClick={onSignOut} className="mt-4 flex w-full items-center gap-3 border-t border-slate-200 px-4 pt-5 text-left text-[14px] font-semibold text-slate-700 hover:text-emerald-900"><LogOut className="h-5 w-5" />Log out</button></div>
      </aside>

      <div className="lg:pl-[216px]">
        <header className="sticky top-0 z-30 flex h-[88px] items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-10">
          <button type="button" onClick={() => setMobileNav(!mobileNav)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700 lg:hidden" aria-label={mobileNav ? 'Close navigation' : 'Open navigation'}>{mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <div className="hidden sm:block lg:hidden"><Brand /></div>
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search by address, city, county, or parcel ID</span><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-800" /><input value={filter.keyword} onChange={(event) => update({ keyword: event.target.value })} placeholder="Search by address, city, county, or parcel ID..." className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-12 pr-4 text-[14px] text-slate-900 outline-none placeholder:text-slate-500 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10" /></label>
          <button type="button" className="hidden h-10 w-10 place-items-center rounded-lg text-slate-800 hover:bg-slate-50 sm:grid" aria-label="Notifications"><Bell className="h-5 w-5" /></button>
          <button type="button" onClick={onOpenAccount} className="flex h-12 items-center gap-3 rounded-lg border border-slate-300 px-3 text-left hover:border-emerald-700"><span className="grid h-8 w-8 place-items-center rounded-full border border-slate-400 text-slate-700">{hasOwnerAccess ? <Target className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}</span><span className="hidden text-[14px] font-semibold text-slate-900 sm:block">{hasOwnerAccess ? 'Owner' : `${membershipTier[0]?.toUpperCase() ?? ''}${membershipTier.slice(1)} plan`}</span><ChevronDown className="h-4 w-4 text-slate-700" /></button>
        </header>

        {mobileNav && <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">{navItems.map(({ view, label, icon: Icon }) => <button key={view} type="button" onClick={() => { onViewChange(view); setMobileNav(false) }} className={`mr-1 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${view === 'table' ? 'bg-emerald-800 text-white' : 'text-slate-700 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{label}</button>)}</div>}

        <main className="mx-auto max-w-[1340px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_312px]">
            <section className="min-w-0">
              <div className="mb-7"><h1 className="text-[34px] font-black tracking-[-0.03em] text-slate-950 sm:text-[40px]">Property command center</h1><p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-600">Discover official listings, follow changes, and move each property from watching to paid.</p></div>

              <div className="mb-5 flex flex-wrap items-center gap-3">
                <FilterSelect label="All states" value={filter.state} onChange={(value) => update({ state: value })} options={['All states', ...states]} icon={MapPin} />
                <FilterSelect label="All counties" value={filter.county} onChange={(value) => update({ county: value })} options={['All counties', ...counties]} icon={Landmark} />
                <FilterSelect label="All sale types" value={filter.saleType} onChange={(value) => update({ saleType: value })} options={['All sale types', 'Tax Deed', 'Tax Lien']} icon={Tag} />
                <button type="button" onClick={() => setShowMoreFilters(!showMoreFilters)} className={`inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-[13px] font-bold transition-colors ${showMoreFilters ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-slate-300 bg-white text-slate-800 hover:border-emerald-700'}`}><SlidersHorizontal className="h-4 w-4" />More filters</button>
                {hasFilters && <button type="button" onClick={clear} className="text-[13px] font-semibold text-emerald-800 underline-offset-4 hover:underline">Reset</button>}
              </div>
              {showMoreFilters && <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-[12px] font-bold text-slate-600">Property type<select value={filter.propertyType} onChange={(event) => update({ propertyType: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold"><option value="">All properties</option><option>Single Family</option><option>Condo</option><option>Townhouse</option><option>Land</option><option>Commercial</option></select></label><label className="text-[12px] font-bold text-slate-600">Minimum amount<input type="number" value={filter.minPrice || ''} onChange={(event) => update({ minPrice: Number(event.target.value) || 0 })} placeholder="Any" className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold" /></label><label className="text-[12px] font-bold text-slate-600">Maximum amount<input type="number" value={filter.maxPrice === 10_000_000 ? '' : filter.maxPrice} onChange={(event) => update({ maxPrice: Number(event.target.value) || 10_000_000 })} placeholder="Any" className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold" /></label><label className="flex items-center gap-2 self-end text-[12px] font-bold text-slate-700"><input type="checkbox" checked={filter.verifiedValueOnly} onChange={(event) => update({ verifiedValueOnly: event.target.checked })} className="h-4 w-4 accent-emerald-700" />Verified value only</label></div>}

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5"><button type="button" onClick={() => setLayoutMode('table')} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] ${layoutMode === 'table' ? 'bg-emerald-50 font-bold text-emerald-900' : 'font-semibold text-slate-600 hover:bg-slate-50'}`}><Table2 className="h-4 w-4" />Table</button><button type="button" onClick={() => setLayoutMode('grid')} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] ${layoutMode === 'grid' ? 'bg-emerald-50 font-bold text-emerald-900' : 'font-semibold text-slate-600 hover:bg-slate-50'}`}><Grid2X2 className="h-4 w-4" />Grid</button><button type="button" onClick={() => onViewChange('calendar')} className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"><CalendarDays className="h-4 w-4" />Calendar</button></div><div className="flex items-center gap-2">{exportControl}<button type="button" onClick={() => onViewChange('alerts')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-700 bg-white px-4 text-[13px] font-bold text-emerald-900 hover:bg-emerald-50"><Heart className="h-4 w-4" />Save search</button></div></div>
              <div className="mb-4 flex items-center justify-between text-[12px] text-slate-500"><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-700" />Official source records</span><span>Showing 1–{Math.min(25, filteredProperties.length)} of {filteredProperties.length.toLocaleString()}</span></div>
              {layoutMode === 'table' ? <PropertyTable properties={filteredProperties} trackers={trackers} favoriteIds={favoriteIds} onOpen={onOpenProperty} onToggleFavorite={onToggleFavorite} /> : <PropertyGrid properties={filteredProperties} favoriteIds={favoriteIds} onOpen={onOpenProperty} onToggleFavorite={onToggleFavorite} />}
            </section>

            <aside className="space-y-4 xl:pt-[107px]">
              <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-[16px] font-extrabold text-slate-950"><CalendarDays className="h-5 w-5" />Upcoming deadlines</div><div className="mt-4 divide-y divide-slate-100">{upcomingAuctions.slice(0, 3).map((auction, index) => <button type="button" key={`${auction.county}-${auction.date}`} onClick={() => onViewChange('calendar')} className="block w-full py-3 text-left first:pt-0 last:pb-0"><div className="flex items-center justify-between gap-2"><span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-emerald-700' : 'bg-amber-500'}`} /><span className="flex-1 text-[13px] font-bold text-slate-800">{date(auction.date)}</span><span className={`rounded-md px-2 py-1 text-[10px] font-extrabold uppercase ${index === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{index === 0 ? 'Auction' : 'Registration'}</span></div><div className="mt-2 pl-4 text-[12px] leading-5 text-slate-600">{auction.county} County {auction.count > 1 ? `· ${auction.count.toLocaleString()} properties` : ''}</div></button>)}{upcomingAuctions.length === 0 && <p className="text-sm text-slate-500">No dated auctions in this view.</p>}</div><button type="button" onClick={() => onViewChange('calendar')} className="mt-4 text-[13px] font-bold text-emerald-800 hover:underline">View all deadlines →</button></section>
              <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[16px] font-extrabold text-slate-950"><Heart className="h-5 w-5" />Saved searches</div><button type="button" onClick={() => onViewChange('alerts')} aria-label="Add saved search" className="text-xl font-light text-emerald-800">+</button></div><div className="mt-4 space-y-4">{savedSearches.slice(0, 3).map((search) => <button type="button" key={search.id} onClick={() => onViewChange('alerts')} className="flex w-full items-start gap-3 text-left"><Heart className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" /><span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-slate-800">{search.name}</span><span className="mt-0.5 block truncate text-[12px] text-slate-500">{search.alertFrequency} delivery</span></span></button>)}{savedSearches.length === 0 && <p className="text-sm text-slate-500">No saved searches yet.</p>}</div><button type="button" onClick={() => onViewChange('alerts')} className="mt-5 text-[13px] font-bold text-emerald-800 hover:underline">View all saved searches →</button></section>
              <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-[16px] font-extrabold text-slate-950"><Bell className="h-5 w-5" />Alert delivery</div><div className="mt-4 space-y-3 text-[13px] text-slate-700"><label className="flex items-center gap-3"><input type="radio" checked={entitlements.alertFrequency === 'instant'} readOnly className="h-4 w-4 accent-emerald-700" />Instant (push)</label><label className="flex items-center gap-3"><input type="radio" checked={entitlements.alertFrequency === 'daily'} readOnly className="h-4 w-4 accent-emerald-700" />Daily email</label><label className="flex items-center gap-3 text-slate-400"><input type="radio" checked={false} readOnly disabled className="h-4 w-4 accent-emerald-700" />Weekly digest</label></div>{entitlements.alertFrequency === 'none' && <p className="mt-4 text-[12px] leading-5 text-slate-500">Upgrade to unlock alerts. Official-source refresh timing can vary.</p>}<button type="button" onClick={() => onViewChange(entitlements.alertFrequency === 'none' ? 'pricing' : 'alerts')} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 text-[13px] font-bold text-emerald-900 hover:bg-emerald-50"><Bell className="h-4 w-4" />Manage alerts</button></section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}
