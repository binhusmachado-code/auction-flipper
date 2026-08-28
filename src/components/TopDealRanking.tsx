import { AlertTriangle, ArrowUpRight, Calculator, CheckCircle2, ShieldCheck, Trophy } from 'lucide-react'
import type { Property } from '../types/property'
import type { RankedDealAnalysis, VerifiedOpportunity } from '../lib/propertyAnalysis'

interface Props {
  ranked: RankedDealAnalysis[]
  screened: VerifiedOpportunity[]
  properties: Property[]
  onOpen: (property: Property) => void
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not ready'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value)
}

export default function TopDealRanking({ ranked, screened, properties, onOpen }: Props) {
  const propertyById = new Map(properties.map((property) => [property.id, property]))
  const analyzedDeals = ranked
    .map((deal) => ({ deal, property: propertyById.get(deal.propertyId) }))
    .filter((item): item is { deal: RankedDealAnalysis; property: Property } => Boolean(item.property))
    .slice(0, 5)
  const screenedDeals = screened
    .map((screening) => ({ screening, property: propertyById.get(screening.propertyId) }))
    .filter((item): item is { screening: VerifiedOpportunity; property: Property } => Boolean(item.property))
    .slice(0, 5)
  const bestProperty = analyzedDeals[0]?.property ?? screenedDeals[0]?.property

  return (
    <section className="mb-8 border-y border-zinc-800 py-5" aria-labelledby="top-deals-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-400" /><h2 id="top-deals-title" className="text-lg font-black text-white">Best Opportunities Right Now</h2></div>
          <p className="mt-1 text-sm text-zinc-500">Completed analyses rank first. The automatic list uses only verified county facts and never calls the value spread profit.</p>
        </div>
        {bestProperty && <button type="button" onClick={() => onOpen(bestProperty)} className="flex w-fit items-center gap-2 text-left text-xs font-bold text-emerald-400 hover:text-emerald-300"><ShieldCheck className="h-4 w-4 flex-none" />Best current candidate: {bestProperty.address}<ArrowUpRight className="h-3.5 w-3.5" /></button>}
      </div>

      {analyzedDeals.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><h3 className="text-sm font-black text-white">Fully analyzed deals</h3></div>
          <p className="mt-1 text-xs text-zinc-500">These include saved resale evidence, repairs, title and lien costs, fees, holding costs, and the profit goal.</p>
          <ol className="mt-3 divide-y divide-zinc-800 border-y border-zinc-800">
            {analyzedDeals.map(({ deal, property }, index) => {
              const totalFees = deal.analysis.buyerPremium + deal.analysis.auctionFees + deal.analysis.closingCosts + deal.analysis.titleAndLienCosts
              return (
                <li key={deal.propertyId}>
                  <button type="button" onClick={() => onOpen(property)} className="grid w-full gap-3 py-4 text-left hover:bg-zinc-900/60 sm:grid-cols-[40px_minmax(180px,1.5fr)_repeat(4,minmax(90px,1fr))_28px] sm:items-center sm:px-2">
                    <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${index === 0 ? 'bg-emerald-400 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>#{index + 1}</span>
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
        </div>
      )}

      <div className="mt-5">
        <div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-amber-400" /><h3 className="text-sm font-black text-white">Top verified screening</h3></div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">Ranked by evidence completeness first, then official county value compared with the opening bid. County assessment is not resale value, and the difference shown is not profit.</p>
        {screenedDeals.length === 0 ? (
          <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-400" />
            <div><h4 className="text-sm font-bold text-zinc-200">No fully verifiable screening match</h4><p className="mt-1 text-xs leading-relaxed text-zinc-500">A property needs both an official opening bid and a verified county value before it can appear here.</p></div>
          </div>
        ) : (
          <ol className="mt-3 divide-y divide-zinc-800 border-y border-zinc-800">
            {screenedDeals.map(({ screening, property }, index) => (
              <li key={screening.propertyId}>
                <button type="button" onClick={() => onOpen(property)} className="grid w-full gap-3 py-4 text-left hover:bg-zinc-900/60 sm:grid-cols-[40px_minmax(200px,1.5fr)_repeat(4,minmax(100px,1fr))_28px] sm:items-center sm:px-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${index === 0 ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>#{index + 1}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{property.address}</span><span className="mt-0.5 block text-xs text-zinc-500">{property.county}, {property.state} · {property.propertyType}</span><span className="mt-1 block text-[11px] font-semibold text-amber-400">Not bid-ready: title, condition, resale value, repairs, and fees remain.</span></span>
                  <span><span className="block text-[10px] font-bold uppercase text-zinc-600">Opening bid</span><strong className="mt-1 block text-sm text-zinc-200">{money(screening.openingBid)}</strong></span>
                  <span><span className="block text-[10px] font-bold uppercase text-zinc-600">County value</span><strong className="mt-1 block text-sm text-zinc-200">{money(screening.countyValue)}</strong></span>
                  <span><span className="block text-[10px] font-bold uppercase text-zinc-600">Value spread</span><strong className="mt-1 block text-sm text-amber-400">{money(screening.screeningSpread)}</strong></span>
                  <span><span className="block text-[10px] font-bold uppercase text-zinc-600">Evidence</span><strong className="mt-1 block text-sm text-zinc-200">{screening.evidenceCount}/{screening.evidenceTotal}</strong></span>
                  <ArrowUpRight className="h-4 w-4 text-zinc-600" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
