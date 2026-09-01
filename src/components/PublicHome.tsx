import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, FileSearch, Menu, ShieldCheck, TrendingUp, X } from 'lucide-react'
import { useState } from 'react'
import { usePublicPropertyPreviews } from '../hooks/useSupabase'
import { getListedBidAmount } from '../lib/propertyBudget'
import type { BillingInterval, PlanTier } from '../types/product'
import PricingSection from './PricingSection'

interface Props {
  onSignIn: () => void
  onStartFree?: () => void
  onChoosePlan: (tier: PlanTier, interval: BillingInterval) => Promise<void> | void
}

function currency(value: number) {
  return value > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) : 'Verify amount'
}

function date(value?: string) {
  if (!value) return 'Date pending'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

export default function PublicHome({ onSignIn, onStartFree = onSignIn, onChoosePlan }: Props) {
  const { properties } = usePublicPropertyPreviews()
  const [menuOpen, setMenuOpen] = useState(false)
  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-800"><TrendingUp className="h-4 w-4 text-white" /></span><span className="text-sm font-black tracking-tight text-emerald-950">TAX DEED &amp; LIEN HUNTER</span></button>
          <div className="hidden items-center gap-7 md:flex">
            <button type="button" onClick={() => scroll('preview')} className="text-sm font-bold text-slate-600 hover:text-slate-950">Browse properties</button>
            <button type="button" onClick={() => scroll('preview')} className="text-sm font-bold text-slate-600 hover:text-slate-950">Auction calendar</button>
            <button type="button" onClick={() => scroll('how-it-works')} className="text-sm font-bold text-slate-600 hover:text-slate-950">Learn</button>
            <button type="button" onClick={() => scroll('pricing')} className="text-sm font-bold text-slate-600 hover:text-slate-950">Pricing</button>
          </div>
          <div className="hidden items-center gap-2 md:flex"><button type="button" onClick={onSignIn} className="px-4 py-2 text-sm font-black text-slate-700">Sign in</button><button type="button" onClick={onStartFree} className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-900">Start free</button></div>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg p-2 text-slate-700 md:hidden" aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <div className="mx-auto flex max-w-7xl flex-col gap-1 border-t border-slate-200 py-3 md:hidden"><button onClick={() => scroll('preview')} className="rounded-lg px-3 py-2 text-left text-sm font-bold">Browse properties</button><button onClick={() => scroll('how-it-works')} className="rounded-lg px-3 py-2 text-left text-sm font-bold">Learn</button><button onClick={() => scroll('pricing')} className="rounded-lg px-3 py-2 text-left text-sm font-bold">Pricing</button><button onClick={onStartFree} className="mt-2 rounded-lg bg-emerald-800 px-3 py-2.5 text-sm font-black text-white">Start free</button></div>}
      </nav>

      <header className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" />Built for careful auction research</div>
            <h1 className="mt-6 max-w-xl text-5xl font-black leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl">Research every auction before you bid.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Find official tax-deed and tax-lien listings, verify the risks, calculate your maximum bid, and manage every step through payment.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={onStartFree} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 text-sm font-black text-white hover:bg-emerald-900">Start free <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => scroll('preview')} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 text-sm font-black text-slate-800 hover:bg-slate-50"><CalendarDays className="h-4 w-4" />Explore the calendar</button></div>
            <p className="mt-4 text-xs font-semibold text-slate-500">No credit card required for Free.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-2xl shadow-slate-900/10 sm:p-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><div className="text-sm font-black">Upcoming auctions</div><div className="text-xs text-slate-500">Official-source previews</div></div><span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800">Live research</span></div>
              <div className="divide-y divide-slate-100">
                {properties.slice(0, 3).map((property) => <div key={property.id} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4"><div className="min-w-0"><div className="truncate text-sm font-black text-slate-900">{property.address}</div><div className="mt-1 text-xs text-slate-500">{property.city}, {property.state} · {property.county} County</div></div><div className="text-right"><div className="text-sm font-black">{currency(getListedBidAmount(property))}</div><div className="mt-1 text-xs text-slate-500">{date(property.auctionDate)}</div></div></div>)}
              </div>
              <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3">
                {[['Quick screen', 'Confirm sale, parcel, and amount'], ['Due diligence', 'Check title, liens, and access'], ['Bid ready', 'Set a maximum bid and deadlines']].map(([title, copy], index) => <div key={title} className="bg-white p-4"><div className="flex items-center gap-2 text-xs font-black"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-800 text-[10px] text-white">{index + 1}</span>{title}</div><p className="mt-2 text-[11px] leading-4 text-slate-500">{copy}</p></div>)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="how-it-works" className="border-y border-slate-200 bg-emerald-50/60 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl"><div className="max-w-2xl"><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">One research workflow</div><h2 className="mt-2 text-3xl font-black tracking-tight">Move from discovery to a defensible bid.</h2></div><div className="mt-8 grid gap-4 md:grid-cols-3">{[
          [FileSearch, 'Screen official listings', 'Compare the address, parcel, opening amount, sale date, and source before spending time on deeper research.'],
          [CheckCircle2, 'Document due diligence', 'Keep source links, freshness dates, notes, uploads, and the buyer checklist beside each property.'],
          [BookOpen, 'Learn while you practice', 'Use step-by-step lessons, state field guides, quizzes, and a clearly labeled practice property.'],
        ].map(([Icon, title, copy]) => { const C = Icon as typeof FileSearch; return <article key={String(title)} className="rounded-2xl border border-emerald-100 bg-white p-6"><C className="h-5 w-5 text-emerald-800" /><h3 className="mt-5 text-base font-black">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{String(copy)}</p></article> })}</div></div>
      </section>

    <section id="preview" className="px-4 py-20 sm:px-6"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Upcoming properties</div><h2 className="mt-2 text-3xl font-black tracking-tight">Start with the linked sale record.</h2></div><button type="button" onClick={onStartFree} className="text-sm font-black text-emerald-800">Create a free account →</button></div><div className="mt-8 overflow-hidden rounded-2xl border border-slate-200"><div className="hidden grid-cols-[1.5fr_.7fr_.7fr_.7fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 md:grid"><div>Property</div><div>Opening bid</div><div>Auction</div><div>Source</div></div>{properties.slice(0, 6).map((property) => <div key={property.id} className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 md:grid-cols-[1.5fr_.7fr_.7fr_.7fr] md:items-center"><div><div className="text-sm font-black">{property.address}</div><div className="text-xs text-slate-500">{property.city}, {property.state} · {property.county} County</div></div><div className="text-sm font-bold">{currency(getListedBidAmount(property))}</div><div className="text-sm text-slate-600">{date(property.auctionDate)}</div><a href={property.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-black text-emerald-800">{property.source || 'Source record'} ↗</a></div>)}</div></div></section>

      <PricingSection onChoose={onChoosePlan} />
      <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs leading-5 text-slate-500">Tax Deed &amp; Lien Hunter is an auction-research workspace, not legal or financial advice. Verify every record with the government or authorized auction source before investing.</footer>
    </div>
  )
}
