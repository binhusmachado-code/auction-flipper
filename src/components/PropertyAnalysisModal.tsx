import {
  AlertTriangle,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  CircleX,
  Lightbulb,
  ListChecks,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import type { Property } from '../types/property'
import { analyzeTaxDeedScenario } from '../lib/calculator'
import {
  getBidTips,
  getDealVerdict,
  getDueDiligenceItems,
  getPropertyProsAndCons,
  type StoredDealAnalysis,
  type VerifiedOpportunity,
} from '../lib/propertyAnalysis'

interface Props {
  property: Property
  savedAnalysis?: StoredDealAnalysis
  rank?: number
  screening?: VerifiedOpportunity
  screeningRank?: number
  onClose: () => void
  onOpenCalculator: () => void
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Not ready'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value)
}

export default function PropertyAnalysisModal({ property, savedAnalysis, rank, screening, screeningRank, onClose, onOpenCalculator }: Props) {
  const analysis = savedAnalysis ? analyzeTaxDeedScenario(savedAnalysis.scenario) : null
  const verdict = analysis && savedAnalysis
    ? getDealVerdict(analysis, savedAnalysis.scenario)
    : { grade: 'Not ready' as const, summary: 'Finish the evidence checks before trusting a grade.', roi: null }
  const { pros, cons } = getPropertyProsAndCons(property)
  const diligence = getDueDiligenceItems(property)
  const tips = getBidTips(property, analysis?.maximumBid ?? null)
  const totalFees = analysis
    ? analysis.auctionFees + analysis.closingCosts + analysis.titleAndLienCosts + analysis.buyerPremium
    : null
  const gradeClass = verdict.grade === 'Great'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
    : verdict.grade === 'Good'
      ? 'border-sky-500/40 bg-sky-500/10 text-sky-400'
      : verdict.grade === 'Bad'
        ? 'border-red-500/40 bg-red-500/10 text-red-400'
        : 'border-amber-500/40 bg-amber-500/10 text-amber-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="property-analysis-title" className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-900/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="property-analysis-title" className="text-lg font-black text-white">Full Property Analysis</h2>
              {rank && <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-black text-emerald-400">Rank #{rank}</span>}
              {!rank && screeningRank && <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-black text-amber-400">Screen #{screeningRank}</span>}
            </div>
            <p className="mt-1 truncate text-sm text-zinc-500">{property.address}, {property.city}, {property.state}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close property analysis" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-8 p-4 sm:p-6">
          <section className={`rounded-lg border p-4 ${gradeClass}`} aria-labelledby="plain-verdict">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-5 w-5" /><span id="plain-verdict">Simple answer</span></div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">{verdict.summary}</p>
              </div>
              <div className="text-2xl font-black">{verdict.grade}</div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Property analysis totals">
            <div className="border-b border-zinc-800 pb-3"><div className="text-[11px] font-bold uppercase text-zinc-500">Listed amount</div><div className="mt-1 text-xl font-black text-white">{property.price > 0 ? money(property.price) : 'Not posted'}</div></div>
            <div className="border-b border-zinc-800 pb-3"><div className="text-[11px] font-bold uppercase text-zinc-500">Verified county value</div><div className="mt-1 text-xl font-black text-white">{property.valuationVerified && (property.estimatedValue > 0 || property.assessedValue > 0) ? money(property.estimatedValue || property.assessedValue) : 'Not verified'}</div></div>
            <div className="border-b border-zinc-800 pb-3"><div className="text-[11px] font-bold uppercase text-zinc-500">Maximum bid</div><div className="mt-1 text-xl font-black text-emerald-400">{property.saleType === 'Tax Lien' ? 'Not a deed bid' : money(analysis?.maximumBid)}</div></div>
            <div className="border-b border-zinc-800 pb-3"><div className="text-[11px] font-bold uppercase text-zinc-500">Approx. profit</div><div className="mt-1 text-xl font-black text-emerald-400">{property.saleType === 'Tax Lien' ? 'Rate not verified' : money(analysis?.projectedProfit)}</div></div>
          </section>

          {screening && (
            <section className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4" aria-labelledby="screening-reason">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-amber-400" />
                <div className="min-w-0 flex-1">
                  <h3 id="screening-reason" className="font-bold text-amber-400">Why this property is automatically ranked</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-300">It has an official opening bid, a county-sourced assessed value, and {screening.evidenceCount} of {screening.evidenceTotal} screening facts available. The value difference below is not profit and does not make the property bid-ready.</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div><dt className="text-[10px] font-bold uppercase text-zinc-600">Opening bid</dt><dd className="mt-1 text-sm font-black text-white">{money(screening.openingBid)}</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase text-zinc-600">County value</dt><dd className="mt-1 text-sm font-black text-white">{money(screening.countyValue)}</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase text-zinc-600">Value spread</dt><dd className="mt-1 text-sm font-black text-amber-400">{money(screening.screeningSpread)}</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase text-zinc-600">Value / bid</dt><dd className="mt-1 text-sm font-black text-zinc-200">{screening.valueToBidRatio.toFixed(1)}x</dd></div>
                  </dl>
                  <ul className="mt-4 space-y-2 text-xs leading-relaxed text-zinc-500">
                    {screening.cautions.map((caution) => <li key={caution} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-400" />{caution}</li>)}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {analysis?.complete && savedAnalysis && (
            <section className="border-y border-zinc-800 py-5" aria-labelledby="saved-numbers">
              <div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-emerald-400" /><h3 id="saved-numbers" className="font-bold text-white">Your saved numbers</h3></div>
              <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Possible bid</dt><dd className="font-bold text-zinc-200">{money(savedAnalysis.scenario.plannedBid)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Repairs</dt><dd className="font-bold text-zinc-200">{money(analysis.repairs)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Fees, closing, title + liens</dt><dd className="font-bold text-zinc-200">{money(totalFees)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Safety cushion</dt><dd className="font-bold text-zinc-200">{money(analysis.contingency)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Holding costs</dt><dd className="font-bold text-zinc-200">{money(analysis.holdingCosts)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Selling costs</dt><dd className="font-bold text-zinc-200">{money(analysis.sellingCosts)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">All project costs</dt><dd className="font-black text-white">{money(analysis.totalProjectCost + analysis.sellingCosts)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Profit goal</dt><dd className="font-bold text-zinc-200">{money(savedAnalysis.scenario.targetProfit)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500">Safety margin</dt><dd className="font-bold text-zinc-200">{analysis.marginOfSafety === null ? 'Not ready' : `${analysis.marginOfSafety.toFixed(1)}%`}</dd></div>
              </dl>
            </section>
          )}

          <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4" aria-labelledby="diligence-meaning">
            <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-400" /><div><h3 id="diligence-meaning" className="font-bold text-amber-400">What “Needs due diligence” means</h3><p className="mt-1 text-sm leading-relaxed text-zinc-300">It means important facts are still missing. It does not mean the property is bad. It means you should not trust a profit, grade, or maximum bid until you check the items below.</p></div></div>
          </section>

          <section aria-labelledby="check-before-bid">
            <div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-amber-400" /><h3 id="check-before-bid" className="text-lg font-black text-white">Check before you bid</h3></div>
            <div className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
              {diligence.map((item, index) => (
                <div key={item.title} className="grid gap-2 py-4 sm:grid-cols-[32px_200px_1fr] sm:items-start">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-zinc-800 text-xs font-black text-zinc-300">{index + 1}</span>
                  <h4 className="text-sm font-bold text-zinc-200">{item.title}</h4>
                  <p className="text-xs leading-relaxed text-zinc-500">{item.explanation}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2" aria-label="Property pros and cons">
            <div>
              <div className="flex items-center gap-2"><ThumbsUp className="h-5 w-5 text-emerald-400" /><h3 className="font-black text-white">Pros</h3></div>
              <ul className="mt-3 space-y-3">
                {pros.length > 0 ? pros.map((item) => <li key={item} className="flex gap-2 text-sm leading-relaxed text-zinc-400"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-400" />{item}</li>) : <li className="text-sm text-zinc-500">No verified advantage is strong enough to list yet.</li>}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2"><ThumbsDown className="h-5 w-5 text-red-400" /><h3 className="font-black text-white">Cons and unknowns</h3></div>
              <ul className="mt-3 space-y-3">
                {cons.map((item) => <li key={item} className="flex gap-2 text-sm leading-relaxed text-zinc-400"><CircleX className="mt-0.5 h-4 w-4 flex-none text-red-400" />{item}</li>)}
              </ul>
            </div>
          </section>

          <section className="border-t border-zinc-800 pt-6" aria-labelledby="bid-tips">
            <div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-sky-400" /><h3 id="bid-tips" className="font-black text-white">Bid tips</h3></div>
            <ol className="mt-3 space-y-3">
              {tips.map((tip, index) => <li key={tip} className="flex gap-3 text-sm leading-relaxed text-zinc-400"><span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-sky-500/10 text-xs font-black text-sky-400">{index + 1}</span>{tip}</li>)}
            </ol>
          </section>

          {property.description && <p className="border-t border-zinc-800 pt-5 text-xs leading-relaxed text-zinc-500">{property.description}</p>}

          <div className="grid gap-2 sm:grid-cols-2">
            {property.saleType === 'Tax Deed' && <button type="button" onClick={onOpenCalculator} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400"><Calculator className="h-4 w-4" />{analysis?.complete ? 'Update full analysis' : 'Start full analysis'}</button>}
            <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm font-bold text-zinc-200 hover:bg-zinc-700">Open official source<ArrowUpRight className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </div>
  )
}
