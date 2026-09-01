import { useState } from 'react'
import {
  AlertTriangle,
  Calculator,
  Check,
  CheckCircle2,
  ExternalLink,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { Property } from '../types/property'
import { analyzeTaxDeedScenario, type TaxDeedScenario } from '../lib/calculator'
import {
  dealAnalysisStorageKey,
  getDealVerdict,
  type StoredDealAnalysis,
} from '../lib/propertyAnalysis'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useToast } from './ToastProvider'

interface Props {
  property: Property
  onClose: () => void
  onSaved?: (record: StoredDealAnalysis) => void
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not ready'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value)
}

function initialScenario(property: Property): TaxDeedScenario {
  return {
    plannedBid: (property.openingBid ?? 0) > 0 ? property.openingBid ?? 0 : Math.max(0, property.price),
    buyerPremiumRate: 0,
    auctionFees: 0,
    closingCosts: 0,
    titleAndLienCosts: 0,
    repairs: 0,
    contingency: 0,
    holdingMonths: 0,
    monthlyHolding: 0,
    resaleValue: 0,
    resaleSource: '',
    sellingCostRate: 0,
    targetProfit: 0,
    valueChecked: false,
    conditionChecked: false,
    titleChecked: false,
    feesChecked: false,
  }
}

const fieldClass = 'h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-8 pr-3 text-base font-bold text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'

function MoneyField({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block min-w-0">
      <span className="block text-sm font-bold text-zinc-200">{label}</span>
      <span className="mt-0.5 block min-h-8 text-xs leading-relaxed text-zinc-500">{hint}</span>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-3 top-2.5 text-sm font-bold text-zinc-500">$</span>
        <input
          type="number"
          min="0"
          step="100"
          value={value || ''}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
          className={fieldClass}
        />
      </div>
    </label>
  )
}

function NumberField({ label, hint, value, suffix, onChange }: { label: string; hint: string; value: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className="block min-w-0">
      <span className="block text-sm font-bold text-zinc-200">{label}</span>
      <span className="mt-0.5 block min-h-8 text-xs leading-relaxed text-zinc-500">{hint}</span>
      <div className="relative mt-2">
        <input
          type="number"
          min="0"
          step="any"
          value={value || ''}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
          className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 pr-14 text-base font-bold text-zinc-100 outline-none focus:border-emerald-500"
        />
        <span className="pointer-events-none absolute right-3 top-3 text-xs font-semibold text-zinc-500">{suffix}</span>
      </div>
    </label>
  )
}

function EvidenceCheck({ checked, title, detail, onChange }: { checked: boolean; title: string; detail: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer gap-3 border-b border-zinc-800 py-3 last:border-b-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 flex-none rounded border-zinc-600 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
      />
      <span>
        <span className="block text-sm font-bold text-zinc-200">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{detail}</span>
      </span>
    </label>
  )
}

export default function DealCalculator({ property, onClose, onSaved }: Props) {
  const initial = initialScenario(property)
  const [savedScenario, setSavedScenario] = useLocalStorage<TaxDeedScenario>(dealAnalysisStorageKey(property.id), initial)
  const [scenario, setScenario] = useState<TaxDeedScenario>({ ...initial, ...savedScenario })
  const { showToast } = useToast()
  const analysis = analyzeTaxDeedScenario(scenario)
  const verdict = getDealVerdict(analysis, scenario)
  const update = <K extends keyof TaxDeedScenario>(key: K, value: TaxDeedScenario[K]) => {
    setScenario((current) => ({ ...current, [key]: value }))
  }
  const save = () => {
    setSavedScenario(scenario)
    const record = {
      propertyId: property.id,
      address: property.address,
      scenario,
      savedAt: new Date().toISOString(),
    }
    onSaved?.(record)
    showToast(analysis.complete ? 'Analysis saved and added to the ranking' : 'Draft saved; finish the checks to rank this deal', analysis.complete ? 'success' : 'info')
  }

  const maximumBid = analysis.maximumBid ?? 0
  const bidDifference = maximumBid - scenario.plannedBid
  const totalFees = analysis.auctionFees + analysis.closingCosts + analysis.titleAndLienCosts
  const allCosts = analysis.totalProjectCost + analysis.sellingCosts
  const gradeClass = verdict.grade === 'Great'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
    : verdict.grade === 'Good'
      ? 'border-sky-500/40 bg-sky-500/10 text-sky-400'
      : verdict.grade === 'Bad'
        ? 'border-red-500/40 bg-red-500/10 text-red-400'
        : 'border-amber-500/40 bg-amber-500/10 text-amber-400'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="deal-calculator-title" className="max-h-[96vh] w-full max-w-6xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-900/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><Calculator className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h2 id="deal-calculator-title" className="text-lg font-bold text-white">Full Property Analysis</h2>
              <p className="truncate text-sm text-zinc-500">{property.address}, {property.city}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close calculator" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid grid-cols-1 gap-8 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="value-step">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-sm font-black text-zinc-950">1</span><div><h3 id="value-step" className="font-bold text-white">Value and possible bid</h3><p className="text-xs text-zinc-500">Use evidence you can show later.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <MoneyField label="Resale value" hint="Recent similar sold properties or an appraisal." value={scenario.resaleValue} onChange={(value) => update('resaleValue', value)} />
                <MoneyField label="Possible bid" hint="The amount you are considering, not the deposit." value={scenario.plannedBid} onChange={(value) => update('plannedBid', value)} />
                <MoneyField label="Profit you want" hint="The minimum money you want left after every cost." value={scenario.targetProfit} onChange={(value) => update('targetProfit', value)} />
              </div>
              <label className="mt-4 block">
                <span className="block text-sm font-bold text-zinc-200">Where did the resale value come from?</span>
                <span className="mt-0.5 block text-xs text-zinc-500">Example: three nearby sold properties and the dates they sold.</span>
                <input value={scenario.resaleSource} onChange={(event) => update('resaleSource', event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" placeholder="Write the source here" />
              </label>
            </section>

            <section aria-labelledby="cost-step" className="border-t border-zinc-800 pt-7">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-sm font-black text-zinc-950">2</span><div><h3 id="cost-step" className="font-bold text-white">Every known cost</h3><p className="text-xs text-zinc-500">Enter zero only when you checked and the cost is really zero.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MoneyField label="Repairs" hint="Written contractor estimate or careful condition estimate." value={scenario.repairs} onChange={(value) => update('repairs', value)} />
                <MoneyField label="Auction fees" hint="Buyer premium and fixed charges are separate below." value={scenario.auctionFees} onChange={(value) => update('auctionFees', value)} />
                <MoneyField label="Title and liens" hint="Title search, legal help, surviving liens, taxes, HOA, or utilities." value={scenario.titleAndLienCosts} onChange={(value) => update('titleAndLienCosts', value)} />
                <MoneyField label="Closing costs" hint="Deed, recording, transfer tax, insurance, and closing services." value={scenario.closingCosts} onChange={(value) => update('closingCosts', value)} />
                <MoneyField label="Safety cushion" hint="Extra money for surprises. Use your own researched amount." value={scenario.contingency} onChange={(value) => update('contingency', value)} />
                <NumberField label="Buyer premium" hint="Use the percentage in the official auction rules." value={scenario.buyerPremiumRate} suffix="%" onChange={(value) => update('buyerPremiumRate', value)} />
              </div>
            </section>

            <section aria-labelledby="time-step" className="border-t border-zinc-800 pt-7">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-sm font-black text-zinc-950">3</span><div><h3 id="time-step" className="font-bold text-white">Time and selling costs</h3><p className="text-xs text-zinc-500">Taxes, insurance, utilities, lawn care, financing, and selling expenses belong here.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <NumberField label="Months held" hint="How long until resale is finished." value={scenario.holdingMonths} suffix="months" onChange={(value) => update('holdingMonths', value)} />
                <MoneyField label="Cost each month" hint="Taxes, insurance, utilities, upkeep, and financing." value={scenario.monthlyHolding} onChange={(value) => update('monthlyHolding', value)} />
                <NumberField label="Selling costs" hint="Agent, seller closing costs, and concessions." value={scenario.sellingCostRate} suffix="%" onChange={(value) => update('sellingCostRate', value)} />
              </div>
            </section>

            <section aria-labelledby="proof-step" className="border-t border-zinc-800 pt-7">
              <div className="mb-2 flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-sm font-black text-zinc-950">4</span><div><h3 id="proof-step" className="font-bold text-white">Confirm your evidence</h3><p className="text-xs text-zinc-500">These checks unlock the grade and maximum bid.</p></div></div>
              <div>
                <EvidenceCheck checked={scenario.valueChecked} onChange={(value) => update('valueChecked', value)} title="I checked the resale value" detail="I recorded recent sold properties or an appraisal above." />
                <EvidenceCheck checked={scenario.conditionChecked} onChange={(value) => update('conditionChecked', value)} title="I checked condition and repairs" detail="I did not rely only on a map image or trespass on the property." />
                <EvidenceCheck checked={scenario.titleChecked} onChange={(value) => update('titleChecked', value)} title="I checked title and surviving liens" detail="I researched ownership, mortgages, taxes, code fines, HOA, utilities, and other claims." />
                <EvidenceCheck checked={scenario.feesChecked} onChange={(value) => update('feesChecked', value)} title="I checked official auction and closing fees" detail="I reviewed registration, deposits, buyer premium, payment deadline, deed, and recording charges." />
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <section className={`rounded-lg border p-5 ${gradeClass}`} aria-labelledby="deal-verdict">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-5 w-5" /><span id="deal-verdict">Deal grade</span></div>
                <span className="text-lg font-black">{verdict.grade}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-300">{verdict.summary}</p>
              <div className="mt-6 text-xs font-bold uppercase text-zinc-500">Do not bid over</div>
              <div className={`mt-1 text-4xl font-black ${analysis.complete ? 'text-white' : 'text-zinc-600'}`}>{money(analysis.maximumBid)}</div>
              {analysis.complete && (
                <p className={`mt-3 text-xs font-bold ${bidDifference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {bidDifference >= 0 ? `${money(bidDifference)} below your limit` : `${money(Math.abs(bidDifference))} above your limit`}
                </p>
              )}
            </section>

            <section className="border-y border-zinc-800 py-4" aria-labelledby="cost-breakdown">
              <h3 id="cost-breakdown" className="text-sm font-bold text-white">Simple cost breakdown</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-zinc-500">Possible bid</dt><dd className="font-bold text-zinc-200">{money(scenario.plannedBid)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-zinc-500">Buyer premium</dt><dd className="font-bold text-zinc-300">{money(analysis.buyerPremium)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-zinc-500">Auction, closing, title + liens</dt><dd className="font-bold text-zinc-300">{money(totalFees)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-zinc-500">Repairs</dt><dd className="font-bold text-zinc-300">{money(analysis.repairs)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-zinc-500">Safety cushion</dt><dd className="font-bold text-zinc-300">{money(analysis.contingency)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-zinc-500">Holding costs</dt><dd className="font-bold text-zinc-300">{money(analysis.holdingCosts)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-zinc-500">Selling costs</dt><dd className="font-bold text-zinc-300">{money(analysis.sellingCosts)}</dd></div>
                <div className="flex justify-between gap-4 border-t border-zinc-800 pt-3"><dt className="font-bold text-zinc-300">All costs</dt><dd className="font-black text-white">{money(allCosts)}</dd></div>
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                <div><div className="text-xs text-zinc-500">Approx. profit</div><div className={`mt-1 text-lg font-black ${analysis.complete ? 'text-emerald-400' : 'text-zinc-600'}`}>{money(analysis.projectedProfit)}</div></div>
                <div><div className="text-xs text-zinc-500">Return on cost</div><div className={`mt-1 text-lg font-black ${verdict.roi !== null ? 'text-zinc-100' : 'text-zinc-600'}`}>{verdict.roi === null ? 'Not ready' : `${verdict.roi.toFixed(1)}%`}</div></div>
              </div>
            </section>

            {analysis.warnings.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-300"><AlertTriangle className="h-4 w-4 text-amber-400" />Finish these items</h3>
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-zinc-500">
                  {analysis.warnings.map((warning) => <li key={warning} className="flex gap-2"><span className="text-amber-400">•</span><span>{warning}</span></li>)}
                </ul>
              </section>
            )}

            {analysis.complete && <div className="flex items-center gap-2 text-xs font-bold text-emerald-400"><CheckCircle2 className="h-4 w-4" />All required evidence checks are complete.</div>}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={save} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400"><Save className="h-4 w-4" />Save analysis</button>
              <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm font-bold text-zinc-200 hover:bg-zinc-700">Open source record<ExternalLink className="h-4 w-4" /></a>
            </div>
            <p className="flex gap-2 text-xs leading-relaxed text-zinc-600"><Check className="mt-0.5 h-3.5 w-3.5 flex-none" />The calculator uses only the numbers and confirmations entered here. It does not invent repairs, fees, value, or title results.</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
