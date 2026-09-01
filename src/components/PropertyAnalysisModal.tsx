import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bath,
  BedDouble,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CircleAlert,
  Database,
  ExternalLink,
  FileText,
  FileUp,
  Gavel,
  House,
  Landmark,
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
import type { PropertyDocument, PropertyNote, PropertyTracker, PropertyTrackingStatus } from '../types/product'
import { applyServerVerificationRun, buildPropertyVerificationReport } from '../lib/propertyVerification'
import AutomatedVerificationPanel from './AutomatedVerificationPanel'
import { hasDisplayablePropertyPhoto } from '../lib/propertyPhoto'

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
  onTrack?: (propertyId: string, status: PropertyTrackingStatus, nextAction?: string, dueAt?: string | null) => Promise<void>
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

function localDateTimeInput(value?: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
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

export default function PropertyAnalysisModal({ property, savedAnalysis, rank, screeningRank, onClose, onOpenCalculator, userId = null, paidAccess = false, tracker, onTrack }: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>('sources')
  const [noteBody, setNoteBody] = useState('')
  const [researchError, setResearchError] = useState('')
  const [nextAction, setNextAction] = useState(tracker?.nextAction ?? '')
  const [dueAt, setDueAt] = useState(localDateTimeInput(tracker?.dueAt))
  const research = usePropertyResearch(userId, property.id, paidAccess)
  const analysis = savedAnalysis ? analyzeTaxDeedScenario(savedAnalysis.scenario) : null
  const verdict = analysis && savedAnalysis ? getDealVerdict(analysis, savedAnalysis.scenario) : null
  const provisionalVerificationReport = useMemo(() => buildPropertyVerificationReport({
    property,
    sources: research.sources,
    documents: research.documents,
    savedAnalysis,
    tracker,
  }), [property, research.sources, research.documents, savedAnalysis, tracker])
  const verificationReport = useMemo(
    () => applyServerVerificationRun(provisionalVerificationReport, research.serverVerification),
    [provisionalVerificationReport, research.serverVerification],
  )
  const listedAmount = property.openingBid || property.price
  const location = [property.city, property.state, property.zip].filter(Boolean).join(', ')
  const memberPhoto = research.documents.find((document) => document.documentType === 'photo' && document.displayUrl)
  const displayedProperty = memberPhoto ? {
    ...property,
    imageUrl: memberPhoto.displayUrl ?? property.imageUrl,
    photoSource: 'member_upload' as const,
    photoSourceName: 'Private member upload',
    photoCapturedAt: undefined,
    photoVerifiedAt: undefined,
  } : property

  useEffect(() => {
    if (!research.loading && research.evidenceSchemaAvailable) {
      void research.runServerVerification().catch(() => undefined)
    }
  }, [property.id, research.evidenceSchemaAvailable, research.loading, research.runServerVerification])

  useEffect(() => {
    setNextAction(tracker?.nextAction ?? '')
    setDueAt(localDateTimeInput(tracker?.dueAt))
  }, [property.id, tracker?.dueAt, tracker?.nextAction])

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
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(360px,0.95fr)]">
            <div className="min-w-0">
              <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="property-analysis-title" className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{property.address}</h2>
                    <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800">{property.saleType ?? property.auctionType}</span>
                    <span className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-extrabold text-amber-950">Auction {dateLabel(property.auctionDate)}</span>
                    {onTrack && <select aria-label="Tracking status" value={tracker?.status ?? 'watching'} onChange={(event) => { const nextStatus = event.target.value as PropertyTrackingStatus; setResearchError(''); if (nextStatus === 'ready' && (!verificationReport.authoritative || verificationReport.overallStatus !== 'verified')) { setResearchError('Ready is locked until the server verifies all nine checks.'); return } void onTrack(property.id, nextStatus).catch((error) => setResearchError(error instanceof Error ? error.message : 'Unable to update tracking')) }} className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold capitalize text-slate-700"><option value="watching">Watching</option><option value="researching">Researching</option><option value="due_diligence">Due diligence</option><option value="ready">Ready</option><option value="won">Won</option><option value="lost">Lost</option><option value="paid">Paid</option><option value="removed">Removed</option></select>}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 text-emerald-700" />{location}</p>
                  {researchError && <p className="mt-1 text-xs font-bold text-red-600">{researchError}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-5 text-xs font-bold"><span className={`inline-flex items-center gap-1.5 ${verificationReport.authoritative && verificationReport.lastSourceVerifiedAt ? 'text-emerald-800' : 'text-amber-700'}`}>{verificationReport.authoritative && verificationReport.lastSourceVerifiedAt ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}{verificationReport.authoritative && verificationReport.lastSourceVerifiedAt ? 'Provider-validated source timestamp saved' : verificationReport.authoritative ? 'Provider validation pending' : 'Server verification pending'}</span>{(rank || screeningRank) && <span className="text-slate-500">Research priority #{rank || screeningRank}</span>}</div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"><PropertyMedia property={displayedProperty} variant="detail" /></div>
              {displayedProperty.images.length > 1 && hasDisplayablePropertyPhoto(displayedProperty) && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {displayedProperty.images.slice(0, 3).map((image, index) => <img key={image} src={image} alt={`${property.address} view ${index + 1}`} className="aspect-[16/7] w-full rounded-xl border border-slate-200 object-cover" />)}
                </div>
              )}
            </div>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 xl:sticky xl:top-24">
              <div className="text-sm font-semibold text-slate-500">{property.saleType === 'Tax Lien' ? 'Tax owed' : 'Opening bid'}</div>
              <div className="mt-1 text-4xl font-black tracking-tight text-slate-950">{money(listedAmount)}</div>
              <dl className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-slate-500"><CalendarDays className="h-4 w-4" />Auction date snapshot</dt><dd className="font-extrabold text-slate-900">{dateLabel(property.auctionDate)}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-slate-500"><Clock3 className="h-4 w-4" />Time until auction</dt><dd className="font-extrabold text-emerald-800">{daysUntil(property.auctionDate)}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-slate-500"><Gavel className="h-4 w-4" />Deposit requirement</dt><dd className="font-extrabold text-slate-900">{property.depositRequired ? money(property.depositRequired) : 'Verify rules'}</dd></div>
                <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-slate-500"><ShieldCheck className="h-4 w-4" />Source</dt><dd className="max-w-[190px] truncate font-extrabold text-slate-900">{property.source}</dd></div>
              </dl>
              <div className="mt-4 grid gap-2">
                <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-white px-4 text-sm font-extrabold text-emerald-900 hover:bg-emerald-50">Open auction source<ArrowUpRight className="h-4 w-4" /></a>
                {property.saleType === 'Tax Deed' && <button type="button" onClick={onOpenCalculator} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-extrabold text-white hover:bg-emerald-700"><Calculator className="h-4 w-4" />{analysis?.complete ? 'Update full analysis' : 'Start full analysis'}<ArrowUpRight className="h-4 w-4" /></button>}
              </div>
              <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold ${verificationReport.overallStatus === 'stop' ? 'bg-red-100 text-red-900' : verificationReport.authoritative && verificationReport.overallStatus === 'verified' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}><AlertTriangle className="h-4 w-4 shrink-0" />{!verificationReport.authoritative ? 'Server verification is required before bidding' : verificationReport.overallStatus === 'stop' ? 'Stop: resolve blocking evidence before bidding' : verificationReport.overallStatus === 'verified' ? 'All nine server checks verified' : `${verificationReport.verifiedCount}/9 server checks verified`}</div>
              {onTrack && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs font-black text-slate-800">Calendar the next deadline</div><div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]"><input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="Registration, payment, or post-sale action" className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-700" /><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-700" /></div><button type="button" disabled={!nextAction.trim() || !dueAt} onClick={() => { setResearchError(''); void onTrack(property.id, tracker?.status ?? 'watching', nextAction, dueAt ? new Date(dueAt).toISOString() : null).catch((error) => setResearchError(error instanceof Error ? error.message : 'Unable to save deadline')) }} className="mt-2 h-9 rounded-lg bg-emerald-800 px-3 text-xs font-black text-white disabled:opacity-40">Save deadline</button></div>}
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
                    <div className="divide-y divide-slate-100">{verificationReport.checks.map((item) => <button key={item.key} type="button" onClick={() => setActiveTab('diligence')} className="grid w-full gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[220px_110px_minmax(0,1fr)_auto] sm:items-center"><span className="text-sm font-bold text-slate-900">{item.title}</span><span className={`w-fit rounded-md px-2 py-1 text-[10px] font-bold ${item.status === 'verified' ? 'bg-emerald-100 text-emerald-900' : item.status === 'partial' ? 'bg-sky-100 text-sky-900' : item.status === 'stop' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'}`}>{item.status.replace('_', ' ')}</span><span className="text-xs text-slate-500">{item.summary}</span><span className="text-xs font-extrabold text-emerald-800">Review →</span></button>)}</div>
                  </div>
                </div>
              )}

              {activeTab === 'diligence' && <div className="p-4 sm:p-5"><PropertyResearchWorkspace property={property} verificationReport={verificationReport} /></div>}
              {activeTab === 'facts' && <div className="grid gap-3 p-5 sm:grid-cols-2"><Fact label="Property type" value={property.propertyType} /><Fact label="Year built" value={property.yearBuilt ? String(property.yearBuilt) : 'Not posted'} /><Fact label="Lot size" value={property.lotSize ? `${property.lotSize.toLocaleString()} acres` : 'Not posted'} /><Fact label="County" value={property.county || 'Not posted'} /><Fact label="Case number" value={property.caseNumber || 'Not posted'} /><Fact label="Parcel ID" value={property.parcelId || 'Not posted'} /><Fact label="Legal description" value={property.legalDescription || 'Not posted'} /><Fact label="Selling authority" value={property.sellingAuthority || 'Not posted'} /></div>}
              {activeTab === 'auction' && <div className="grid gap-3 p-5 sm:grid-cols-2"><Fact label="Sale type" value={property.saleType ?? property.auctionType} /><Fact label="Auction date" value={dateLabel(property.auctionDate)} /><Fact label="Listed amount" value={money(listedAmount)} /><Fact label="Deposit" value={property.depositRequired ? money(property.depositRequired) : 'Verify rules'} /><Fact label="Registration deadline" value={property.registrationDeadline ? dateLabel(property.registrationDeadline.slice(0, 10)) : 'Not posted'} /><Fact label="Payment deadline" value={property.paymentDeadline ? dateLabel(property.paymentDeadline.slice(0, 10)) : 'Not posted'} /><Fact label="Source record" value={property.source} /><Fact label="Status" value={property.status} /></div>}
              {activeTab === 'sources' && <><SourceCenter property={property} sources={research.sources} paidAccess={paidAccess} userId={userId} /><SourceLinkedDocumentUpload disabled={!userId || !research.evidenceSchemaAvailable} schemaReady={research.evidenceSchemaAvailable} onUpload={async (file, documentType, sourceUrl) => { setResearchError(''); await research.uploadDocument(file, documentType, { sourceUrl, memberAttested: true }) }} /><NotesPreview notes={research.notes} documents={research.documents} onOpen={() => setActiveTab('notes')} /></>}
              {activeTab === 'notes' && <NotesAndDocumentsPanel noteBody={noteBody} setNoteBody={setNoteBody} error={researchError} setError={setResearchError} notes={research.notes} documents={research.documents} onAddNote={research.addNote} onUpload={research.uploadDocument} />}
              {activeTab === 'analysis' && <div className="p-5"><div className={`rounded-xl border p-4 ${verdict?.grade === 'Great' ? 'border-emerald-200 bg-emerald-50' : verdict?.grade === 'Good' ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center gap-2 text-sm font-black text-slate-900"><ShieldAlert className="h-5 w-5" />{verdict ? `${verdict.grade} analysis` : 'Analysis not ready'}</div><p className="mt-2 text-sm leading-relaxed text-slate-600">{verdict?.summary || 'Complete the evidence checks and enter your resale, repair, title, fee, and holding assumptions before trusting a maximum bid.'}</p></div>{analysis?.complete && <div className="mt-4 grid gap-3 sm:grid-cols-3"><Fact label="Maximum bid" value={money(analysis.maximumBid)} /><Fact label="Projected profit" value={money(analysis.projectedProfit)} /><Fact label="Repairs" value={money(analysis.repairs)} /></div>}<button type="button" onClick={onOpenCalculator} className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-extrabold text-white"><Calculator className="h-4 w-4" />{analysis?.complete ? 'Update analysis' : 'Start full analysis'}</button></div>}
            </section>

            <aside className="h-fit space-y-4">
              <AutomatedVerificationPanel report={verificationReport} compact onReview={() => setActiveTab('diligence')} />
              <CalculationProvenanceCard property={property} onOpen={() => setActiveTab('analysis')} />
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-black text-slate-950">Before you bid</h3>
              <div className="mt-4 space-y-4">
                {[['Property sold as-is, where-is', 'You are responsible for repairs, violations, and unpaid costs that survive the sale.'], ['Possible occupants', 'Confirm occupancy and the legal possession process before bidding.'], ['Rules vary by jurisdiction', 'Verify redemption, payment deadlines, title process, and bidder registration.']].map(([title, copy], index) => <div key={title} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-200 text-xs font-black text-amber-950">{index + 1}</span><div><div className="text-sm font-extrabold text-slate-900">{title}</div><p className="mt-0.5 text-xs leading-relaxed text-slate-500">{copy}</p></div></div>)}
              </div>
              <button type="button" onClick={() => setActiveTab('diligence')} className="mt-5 text-sm font-extrabold text-emerald-800 hover:text-emerald-600">Open research workspace →</button>
              </section>
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

function documentEvidenceLabel(document: PropertyDocument) {
  if (document.verifiedAt && document.evidence.providerValidated === true) return 'server-validated official record'
  if (document.sourceUrl) return 'source-linked upload · validation pending'
  return 'private upload'
}

function NotesAndDocumentsPanel({
  noteBody,
  setNoteBody,
  error,
  setError,
  notes,
  documents,
  onAddNote,
  onUpload,
}: {
  noteBody: string
  setNoteBody: (value: string) => void
  error: string
  setError: (value: string) => void
  notes: PropertyNote[]
  documents: PropertyDocument[]
  onAddNote: (body: string) => Promise<void>
  onUpload: (file: File, documentType: PropertyDocument['documentType']) => Promise<void>
}) {
  return (
    <div className="p-5">
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-emerald-900">Add research note</span><textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} rows={3} placeholder="What did you verify, and when?" className="w-full rounded-lg border border-emerald-200 bg-white p-3 text-sm outline-none focus:border-emerald-700" /></label>
        <button type="button" disabled={!noteBody.trim()} onClick={() => { void onAddNote(noteBody).then(() => setNoteBody('')).catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to save note')) }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-xs font-black text-white disabled:opacity-40"><NotebookPen className="h-4 w-4" />Save note</button>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-black">Notes &amp; documents</h3>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700"><FileUp className="h-4 w-4" />Upload photo or note<input type="file" accept=".jpg,.jpeg,.png,.webp,.txt" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(file, file.type.startsWith('image/') ? 'photo' : 'other').catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to upload document')); event.currentTarget.value = '' }} /></label>
      </div>
      {error && <p className="mt-3 text-xs font-bold text-red-600">{error}</p>}
      <div className="mt-3 space-y-3">
        {notes.map((note) => <div key={note.id} className="rounded-xl border border-slate-200 p-4"><div className="text-sm leading-6 text-slate-700">{note.body}</div><div className="mt-2 text-[11px] font-semibold text-slate-500">Added {new Date(note.createdAt).toLocaleString()}</div></div>)}
        {documents.map((document) => <div key={document.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><FileText className="h-5 w-5 text-emerald-800" /><div className="min-w-0"><div className="text-sm font-black">{document.filename}</div><div className="mt-1 text-[11px] text-slate-500">{document.documentType.replace('_', ' ')} · {documentEvidenceLabel(document)}</div>{document.sourceUrl && <a href={document.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[11px] font-bold text-emerald-800 hover:underline">Open source →</a>}</div></div>)}
        {notes.length === 0 && documents.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-xs text-slate-500">No notes or documents yet. Add the evidence you want beside this property.</div>}
      </div>
    </div>
  )
}

function SourceLinkedDocumentUpload({
  disabled,
  schemaReady,
  onUpload,
}: {
  disabled: boolean
  schemaReady: boolean
  onUpload: (file: File, documentType: PropertyDocument['documentType'], sourceUrl: string) => Promise<void>
}) {
  const [documentType, setDocumentType] = useState<PropertyDocument['documentType']>('auction_notice')
  const [sourceUrl, setSourceUrl] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const validSource = sourceUrl.trim().startsWith('https://')

  return (
    <section className="border-t border-slate-200 bg-emerald-50/40 p-5">
      <div className="flex items-start gap-3">
        <FileUp className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-950">Save a source-linked document</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">Classify the record and keep its HTTPS source link. Member uploads remain pending until a server-side source check validates them.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <label className="text-xs font-bold text-slate-700">Document type
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value as PropertyDocument['documentType'])} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700">
                <option value="auction_notice">Auction notice</option>
                <option value="title_search">Title search</option>
                <option value="tax_record">Tax record</option>
                <option value="appraiser_record">Appraiser record</option>
                <option value="map">Parcel map</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">Source link
              <input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://county.gov/record/..." className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700" />
            </label>
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-emerald-700" /><span>I opened this source record and confirmed it belongs to this property.</span></label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-xs font-black text-white ${disabled || !confirmed || !validSource || busy ? 'cursor-not-allowed bg-slate-400' : 'cursor-pointer bg-emerald-800 hover:bg-emerald-700'}`}>
              <FileUp className="h-4 w-4" />{busy ? 'Saving…' : 'Choose document'}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                disabled={disabled || !confirmed || !validSource || busy}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.currentTarget.value = ''
                  if (!file) return
                  setBusy(true)
                  setMessage('')
                  void onUpload(file, documentType, sourceUrl.trim())
                    .then(() => { setMessage('Source-linked document saved; validation is pending.'); setConfirmed(false); setSourceUrl('') })
                    .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to save document'))
                    .finally(() => setBusy(false))
                }}
              />
            </label>
            {disabled && <span className="text-xs font-bold text-amber-700">{schemaReady ? 'Sign in to save evidence.' : 'Evidence storage upgrade is ready for database activation.'}</span>}
            {!disabled && !validSource && sourceUrl && <span className="text-xs font-bold text-amber-700">Use the complete HTTPS source link.</span>}
            {message && <span className="text-xs font-bold text-slate-700">{message}</span>}
          </div>
        </div>
      </div>
    </section>
  )
}

type SourceCenterRecord = {
  id: string
  sourceType: string
  sourceName: string
  sourceUrl: string
  status: string
  verifiedAt: string | null
  official?: boolean
  evidence?: Record<string, unknown>
}

function SourceCenter({ property, sources, paidAccess, userId }: { property: Property; sources: SourceCenterRecord[]; paidAccess: boolean; userId: string | null | undefined }) {
  const records = sources.length ? sources : [
    { id: 'linked-listing', sourceType: 'auction', sourceName: property.source || 'Auction listing source', sourceUrl: property.sourceUrl, status: property.sourceUrl ? 'available' : 'unavailable', verifiedAt: null, official: false, evidence: { providerValidated: false } },
    { id: 'county-appraiser', sourceType: 'appraiser', sourceName: `${property.county || 'County'} Property Appraiser`, sourceUrl: '', status: 'unavailable', verifiedAt: null },
    { id: 'county-tax', sourceType: 'tax_collector', sourceName: `${property.county || 'County'} Tax Collector`, sourceUrl: '', status: 'unavailable', verifiedAt: null },
    { id: 'parcel-map', sourceType: 'gis', sourceName: `${property.county || 'County'} Parcel Map`, sourceUrl: '', status: 'unavailable', verifiedAt: null },
    { id: 'auction-rules', sourceType: 'rules', sourceName: 'Auction rules', sourceUrl: '', status: 'unavailable', verifiedAt: null },
  ]
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-4"><div><h3 className="text-[16px] font-black">Source center</h3><p className="mt-1 text-xs leading-5 text-slate-500">Source links, snapshot dates, and provider-validation status for this property.</p></div><Link2 className="h-5 w-5 text-emerald-800" /></div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[700px] w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-600"><tr><th className="px-4 py-2.5">Source type</th><th className="px-4 py-2.5">Source</th><th className="px-4 py-2.5">Snapshot date</th><th className="px-4 py-2.5">Validation</th><th className="px-4 py-2.5">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => {
              const providerValidated = record.official === true && record.evidence?.providerValidated === true && record.status === 'available'
              const sourceLinked = Boolean(record.sourceUrl)
              return <tr key={record.id} className="text-xs"><td className="px-4 py-3"><div className="flex items-center gap-2 font-bold capitalize text-slate-800"><span className="text-emerald-800">{record.sourceType === 'auction' ? <Gavel className="h-4 w-4" /> : record.sourceType === 'gis' ? <MapPin className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}</span>{record.sourceType.replace('_', ' ')}</div></td><td className="px-4 py-3"><div className="font-semibold text-slate-900">{record.sourceName}</div><div className="mt-0.5 text-slate-500">{record.sourceType === 'auction' ? 'Auction information' : 'Source record'}</div></td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.verifiedAt ? new Date(record.verifiedAt).toLocaleDateString() : 'Not validated'}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-bold ${providerValidated ? 'bg-emerald-50 text-emerald-800' : sourceLinked ? 'bg-sky-50 text-sky-800' : 'bg-slate-100 text-slate-600'}`}>{providerValidated ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}{providerValidated ? 'Server validated' : sourceLinked ? 'Source linked' : 'Not linked'}</span></td><td className="px-4 py-3">{record.sourceUrl ? <a href={record.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-emerald-700 px-3 py-1.5 font-bold text-emerald-900 hover:bg-emerald-50">Open record <ExternalLink className="h-3.5 w-3.5" /></a> : <span className="inline-flex rounded-md border border-slate-200 px-3 py-1.5 font-bold text-slate-400">Not available</span>}</td></tr>
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-slate-500"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-700" />A source link is not the same as field-level verification. The nine-check panel only trusts server-validated evidence.</p>
      {!paidAccess && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">Upgrade to Investor to unlock the full evidence source center, freshness history, and advanced reports.</div>}
      <PartnerServices userId={userId ?? null} propertyId={property.id} />
    </div>
  )
}

function NotesPreview({ notes, documents, onOpen }: { notes: PropertyNote[]; documents: PropertyDocument[]; onOpen: () => void }) {
  return <section className="border-t border-slate-200 p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-[15px] font-black">Notes &amp; documents</h3><p className="mt-1 text-xs text-slate-500">Keep your research evidence beside the official records.</p></div><button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50"><NotebookPen className="h-3.5 w-3.5" />Add note</button></div><div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">{notes.slice(0, 1).map((note) => <div key={note.id} className="flex items-start gap-3 px-4 py-3 text-xs"><NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span className="min-w-0"><span className="block font-semibold text-slate-800">{note.body}</span><span className="mt-1 block text-slate-500">Added {new Date(note.createdAt).toLocaleString()}</span></span></div>)}{documents.slice(0, 1).map((document) => <div key={document.id} className="flex items-start gap-3 px-4 py-3 text-xs"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{document.filename}</span><span className="mt-1 block text-slate-500">{document.documentType.replace('_', ' ')}</span></span></div>)}{notes.length === 0 && documents.length === 0 && <div className="px-4 py-4 text-xs text-slate-500">No notes or documents yet. Add the evidence you want beside this property.</div>}</div><button type="button" onClick={onOpen} className="mt-3 text-xs font-bold text-emerald-800 hover:underline">View all notes &amp; documents →</button></section>
}

function CalculationProvenanceCard({ property, onOpen }: { property: Property; onOpen: () => void }) {
  const sourceCount = property.source ? 1 : 0
  const memberCount = property.notes ? 1 : 0
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-[15px] font-black">Calculation provenance <CircleHelpIcon /></div><div className="mt-4 divide-y divide-slate-100"><div className="flex items-center justify-between gap-3 py-3"><span className="flex items-center gap-2 text-sm text-slate-700"><Link2 className="h-5 w-5 text-emerald-700" />Source link</span><span className="text-xs font-bold text-slate-700">{sourceCount} item</span></div><div className="flex items-center justify-between gap-3 py-3"><span className="flex items-center gap-2 text-sm text-slate-700"><Database className="h-5 w-5 text-sky-600" />Member entry</span><span className="text-xs font-bold text-slate-700">{memberCount} item</span></div><div className="flex items-center justify-between gap-3 py-3"><span className="flex items-center gap-2 text-sm text-slate-700"><CircleAlert className="h-5 w-5 text-amber-600" />Assumption</span><span className="text-xs font-bold text-slate-700">3 items</span></div></div><button type="button" onClick={onOpen} className="mt-3 text-xs font-bold text-emerald-800 hover:underline">View all calculations →</button></section>
}

function CircleHelpIcon() {
  return <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full border border-slate-400 text-[10px] font-bold text-slate-500">?</span>
}
