import { useState } from 'react'
import { AlertTriangle, Calculator, CheckCircle2, ChevronDown, ExternalLink, Save, X } from 'lucide-react'
import type { Property } from '../types/property'
import { analyzeTaxDeedScenario, type TaxDeedScenario } from '../lib/calculator'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useToast } from './ToastProvider'

interface Props {
  property: Property
  onClose: () => void
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Enter a resale value'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value)
}

const fieldClass = 'h-12 w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-8 pr-3 text-base font-bold text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'

function MoneyField({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block min-w-0">
      <span className="block text-sm font-bold text-zinc-200">{label}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{hint}</span>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-3 top-3 text-sm font-bold text-zinc-500">$</span>
        <input
          type="number"
          min="0"
          step="500"
          value={value || ''}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
          className={fieldClass}
        />
      </div>
    </label>
  )
}

function SmallNumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-zinc-400">{label}</span>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="any"
          value={value || ''}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
          className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 pr-11 text-sm text-zinc-100 outline-none focus:border-emerald-500"
        />
        <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-semibold text-zinc-500">{suffix}</span>
      </div>
    </label>
  )
}

export default function DealCalculator({ property, onClose }: Props) {
  const initial: TaxDeedScenario = {
    plannedBid: property.openingBid ?? property.price ?? 0,
    buyerPremiumRate: 0,
    otherCosts: 10_000,
    repairs: 0,
    holdingMonths: 6,
    monthlyHolding: 900,
    resaleValue: 0,
    resaleSource: '',
    sellingCostRate: 8,
    targetProfit: 30_000,
  }
  const [savedScenario, setSavedScenario] = useLocalStorage<TaxDeedScenario>(`simple-tax-deed-scenario-${property.id}`, initial)
  const [scenario, setScenario] = useState<TaxDeedScenario>(savedScenario)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { showToast } = useToast()
  const analysis = analyzeTaxDeedScenario(scenario)
  const update = <K extends keyof TaxDeedScenario>(key: K, value: TaxDeedScenario[K]) => {
    setScenario((current) => ({ ...current, [key]: value }))
  }
  const save = () => {
    setSavedScenario(scenario)
    showToast('Calculator saved on this device', 'success')
  }

  const maximumBid = analysis.maximumBid ?? 0
  const bidDifference = maximumBid - scenario.plannedBid
  const bidStatus = !analysis.complete
    ? 'Enter the resale value to get your limit'
    : bidDifference >= 0
      ? `Your bid is ${money(bidDifference)} below the limit`
      : `Your bid is ${money(Math.abs(bidDifference))} over the limit`

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-900/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><Calculator className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white">Simple Maximum Bid</h2>
              <p className="truncate text-sm text-zinc-500">{property.address}, {property.city}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close calculator" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid grid-cols-1 gap-7 p-4 sm:p-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section aria-labelledby="calculator-inputs">
            <div className="mb-5 flex items-start gap-3 border-b border-zinc-800 pb-5">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-400" />
              <p className="text-xs leading-relaxed text-zinc-400">Use a conservative resale value based on recent sold properties. This estimate does not replace title, lien, condition, or legal research.</p>
            </div>

            <h3 id="calculator-inputs" className="sr-only">Calculator inputs</h3>
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <MoneyField label="1. What could it sell for?" hint="Use recent nearby sold properties, not the assessed value." value={scenario.resaleValue} onChange={(value) => update('resaleValue', value)} />
              </div>
              <MoneyField label="2. Repairs" hint="Your best estimate to make it usable or sellable." value={scenario.repairs} onChange={(value) => update('repairs', value)} />
              <MoneyField label="3. Other costs + safety cushion" hint="Title, liens, legal, auction, closing, and surprises." value={scenario.otherCosts} onChange={(value) => update('otherCosts', value)} />
              <MoneyField label="4. Profit you want" hint="The minimum amount you want left after all costs." value={scenario.targetProfit} onChange={(value) => update('targetProfit', value)} />
              <MoneyField label="5. Your possible bid" hint="Start with the opening bid, then test a higher amount." value={scenario.plannedBid} onChange={(value) => update('plannedBid', value)} />
            </div>

            <button type="button" onClick={() => setShowAdvanced((current) => !current)} aria-expanded={showAdvanced} className="mt-6 flex w-full items-center justify-between border-y border-zinc-800 py-3 text-left text-sm font-bold text-zinc-300 hover:text-white">
              More options
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="grid gap-3 border-b border-zinc-800 py-4 sm:grid-cols-2">
                <SmallNumberField label="Buyer premium" value={scenario.buyerPremiumRate} onChange={(value) => update('buyerPremiumRate', value)} suffix="%" />
                <SmallNumberField label="Selling costs" value={scenario.sellingCostRate} onChange={(value) => update('sellingCostRate', value)} suffix="%" />
                <SmallNumberField label="Months you may hold it" value={scenario.holdingMonths} onChange={(value) => update('holdingMonths', value)} suffix="mo" />
                <SmallNumberField label="Cost per month" value={scenario.monthlyHolding} onChange={(value) => update('monthlyHolding', value)} suffix="$/mo" />
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-zinc-400">Where did the resale value come from?</span>
                  <input value={scenario.resaleSource} onChange={(event) => update('resaleSource', event.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" placeholder="Example: three nearby sold properties" />
                </label>
              </div>
            )}
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className={`rounded-lg border p-5 ${analysis.complete ? bidDifference >= 0 ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-red-500/35 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                {analysis.complete && bidDifference >= 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className={`h-5 w-5 ${analysis.complete ? 'text-red-400' : 'text-amber-400'}`} />}
                {bidStatus}
              </div>
              <div className="mt-6 text-xs font-bold uppercase text-zinc-500">Do not bid over</div>
              <div className={`mt-1 text-4xl font-extrabold ${analysis.complete ? 'text-emerald-400' : 'text-zinc-600'}`}>{money(analysis.maximumBid)}</div>
              {analysis.complete && (
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-800/80 pt-4">
                  <div><div className="text-xs text-zinc-500">Profit at your bid</div><div className={`mt-1 text-lg font-bold ${(analysis.projectedProfit ?? 0) >= scenario.targetProfit ? 'text-zinc-100' : 'text-red-400'}`}>{money(analysis.projectedProfit)}</div></div>
                  <div><div className="text-xs text-zinc-500">Cash needed</div><div className="mt-1 text-lg font-bold text-zinc-100">{money(analysis.cashNeeded)}</div></div>
                </div>
              )}
            </div>

            <div className="border-y border-zinc-800 py-4">
              <div className="flex justify-between gap-4 text-sm"><span className="text-zinc-500">Resale value</span><strong className="text-zinc-200">{money(scenario.resaleValue)}</strong></div>
              <div className="mt-2 flex justify-between gap-4 text-sm"><span className="text-zinc-500">Selling costs</span><strong className="text-zinc-300">-{money(analysis.sellingCosts)}</strong></div>
              <div className="mt-2 flex justify-between gap-4 text-sm"><span className="text-zinc-500">Repairs, other costs, holding</span><strong className="text-zinc-300">-{money(analysis.nonBidCosts)}</strong></div>
              <div className="mt-2 flex justify-between gap-4 text-sm"><span className="text-zinc-500">Profit reserved</span><strong className="text-zinc-300">-{money(scenario.targetProfit)}</strong></div>
              <p className="mt-4 text-xs leading-relaxed text-zinc-600">Default assumptions: {scenario.sellingCostRate}% selling costs and {scenario.holdingMonths} months at {money(scenario.monthlyHolding)} per month.</p>
            </div>

            {analysis.warnings.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-zinc-300">Double-check before bidding</h3>
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-zinc-500">
                  {analysis.warnings.map((warning) => <li key={warning} className="flex gap-2"><span className="text-amber-400">•</span><span>{warning}</span></li>)}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={save} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400"><Save className="h-4 w-4" />Save</button>
              <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm font-bold text-zinc-200 hover:bg-zinc-700">Official auction<ExternalLink className="h-4 w-4" /></a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
