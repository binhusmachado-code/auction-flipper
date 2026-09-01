import { AlertTriangle, CheckCircle2, CircleDashed, CircleStop, Clock3, RefreshCw } from 'lucide-react'
import type { PropertyVerificationReport, VerificationStatus } from '../lib/propertyVerification'

interface Props {
  report: PropertyVerificationReport
  compact?: boolean
  onReview?: () => void
}
const statusContent: Record<VerificationStatus, { label: string; icon: typeof CheckCircle2; badge: string; iconClass: string }> = {
  verified: { label: 'Verified', icon: CheckCircle2, badge: 'bg-emerald-100 text-emerald-900', iconClass: 'text-emerald-700' },
  partial: { label: 'Partial', icon: CircleDashed, badge: 'bg-sky-100 text-sky-900', iconClass: 'text-sky-700' },
  action_required: { label: 'Action required', icon: AlertTriangle, badge: 'bg-amber-100 text-amber-950', iconClass: 'text-amber-600' },
  stop: { label: 'Stop', icon: CircleStop, badge: 'bg-red-100 text-red-900', iconClass: 'text-red-700' },
}

function formatTimestamp(value: string | null) {
  if (!value) return 'No final source timestamp'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function AutomatedVerificationPanel({ report, compact = false, onReview }: Props) {
  const overall = statusContent[report.overallStatus]
  const OverallIcon = overall.icon
  const authorityLabel = report.authoritative ? 'Server audit' : 'Provisional preview'

  if (compact) {
    const counts = report.checks.reduce<Record<VerificationStatus, number>>((result, item) => {
      result[item.status] += 1
      return result
    }, { verified: 0, partial: 0, action_required: 0, stop: 0 })
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="text-[15px] font-black">Automatic double-check</h3><p className="mt-1 text-xs text-slate-500">Evidence-based; never substitutes for title or legal review.</p></div>
          <OverallIcon className={`h-5 w-5 ${overall.iconClass}`} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {(['verified', 'partial', 'action_required', 'stop'] as VerificationStatus[]).map((status) => {
            const content = statusContent[status]
            const Icon = content.icon
            return <div key={status} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="flex items-center gap-1.5 text-slate-600"><Icon className={`h-3.5 w-3.5 ${content.iconClass}`} />{content.label}</span><strong>{counts[status]}</strong></div>
          })}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><Clock3 className="h-3.5 w-3.5" />{authorityLabel} · provider-validated source: {formatTimestamp(report.lastSourceVerifiedAt)}</div>
        {onReview && <button type="button" onClick={onReview} className="mt-3 text-xs font-bold text-emerald-800 hover:underline">Review all nine checks →</button>}
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby="automatic-verification-title">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-emerald-700" /><h3 id="automatic-verification-title" className="font-black text-slate-950">Automatic source double-check</h3></div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{report.authoritative ? 'Authoritative server result from the current property record, validated sources, saved documents, analysis, and deadlines.' : 'Browser preview only. Server verification is required before this property can be bid-ready.'}</p>
        </div>
        <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${overall.badge}`}><OverallIcon className="h-4 w-4" />{authorityLabel} · {report.verifiedCount}/9 · {overall.label}</div>
      </div>
      <div className="divide-y divide-slate-100">
        {report.checks.map((item) => {
          const content = statusContent[item.status]
          const Icon = content.icon
          return (
            <details key={item.key} className="group px-4 py-3">
              <summary className="grid cursor-pointer list-none gap-2 sm:grid-cols-[24px_minmax(0,1fr)_auto] sm:items-center">
                <Icon className={`h-5 w-5 ${content.iconClass}`} />
                <span><span className="block text-sm font-bold text-slate-900">{item.title}</span><span className="mt-0.5 block text-xs text-slate-500">{item.summary}</span></span>
                <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${content.badge}`}>{content.label}</span>
              </summary>
              <div className="ml-0 mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:ml-6 sm:grid-cols-2">
                <div><div className="font-black uppercase tracking-wide text-slate-500">Evidence found</div>{item.evidence.length ? <ul className="mt-1.5 space-y-1 text-slate-700">{item.evidence.map((evidence) => <li key={evidence}>✓ {evidence}</li>)}</ul> : <p className="mt-1.5 text-slate-500">No verified evidence found.</p>}</div>
                <div><div className="font-black uppercase tracking-wide text-slate-500">Still needed</div>{item.missing.length ? <ul className="mt-1.5 space-y-1 text-slate-700">{item.missing.map((missing) => <li key={missing}>• {missing}</li>)}</ul> : <p className="mt-1.5 text-emerald-800">Nothing missing for this check.</p>}</div>
              </div>
            </details>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-500"><span>{authorityLabel} · engine {report.engineVersion} · checked {formatTimestamp(report.checkedAt)}</span><span className="font-semibold">Last provider-validated source: {formatTimestamp(report.lastSourceVerifiedAt)}</span></div>
    </section>
  )
}
