import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Bath, BedDouble, CalendarDays, FileText, Heart, House, MapPin, Ruler, ShieldAlert, Trophy } from 'lucide-react'
import type { Property } from '../types/property'
import { analyzeTaxDeedScenario } from '../lib/calculator'
import { getDealVerdict, type StoredDealAnalysis } from '../lib/propertyAnalysis'
import PropertyMedia from './PropertyMedia'

interface Props { property: Property; onSelect: (p: Property) => void; onToggleFavorite: (id: string) => void; isFavorite: boolean; savedAnalysis?: StoredDealAnalysis; rank?: number; screeningRank?: number }

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value?: string) {
  if (!value) return 'Date TBD'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function saleTypeStyle(saleType: string) {
  if (saleType === 'Tax Deed') return 'bg-emerald-700 text-white'
  if (saleType === 'Tax Lien') return 'bg-teal-700 text-white'
  return 'bg-sky-700 text-white'
}

export default function PropertyCard({ property, onSelect, onToggleFavorite, isFavorite, savedAnalysis, rank, screeningRank }: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.disconnect() }
    }, { threshold: 0.1, rootMargin: '40px' })
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  const analysis = savedAnalysis ? analyzeTaxDeedScenario(savedAnalysis.scenario) : null
  const verdict = analysis && savedAnalysis ? getDealVerdict(analysis, savedAnalysis.scenario) : null
  const saleType = property.saleType ?? property.auctionType
  const listedAmount = property.openingBid || property.price

  return (
    <article ref={cardRef} className={`group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-700/30 hover:shadow-xl hover:shadow-slate-900/10 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
      <div className="relative">
        <PropertyMedia property={property} />
        <div className={`absolute left-3 top-3 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide shadow-sm ${saleTypeStyle(saleType)}`}>{saleType}</div>
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-amber-200 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-950 shadow-sm"><CalendarDays className="h-3.5 w-3.5" />{formatDate(property.auctionDate)}</div>
        <button type="button" aria-label={isFavorite ? `Remove ${property.address} from saved properties` : `Save ${property.address}`} onClick={(event) => { event.stopPropagation(); onToggleFavorite(property.id) }} className={`absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full border bg-white shadow-md transition-colors ${isFavorite ? 'border-emerald-700 text-emerald-700' : 'border-slate-200 text-slate-500 hover:text-emerald-700'}`}><Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} /></button>
        {(rank || screeningRank) && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[10px] font-extrabold text-slate-800 shadow-sm"><Trophy className="h-3 w-3 text-amber-600" />{rank ? `Analyzed #${rank}` : `Screen #${screeningRank}`}</span>}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-extrabold leading-tight text-slate-950">{property.address}</h3>
            <div className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700" /><span className="truncate">{property.city}, {property.state} {property.zip}</span></div>
          </div>
          <div className="shrink-0 text-right"><div className="text-[11px] font-semibold text-slate-500">{property.saleType === 'Tax Lien' ? 'Tax owed' : 'Opening bid'}</div><div className="text-xl font-black text-emerald-800">{listedAmount > 0 ? formatCurrency(listedAmount) : 'Not posted'}</div></div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-y border-slate-100 py-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-slate-400" /><span className="truncate">{property.parcelId || 'Parcel not posted'}</span></div>
          <div className="text-right"><span className="text-slate-400">Assessed </span><strong className="text-slate-700">{property.valuationVerified && property.assessedValue > 0 ? formatCurrency(property.assessedValue) : 'Not verified'}</strong></div>
          {property.propertyType === 'Land' ? <div className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" />{property.lotSize ? `${property.lotSize.toLocaleString()} acre lot` : 'Land'}</div> : <>
            {property.beds > 0 && <div className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{property.beds} beds</div>}
            {property.baths > 0 && <div className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{property.baths} baths</div>}
            {property.sqft > 0 && <div className="flex items-center gap-1.5"><House className="h-3.5 w-3.5" />{property.sqft.toLocaleString()} sqft</div>}
          </>}
        </div>

        <div className="mt-3 flex min-h-7 items-center justify-between gap-3">
          {analysis?.complete && verdict ? <div className="text-xs font-bold text-slate-700">{verdict.grade} analysis · projected profit {formatCurrency(analysis.projectedProfit ?? 0)}</div> : <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700"><ShieldAlert className="h-4 w-4" />Needs due diligence</div>}
          <span className="truncate text-[11px] text-slate-400">{property.source}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onSelect(property)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-extrabold text-white transition-colors hover:bg-emerald-700">Review property <ArrowUpRight className="h-4 w-4" /></button>
          <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-emerald-700 hover:text-emerald-800">Official auction <ArrowUpRight className="h-4 w-4" /></a>
        </div>
      </div>
    </article>
  )
}
