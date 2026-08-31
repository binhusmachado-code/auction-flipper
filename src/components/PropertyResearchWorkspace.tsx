import { useState } from 'react'
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  CircleHelp,
  Clipboard,
  ExternalLink,
  Flag,
  PhoneCall,
  Route,
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  calculateResearchReadiness,
  createEmptyResearchRecord,
  getCountyCallQuestions,
  getResearchSections,
  hasVerifiedEvidence,
  researchWorkspaceStorageKey,
  type ExitStrategy,
  type PropertyResearchRecord,
  type ResearchItemKey,
  type ResearchStatus,
} from '../lib/researchWorkspace'
import type { Property } from '../types/property'

interface Props {
  property: Property
}

const statusOptions: Array<{
  value: ResearchStatus
  label: string
  icon: typeof CircleHelp
  activeClass: string
}> = [
  { value: 'unknown', label: 'Unknown', icon: CircleHelp, activeClass: 'border-slate-300 bg-slate-200 text-slate-800' },
  { value: 'verified', label: 'Verified', icon: CheckCircle2, activeClass: 'border-emerald-500 bg-emerald-500 text-zinc-950' },
  { value: 'concern', label: 'Concern', icon: AlertTriangle, activeClass: 'border-amber-500 bg-amber-500 text-zinc-950' },
  { value: 'stop', label: 'Stop', icon: Ban, activeClass: 'border-red-500 bg-red-500 text-white' },
]

const exitStrategies: Array<{ value: ExitStrategy; label: string }> = [
  { value: '', label: 'Choose an exit' },
  { value: 'resale', label: 'Repair and resell' },
  { value: 'rental', label: 'Keep as a rental' },
  { value: 'hold-land', label: 'Hold or resell land' },
  { value: 'personal-use', label: 'Personal use' },
  { value: 'other', label: 'Other plan' },
]

function normalizedRecord(propertyId: string, value: PropertyResearchRecord): PropertyResearchRecord {
  const empty = createEmptyResearchRecord(propertyId)
  return {
    ...empty,
    ...(value && typeof value === 'object' ? value : {}),
    propertyId,
    items: value?.items && typeof value.items === 'object' ? value.items : {},
  }
}

export default function PropertyResearchWorkspace({ property }: Props) {
  const empty = createEmptyResearchRecord(property.id)
  const [storedRecord, setStoredRecord] = useLocalStorage<PropertyResearchRecord>(researchWorkspaceStorageKey(property.id), empty)
  const record = normalizedRecord(property.id, storedRecord)
  const sections = getResearchSections(property)
  const readiness = calculateResearchReadiness(record, property)
  const questions = getCountyCallQuestions(property)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const progress = Math.round(readiness.verified / readiness.total * 100)

  const updateRecord = (update: (current: PropertyResearchRecord) => PropertyResearchRecord) => {
    setStoredRecord((current) => ({
      ...update(normalizedRecord(property.id, current)),
      updatedAt: new Date().toISOString(),
    }))
  }

  const setItemStatus = (key: ResearchItemKey, status: ResearchStatus) => {
    updateRecord((current) => ({
      ...current,
      items: {
        ...current.items,
        [key]: {
          status,
          note: current.items[key]?.note ?? '',
          checkedAt: status === 'unknown' ? undefined : new Date().toISOString(),
        },
      },
    }))
  }

  const setItemNote = (key: ResearchItemKey, note: string) => {
    updateRecord((current) => ({
      ...current,
      items: {
        ...current.items,
        [key]: {
          status: current.items[key]?.status ?? 'unknown',
          note,
          checkedAt: current.items[key]?.checkedAt,
        },
      },
    }))
  }

  const setExitPlan = (patch: Partial<Pick<PropertyResearchRecord, 'exitStrategy' | 'exitPlan'>>) => {
    updateRecord((current) => ({ ...current, ...patch }))
  }

  const copyQuestions = async () => {
    const heading = `${property.county || property.state} ${property.saleType ?? 'tax sale'} questions`
    const text = `${heading}\n\n${questions.map((question, index) => `${index + 1}. ${question}`).join('\n')}`
    const legacyCopy = () => {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      if (!copied) throw new Error('Copy failed')
    }

    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          legacyCopy()
        }
      } else {
        legacyCopy()
      }
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('failed')
    }
  }

  const stageIndex = readiness.stage === 'quick-screen' ? 0 : readiness.stage === 'due-diligence' ? 1 : 2
  const stages = ['Quick screen', 'Due diligence', 'Bid ready']

  return (
    <section className="py-1" aria-labelledby="research-workspace-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-emerald-700" />
            <h3 id="research-workspace-title" className="text-lg font-black text-slate-950">My property research</h3>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Move one fact at a time from unknown to verified. Add the answer or source so it counts. A concern needs more research. Stop means do not bid until it is resolved.</p>
        </div>
        <div className="flex-none text-left sm:text-right">
          <div className="text-2xl font-black text-slate-950">{readiness.verified}/{readiness.total}</div>
          <div className="text-[11px] font-bold uppercase text-slate-500">facts verified</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200" aria-label="Research stage">
        {stages.map((stage, index) => (
          <div key={stage} className={`border-r border-slate-200 px-2 py-3 text-center text-xs font-bold last:border-r-0 ${index === stageIndex ? 'bg-emerald-700 text-white' : index < stageIndex ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>
            <span className="mr-1 hidden sm:inline">{index + 1}.</span>{stage}
          </div>
        ))}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-label={`${progress}% of research verified`}>
        <div className="h-full bg-emerald-700 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {(readiness.blockers.length > 0 || readiness.concerns.length > 0) && (
        <div className={`mt-4 flex gap-3 rounded-lg border p-3 ${readiness.blockers.length > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          {readiness.blockers.length > 0 ? <Ban className="mt-0.5 h-4 w-4 flex-none text-red-400" /> : <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-400" />}
          <p className="text-xs leading-relaxed text-slate-700">
            {readiness.blockers.length > 0
              ? `${readiness.blockers.length} stop item${readiness.blockers.length === 1 ? '' : 's'} block this property from becoming bid ready.`
              : `${readiness.concerns.length} concern${readiness.concerns.length === 1 ? '' : 's'} still need an answer before bidding.`}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {sections.map((section, sectionIndex) => (
          <details key={section.key} open={sectionIndex === 0} className="group border-b border-slate-200 pb-5 last:border-b-0">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-md py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <div>
                <h4 className="font-black text-slate-950">{section.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{section.description}</p>
              </div>
              <span className="mt-0.5 flex-none text-xs font-bold text-slate-500 group-open:text-emerald-700">{section.items.filter((item) => hasVerifiedEvidence(record.items[item.key])).length}/{section.items.length}</span>
            </summary>

            <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {section.items.map((item) => {
                const state = record.items[item.key] ?? { status: 'unknown' as const, note: '' }
                return (
                  <div key={item.key} className="py-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">{item.title}</h5>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.help}</p>
                      </div>
                      <div className="grid grid-cols-4 overflow-hidden rounded-md border border-slate-200 bg-white" role="group" aria-label={`${item.title} status`}>
                        {statusOptions.map(({ value, label, icon: Icon, activeClass }) => {
                          const active = state.status === value
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setItemStatus(item.key, value)}
                              aria-pressed={active}
                              aria-label={`${label}: ${item.title}`}
                              title={`${label}: ${item.title}`}
                              className={`flex h-9 min-w-10 items-center justify-center gap-1 border-r border-slate-200 px-2 text-[10px] font-bold last:border-r-0 ${active ? activeClass : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">{label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {state.status !== 'unknown' && (
                      <input
                        value={state.note}
                        onChange={(event) => setItemNote(item.key, event.target.value)}
                        placeholder="Add the answer, source, date, or problem you found"
                        aria-label={`Notes for ${item.title}`}
                        className="mt-3 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>

      <section className="mt-6 border-t border-slate-200 pt-5" aria-labelledby="exit-plan-title">
        <div className="flex items-center gap-2"><Flag className="h-4 w-4 text-sky-600" /><h4 id="exit-plan-title" className="font-black text-slate-950">Exit plan before bidding</h4></div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Decide who will use or buy the property, why they would want it, and what must happen first.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
          <select value={record.exitStrategy} onChange={(event) => setExitPlan({ exitStrategy: event.target.value as ExitStrategy })} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-600" aria-label="Exit strategy">
            {exitStrategies.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input value={record.exitPlan} onChange={(event) => setExitPlan({ exitPlan: event.target.value })} placeholder="Example: sell to a local buyer after title work and repairs" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-600" aria-label="Exit plan details" />
        </div>
        {!readiness.exitPlanComplete && <p className="mt-2 text-xs font-semibold text-amber-400">Choose an exit and write the plan before this property can become bid ready.</p>}
      </section>

      <details className="mt-6 border-t border-slate-200 pt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <div className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-violet-600" /><span className="font-black text-slate-950">Questions to ask {property.county ? `${property.county} County` : 'the selling office'}</span></div>
          <span className="text-xs font-bold text-slate-500">{questions.length} questions</span>
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">Use the official listing contact. Write down the employee name, date, and where each answer is published.</p>
        <ol className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {questions.map((question, index) => (
            <li key={question} className="grid grid-cols-[28px_1fr] gap-3 py-3 text-xs leading-relaxed text-slate-600">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-50 font-black text-violet-700">{index + 1}</span>
              <span>{question}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void copyQuestions()} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
            {copyState === 'copied' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5" />}
            {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy questions'}
          </button>
          <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Official listing<ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </details>
    </section>
  )
}
