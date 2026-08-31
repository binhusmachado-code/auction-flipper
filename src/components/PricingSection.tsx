import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { PLAN_DEFINITIONS } from '../lib/plans'
import type { BillingInterval, PlanTier } from '../types/product'

interface Props {
  currentTier?: PlanTier
  onChoose: (tier: PlanTier, interval: BillingInterval) => Promise<void> | void
  compact?: boolean
  onManageBilling?: () => Promise<void> | void
}

export default function PricingSection({ currentTier = 'free', onChoose, compact = false, onManageBilling }: Props) {
  const [interval, setInterval] = useState<BillingInterval>('month')
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null)

  const choose = async (tier: PlanTier) => {
    setLoadingTier(tier)
    try { await onChoose(tier, interval) } finally { setLoadingTier(null) }
  }

  return (
    <section id="pricing" className={compact ? 'py-8' : 'border-t border-slate-200 bg-slate-50 px-4 py-20 sm:px-6'} aria-labelledby="pricing-title">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Simple membership</div>
            <h2 id="pricing-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Research with a plan that fits.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Start free. Upgrade when you need complete records, alerts, exports, and a larger research pipeline.</p>
          </div>
          <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Billing interval">
            <button type="button" onClick={() => setInterval('month')} className={`rounded-lg px-4 py-2 text-sm font-bold ${interval === 'month' ? 'bg-emerald-800 text-white' : 'text-slate-600'}`}>Monthly</button>
            <button type="button" onClick={() => setInterval('year')} className={`rounded-lg px-4 py-2 text-sm font-bold ${interval === 'year' ? 'bg-emerald-800 text-white' : 'text-slate-600'}`}>Annual <span className="ml-1 text-[10px] opacity-80">2 months free</span></button>
          </div>
        </div>

        {onManageBilling && currentTier !== 'free' && <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"><span className="text-sm font-bold text-slate-700">Need to update payment details or cancel?</span><button type="button" onClick={() => void onManageBilling()} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700">Manage billing</button></div>}
        <div className="mt-9 grid gap-4 lg:grid-cols-3">
          {(Object.keys(PLAN_DEFINITIONS) as PlanTier[]).map((tier) => {
            const plan = PLAN_DEFINITIONS[tier]
            const active = tier === currentTier
            const price = interval === 'year' ? plan.annualMonthlyEquivalent : plan.monthlyPrice
            return (
              <article key={tier} className={`relative rounded-2xl border bg-white p-6 ${plan.recommended ? 'border-emerald-700 shadow-lg shadow-emerald-950/5' : 'border-slate-200 shadow-sm'}`}>
                {plan.recommended && <div className="absolute -top-3 left-6 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950">Best for most investors</div>}
                <h3 className="text-lg font-black text-slate-950">{plan.name}</h3>
                <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">{plan.description}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-black tracking-tight text-slate-950">${price % 1 ? price.toFixed(2) : price}</span>
                  <span className="pb-1 text-sm font-semibold text-slate-500">/month</span>
                </div>
                {interval === 'year' && tier !== 'free' && <p className="mt-1 text-xs font-semibold text-emerald-800">${plan.annualPrice} billed annually</p>}
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{feature}</li>)}
                </ul>
                <button type="button" disabled={active || loadingTier !== null} onClick={() => void choose(tier)} className={`mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black transition-colors disabled:cursor-default ${active ? 'border border-emerald-200 bg-emerald-50 text-emerald-800' : plan.recommended ? 'bg-emerald-800 text-white hover:bg-emerald-900' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}>
                  {loadingTier === tier && <Loader2 className="h-4 w-4 animate-spin" />}
                  {active ? 'Current plan' : tier === 'free' ? 'Start free' : `Choose ${plan.name}`}
                </button>
              </article>
            )
          })}
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">Auction data is a research aid, not legal, title, or investment advice. Always verify the official record before bidding.</p>
      </div>
    </section>
  )
}
