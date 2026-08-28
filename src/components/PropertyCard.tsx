import { useState, useRef, useEffect } from 'react'
import { MapPin, Heart, ArrowUpRight, Tag, Percent, Clock, DollarSign, FileText, Building, ShieldAlert, Trophy } from 'lucide-react'
import { Property } from '../types/property'
import { analyzeTaxDeedScenario } from '../lib/calculator'
import { getDealVerdict, type StoredDealAnalysis } from '../lib/propertyAnalysis'
import PropertyMedia from './PropertyMedia'

interface Props {
  property: Property
  onSelect: (p: Property) => void
  onToggleFavorite: (id: string) => void
  isFavorite: boolean
  savedAnalysis?: StoredDealAnalysis
  rank?: number
  screeningRank?: number
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function getSaleTypeColor(saleType: string) {
  if (saleType === 'Tax Lien') return 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
  if (saleType === 'Tax Deed') return 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
  return 'bg-sky-500/10 text-sky-400 ring-sky-500/20'
}

export default function PropertyCard({ property, onSelect, onToggleFavorite, isFavorite, savedAnalysis, rank, screeningRank }: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '40px' }
    )
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  const analysis = savedAnalysis ? analyzeTaxDeedScenario(savedAnalysis.scenario) : null
  const verdict = analysis && savedAnalysis ? getDealVerdict(analysis, savedAnalysis.scenario) : null
  const displaySaleType = property.saleType ?? property.auctionType

  return (
    <div
      ref={cardRef}
      className={`group transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl overflow-hidden hover:border-zinc-700/80 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-800/60">
          <div className="flex min-w-0 items-center gap-2">
            {rank && <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-[10px] font-black text-zinc-950"><Trophy className="h-3 w-3" />#{rank}</span>}
            {!rank && screeningRank && <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-400"><Trophy className="h-3 w-3" />Screen #{screeningRank}</span>}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full ring-1 ${getSaleTypeColor(displaySaleType)}`}>
              <Tag className="w-3 h-3" />
              {displaySaleType}
            </span>
            <span className="truncate text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              {property.source}
            </span>
          </div>
          <button
            aria-label={isFavorite ? `Remove ${property.address} from saved properties` : `Save ${property.address}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(property.id)
            }}
            className={`p-2 rounded-full transition-all duration-300 ${
              isFavorite
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-emerald-400' : ''}`} />
          </button>
        </div>

        <PropertyMedia property={property} />

        {/* Main content */}
        <div className="p-5">
          {/* Address */}
          <div className="mb-4">
            <h3 className="font-bold text-zinc-100 text-[15px] leading-snug">
              {property.address}
            </h3>
            <div className="flex items-center gap-1 text-sm text-zinc-500 mt-1">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{property.city}, {property.state} {property.zip}</span>
            </div>
            {property.parcelId && (
              <div className="flex items-center gap-1 text-xs text-zinc-600 mt-1">
                <FileText className="w-3 h-3" />
                <span>Parcel: {property.parcelId}</span>
              </div>
            )}
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/40">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                <DollarSign className="w-3 h-3" />
                {property.saleType === 'Tax Lien' ? 'Tax Owed' : 'Opening Bid'}
              </div>
              <div className="text-lg font-bold text-emerald-400">
                {property.price > 0 ? formatCurrency(property.price) : 'Not posted'}
              </div>
            </div>
            <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/40">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                <Percent className="w-3 h-3" />
                {property.saleType === 'Tax Lien'
                  ? 'Interest Rate'
                  : property.depositRequired === 0 ? 'Payment Rule' : 'Est. Min. Deposit'}
              </div>
              <div className="text-lg font-bold text-emerald-400">
                {property.saleType === 'Tax Lien'
                  ? property.interestRate > 0 ? `${property.interestRate}%` : 'Verify rate'
                  : property.depositRequired === 0
                    ? 'Full payment'
                    : property.depositRequired !== undefined
                    ? formatCurrency(property.depositRequired)
                    : 'Verify rules'}
              </div>
            </div>
            <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/40">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                <Clock className="w-3 h-3" />
                {property.saleType === 'Tax Lien' ? 'Redemption' : 'Auction Date'}
              </div>
              <div className="text-lg font-bold text-zinc-200">
                {property.saleType === 'Tax Lien'
                  ? property.redemptionPeriod > 0 ? `${property.redemptionPeriod} mo` : 'Verify rules'
                  : (property.auctionDate || 'TBD')}
              </div>
            </div>
            <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/40">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                <Building className="w-3 h-3" />
                Assessed Value
              </div>
              <div className="text-lg font-bold text-zinc-200">
                {property.valuationVerified && property.assessedValue > 0 ? formatCurrency(property.assessedValue) : 'Not verified'}
              </div>
            </div>
          </div>

          {/* Deal summary */}
          <div className="mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              {analysis?.complete && verdict ? (
                <>
                  <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${verdict.grade === 'Great' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : verdict.grade === 'Good' ? 'border-sky-500/30 bg-sky-500/10 text-sky-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                    {verdict.grade} deal
                  </span>
                  <span className="text-xs font-bold text-zinc-300">Approx. profit {formatCurrency(analysis.projectedProfit ?? 0)}</span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5" />Needs due diligence
                </span>
              )}
              {property.delinquentYears > 0 && (
                <span className="text-xs text-zinc-500">
                  {property.delinquentYears}yr delinquent
                </span>
              )}
            </div>
            {analysis?.complete ? (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                <span>Max bid <strong className="text-zinc-300">{formatCurrency(analysis.maximumBid ?? 0)}</strong></span>
                <span>Repairs <strong className="text-zinc-300">{formatCurrency(analysis.repairs)}</strong></span>
                <span>All costs <strong className="text-zinc-300">{formatCurrency(analysis.totalProjectCost + analysis.sellingCosts)}</strong></span>
              </div>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                {property.saleType === 'Tax Lien'
                  ? 'Check certificate availability, rate, redemption rules, title, and payoff.'
                  : 'Check value, title and liens, condition, repairs, fees, occupancy, and auction rules.'}
              </p>
            )}
            {property.waterDebtOnly === 'YES' && (
              <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                Water Debt Only
              </span>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <p className="text-xs text-zinc-500 leading-relaxed mb-4 line-clamp-2">
              {property.description}
            </p>
          )}

          {/* CTA */}
          <div className="flex gap-2">
            <button
              onClick={() => onSelect(property)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold rounded-xl transition-all duration-300 active:scale-[0.98] group/btn"
            >
              Full analysis
              <span className="transition-transform duration-300 group-hover/btn:translate-x-0.5">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </button>
            <a
              href={property.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold rounded-xl transition-all duration-300 active:scale-[0.98]"
            >
              Official Auction
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
