import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Calculator, Check, CircleDollarSign, ExternalLink, Gavel, Landmark, Loader2, MapPin, ReceiptText, Search, ShieldCheck, UserCheck, WalletCards } from 'lucide-react'
import type { Property } from '../types/property'
import type { BidStepKey, BidWorkflow, BidWorkflowStatus } from '../types/bid'
import { calculateBidReadiness, getBidRules } from '../lib/bidRules'
import { useBidWorkflows } from '../hooks/useBidWorkflows'
import { useToast } from './ToastProvider'

interface Props {
  userId: string
  properties: Property[]
  favoriteIds: string[]
  onOpenGuide: () => void
  onOpenCalculator: (property: Property) => void
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not set'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function shortDate(value?: string) {
  if (!value) return 'Date pending'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

const blankWorkflow = (userId: string, propertyId: string): BidWorkflow => ({
  userId,
  propertyId,
  status: 'researching',
  maxBid: null,
  estimatedDeposit: null,
  completedSteps: {},
  officialBidReference: '',
  paymentDeadline: null,
  paymentConfirmation: '',
})

const purchaseJourney = [
  { label: 'Research', icon: Search, color: 'text-sky-400' },
  { label: 'Register', icon: UserCheck, color: 'text-violet-400' },
  { label: 'Fund', icon: WalletCards, color: 'text-amber-400' },
  { label: 'Bid', icon: Gavel, color: 'text-rose-400' },
  { label: 'Pay', icon: ReceiptText, color: 'text-emerald-400' },
]

export default function BidCenter({ userId, properties, favoriteIds, onOpenGuide, onOpenCalculator }: Props) {
  const { showToast } = useToast()
  const eligibleProperties = useMemo(() => properties
    .filter((property) => property.saleType === 'Tax Deed' || property.saleType === 'Tax Lien')
    .sort((a, b) => Number(favoriteIds.includes(b.id)) - Number(favoriteIds.includes(a.id))), [favoriteIds, properties])
  const [propertyId, setPropertyId] = useState(eligibleProperties[0]?.id ?? '')
  const property = eligibleProperties.find((item) => item.id === propertyId) ?? eligibleProperties[0]
  const { workflows, loading, save } = useBidWorkflows(userId, true)
  const workflow = property ? workflows[property.id] ?? blankWorkflow(userId, property.id) : null
  const [maxBid, setMaxBid] = useState('')
  const [reference, setReference] = useState('')
  const [paymentDeadline, setPaymentDeadline] = useState('')
  const [paymentConfirmation, setPaymentConfirmation] = useState('')
  const [working, setWorking] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setMaxBid(workflow?.maxBid ? String(workflow.maxBid) : '')
    setReference(workflow?.officialBidReference ?? '')
    setPaymentDeadline(workflow?.paymentDeadline?.slice(0, 16) ?? '')
    setPaymentConfirmation(workflow?.paymentConfirmation ?? '')
  }, [propertyId, workflow?.maxBid, workflow?.officialBidReference, workflow?.paymentDeadline, workflow?.paymentConfirmation])

  useEffect(() => { setImageFailed(false) }, [propertyId])

  if (!property || !workflow) {
    return <div className="mx-auto max-w-3xl py-16 text-center"><Gavel className="mx-auto h-8 w-8 text-zinc-600" /><h3 className="mt-4 text-xl font-extrabold text-white">No active auction properties</h3><p className="mt-2 text-sm text-zinc-500">A bid workspace will appear when an official property is available.</p></div>
  }

  const rules = getBidRules(property)
  const readiness = calculateBidReadiness(workflow.completedSteps)
  const maxBidNumber = Number(maxBid) > 0 ? Number(maxBid) : null
  const depositEstimate = maxBidNumber === null ? workflow.estimatedDeposit : rules.depositEstimate(maxBidNumber)

  const persist = async (patch: Partial<BidWorkflow>, successMessage?: string) => {
    setWorking(true)
    try {
      await save(property, patch)
      if (successMessage) showToast(successMessage, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Progress could not be saved', 'error')
    } finally {
      setWorking(false)
    }
  }

  const toggleStep = (step: BidStepKey) => {
    const completedSteps = { ...workflow.completedSteps, [step]: !workflow.completedSteps[step] }
    const nextReadiness = calculateBidReadiness(completedSteps)
    void persist({ completedSteps, status: nextReadiness.ready ? 'ready' : 'researching' })
  }

  const saveLimit = () => {
    if (!maxBidNumber) {
      showToast('Enter a maximum bid greater than zero', 'error')
      return
    }
    const completedSteps = { ...workflow.completedSteps, max_bid: true }
    const nextReadiness = calculateBidReadiness(completedSteps)
    void persist({ maxBid: maxBidNumber, estimatedDeposit: depositEstimate, completedSteps, status: nextReadiness.ready ? 'ready' : 'researching' }, 'Maximum bid saved')
  }

  const setOutcome = (status: BidWorkflowStatus) => {
    const completedSteps = status === 'won' || status === 'lost'
      ? { ...workflow.completedSteps, official_bid: true }
      : workflow.completedSteps
    void persist({ status, completedSteps, officialBidReference: reference }, status === 'won' ? 'Winning bid recorded' : 'Auction result recorded')
  }

  const markPaid = () => {
    if (!paymentConfirmation.trim()) {
      showToast('Enter the county or auction-provider payment confirmation', 'error')
      return
    }
    void persist({
      status: 'paid',
      paymentDeadline: paymentDeadline ? new Date(paymentDeadline).toISOString() : null,
      paymentConfirmation: paymentConfirmation.trim(),
      completedSteps: { ...workflow.completedSteps, final_payment: true },
    }, 'Official payment confirmation recorded')
  }

  const checklist = [
    { key: 'official_rules' as const, title: 'Official rules reviewed', detail: `Confirm ${property.county} County registration, deposit, and payment rules.` },
    { key: 'registration' as const, title: 'Bidder registration approved', detail: rules.registrationNote },
    { key: 'due_diligence' as const, title: 'Due diligence complete', detail: 'Title, surviving liens, occupancy, access, land use, condition, and current taxes checked.' },
    { key: 'deposit' as const, title: 'Deposit funded and available', detail: rules.depositLabel },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 lg:flex-row lg:items-end">
        <div><div className="flex items-center gap-2"><Gavel className="h-5 w-5 text-emerald-400" /><h3 className="text-xl font-extrabold text-white">Guided Bid Center</h3></div><p className="mt-1 text-sm text-zinc-500">One workspace from research through the official winning-bid payment.</p></div>
        <label className="block min-w-0 lg:w-[420px]"><span className="mb-1.5 block text-xs font-semibold text-zinc-500">Auction property</span><select value={property.id} onChange={(event) => setPropertyId(event.target.value)} className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-white outline-none focus:border-emerald-500">{eligibleProperties.map((item) => <option key={item.id} value={item.id}>{favoriteIds.includes(item.id) ? 'Saved: ' : ''}{item.county} - {item.address}</option>)}</select></label>
      </div>

      <section className="border-b border-zinc-800 py-5" aria-labelledby="purchase-path-title">
        <div className="mb-3 flex items-center justify-between gap-3"><div><h4 id="purchase-path-title" className="text-sm font-bold text-white">Your purchase path</h4><p className="mt-1 text-xs text-zinc-500">Follow each stage in order and save the official confirmations here.</p></div><button type="button" onClick={onOpenGuide} className="flex h-9 flex-none items-center gap-2 rounded-md border border-zinc-700 px-3 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white"><ShieldCheck className="h-3.5 w-3.5" />Illustrated guide</button></div>
        <div className="grid grid-cols-5 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/45">
          {purchaseJourney.map(({ label, icon: Icon, color }, index) => (
            <div key={label} className="relative min-w-0 border-r border-zinc-800 px-1.5 py-3 text-center last:border-r-0 sm:px-3">
              <Icon className={`mx-auto h-4 w-4 ${color}`} />
              <div className="mt-1.5 truncate text-[10px] font-bold text-zinc-400 sm:text-xs">{label}</div>
              {index < purchaseJourney.length - 1 && <ArrowRight className="absolute -right-2 top-3.5 z-10 h-3.5 w-3.5 rounded-full bg-zinc-950 text-zinc-600" />}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-7 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <section className="border-y border-zinc-800 py-5" aria-labelledby="bid-readiness-title">
            <div className="flex items-start justify-between gap-4"><div><h4 id="bid-readiness-title" className="font-bold text-white">Auction readiness</h4><p className="mt-1 text-sm text-zinc-500">{readiness.complete} of {readiness.total} required checks complete</p></div><span className={`rounded-md border px-2.5 py-1 text-xs font-bold ${readiness.ready ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>{readiness.ready ? 'Ready for official auction' : 'Preparation required'}</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${(readiness.complete / readiness.total) * 100}%` }} /></div>
          </section>

          <section className="divide-y divide-zinc-800" aria-label="Bid readiness checklist">
            {checklist.map((item) => (
              <label key={item.key} className="flex cursor-pointer gap-3 py-4">
                <input type="checkbox" checked={Boolean(workflow.completedSteps[item.key])} onChange={() => toggleStep(item.key)} disabled={working} className="mt-0.5 h-5 w-5 rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500" />
                <span><span className="block text-sm font-bold text-zinc-200">{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-zinc-500">{item.detail}</span></span>
              </label>
            ))}
          </section>

          <section className="border-t border-zinc-800 py-5" aria-labelledby="bid-limit-title">
            <div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-sky-400" /><h4 id="bid-limit-title" className="text-sm font-bold text-white">Maximum bid</h4></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><label><span className="mb-1.5 block text-xs font-semibold text-zinc-500">Your hard stop</span><div className="relative"><span className="absolute left-3 top-2.5 text-sm text-zinc-500">$</span><input type="number" min="1" step="100" value={maxBid} onChange={(event) => setMaxBid(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-7 pr-3 text-sm text-white outline-none focus:border-emerald-500" /></div></label><button type="button" onClick={saveLimit} disabled={working} className="h-10 self-end rounded-lg bg-sky-500 px-4 text-sm font-bold text-zinc-950 hover:bg-sky-400 disabled:opacity-50">Save limit</button></div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs"><span className="text-zinc-500">Opening bid <strong className="text-zinc-300">{property.openingBid !== undefined && property.openingBid > 0 ? money(property.openingBid) : property.price > 0 ? money(property.price) : 'Not posted by county'}</strong></span><span className="text-zinc-500">Estimated deposit <strong className="text-zinc-300">{money(depositEstimate)}</strong></span></div>
            {property.saleType === 'Tax Deed' ? (
              <button type="button" onClick={() => onOpenCalculator(property)} className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300"><Calculator className="h-3.5 w-3.5" />Open full maximum-bid calculator</button>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-amber-400">A tax lien is a certificate, not a property purchase. Confirm its availability, payoff, rate, and redemption rules with the Treasurer before setting an investment limit.</p>
            )}
          </section>

          <section className="border-t border-zinc-800 py-5" aria-labelledby="official-bid-title">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-amber-400" /><h4 id="official-bid-title" className="text-sm font-bold text-white">Official auction</h4></div><p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-500">The county auction provider is the seller and official bid record. Direct submission here remains locked until an authorized connection is approved. Never give this website your county auction password.</p></div><span className="w-fit rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-400">Guided connection</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><label><span className="mb-1.5 block text-xs font-semibold text-zinc-500">Official bid or confirmation number</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Enter after the official auction accepts the bid" className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" /></label><a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className={`flex h-10 items-center justify-center gap-2 self-end rounded-lg px-4 text-sm font-bold ${readiness.ready ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400' : 'pointer-events-none bg-zinc-800 text-zinc-600'}`} aria-disabled={!readiness.ready}>Open official bidding<ExternalLink className="h-4 w-4" /></a></div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setOutcome('won')} disabled={!readiness.ready || working} className="h-9 rounded-lg border border-emerald-500/40 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30">I won</button><button type="button" onClick={() => setOutcome('lost')} disabled={!readiness.ready || working} className="h-9 rounded-lg border border-zinc-700 px-3 text-xs font-bold text-zinc-400 hover:bg-zinc-800 disabled:opacity-30">I did not win</button></div>
          </section>

          {(workflow.status === 'won' || workflow.status === 'payment_due' || workflow.status === 'paid') && <section className="border-t border-zinc-800 py-5" aria-labelledby="payment-title"><div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-emerald-400" /><h4 id="payment-title" className="text-sm font-bold text-white">Winning-bid payment</h4></div><p className="mt-2 text-xs leading-relaxed text-zinc-500">{rules.paymentTiming} Send funds only to the county clerk or its authorized auction provider.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-semibold text-zinc-500">Official deadline</span><input type="datetime-local" value={paymentDeadline} onChange={(event) => setPaymentDeadline(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" /></label><label><span className="mb-1.5 block text-xs font-semibold text-zinc-500">Payment confirmation</span><input value={paymentConfirmation} onChange={(event) => setPaymentConfirmation(event.target.value)} placeholder="County receipt, batch, or wire confirmation" className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" /></label></div><button type="button" onClick={markPaid} disabled={working || workflow.status === 'paid'} className="mt-3 flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{workflow.status === 'paid' ? 'Payment recorded' : 'Record official payment'}</button></section>}
        </div>

        <aside className="border-t border-zinc-800 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="aspect-[16/10] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">{property.imageUrl && !imageFailed ? <img src={property.imageUrl} alt={`${property.address} property or location`} onError={() => setImageFailed(true)} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-center"><div><MapPin className="mx-auto h-6 w-6 text-zinc-600" /><div className="mt-2 text-xs font-semibold text-zinc-500">Map location</div></div></div>}</div>
          <h4 className="mt-4 text-sm font-bold text-white">{property.address}</h4><p className="mt-1 text-xs text-zinc-500">{property.city}, {property.state} {property.zip}</p>
          <dl className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800 text-xs"><div className="flex justify-between gap-3 py-3"><dt className="text-zinc-500">Auction</dt><dd className="text-right font-semibold text-zinc-300">{shortDate(property.auctionDate)}</dd></div><div className="flex justify-between gap-3 py-3"><dt className="text-zinc-500">County</dt><dd className="text-right font-semibold text-zinc-300">{property.county}</dd></div><div className="flex justify-between gap-3 py-3"><dt className="text-zinc-500">Sale</dt><dd className="text-right font-semibold text-zinc-300">{property.saleType}</dd></div><div className="flex justify-between gap-3 py-3"><dt className="text-zinc-500">Status</dt><dd className="text-right font-semibold capitalize text-zinc-300">{workflow.status.replace(/_/g, ' ')}</dd></div></dl>
          <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300">Official property record<ArrowUpRight className="h-3.5 w-3.5" /></a>
          <button type="button" onClick={onOpenGuide} className="mt-4 flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white"><ShieldCheck className="h-3.5 w-3.5" />Review buyer guide</button>
          {loading && <div className="mt-4 flex items-center gap-2 text-xs text-zinc-600"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading saved progress</div>}
        </aside>
      </div>
    </div>
  )
}
