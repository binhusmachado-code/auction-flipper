import { useState, useRef, useEffect } from 'react'
import { MapPin, Heart, ArrowUpRight, Tag, Percent, Clock, DollarSign, FileText, Building, Sparkles, ShoppingCart } from 'lucide-react'
import { Property } from '../types/property'
import { dealProfit, dealScore, isProfitable } from '../lib/deal'

interface Props {
  property: Property
  onSelect: (p: Property) => void
  onToggleFavorite: (id: string) => void
  onBuy: (p: Property) => void
  isFavorite: boolean
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

export default function PropertyCard({ property, onSelect, onToggleFavorite, onBuy, isFavorite }: Props) {
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

  const discountPct = property.assessedValue > 0
    ? Math.round((1 - property.price / property.assessedValue) * 100)
    : 0

  const profit = dealProfit(property)
  const score = dealScore(property)
  const profitable = isProfitable(property)
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
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full ring-1 ${getSaleTypeColor(displaySaleType)}`}>
              <Tag className="w-3 h-3" />
              {displaySaleType}
            </span>
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
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
                {formatCurrency(property.price)}
              </div>
            </div>
            <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/40">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                <Percent className="w-3 h-3" />
                {property.saleType === 'Tax Lien' ? 'Interest Rate' : 'Opening Bid'}
              </div>
              <div className="text-lg font-bold text-emerald-400">
                {property.saleType === 'Tax Lien' ? `${property.interestRate}%` : formatCurrency(property.openingBid ?? property.price)}
              </div>
            </div>
            <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/40">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                <Clock className="w-3 h-3" />
                {property.saleType === 'Tax Lien' ? 'Redemption' : 'Auction Date'}
              </div>
              <div className="text-lg font-bold text-zinc-200">
                {property.saleType === 'Tax Lien' ? `${property.redemptionPeriod} mo` : (property.auctionDate || 'TBD')}
              </div>
            </div>
            <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/40">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                <Building className="w-3 h-3" />
                Assessed Value
              </div>
              <div className="text-lg font-bold text-zinc-200">
                {formatCurrency(property.assessedValue)}
              </div>
            </div>
          </div>

          {/* Deal summary */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              {property.valuationVerified === false ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20">
                  Needs due diligence
                </span>
              ) : profitable ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />
                  Est. Profit {formatCurrency(profit)}
                </span>
              ) : (
                discountPct > 0 && (
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">
                    {discountPct}% Below Market
                  </span>
                )
              )}
              {profitable && score > 0 && (
                <span className="text-xs" title={`Deal score ${score}/5`}>
                  {'⭐'.repeat(score)}
                </span>
              )}
              {property.delinquentYears > 0 && (
                <span className="text-xs text-zinc-500">
                  {property.delinquentYears}yr delinquent
                </span>
              )}
            </div>
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
              Analyze
              <span className="transition-transform duration-300 group-hover/btn:translate-x-0.5">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </button>
            {property.valuationVerified === false ? (
              <a
                href={property.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold rounded-xl transition-all duration-300 active:scale-[0.98]"
              >
                Official Auction
                <ArrowUpRight className="w-4 h-4" />
              </a>
            ) : (
              <button
                onClick={() => onBuy(property)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold rounded-xl transition-all duration-300 active:scale-[0.98]"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy — Easy Steps
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
