import { useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bath,
  BedDouble,
  Calculator,
  CalendarDays,
  Clock3,
  CircleDot,
  ExternalLink,
  FileText,
  FileUp,
  Gavel,
  House,
  Link2,
  MapPin,
  NotebookPen,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { Property } from '../types/property'
import { analyzeTaxDeedScenario } from '../lib/calculator'
import { getDealVerdict, type StoredDealAnalysis, type VerifiedOpportunity } from '../lib/propertyAnalysis'
import PropertyMedia from './PropertyMedia'
import PropertyResearchWorkspace from './PropertyResearchWorkspace'
import PartnerServices from './PartnerServices'
import { usePropertyResearch } from '../hooks/useMemberProduct'
import type { PropertyTracker, PropertyTrackingStatus } from '../types/product'

interface Props {
  property: Property
  savedAnalysis?: StoredDealAnalysis
  rank?: number
  screening?: VerifiedOpportunity
  screeningRank?: number
  onClose: () => void
  onOpenCalculator: () => void
  userId?: string | null
  paidAccess?: boolean
  tracker?: PropertyTracker
  onTrack?: (propertyId: string, status: PropertyTrackingStatus) => Promise<void>
}

type DetailTab = 'overview' | 'diligence' | 'facts' | 'auction' | 'sources' | 'notes' | 'analysis'

function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return 'Not verified'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function dateLabel(value?: string) {
  if (!value) return 'Date not posted'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function daysUntil(value?: string) {
  if (!value) return 'Unknown'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(`${value}T12:00:00`)
  const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return 'Date passed'
  if (days === 0) return 'Today'
  return `${days} day${days === 1 ? '' : 's'}`
}

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'diligence', label: 'Due diligence' },
  { id: 'facts', label: 'Property facts' },
  { id: 'auction', label: 'Auction details' },
  { id: 'sources', label: 'Source center' },
  { id: 'notes', label: 'Notes & docs' },
  { id: 'analysis', label: 'My analysis' },
]

const checklist = [
  ['Parcel identity', 'Confirm the legal description and parcel match'],
  ['Legal access', 'Check easements, access, and encroachments'],
  ['Title & liens', 'Review prior liens, judgments, and tax status'],
  ['Property condition', 'Inspect condition and estimate repair costs'],
  ['Occupancy', 'Verify occupancy and possible possession needs'],
  ['Auction rules', 'Understand payment, redemption, and sale terms'],
] as const

export default function PropertyAnalysisModal({ property, savedAnalysis, rank, screeningRank, onClose, onOpenCalculator, userId = null, paidAccess = false, tracker, onTrack }: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [noteBody, setNoteBody] = useState('')
  const [researchError, setResearchError] = useState('')
  const research = usePropertyResearch(userId, property.id, paidAccess)
  const analysis = savedAnalysis ? analyzeTaxDeedScenario(savedAnalysis.scenario) : null
  const verdict = analysis && savedAnalysis ? getDealVerdict(analysis, savedAnalysis.scenario) : null
  const listedAmount = property.openingBid || property.price
  const location = [property.city, property.state, property.zip].filter(Boolean).join(', ')

  const facts = [
    { icon: House, label: 'Assessed value', value: property.valuationVerified ? money(property.assessedValue || property.estimatedValue) : 'Not verified', note: 'County assessment' },
    { icon: BedDouble, label: 'Beds', value: property.beds > 0 ? String(property.beds) : '—' },
    { icon: Bath, label: 'Baths', value: property.baths > 0 ? String(property.baths) : '—' },
    { icon: Ruler, label: 'Square feet', value: property.sqft > 0 ? property.sqft.toLocaleString() : '—' },
    { icon: FileText, label: 'Parcel ID', value: property.parcelId || 'Not posted' },
  ]

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-0 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="property-analysis-title" onClick={(event) => event.stopPropagation()} className="mx-auto min-h-screen w-full max-w-[1480px] bg-white shadow-2xl sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-600"><ArrowLeft className="h-4 w-4" />All properties</button>
            <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex"><span>{property.state}</span><span>/</span><span>{property.county || 'County not posted'}</span></div>
            <button type="button" onClick={onClose} aria-label="Close property details" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="property-analysis-title" className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{property.address}</h2>
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800">{property.saleType ?? property.auctionType}</span>
                <span className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-extrabold text-amber-950">Auction {dateLabel(property.auctionDate)}</span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 text-emerald-700" />{location}</p>
            </div>
            {(rank || screeningRank) && <div className="text-xs font-bold text-slate-500">Research priority #{rank || screeningRank}</div>}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(360px,0.95fr)]">
            <div className="min-w-0">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"><PropertyMedia property={property} /></div>
              {property.images.length > 1 && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {property.images.slice(0, 3).map((image, index) => <img key={image} src={image} alt={`${property.address} view ${index + 1}`} className="aspect-[16/7] w-full rounded-xl border border-slate-200 object-cover" />)}
                </div>
              )}
            </div>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 xl:sticky xl:top-24">
              <div className="text-sm font-semibold text-slate-500">{property.saleType === 'Tax Lien' ? 'Tax owed' : 'Opening bid'}</div>
              <div className="mt-1 text-4xl font-black tracking-tight text-slate-950">{money(listedAmount)}</div>
              <dl className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-slate-500"><CalendarDays className="h-4 w-4" />Official auction date</dt><dd className="font-extrabold text-slate-900">{dateLabel(property.auctionDate)}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-slate-500"><Clock3 className="h-4 w-4" />Time until auction</dt><dd className="font-extrabold text-emerald-800">{daysUntil(property.auctionDate)}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-slate-500"><Gavel className="h-4 w-4" />Deposit requirement</dt><dd className="font-extrabold text-slate-900">{property.depositRequired ? money(property.depositRequired) : 'Verify rules'}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-slate-500"><ShieldCheck className="h-4 w-4" />Source</dt><dd className="max-w-[190px] truncate font-extrabold text-slate-900">{property.source}</dd></div>
              </dl>
              <div className="mt-4 grid gap-2">
                <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-extrabold text-white hover:bg-emerald-700">Open official auction<ArrowUpRight className="h-4 w-4" /></a>
                {property.saleType === 'Tax Deed' && <button type="button" onClick={onOpenCalculator} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-800 hover:border-emerald-700 hover:text-emerald-800"><Calculator className="h-4 w-4" />{analysis?.complete ? 'Update full analysis' : 'Start full analysis'}</button>}
              </div>
              {onTrack && <label className="mt-4 block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500"><CircleDot className="h-3.5 w-3.5 text-emerald-700" />Tracking status</span><select value={tracker?.status ?? 'watching'} onChange={(event) => { setResearchError(''); void onTrack(property.id, event.target.value as PropertyTrackingStatus).catch((error) => setResearchError(error instanceof Error ? error.message : 'Unable to update tracking')) }} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold capitalize text-slate-700"><option value="watching">Watching</option><option value="researching">Researching</option><option value="due_diligence">Due diligence</option><option value="ready">Ready</option><option value="won">Won</option><option value="lost">Lost</option><option value="paid">Paid</option><option value="removed">Removed</option></select></label>}
              {researchError && <p className="mt-2 text-xs font-bold text-red-600">{researchError}</p>}
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2.5 text-sm font-bold text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />Needs due diligence before bidding</div>
            </aside>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(360px,0.95fr)]">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="hide-scrollbar flex overflow-x-auto border-b border-slate-200 px-3" role="tablist" aria-label="Property details">
                {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`relative min-w-max px-4 py-4 text-sm font-bold transition-colors ${activeTab === tab.id ? 'text-emerald-800 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-emerald-700' : 'text-slate-500 hover:text-slate-900'}`}>{tab.label}</button>)}
              </div>

              {activeTab === 'overview' && (
                <div className="p-4 sm:p-5">
                  <div className="grid divide-y divide-slate-100 rounded-xl border border-slate-200 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
                    {facts.map(({ icon: Icon, label, value, note }) => <div key={label} className="flex min-w-0 items-center gap-3 p-3"><Icon className="h-5 w-5 shrink-0 text-slate-500" /><div className="min-w-0"><div className="truncate text-sm font-extrabold text-slate-950">{value}</div><div className="text-[11px] text-slate-500">{note || label}</div></div></div>)}
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-3"><h3 className="font-black text-slate-950">Research checklist</h3><p className="mt-0.5 text-xs text-slate-500">Confirm each item with a source before deciding what to bid.</p></div>
                    <div className="divide-y divide-slate-100">
                      {checklist.map(([title, help]) => <button key={title} type="button" onClick={() => setActiveTab('diligence')} className="grid w-full gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[160px_90px_minmax(0,1fr)_auto] sm:items-center"><span className="text-sm font-bold text-slate-900">{title}</span><span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Not checked</span><span className="text-xs text-slate-500">{help}</span><span className="text-xs font-extrabold text-emerald-800">Review →</span></button>)}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'diligence' && <div className="p-4 sm:p-5"><PropertyResearchWorkspace property={property} /></div>}
              {activeTab === 'facts' && <div className="grid gap-3 p-5 sm:grid-cols-2"><Fact label="Property type" value={property.propertyType} /><Fact label="Year built" value={property.yearBuilt ? String(property.yearBuilt) : 'Not posted'} /><Fact label="Lot size" value={property.lotSize ? `${property.lotSize.toLocaleString()} acres` : 'Not posted'} /><Fact label="County" value={property.county || 'Not posted'} /><Fact label="Case number" value={property.caseNumber || 'Not posted'} /><Fact label="Parcel ID" value={property.parcelId || 'Not posted'} /></div>}
              {activeTab === 'auction' && <div className="grid gap-3 p-5 sm:grid-cols-2"><Fact label="Sale type" value={property.saleType ?? property.auctionType} /><Fact label="Auction date" value={dateLabel(property.auctionDate)} /><Fact label="Listed amount" value={money(listedAmount)} /><Fact label="Deposit" value={property.depositRequired ? money(property.depositRequired) : 'Verify rules'} /><Fact label="Official source" value={property.source} /><Fact label="Status" value={property.status} /></div>}
              {activeTab === 'sources' && <SourceCenter property={property} sources={research.sources} paidAccess={paidAccess} userId={userId} />}
              {activeTab === 'notes' && <div className="p-5"><div className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 sm:flex-row sm:items-end"><label className="min-w-0 flex-1"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-emerald-900">Add research note</span><textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} rows={3} placeholder="What did you verify, and when?" className="w-full rounded-lg border border-emerald-200 bg-white p-3 text-sm outline-none focus:border-emerald-700" /></label><button type="button" disabled={!noteBody.trim()} onClick={() => { void research.addNote(noteBody).then(() => setNoteBody('')).catch((error) => setResearchError(error instanceof Error ? error.message : 'Unable to save note')) }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-xs font-black text-white disabled:opacity-40"><NotebookPen className="h-4 w-4" />Save note</button></div><div className="mt-5 flex items-center justify-between"><h3 className="text-sm font-black">Notes & documents</h3><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700"><FileUp className="h-4 w-4" />Upload<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void research.uploadDocument(file, 'other').catch((error) => setResearchError(error instanceof Error ? error.message : 'Unable to upload document')); event.currentTarget.value = '' }} /></label></div>{researchError && <p className="mt-3 text-xs font-bold text-red-600">{researchError}</p>}<div className="mt-3 space-y-3">{research.notes.map((note) => <div key={note.id} className="rounded-xl border border-slate-200 p-4"><div className="text-sm leading-6 text-slate-700">{note.body}</div><div className="mt-2 text-[11px] font-semibold text-slate-500">Added {new Date(note.createdAt).toLocaleString()}</div></div>)}{research.documents.map((document) => <div key={document.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><FileText className="h-5 w-5 text-emerald-800" /><div><div className="text-sm font-black">{document.filename}</div><div className="mt-1 text-[11px] text-slate-500">{document.documentType.replace('_', ' ')} · private upload</div></div></div>)}{research.notes.length === 0 && research.documents.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-xs text-slate-500">No notes or documents yet. Add the evidence you want beside this property.</div>}</div></div>}
              {activeTab === 'analysis' && <div className="p-5"><div className={`rounded-xl border p-4 ${verdict?.grade === 'Great' ? 'border-emerald-200 bg-emerald-50' : verdict?.grade === 'Good' ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center gap-2 text-sm font-black text-slate-900"><ShieldAlert className="h-5 w-5" />{verdict ? `${verdict.grade} analysis` : 'Analysis not ready'}</div><p className="mt-2 text-sm leading-relaxed text-slate-600">{verdict?.summary || 'Complete the evidence checks and enter your resale, repair, title, fee, and holding assumptions before trusting a maximum bid.'}</p></div>{analysis?.complete && <div className="mt-4 grid gap-3 sm:grid-cols-3"><Fact label="Maximum bid" value={money(analysis.maximumBid)} /><Fact label="Projected profit" value={money(analysis.projectedProfit)} /><Fact label="Repairs" value={money(analysis.repairs)} /></div>}<button type="button" onClick={onOpenCalculator} className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-extrabold text-white"><Calculator className="h-4 w-4" />{analysis?.complete ? 'Update analysis' : 'Start full analysis'}</button></div>}
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-black text-slate-950">Before you bid</h3>
              <div className="mt-4 space-y-4">
                {[['Property sold as-is, where-is', 'You are responsible for repairs, violations, and unpaid costs that survive the sale.'], ['Possible occupants', 'Confirm occupancy and the legal possession process before bidding.'], ['Rules vary by jurisdiction', 'Verify redemption, payment deadlines, title process, and bidder registration.']].map(([title, copy], index) => <div key={title} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-200 text-xs font-black text-amber-950">{index + 1}</span><div><div className="text-sm font-extrabold text-slate-900">{title}</div><p className="mt-0.5 text-xs leading-relaxed text-slate-500">{copy}</p></div></div>)}
              </div>
              <button type="button" onClick={() => setActiveTab('diligence')} className="mt-5 text-sm font-extrabold text-emerald-800 hover:text-emerald-600">Open research workspace →</button>
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-sm font-extrabold text-slate-900">{value}</div></div>
}

function SourceCenter({ property, sources, paidAccess, userId }: { property: Property; sources: Array<{ id: string; sourceType: string; sourceName: string; sourceUrl: string; status: string; verifiedAt: string | null }>; paidAccess: boolean; userId: string | null | undefined }) {
  const records = sources.length ? sources : [{ id: 'official-listing', sourceType: 'auction', sourceName: property.source || 'Official auction listing', sourceUrl: property.sourceUrl, status: 'available', verifiedAt: null }]
  return <div className="p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-black">Source center</h3><p className="mt-1 text-xs leading-5 text-slate-500">Every link is a starting point. Reopen the current official record before making a decision.</p></div><Link2 className="h-5 w-5 text-emerald-800" /></div><div className="mt-5 space-y-3">{records.map((record) => <div key={record.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${record.status === 'available' ? 'bg-emerald-600' : record.status === 'stale' ? 'bg-amber-500' : 'bg-slate-300'}`} /><div className="min-w-0"><div className="text-sm font-black capitalize text-slate-900">{record.sourceName}</div><div className="mt-1 text-xs capitalize text-slate-500">{record.sourceType.replace('_', ' ')} · {record.verifiedAt ? `Verified ${new Date(record.verifiedAt).toLocaleDateString()}` : 'Verification date not provided'}</div></div></div><a href={record.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-emerald-800">Open source <ExternalLink className="h-3.5 w-3.5" /></a></div>)}</div>{!paidAccess && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">Upgrade to Investor to unlock the full evidence source center, freshness history, and advanced reports.</div>}<PartnerServices userId={userId ?? null} propertyId={property.id} /></div>
}
