import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Gavel,
  Menu,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { usePublicPropertyPreviews } from '../hooks/useSupabase'
import { getListedBidAmount } from '../lib/propertyBudget'
import type { Property } from '../types/property'
import type { BillingInterval, PlanTier } from '../types/product'
import PricingSection from './PricingSection'
import PropertyMedia from './PropertyMedia'

interface Props {
  onSignIn: () => void
  onStartFree?: () => void
  onChoosePlan: (tier: PlanTier, interval: BillingInterval) => Promise<void> | void
}

function currency(value: number) {
  return value > 0
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    : 'Verify amount'
}

function date(value?: string) {
  if (!value) return 'Date pending'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function FeaturedPropertyCard({ property, onReview }: { property: Property; onReview: () => void }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_-28px_rgba(15,23,42,0.5)] transition duration-300 hover:-translate-y-1 hover:border-emerald-700/35 hover:shadow-[0_24px_55px_-28px_rgba(15,23,42,0.55)]">
      <div className="relative">
        <PropertyMedia property={property} />
        <span className="absolute left-3 top-3 rounded-md bg-emerald-800 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">
          {property.saleType ?? property.auctionType}
        </span>
      </div>
      <div className="p-4">
        <h3 className="truncate text-base font-black tracking-tight text-slate-950">{property.address}</h3>
        <p className="mt-1 truncate text-xs text-slate-500">{property.city}, {property.state} {property.zip}</p>
        <dl className="mt-4 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-100 py-3">
          <div className="pr-2"><dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Opening bid</dt><dd className="mt-1 truncate text-xs font-black text-slate-950">{currency(getListedBidAmount(property))}</dd></div>
          <div className="px-2"><dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Auction</dt><dd className="mt-1 truncate text-xs font-black text-slate-950">{date(property.auctionDate)}</dd></div>
          <div className="pl-2"><dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Parcel ID</dt><dd className="mt-1 truncate text-xs font-black text-slate-950">{property.parcelId || 'Not posted'}</dd></div>
        </dl>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={onReview} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-700 text-xs font-black text-emerald-900 transition hover:bg-emerald-800 hover:text-white">
            Review property <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <a href={property.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open source record for ${property.address}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-emerald-700 hover:text-emerald-800">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  )
}

export default function PublicHome({ onSignIn, onStartFree = onSignIn, onChoosePlan }: Props) {
  const { properties } = usePublicPropertyPreviews()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const startSearch = () => {
    if (query.trim()) sessionStorage.setItem('auction-hunter-search', query.trim())
    onStartFree()
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-800 shadow-sm"><TrendingUp className="h-4 w-4 text-white" /></span>
            <span className="text-sm font-black tracking-tight text-emerald-950 sm:text-base">TAX DEED &amp; LIEN HUNTER</span>
          </button>
          <div className="hidden items-center gap-8 md:flex">
            <button type="button" onClick={() => scroll('featured-properties')} className="text-sm font-bold text-slate-600 hover:text-emerald-800">Browse properties</button>
            <button type="button" onClick={() => scroll('featured-properties')} className="text-sm font-bold text-slate-600 hover:text-emerald-800">Auction calendar</button>
            <button type="button" onClick={() => scroll('how-it-works')} className="text-sm font-bold text-slate-600 hover:text-emerald-800">Learn</button>
            <button type="button" onClick={() => scroll('pricing')} className="text-sm font-bold text-slate-600 hover:text-emerald-800">Pricing</button>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button type="button" onClick={onSignIn} className="rounded-lg px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Sign in</button>
            <button type="button" onClick={onStartFree} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-emerald-900">Start free</button>
          </div>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg p-2 text-slate-700 md:hidden" aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && (
          <div className="mx-auto flex max-w-[1400px] flex-col gap-1 border-t border-slate-200 py-3 md:hidden">
            <button onClick={() => { scroll('featured-properties'); setMenuOpen(false) }} className="rounded-lg px-3 py-2 text-left text-sm font-bold">Browse properties</button>
            <button onClick={() => { scroll('how-it-works'); setMenuOpen(false) }} className="rounded-lg px-3 py-2 text-left text-sm font-bold">Learn</button>
            <button onClick={() => { scroll('pricing'); setMenuOpen(false) }} className="rounded-lg px-3 py-2 text-left text-sm font-bold">Pricing</button>
            <button onClick={onStartFree} className="mt-2 rounded-lg bg-emerald-800 px-3 py-2.5 text-sm font-black text-white">Start free</button>
          </div>
        )}
      </nav>

      <header className="relative isolate min-h-[500px] overflow-hidden bg-slate-950">
        <img
          src="/assets/auction-neighborhood-hero-v1.png"
          alt="Tree-lined residential neighborhood"
          className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,18,12,0.92)_0%,rgba(2,18,12,0.76)_38%,rgba(2,18,12,0.2)_68%,rgba(2,18,12,0.03)_100%)]" />
        <div className="relative mx-auto flex min-h-[500px] max-w-[1400px] items-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-5xl">
            <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-[72px]">Find auction properties.<br />Research before you bid.</h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-white/90 sm:text-lg">Tax deeds, tax liens, source records, and careful due diligence—organized in one property research workspace.</p>
            <form onSubmit={(event) => { event.preventDefault(); startSearch() }} className="mt-8 flex max-w-5xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-[0_26px_70px_-20px_rgba(0,0,0,0.65)] sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search properties</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by address, city, county, state, or parcel ID" className="h-14 w-full rounded-xl border-0 bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-700/20 sm:text-base" />
              </label>
              <button type="submit" className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-9 text-sm font-black text-white transition hover:bg-emerald-900 sm:text-base">Search properties <ArrowRight className="h-4 w-4" /></button>
            </form>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/80"><span>Tax deed auctions</span><span>Tax lien certificates</span><span>Source-linked research</span></div>
          </div>
        </div>
      </header>

      <section id="featured-properties" className="relative z-10 bg-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Featured auction properties</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">Verified property photos appear when a trusted source supplies them. Otherwise, we show clearly labeled aerial parcel context.</p></div>
            <button type="button" onClick={onStartFree} className="hidden items-center gap-1.5 text-sm font-black text-emerald-800 hover:text-emerald-600 sm:inline-flex">View all properties <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {properties.slice(0, 4).map((property) => <FeaturedPropertyCard key={property.id} property={property} onReview={onStartFree} />)}
          </div>
          <button type="button" onClick={onStartFree} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 text-sm font-black text-white sm:hidden">View all properties <ArrowRight className="h-4 w-4" /></button>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200 bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-[1400px] gap-0 md:grid-cols-3">
          {[
            [FileSearch, 'Quick screen', 'Confirm the sale type, auction authority, property identity, amount, and source.'],
            [CheckCircle2, 'Due diligence', 'Review title, liens, access, occupancy signals, condition, permits, utilities, and deadlines.'],
            [Gavel, 'Bid ready', 'Document your value, costs, contingency, maximum bid, and final source timestamp.'],
          ].map(([Icon, title, copy], index) => { const C = Icon as typeof FileSearch; return (
            <article key={String(title)} className={`flex gap-4 px-2 py-5 sm:px-7 ${index > 0 ? 'border-t border-slate-200 md:border-l md:border-t-0' : ''}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-800 text-white shadow-sm"><C className="h-5 w-5" /></span>
              <div><div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Step {index + 1}</div><h3 className="mt-1 text-lg font-black text-slate-950">{String(title)}</h3><p className="mt-1.5 text-sm leading-6 text-slate-600">{String(copy)}</p></div>
            </article>
          ) })}
        </div>
      </section>

      <section className="overflow-hidden bg-emerald-950 px-4 py-16 text-white sm:px-6">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div><h2 className="text-3xl font-black tracking-tight sm:text-4xl">See the property. Trace the evidence.</h2><p className="mt-4 max-w-xl text-base leading-7 text-emerald-100/80">Every visual is labeled by provenance. Open the map, inspect nearby Street View, save source records, and keep your bid decision connected to the evidence.</p><button type="button" onClick={onStartFree} className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-black text-emerald-950 hover:bg-emerald-50">Explore properties <ArrowRight className="h-4 w-4" /></button></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {properties.slice(0, 2).map((property) => <div key={property.id} className="group overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-2xl"><PropertyMedia property={property} /><div className="p-4"><div className="truncate text-sm font-black">{property.address}</div><div className="mt-1 text-xs text-emerald-100/70">{property.city}, {property.state} · {date(property.auctionDate)}</div></div></div>)}
          </div>
        </div>
      </section>

      <PricingSection onChoose={onChoosePlan} />

      <footer className="bg-slate-950 px-4 py-10 text-slate-300 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-6 md:flex-row md:items-end"><div><div className="flex items-center gap-2 text-sm font-black text-white"><TrendingUp className="h-4 w-4 text-emerald-400" />TAX DEED &amp; LIEN HUNTER</div><p className="mt-3 max-w-xl text-xs leading-5 text-slate-400">An auction-research workspace—not legal, title, financial, or investment advice. Verify every record with the government or authorized auction source before investing.</p></div><div className="flex flex-wrap gap-5 text-xs font-bold"><button onClick={() => scroll('featured-properties')} className="hover:text-white">Properties</button><button onClick={() => scroll('how-it-works')} className="hover:text-white">How it works</button><button onClick={() => scroll('pricing')} className="hover:text-white">Pricing</button><button onClick={onSignIn} className="hover:text-white">Sign in</button></div></div>
      </footer>
    </div>
  )
}
