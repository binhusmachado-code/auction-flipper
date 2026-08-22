import { ArrowUpRight, Calculator, ShieldCheck, Trophy } from 'lucide-react'
import type { Property } from '../types/property'
import type { RankedDealAnalysis } from '../lib/propertyAnalysis'

interface Props {
  ranked: RankedDealAnalysis[]
  properties: Property[]
  onOpen: (property: Property) => void
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not ready'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value)
}

export default function TopDealRanking({ ranked, properties, onOpen }: Props) {
  const propertyById = new Map(properties.map((property) => [property.id, property]))
  const topDeals = ranked
    .map((deal) => ({ deal, property: propertyById.get(deal.propertyId) }))
    .filter((item): item is { deal: RankedDealAnalysis; property: Property } => Boolean(item.property))
    .slice(0, 5)

  return (
    <section className="mb-8 border-y border-zinc-800 py-5" aria-labelledby="top-deals-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-400" /><h2 id="top-deals-title" className="text-lg font-black text-white">Top Analyzed Deals</h2></div>
          <p className="mt-1 text-sm text-zinc-500">Only completed analyses are ranked: grade first, then safety margin, then profit.</p>
        </div>
        {topDeals.length > 0 && <div className="flex items-center gap-2 text-xs font-bold text-emerald-400"><ShieldCheck className="h-4 w-4" />Best saved deal: {topDeals[0].property.address}</div>}
      </div>

      {topDeals.length === 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
          <Calculator className="mt-0.5 h-5 w-5 flex-none text-amber-400" />
          <div><h3 className="text-sm font-bold text-zinc-200">No honest ranking yet</h3><p className="mt-1 text-xs leading-relaxed text-zinc-500">Open a tax deed, enter the value source and every cost, finish the evidence checks, then save it. The site will not guess which property is best.</p></div>
        </div>
      ) : (
        <ol className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
          {topDeals.map(({ deal, property }, index) => {
            const totalFees = deal.analysis.buyerPremium + deal.analysis.auctionFees + deal.analysis.closingCosts + deal.analysis.titleAndLienCosts
            return (
              <li key={deal.propertyId}>
                <button type="button" onClick={() => onOpen(property)} className="grid w-full gap-3 py-4 text-left hover:bg-zinc-900/60 sm:grid-cols-[40px_minmax(180px,1.5fr)_repeat(4,minmax(90px,1fr))_28px] sm:items-center sm:px-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${index === 0 ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>#{index + 1}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{property.address}</span><span className="mt-0.5 block text-xs text-zinc-500">{property.county}, {property.state} · {deal.verdict.grade}</span></span>
                  <span><span className="block text-[10px] font-bold uppercase text-zinc-600">Max bid</span><strong className="mt-1 block text-sm text-emerald-400">{money(deal.analysis.maximumBid)}</strong></span>
                  <span><span className="block text-[10px] font-bold uppercase text-zinc-600">Profit</span><strong className="mt-1 block text-sm text-zinc-200">{money(deal.analysis.projectedProfit)}</strong></span>
                  <span><span className="block text-[10px] font-bold uppercase text-zinc-600">Repairs</span><strong className="mt-1 block text-sm text-zinc-200">{money(deal.analysis.repairs)}</strong></span>
                  <span><span className="block text-[10px] font-bold uppercase text-zinc-600">Fees + title</span><strong className="mt-1 block text-sm text-zinc-200">{money(totalFees)}</strong></span>
                  <ArrowUpRight className="h-4 w-4 text-zinc-600" />
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
