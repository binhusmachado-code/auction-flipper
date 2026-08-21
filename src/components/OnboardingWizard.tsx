import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Calculator, CheckCircle2, ExternalLink, Search, ShieldCheck, X } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Props {
  onClose: () => void
  onOpenCalculator: () => void
}

interface Preferences {
  experience: string
  budget: string
  county: string
  strategy: string
  completed: boolean
}

const steps = [
  { title: 'Welcome', icon: BookOpen },
  { title: 'Deed or lien', icon: Search },
  { title: 'Your plan', icon: Calculator },
  { title: 'Research first', icon: ShieldCheck },
  { title: 'Ready to practice', icon: CheckCircle2 },
]

const selectClass = 'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500'

export default function OnboardingWizard({ onClose, onOpenCalculator }: Props) {
  const [step, setStep] = useState(0)
  const [preferences, setPreferences] = useLocalStorage<Preferences>('auction-hunter-onboarding', {
    experience: '', budget: '', county: '', strategy: '', completed: false,
  })
  const StepIcon = steps[step].icon
  const canContinue = step !== 2 || Boolean(preferences.experience && preferences.budget && preferences.county && preferences.strategy)

  const finish = () => {
    setPreferences((current) => ({ ...current, completed: true }))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Beginner path</div>
            <h2 className="mt-1 text-lg font-bold text-white">Start with the process, not the bid</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close beginner guide" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex gap-1 border-b border-zinc-800 px-5 py-3" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((item, index) => <div key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-emerald-500' : 'bg-zinc-800'}`} />)}
        </div>

        <main className="min-h-[390px] p-5 sm:p-8">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"><StepIcon className="h-5 w-5" /></div>

          {step === 0 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">This is a research tool, not a bidding site.</h3>
            <p className="leading-relaxed text-zinc-400">Use it to discover official auctions, organize due diligence, and set a maximum bid. You will always place bids on the county's official auction website, never here.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {['Find the official record', 'Investigate what is unknown', 'Calculate your own limit'].map((text, index) => <div key={text} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4"><div className="text-xs font-bold text-emerald-400">0{index + 1}</div><div className="mt-2 text-sm font-semibold text-zinc-200">{text}</div></div>)}
            </div>
          </div>}

          {step === 1 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">Tax deeds and tax liens are different.</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5"><div className="font-bold text-amber-400">Tax deed</div><p className="mt-2 text-sm leading-relaxed text-zinc-400">You bid for an interest in the real property. It is commonly sold as-is. Title, surviving claims, access, occupancy, land use, and condition still require independent research.</p></div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5"><div className="font-bold text-emerald-400">Tax lien certificate</div><p className="mt-2 text-sm leading-relaxed text-zinc-400">You generally purchase a tax debt certificate, not the house. The owner may redeem it under the applicable rules. Rates, bidding methods, and redemption procedures vary.</p></div>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">The current live inventory is Florida tax deeds. Always read the county's current rules and official sale file.</p>
          </div>}

          {step === 2 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">Set a simple research starting point.</h3>
            <p className="text-sm text-zinc-400">These answers are saved only on this device for now. They do not determine suitability or make an investment recommendation.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Real estate experience</span><select className={selectClass} value={preferences.experience} onChange={(event) => setPreferences({ ...preferences, experience: event.target.value })}><option value="">Choose one</option><option value="first">First purchase</option><option value="some">Bought property before</option><option value="experienced">Experienced investor</option></select></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Maximum available cash</span><select className={selectClass} value={preferences.budget} onChange={(event) => setPreferences({ ...preferences, budget: event.target.value })}><option value="">Choose a range</option><option value="25000">Up to $25,000</option><option value="50000">$25,000 to $50,000</option><option value="100000">$50,000 to $100,000</option><option value="more">More than $100,000</option></select></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-400">County interest</span><select className={selectClass} value={preferences.county} onChange={(event) => setPreferences({ ...preferences, county: event.target.value })}><option value="">Choose one</option><option>Brevard</option><option>Broward</option><option>Suwannee</option><option>Gulf</option><option>Learning only</option></select></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Likely strategy</span><select className={selectClass} value={preferences.strategy} onChange={(event) => setPreferences({ ...preferences, strategy: event.target.value })}><option value="">Choose one</option><option value="resale">Resale</option><option value="rental">Rental</option><option value="land">Land</option><option value="learning">Learning only</option></select></label>
            </div>
          </div>}

          {step === 3 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">Do not let unknown mean zero.</h3>
            <p className="leading-relaxed text-zinc-400">A low opening bid does not cancel risk. Before bidding, verify each item and add money for uncertainty.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {['Parcel and legal description agree', 'Legal and physical access', 'Zoning, buildability, flood and wetlands', 'Occupancy and exterior condition', 'Title search and surviving claims', 'Code, utilities, assessments and association', 'Current auction status and payment deadline', 'Exit plan and title insurability'].map((item) => <div key={item} className="flex gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-300"><ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-amber-400" />{item}</div>)}
            </div>
          </div>}

          {step === 4 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">Practice the complete workflow.</h3>
            <p className="leading-relaxed text-zinc-400">Open a property, compare its parcel information with the official source, research a resale value, add every expected cost, and let the calculator show the highest bid that still leaves your target profit.</p>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="font-bold text-emerald-400">Your first rule</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">Never bid from the card price alone. Stop when title, access, identity, or auction status cannot be verified.</p>
            </div>
            <button type="button" onClick={() => { finish(); onOpenCalculator() }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-700"><Calculator className="h-4 w-4" />Open a calculator example<ExternalLink className="h-4 w-4" /></button>
          </div>}
        </main>

        <footer className="flex items-center justify-between gap-3 border-t border-zinc-800 px-5 py-4">
          <button type="button" disabled={step === 0} onClick={() => setStep((current) => current - 1)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-400 hover:bg-zinc-800 disabled:invisible"><ArrowLeft className="h-4 w-4" />Back</button>
          <span className="text-xs text-zinc-600">{step + 1} of {steps.length}</span>
          {step < steps.length - 1 ? <button type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">Continue<ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={finish} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-400">Finish<CheckCircle2 className="h-4 w-4" /></button>}
        </footer>
      </div>
    </div>
  )
}
