import { useState } from 'react'
import { AlertTriangle, Calculator, CheckCircle2, ExternalLink, Info, Save, X } from 'lucide-react'
import type { Property } from '../types/property'
import { analyzeTaxDeedScenario, type TaxDeedScenario } from '../lib/calculator'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useToast } from './ToastProvider'

interface Props {
  property: Property
  onClose: () => void
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Incomplete'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value)
}

const fieldClass = 'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix?: string }) {
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
          className={`${fieldClass} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-zinc-500">{suffix}</span>}
      </div>
    </label>
  )
}

export default function DealCalculator({ property, onClose }: Props) {
  const initial: TaxDeedScenario = {
    plannedBid: property.openingBid ?? property.price ?? 0,
    buyerPremiumRate: 0,
    auctionFees: 500,
    titleLegal: 5000,
    obligationsReserve: 5000,
    repairs: 0,
    holdingMonths: 6,
    monthlyHolding: 900,
    resaleValue: 0,
    resaleSource: '',
    sellingCostRate: 8,
    fixedExitCosts: 1500,
    targetProfit: 30000,
  }
  const [savedScenario, setSavedScenario] = useLocalStorage<TaxDeedScenario>(`tax-deed-scenario-${property.id}`, initial)
  const [scenario, setScenario] = useState<TaxDeedScenario>(savedScenario)
  const { showToast } = useToast()
  const analysis = analyzeTaxDeedScenario(scenario)
  const update = <K extends keyof TaxDeedScenario>(key: K, value: TaxDeedScenario[K]) => {
    setScenario((current) => ({ ...current, [key]: value }))
  }
  const save = () => {
    setSavedScenario(scenario)
    showToast('Scenario saved on this device', 'success')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-900/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><Calculator className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white">Maximum Bid Calculator</h2>
              <p className="truncate text-sm text-zinc-500">{property.address}, {property.city}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close calculator" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section aria-labelledby="calculator-inputs" className="space-y-5">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-relaxed text-zinc-300">
              <div className="mb-1 flex items-center gap-2 font-bold text-amber-400"><Info className="h-4 w-4" /> Scenario, not an appraisal</div>
              Opening bid is only a starting point. Enter your planned bid, independently researched resale value, and every expected cost. The auction deposit is part of the winning bid, so it is not added again.
            </div>

            <div>
              <h3 id="calculator-inputs" className="mb-3 text-sm font-bold text-zinc-200">Purchase and auction costs</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <NumberField label="Planned winning bid" value={scenario.plannedBid} onChange={(value) => update('plannedBid', value)} />
                <NumberField label="Buyer premium" value={scenario.buyerPremiumRate} onChange={(value) => update('buyerPremiumRate', value)} suffix="%" />
                <NumberField label="Auction, recording, wire fees" value={scenario.auctionFees} onChange={(value) => update('auctionFees', value)} />
                <NumberField label="Title search and legal allowance" value={scenario.titleLegal} onChange={(value) => update('titleLegal', value)} />
                <NumberField label="Liens and risk reserve" value={scenario.obligationsReserve} onChange={(value) => update('obligationsReserve', value)} />
                <NumberField label="Repairs and stabilization" value={scenario.repairs} onChange={(value) => update('repairs', value)} />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold text-zinc-200">Holding and exit assumptions</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <NumberField label="Holding period" value={scenario.holdingMonths} onChange={(value) => update('holdingMonths', value)} suffix="mo" />
                <NumberField label="Monthly holding costs" value={scenario.monthlyHolding} onChange={(value) => update('monthlyHolding', value)} />
                <NumberField label="Expected resale value" value={scenario.resaleValue} onChange={(value) => update('resaleValue', value)} />
                <NumberField label="Selling costs" value={scenario.sellingCostRate} onChange={(value) => update('sellingCostRate', value)} suffix="%" />
                <NumberField label="Fixed exit costs" value={scenario.fixedExitCosts} onChange={(value) => update('fixedExitCosts', value)} />
                <NumberField label="Target profit" value={scenario.targetProfit} onChange={(value) => update('targetProfit', value)} />
              </div>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-semibold text-zinc-400">Resale value source</span>
                <input value={scenario.resaleSource} onChange={(event) => update('resaleSource', event.target.value)} className={fieldClass} placeholder="Example: three nearby sold comparables, reviewed Aug. 21" />
              </label>
            </div>
          </section>

          <aside className="space-y-4">
            <div className={`rounded-lg border p-5 ${analysis.complete ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                {analysis.complete ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-amber-400" />}
                {analysis.complete ? 'Scenario calculated' : 'More research required'}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div><div className="text-xs text-zinc-500">Maximum bid</div><div className="mt-1 text-xl font-extrabold text-emerald-400 sm:text-2xl">{money(analysis.maximumBid)}</div></div>
                <div><div className="text-xs text-zinc-500">Estimated profit</div><div className={`mt-1 text-xl font-extrabold sm:text-2xl ${(analysis.projectedProfit ?? 0) >= 0 ? 'text-zinc-100' : 'text-red-400'}`}>{money(analysis.projectedProfit)}</div></div>
                <div><div className="text-xs text-zinc-500">Cash needed</div><div className="mt-1 text-lg font-bold text-zinc-200">{money(analysis.cashNeeded)}</div></div>
                <div><div className="text-xs text-zinc-500">Break-even resale</div><div className="mt-1 text-lg font-bold text-zinc-200">{money(analysis.breakEvenResale)}</div></div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <h3 className="text-sm font-bold text-zinc-200">Cost breakdown</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-zinc-500">Bid plus premium</dt><dd className="font-semibold text-zinc-300">{money(analysis.acquisitionCost)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-zinc-500">Non-bid costs</dt><dd className="font-semibold text-zinc-300">{money(analysis.nonBidCosts)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-zinc-500">Selling costs</dt><dd className="font-semibold text-zinc-300">{money(analysis.sellingCosts)}</dd></div>
                <div className="flex justify-between gap-4 border-t border-zinc-800 pt-2"><dt className="font-bold text-zinc-300">Total project cost</dt><dd className="font-bold text-white">{money(analysis.totalProjectCost)}</dd></div>
              </dl>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-200"><AlertTriangle className="h-4 w-4 text-amber-400" /> Research warnings</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
                {analysis.warnings.map((warning) => <li key={warning} className="flex gap-2"><span className="text-amber-400">•</span><span>{warning}</span></li>)}
                <li className="flex gap-2"><span className="text-amber-400">•</span><span>Confirm auction status, title, access, occupancy, zoning, flood risk, condition, and county payment deadlines before bidding.</span></li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={save} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400"><Save className="h-4 w-4" />Save scenario</button>
              <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-700">Official auction<ExternalLink className="h-4 w-4" /></a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
