import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileCheck2,
  Gavel,
  Landmark,
  LockKeyhole,
  ReceiptText,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  WalletCards,
  X,
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Props {
  onClose: () => void
  onOpenCalculator: () => void
  onCreateAccount: () => void
}

interface Preferences {
  experience: string
  budget: string
  county: string
  strategy: string
  completed: boolean
}

const steps = [
  { title: 'The full path', icon: BookOpen },
  { title: 'Deed or lien', icon: Building2 },
  { title: 'Your plan', icon: Calculator },
  { title: 'Research', icon: Search },
  { title: 'Register', icon: UserCheck },
  { title: 'Fund', icon: WalletCards },
  { title: 'Bid', icon: Gavel },
  { title: 'Pay', icon: CircleDollarSign },
  { title: 'Finish', icon: CheckCircle2 },
]

const journey = [
  { label: 'Research', icon: Search, color: 'text-sky-400' },
  { label: 'Register', icon: UserCheck, color: 'text-violet-400' },
  { label: 'Fund', icon: WalletCards, color: 'text-amber-400' },
  { label: 'Bid', icon: Gavel, color: 'text-rose-400' },
  { label: 'Pay & deed', icon: ReceiptText, color: 'text-emerald-400' },
]

const selectClass = 'h-12 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500'

function IllustratedJourney() {
  return (
    <div className="grid grid-cols-5 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/70" aria-label="Auction purchase journey">
      {journey.map(({ label, icon: Icon, color }, index) => (
        <div key={label} className="relative min-w-0 border-r border-zinc-800 px-1.5 py-4 text-center last:border-r-0 sm:px-3">
          <div className={`mx-auto grid h-9 w-9 place-items-center rounded-lg bg-zinc-900 ${color}`}><Icon className="h-4 w-4" /></div>
          <div className="mt-2 text-[10px] font-bold leading-tight text-zinc-300 sm:text-xs">{label}</div>
          {index < journey.length - 1 && <ArrowRight className="absolute -right-2 top-6 z-10 h-3.5 w-3.5 rounded-full bg-zinc-950 text-zinc-600" />}
        </div>
      ))}
    </div>
  )
}

function StepList({ items }: { items: Array<{ title: string; detail: string }> }) {
  return (
    <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950/55">
      {items.map((item, index) => (
        <div key={item.title} className="flex gap-3 p-3.5">
          <div className="grid h-7 w-7 flex-none place-items-center rounded-md bg-emerald-500/10 text-xs font-extrabold text-emerald-400">{index + 1}</div>
          <div><div className="text-sm font-bold text-zinc-200">{item.title}</div><p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.detail}</p></div>
        </div>
      ))}
    </div>
  )
}

export default function OnboardingWizard({ onClose, onOpenCalculator, onCreateAccount }: Props) {
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-3" onClick={onClose}>
      <div className="flex h-[min(760px,96vh)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex flex-none items-center justify-between border-b border-zinc-800 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Illustrated beginner guide</div>
            <h2 className="mt-1 truncate text-base font-bold text-white sm:text-lg">From first search to official purchase</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close beginner guide" className="ml-3 rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex flex-none gap-1 border-b border-zinc-800 px-4 py-3 sm:px-5" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((item, index) => <div key={item.title} title={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-emerald-500' : 'bg-zinc-800'}`} />)}
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-emerald-500/10 text-emerald-400"><StepIcon className="h-5 w-5" /></div>
            <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Step {step + 1}</div><div className="text-sm font-bold text-zinc-300">{steps[step].title}</div></div>
          </div>

          {step === 0 && <div className="space-y-5">
            <div><h3 className="text-2xl font-extrabold text-white">We stay with you through every stage.</h3><p className="mt-2 leading-relaxed text-zinc-400">Auction Flipper organizes the work and sends you to the verified county auction when an official action is required. Your passwords and property funds stay with the county or its authorized provider.</p></div>
            <IllustratedJourney />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4"><ShieldCheck className="h-5 w-5 flex-none text-emerald-400" /><div><div className="text-sm font-bold text-zinc-200">Guided inside our website</div><p className="mt-1 text-xs leading-relaxed text-zinc-500">Research, checklist, maximum bid, deposit estimate, deadlines, receipts, and saved progress.</p></div></div>
              <div className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"><Landmark className="h-5 w-5 flex-none text-amber-400" /><div><div className="text-sm font-bold text-zinc-200">Completed on the official site</div><p className="mt-1 text-xs leading-relaxed text-zinc-500">Identity approval, bidder deposit, binding bid, winning balance, and official receipt.</p></div></div>
            </div>
          </div>}

          {step === 1 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">Know what you are purchasing.</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5"><Building2 className="h-6 w-6 text-amber-400" /><div className="mt-3 font-bold text-amber-400">Tax deed</div><p className="mt-2 text-sm leading-relaxed text-zinc-400">You bid for an interest in real property. It is commonly sold as-is. Title, surviving claims, access, occupancy, land use, and condition still require independent research.</p></div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5"><ReceiptText className="h-6 w-6 text-emerald-400" /><div className="mt-3 font-bold text-emerald-400">Tax lien certificate</div><p className="mt-2 text-sm leading-relaxed text-zinc-400">You generally purchase a tax debt certificate, not the house. The owner may redeem under that jurisdiction's rules. Rates and bidding methods vary.</p></div>
            </div>
            <p className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-xs leading-relaxed text-zinc-500">The current live inventory is Florida tax deeds. Confirm the sale type on the property card and the official county file before continuing.</p>
          </div>}

          {step === 2 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">Set a simple research starting point.</h3>
            <p className="text-sm text-zinc-400">These answers stay on this device. They help organize the guide; they are not an investment recommendation.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Real estate experience</span><select className={selectClass} value={preferences.experience} onChange={(event) => setPreferences({ ...preferences, experience: event.target.value })}><option value="">Choose one</option><option value="first">First purchase</option><option value="some">Bought property before</option><option value="experienced">Experienced investor</option></select></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Maximum available cash</span><select className={selectClass} value={preferences.budget} onChange={(event) => setPreferences({ ...preferences, budget: event.target.value })}><option value="">Choose a range</option><option value="25000">Up to $25,000</option><option value="50000">$25,000 to $50,000</option><option value="100000">$50,000 to $100,000</option><option value="more">More than $100,000</option></select></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-400">County interest</span><select className={selectClass} value={preferences.county} onChange={(event) => setPreferences({ ...preferences, county: event.target.value })}><option value="">Choose one</option><option>Brevard</option><option>Broward</option><option>Suwannee</option><option>Gulf</option><option>Learning only</option></select></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-zinc-400">Likely strategy</span><select className={selectClass} value={preferences.strategy} onChange={(event) => setPreferences({ ...preferences, strategy: event.target.value })}><option value="">Choose one</option><option value="resale">Resale</option><option value="rental">Rental</option><option value="land">Land</option><option value="learning">Learning only</option></select></label>
            </div>
          </div>}

          {step === 3 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">Investigate before you register to bid.</h3>
            <p className="leading-relaxed text-zinc-400">Match our property to the official parcel and stop when a critical fact cannot be verified.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {['Parcel and legal description agree', 'Legal and physical access', 'Zoning, buildability, flood and wetlands', 'Occupancy and exterior condition', 'Title search and surviving claims', 'Code, utilities, assessments and association', 'Current auction status and payment deadline', 'Exit plan and title insurability'].map((item) => <div key={item} className="flex gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-300"><ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-amber-400" />{item}</div>)}
            </div>
          </div>}

          {step === 4 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">Create and approve your official bidder account.</h3>
            <div className="grid gap-4 sm:grid-cols-[1fr_250px]">
              <StepList items={[
                { title: 'Open Official Auction', detail: 'Use the button on the property page so you land on the correct county provider.' },
                { title: 'Select Register', detail: 'Create the vendor account directly. Never give Auction Flipper that password.' },
                { title: 'Verify identity and email', detail: 'Enter the legal bidder details, tax information, and name that should appear on title.' },
                { title: 'Wait for approval', detail: 'Do not fund or bid until the official site shows an approved bidder number.' },
              ]} />
              <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3 shadow-xl">
                <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2"><span className="h-2 w-2 rounded-full bg-rose-400" /><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="ml-2 text-[9px] text-zinc-600">Official bidder registration</span></div>
                <div className="mt-4 space-y-2"><div className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-[10px] text-zinc-600">Legal name</div><div className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-[10px] text-zinc-600">Email and identity</div><div className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-[10px] text-zinc-600">Name on title</div><div className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-500/15 py-2 text-[10px] font-bold text-emerald-400"><BadgeCheck className="h-3.5 w-3.5" />Bidder approved</div></div>
              </div>
            </div>
          </div>}

          {step === 5 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">Fund the official bidder account before cutoff.</h3>
            <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
              <StepList items={[
                { title: 'Read the funding cutoff', detail: 'The county may require cleared funds before the auction date. Do not wait until sale day.' },
                { title: 'Estimate the required deposit', detail: 'For Florida tax deeds, plan for at least $200 or 5% of the bid, whichever is greater.' },
                { title: 'Use an accepted method', detail: 'Follow the official portal instructions for ACH, wire, or another county-approved method.' },
                { title: 'Confirm available balance', detail: 'A sent transfer is not enough. The official bidder dashboard must show funds available to bid.' },
              ]} />
              <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-4">
                <div className="flex items-center justify-between"><div className="text-xs font-bold text-zinc-400">Official bidder wallet</div><WalletCards className="h-5 w-5 text-amber-400" /></div>
                <div className="mt-5 text-[10px] uppercase tracking-[0.14em] text-zinc-600">Example maximum bid</div><div className="mt-1 text-2xl font-extrabold text-white">$20,000</div>
                <div className="mt-4 flex items-center justify-between border-y border-zinc-800 py-3 text-xs"><span className="text-zinc-500">Est. minimum</span><strong className="text-zinc-200">$1,000</strong></div>
                <div className="mt-4 flex items-center justify-center gap-2 rounded-md bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-400"><CheckCircle2 className="h-4 w-4" />Funds available</div>
              </div>
            </div>
          </div>}

          {step === 6 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">Bid on the official auction, with a hard stop.</h3>
            <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
              <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-4">
                <div className="flex items-center justify-between"><div className="text-xs font-bold text-zinc-400">Parcel 00-0000</div><Gavel className="h-5 w-5 text-rose-400" /></div>
                <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-md bg-zinc-900 p-3"><div className="text-[9px] uppercase text-zinc-600">Current bid</div><div className="mt-1 font-extrabold text-white">$14,500</div></div><div className="rounded-md bg-zinc-900 p-3"><div className="text-[9px] uppercase text-zinc-600">Your stop</div><div className="mt-1 font-extrabold text-amber-400">$18,000</div></div></div>
                <div className="mt-3 flex items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-400"><LockKeyhole className="h-4 w-4" />Never exceed your stop</div>
              </div>
              <StepList items={[
                { title: 'Recheck the parcel and case', detail: 'Confirm the official auction item matches the property you researched.' },
                { title: 'Enter only your approved limit', detail: 'Use the maximum-bid calculator and include repair, title, holding, and uncertainty costs.' },
                { title: 'Review before submitting', detail: 'Check the amount, bidder name, deposit impact, and any advance-bid or live-bid setting.' },
                { title: 'Save official confirmation', detail: 'A bid counts only when the auction provider accepts it and shows a confirmation or current status.' },
              ]} />
            </div>
          </div>}

          {step === 7 && <div className="space-y-4">
            <h3 className="text-2xl font-extrabold text-white">If you win, complete payment before the official deadline.</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: 'Winner notice', detail: 'Record the bid and confirmation.', icon: Gavel, color: 'text-rose-400' },
                { label: 'Balance & fees', detail: 'Verify the exact amount due.', icon: Calculator, color: 'text-sky-400' },
                { label: 'Official payment', detail: 'Pay only the clerk or provider.', icon: CircleDollarSign, color: 'text-amber-400' },
                { label: 'Save receipt', detail: 'Record payment inside Bid Center.', icon: ReceiptText, color: 'text-emerald-400' },
              ].map(({ label, detail, icon: Icon, color }) => <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4"><Icon className={`h-5 w-5 ${color}`} /><div className="mt-3 text-sm font-bold text-zinc-200">{label}</div><p className="mt-1 text-xs leading-relaxed text-zinc-500">{detail}</p></div>)}
            </div>
            <div className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"><CircleDollarSign className="h-5 w-5 flex-none text-amber-400" /><p className="text-sm leading-relaxed text-zinc-300">Florida tax-deed balances and applicable fees are generally due within 24 hours, excluding weekends and legal holidays, but the county may publish an earlier cutoff. Use the deadline shown by the official provider.</p></div>
          </div>}

          {step === 8 && <div className="space-y-5">
            <h3 className="text-2xl font-extrabold text-white">Purchase recorded. Keep following through.</h3>
            <IllustratedJourney />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/55 p-4"><FileCheck2 className="h-5 w-5 text-emerald-400" /><div className="mt-3 text-sm font-bold text-zinc-200">Keep the complete file</div><p className="mt-1 text-xs leading-relaxed text-zinc-500">Bid confirmation, payment receipt, county notices, recorded deed, title work, inspection notes, and every cost.</p></div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/55 p-4"><ShieldCheck className="h-5 w-5 text-sky-400" /><div className="mt-3 text-sm font-bold text-zinc-200">Plan post-sale work</div><p className="mt-1 text-xs leading-relaxed text-zinc-500">Deed recording, possession, insurance, title or quiet-title work, taxes, utilities, repairs, and your intended exit.</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => { finish(); onCreateAccount() }} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400"><UserPlus className="h-4 w-4" />Create your account</button><button type="button" onClick={() => { finish(); onOpenCalculator() }} className="flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm font-bold text-zinc-200 hover:bg-zinc-700"><Calculator className="h-4 w-4" />Practice the calculator<ExternalLink className="h-4 w-4" /></button></div>
          </div>}
        </main>

        <footer className="flex flex-none items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" disabled={step === 0} onClick={() => setStep((current) => current - 1)} className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold text-zinc-400 hover:bg-zinc-800 disabled:invisible"><ArrowLeft className="h-4 w-4" />Back</button>
          <span className="text-xs text-zinc-600">{step + 1} of {steps.length}</span>
          {step < steps.length - 1 ? <button type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)} className="flex h-10 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">Continue<ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={finish} className="flex h-10 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-bold text-zinc-950 hover:bg-emerald-400">Finish<Check className="h-4 w-4" /></button>}
        </footer>
      </div>
    </div>
  )
}
