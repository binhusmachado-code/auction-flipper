import { useState } from 'react'
import {
  BookOpen, Percent, Building2, Gavel, Landmark, Home, Flag,
  Wallet, CreditCard, Clock, KeyRound, Tag, AlertTriangle, HelpCircle,
  BookText, ChevronDown, CheckCircle2, ShieldCheck, FileText, Ban,
} from 'lucide-react'

interface Props {
  onClose: () => void
}

/* ---------- small building blocks ---------- */

function Section({ id, icon: Icon, title, sub, children }: {
  id: string
  icon: React.ElementType
  title: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="flex items-start gap-4 mb-5">
        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex-shrink-0">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">{title}</h2>
          {sub && <p className="text-sm text-zinc-500 mt-1">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-950/60 border border-zinc-800/70 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  )
}

function Accordion({ title, children, defaultOpen = false }: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-zinc-950/60 border border-zinc-800/70 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-900/40 transition-colors"
      >
        <span className="font-bold text-zinc-100 text-sm sm:text-base">{title}</span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 animate-fade-in">{children}</div>}
    </div>
  )
}

function AuctionTypeCard({ icon: Icon, color, name, tagline, children }: {
  icon: React.ElementType
  color: 'emerald' | 'amber' | 'sky' | 'rose' | 'violet' | 'cyan'
  name: string
  tagline: string
  children: React.ReactNode
}) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  }[color]
  return (
    <Card>
      <div className="flex items-center gap-3 mb-1">
        <div className={`p-2.5 rounded-xl border ${colors}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-extrabold text-zinc-100">{name}</h3>
          <p className="text-xs text-zinc-500">{tagline}</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">{label}</div>
      <div className="text-sm text-zinc-400 leading-relaxed">{children}</div>
    </div>
  )
}

/* ---------- main guide ---------- */

const TOC = [
  { id: 'journey', label: 'How buying works' },
  { id: 'deposit', label: 'The deposit' },
  { id: 'auction-types', label: 'Auction types' },
  { id: 'payments', label: 'Payments' },
  { id: 'move-in', label: 'Moving in' },
  { id: 'resell', label: 'Selling & renting' },
  { id: 'risks', label: 'Risks & checklist' },
  { id: 'faq', label: 'FAQ' },
  { id: 'glossary', label: 'Glossary' },
]

export default function Guide({ onClose }: Props) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/70">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-white">Buyer Guide</h1>
              <p className="text-[11px] text-zinc-500">Everything about auctions, payments, move-in & reselling</p>
            </div>
          </div>
          <button onClick={onClose} className="pill-btn !px-4 !py-2 text-xs">Back to Deals</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-24 space-y-14">
        {/* TOC */}
        <div className="flex flex-wrap gap-2">
          {TOC.map((t) => (
            <button
              key={t.id}
              onClick={() => scrollTo(t.id)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 1 — Journey */}
        <Section id="journey" icon={Flag} title="How buying works here" sub="From browsing to owning — the 6 steps, in plain language.">
          <div className="space-y-3">
            {[
              ['1', 'Browse deals', 'Every property on this site comes from a real government or bank source (county tax lists, HUD, GSA, sheriff sales). We pre-filter for deals where the numbers make sense.'],
              ['2', 'Study the property', 'Open the Investment Analysis on any card. Check the price, estimated value, interest rate, and redemption period. Always verify with the official source link — and visit or drive by the property if you can.'],
              ['3', 'Tap Buy and place your order', 'Our 5-step wizard collects your name, email, and how you want to pay. This is free — you are not charged anything on this website. You receive an order confirmation email with your reference number.'],
              ['4', 'Pay the deposit', 'A small deposit (usually 5–10% of the price) reserves your spot and proves you are a serious bidder. It is paid directly to the auction authority — county, bank, or auction house — never to this website.'],
              ['5', 'Auction day', 'Depending on the sale type, you bid live (online or in person), or our partner team bids on your behalf up to your maximum. If someone outbids you, your deposit comes back.'],
              ['6', 'Win, pay the balance, get the title', 'If you win, you pay the remaining balance within the deadline (see Payments below), receive the deed or lien certificate, and the property (or lien) is legally yours.'],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-4 bg-zinc-950/60 border border-zinc-800/70 rounded-2xl p-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 text-sm font-extrabold flex items-center justify-center flex-shrink-0">{n}</div>
                <div>
                  <div className="font-bold text-zinc-100">{t}</div>
                  <div className="text-sm text-zinc-500 mt-1 leading-relaxed">{d}</div>
                </div>
              </div>
            ))}
          </div>
          <Card className="mt-4 !bg-emerald-500/5 !border-emerald-500/15">
            <div className="flex gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-300 leading-relaxed">
                <strong className="text-emerald-400">Do I need an account?</strong> No. You can browse every deal and place an order
                with just your name and email. Optional accounts (created by our team for customers who ask) add
                saved favorites and deal alerts — but an account is never required to buy.
              </p>
            </div>
          </Card>
        </Section>

        {/* 2 — Deposit */}
        <Section id="deposit" icon={Wallet} title="The deposit — what it is and why" sub="The most asked question, answered honestly.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <InfoRow label="What it is">
                A good-faith payment (also called <em>earnest money</em> or a <em>bidder deposit</em>) that reserves your spot
                in the auction. Typical amounts: <strong className="text-zinc-200">5–10% of the purchase price</strong>, or a
                flat $500–$5,000 depending on the county or auction house. On this site we show the exact amount before you confirm anything.
              </InfoRow>
            </Card>
            <Card>
              <InfoRow label="Who gets it">
                Never us. The deposit goes to the <strong className="text-zinc-200">auction authority</strong> — the county tax
                office, sheriff, bankruptcy trustee, bank, or auction company running the sale. We email you their exact
                payment instructions after you place an order.
              </InfoRow>
            </Card>
            <Card>
              <InfoRow label="When you get it back">
                If you <strong className="text-zinc-200">don't win</strong> the auction, the deposit is refunded in full —
                usually within a few business days. If you win, it is applied toward your purchase price (it is not an extra fee).
              </InfoRow>
            </Card>
            <Card>
              <InfoRow label="When you LOSE it">
                Only if you <strong className="text-rose-400">win and then refuse to pay</strong> the remaining balance by the
                deadline. Auction rules are strict about this — a winning bid is a binding contract. Never bid money you don't have.
              </InfoRow>
            </Card>
          </div>
        </Section>

        {/* 3 — Auction types */}
        <Section id="auction-types" icon={Gavel} title="How each auction type works" sub="Six kinds of sales on this site — each with different rules, timelines and risks.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AuctionTypeCard icon={Percent} color="emerald" name="Tax Lien" tagline="You buy the unpaid tax debt, not the house">
              <InfoRow label="How it works">
                The county sells the owner's unpaid property-tax bill to investors. You pay the taxes owed; the owner must then
                repay <strong className="text-zinc-200">you</strong> with interest — typically 9–18% per year, set by state law.
              </InfoRow>
              <InfoRow label="Timeline">
                The owner has a <strong className="text-zinc-200">redemption period</strong> (about 6 months–3 years, varies by state)
                to pay you back in full plus interest. Most owners pay. If they never pay, you may foreclose and take the property.
              </InfoRow>
              <InfoRow label="Moving in">
                You do <strong className="text-rose-400">not</strong> get the property or move in. You own a debt certificate.
                Possession is only possible much later, and only if you complete a foreclosure.
              </InfoRow>
              <InfoRow label="Selling / exiting">
                You are normally paid out with interest when the owner redeems. Some states let you sell (assign) the lien
                certificate to another investor, but most buyers simply hold it until redemption.
              </InfoRow>
            </AuctionTypeCard>

            <AuctionTypeCard icon={Building2} color="amber" name="Tax Deed" tagline="You buy the actual property at auction">
              <InfoRow label="How it works">
                When taxes stay unpaid for years, the county seizes the property and auctions the deed itself.
                Winning bid = you own the real estate.
              </InfoRow>
              <InfoRow label="Timeline">
                Deposit on auction day; the balance is usually due within <strong className="text-zinc-200">24 hours to 30 days</strong>.
                A few states (e.g. Texas, Georgia) give the old owner a post-sale redemption window of 6 months–2 years during
                which they can buy the property back from you at a premium.
              </InfoRow>
              <InfoRow label="Moving in">
                After the deed is recorded — often within weeks. If the home is occupied, you may need a formal eviction
                process, which takes extra weeks to months. In redemption states you should wait out the redemption window first.
              </InfoRow>
              <InfoRow label="Selling / reselling">
                You can resell once the deed is in your name. Many buyers do a <strong className="text-zinc-200">quiet title action</strong>
                (a short court process, roughly 2–6 months) first, because title insurers are cautious with tax deeds —
                without it, resale to a financed buyer is harder.
              </InfoRow>
            </AuctionTypeCard>

            <AuctionTypeCard icon={Gavel} color="sky" name="Foreclosure / Sheriff Sale" tagline="Courthouse auctions of mortgaged homes">
              <InfoRow label="How it works">
                A lender forecloses and the property is sold at a public auction — on the courthouse steps or online.
                Bidding starts near the debt owed. Everything is sold strictly <strong className="text-zinc-200">as-is</strong>,
                often with no interior access beforehand.
              </InfoRow>
              <InfoRow label="Timeline">
                A 5–10% deposit is due immediately when you win; the balance is typically due within
                <strong className="text-zinc-200"> 24 hours to 30 days</strong>. Some states (e.g. North Carolina) add an
                <em> upset-bid</em> window (~10 days) where others can outbid you before the sale is final.
              </InfoRow>
              <InfoRow label="Moving in">
                After the trustee or sheriff's deed is issued and recorded. If the former owner or tenants still live there,
                eviction can add 1–3 months. Budget for it.
              </InfoRow>
              <InfoRow label="Selling / reselling">
                Once the deed records, you can renovate and resell immediately. Check for surviving junior liens or IRS
                redemption rights (the IRS has 120 days on some foreclosures) before counting your profit.
              </InfoRow>
            </AuctionTypeCard>

            <AuctionTypeCard icon={Landmark} color="rose" name="REO / Bank-Owned (HUD)" tagline="The auction already happened — the bank owns it">
              <InfoRow label="How it works">
                If nobody bids at the foreclosure auction, the lender takes the property back and lists it for sale —
                HUD Home Store is the federal version. You submit an offer like a normal purchase, not a live auction bid.
              </InfoRow>
              <InfoRow label="Timeline">
                Much calmer: offer accepted → <strong className="text-zinc-200">30–45 days to close</strong>. HUD gives
                owner-occupants a priority window (usually the first 7–30 days) before investors may bid.
                Financing and inspections are usually allowed.
              </InfoRow>
              <InfoRow label="Moving in">
                At closing, like any regular home purchase. These homes are almost always vacant.
              </InfoRow>
              <InfoRow label="Selling / reselling">
                Immediately after closing. Note: FHA-backed buyers face a 90-day anti-flipping rule if you resell quickly,
                which can shrink your buyer pool in the first 3 months.
              </InfoRow>
            </AuctionTypeCard>

            <AuctionTypeCard icon={Home} color="violet" name="Estate Auction" tagline="Heirs sell an inherited property">
              <InfoRow label="How it works">
                When an owner passes away, the estate sells the property — often through an auction company.
                Terms are set by the estate: commonly ~10% deposit, closing in 30–45 days. Usually as-is,
                but inspections before the auction are often welcomed.
              </InfoRow>
              <InfoRow label="Timeline">
                Deposit on auction day → closing in about a month. Some estate sales need a quick court confirmation,
                which can add 2–4 weeks.
              </InfoRow>
              <InfoRow label="Moving in">At closing. Homes are typically vacant by auction day.</InfoRow>
              <InfoRow label="Selling / reselling">
                Freely — title usually comes through the estate cleanly, so reselling and financing are straightforward.
              </InfoRow>
            </AuctionTypeCard>

            <AuctionTypeCard icon={Flag} color="cyan" name="Government Surplus (GSA)" tagline="Federal agencies selling property they no longer need">
              <InfoRow label="How it works">
                Agencies like the GSA auction surplus real estate online. You register, bid online, and pay a deposit
                by card or wire. These sales usually come with <strong className="text-zinc-200">clear title</strong> —
                a big advantage over other auction types.
              </InfoRow>
              <InfoRow label="Timeline">
                Deposit when you win → full payment within days → deed transfer in a few weeks.
              </InfoRow>
              <InfoRow label="Moving in">After closing and recording. Properties are vacant government assets.</InfoRow>
              <InfoRow label="Selling / reselling">Immediately — clear title makes resale the simplest of all auction types.</InfoRow>
            </AuctionTypeCard>
          </div>
        </Section>

        {/* 4 — Payments */}
        <Section id="payments" icon={CreditCard} title="Payments: methods, deadlines, refunds" sub="How money moves at every stage.">
          <Card className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                  <th className="pb-3 pr-4">Stage</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">When it's due</th>
                  <th className="pb-3 pr-4">Usual methods</th>
                  <th className="pb-3">Refundable?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-400">
                <tr>
                  <td className="py-3 pr-4 font-bold text-zinc-200">Bidder deposit</td>
                  <td className="py-3 pr-4">5–10% of price (or flat fee)</td>
                  <td className="py-3 pr-4">When you register / win</td>
                  <td className="py-3 pr-4">Wire, cashier's check, card</td>
                  <td className="py-3"><span className="text-emerald-400 font-bold">Yes</span> — if you don't win, or applied to price if you do</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-bold text-zinc-200">Balance</td>
                  <td className="py-3 pr-4">Remaining 90–95%</td>
                  <td className="py-3 pr-4">24 hours – 30 days after winning (varies)</td>
                  <td className="py-3 pr-4">Wire or cashier's check only (most auctions)</td>
                  <td className="py-3"><span className="text-rose-400 font-bold">No</span> — missing the deadline forfeits your deposit</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-bold text-zinc-200">Buyer fees</td>
                  <td className="py-3 pr-4">0–10% buyer's premium + recording/closing costs</td>
                  <td className="py-3 pr-4">With the balance</td>
                  <td className="py-3 pr-4">Same as balance</td>
                  <td className="py-3">No</td>
                </tr>
              </tbody>
            </table>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Card>
              <div className="flex gap-3">
                <Clock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200">Auctions want cash-like money.</strong> Traditional mortgages are too slow for
                  most live auctions. Buyers typically use savings, hard-money loans, or lines of credit — then refinance later.
                  REO and HUD purchases are the exception: normal financing works there.
                </p>
              </div>
            </Card>
            <Card>
              <div className="flex gap-3">
                <Ban className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200">Never pay anyone outside the official channel.</strong> Your confirmation email
                  names the exact authority to pay (county, trustee, bank, auction house). If anyone asks for payment to a
                  different name or personal account, stop and contact us first.
                </p>
              </div>
            </Card>
          </div>
        </Section>

        {/* 5 — Move in */}
        <Section id="move-in" icon={KeyRound} title="When can you move in?" sub="The honest answer: it depends completely on the sale type.">
          <Card className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                  <th className="pb-3 pr-4">Sale type</th>
                  <th className="pb-3 pr-4">Earliest possession</th>
                  <th className="pb-3">What can delay it</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-400">
                <tr><td className="py-3 pr-4 font-bold text-emerald-400">Tax Lien</td><td className="py-3 pr-4">You don't — you own a debt</td><td className="py-3">Only foreclosure after the redemption period (1–3 yrs) could change that</td></tr>
                <tr><td className="py-3 pr-4 font-bold text-amber-400">Tax Deed</td><td className="py-3 pr-4">When the deed records (weeks)</td><td className="py-3">Post-sale redemption windows; occupants requiring eviction</td></tr>
                <tr><td className="py-3 pr-4 font-bold text-sky-400">Foreclosure</td><td className="py-3 pr-4">After deed + confirmation (2–8 wks)</td><td className="py-3">Upset-bid windows, eviction of former owners (1–3 mo)</td></tr>
                <tr><td className="py-3 pr-4 font-bold text-rose-400">REO / HUD</td><td className="py-3 pr-4">At closing (30–45 days)</td><td className="py-3">Normal financing paperwork only — homes are vacant</td></tr>
                <tr><td className="py-3 pr-4 font-bold text-violet-400">Estate</td><td className="py-3 pr-4">At closing (30–45 days)</td><td className="py-3">Court confirmation in some states</td></tr>
                <tr><td className="py-3 pr-4 font-bold text-cyan-400">Government (GSA)</td><td className="py-3 pr-4">After closing (a few weeks)</td><td className="py-3">Deed processing time only</td></tr>
              </tbody>
            </table>
          </Card>
        </Section>

        {/* 6 — Resell */}
        <Section id="resell" icon={Tag} title="Selling, renting & reselling" sub="Your exit options after you win.">
          <div className="space-y-3">
            <Accordion title="Flip it: renovate and resell" defaultOpen>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The classic strategy for Tax Deed, Foreclosure, Estate and GSA buys. You own the property, so you can sell it the
                day your deed records. In practice: do a <strong className="text-zinc-200">quiet title action</strong> on tax deeds
                (2–6 months) so title insurance companies will cover your buyer — without insurance, financed buyers can't purchase
                from you and your pool shrinks to cash buyers. On REO/HUD resales within 90 days, FHA's anti-flipping rule can
                block some buyers. Cash buyers are unaffected by both issues.
              </p>
            </Accordion>
            <Accordion title="Hold it: rent for monthly income">
              <p className="text-sm text-zinc-400 leading-relaxed">
                You may rent the property as soon as you have possession (see Moving in). Check local landlord registration and
                code-compliance rules first — auction properties are as-is, and some cities require a rental license or inspection
                before tenants move in. If a tenant already lives there (foreclosure buys), federal and state tenant-protection
                laws control how and when they can be asked to leave.
              </p>
            </Accordion>
            <Accordion title="Exit a Tax Lien position">
              <p className="text-sm text-zinc-400 leading-relaxed">
                Liens are designed to end by <strong className="text-zinc-200">redemption</strong>: the owner repays you with interest
                and you exit automatically with a check from the county. If the redemption period expires unpaid, your exit is
                foreclosure — you get the property instead of interest. Some states allow selling (assigning) your lien certificate
                to another investor; many counties restrict this, so check local rules before counting on it.
              </p>
            </Accordion>
            <Accordion title="Wholesale it: assign the contract">
              <p className="text-sm text-zinc-400 leading-relaxed">
                Some investors sell their <em>position</em> before closing — assigning the winning bid contract to another buyer for a
                fee. This is only possible where the auction terms allow assignment; many government auctions do not. Always read
                the auction's terms of sale before planning a wholesale exit.
              </p>
            </Accordion>
          </div>
        </Section>

        {/* 7 — Risks */}
        <Section id="risks" icon={AlertTriangle} title="Risks & your pre-bid checklist" sub="Every auction is as-is. Protect yourself with this 6-point check.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['Title search', 'Check for surviving liens — mortgages, IRS liens, HOA liens, code violations. Some survive the auction, some don\'t, depending on sale type and state.'],
              ['See the property', 'Drive by at minimum. Interior access is rare at live auctions — assume repairs are needed and price them in.'],
              ['Occupancy check', 'Occupied homes mean eviction cost and time. A vacant home is worth a premium to you.'],
              ['Read the terms of sale', 'Deposit %, balance deadline, buyer\'s premium, assignment rules. Every auction publishes these; they are binding.'],
              ['Set a max bid — and stop', 'Decide your ceiling from the numbers (we show value estimates on every card) and never chase a bid past it.'],
              ['Money ready before you bid', 'Have the full amount available as cash, hard money, or credit line. A winning bid with no money behind it costs you the deposit.'],
            ].map(([t, d]) => (
              <Card key={t}>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-zinc-100 text-sm">{t}</div>
                    <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{d}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* 8 — FAQ */}
        <Section id="faq" icon={HelpCircle} title="Frequently asked questions" sub="">
          <div className="space-y-3">
            {[
              ['Do I need to sign in to buy?', 'No. Browse and place an order with just your name and email. Optional accounts are created by our team for customers who want favorites syncing and deal alerts — never required to buy.'],
              ['I placed an order — what did I just commit to?', 'Nothing binding yet. Your order tells our team to prepare your auction registration. It only becomes binding when you win a bid at the real auction.'],
              ['Why didn\'t I get a confirmation email?', 'Check spam first. If it\'s not there, the email delivery may still be activating on our side — your order is saved regardless, and your reference number is shown on the confirmation screen.'],
              ['Is the deposit a fee I lose?', 'No. It is refunded if you don\'t win, and credited toward your price if you do. You only forfeit it by winning and then not paying the balance.'],
              ['Can I use a mortgage?', 'Rarely at live auctions (too slow). Yes at REO/HUD, estate, and GSA sales. Many auction buyers use cash or hard money, then refinance after closing.'],
              ['When exactly do I get the keys?', 'Tax Deed: after the deed records. Foreclosure: after deed + any upset-bid window. REO/Estate/GSA: at closing. Tax Lien: never — unless you later foreclose.'],
              ['Can the old owner take the house back?', 'Tax Lien: yes, by redeeming (paying you back with interest) during the redemption period. Tax Deed: in a few states, yes, within a post-sale redemption window — they must pay you a premium. Foreclosure/REO/GSA: essentially no.'],
              ['Can I sell immediately after winning?', 'For deed-type sales, yes — once the deed is in your name. A quiet title action first (tax deeds) makes resale much easier.'],
              ['What if the property has people living in it?', 'You inherit the situation. Eviction is a legal process (typically 1–3 months) and its cost should be part of your bid math.'],
              ['Is any of this financial advice?', 'No. We surface real government auction data and explain the rules. Verify everything independently and consider a local attorney or title company before large bids.'],
            ].map(([q, a]) => (
              <Accordion key={q} title={q}>
                <p className="text-sm text-zinc-400 leading-relaxed">{a}</p>
              </Accordion>
            ))}
          </div>
        </Section>

        {/* 9 — Glossary */}
        <Section id="glossary" icon={BookText} title="Glossary" sub="The words auctions use, in plain English.">
          <Card>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {[
                ['As-is', 'You buy it exactly as it sits — no repairs, no warranties, no refunds.'],
                ["Buyer's premium", 'A fee (0–10%) some auction houses add on top of your winning bid.'],
                ['Deed', 'The legal document proving you own the property.'],
                ['Deposit / earnest money', 'Good-faith money that reserves your bid; refunded if you lose, credited if you win.'],
                ['Foreclosure', 'The legal process where a lender takes and sells a property over unpaid debt.'],
                ['Lien', 'A legal claim on a property for an unpaid debt (taxes, mortgage, HOA...).'],
                ['Opening bid', 'The minimum first bid the auction will accept.'],
                ['Quiet title action', 'A short court process that cleans up ownership history so title insurers will cover the property.'],
                ['Redemption period', 'The window where the old owner can reclaim by paying the debt (lien states) or buy back from you (some deed states).'],
                ['REO', 'Real Estate Owned — a property the bank kept after its auction got no bids.'],
                ['Sheriff sale', 'A court-ordered foreclosure auction run by the county sheriff.'],
                ['Title insurance', 'Insurance that protects a buyer from hidden ownership problems. Often requires a quiet title first on tax deeds.'],
                ['Trustee', 'The neutral party that runs a foreclosure sale on behalf of the lender.'],
                ['Upset bid', 'A rule (e.g. North Carolina) letting others outbid a winner for ~10 days after the sale.'],
              ].map(([t, d]) => (
                <div key={t}>
                  <dt className="text-sm font-bold text-emerald-400">{t}</dt>
                  <dd className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{d}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </Section>

        {/* Disclaimer */}
        <Card className="!bg-amber-500/5 !border-amber-500/15">
          <div className="flex gap-3">
            <FileText className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong className="text-amber-400">Important:</strong> auction rules, redemption periods, and deadlines differ by
              state and county — sometimes by individual sale. This guide explains the general patterns; the official terms of
              sale for your specific auction always win. Tax Lien Hunter provides data and education, not legal or financial advice.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
