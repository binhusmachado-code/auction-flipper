import { useState } from 'react'
import { X, ArrowLeft, ArrowRight, Check, Home, User, CreditCard, ClipboardCheck, PartyPopper, ShieldCheck, MapPin, Loader2, MailWarning, BookOpen } from 'lucide-react'
import { Property } from '../types/property'
import { dealProfit, dealRoi, formatMoney, totalCost, marketValue } from '../lib/deal'
import { supabase } from '../lib/supabase.ts'

interface Props {
  property: Property
  userId?: string | null
  onClose: () => void
  onOpenGuide?: () => void
}

const STEPS = [
  { icon: Home, label: 'The Deal' },
  { icon: User, label: 'About You' },
  { icon: CreditCard, label: 'Payment' },
  { icon: ClipboardCheck, label: 'Review' },
  { icon: PartyPopper, label: 'Done' },
]

interface BuyerInfo {
  fullName: string
  email: string
  phone: string
}

export default function BuyWizard({ property, userId = null, onClose, onOpenGuide }: Props) {
  const [step, setStep] = useState(0)
  const [buyer, setBuyer] = useState<BuyerInfo>({ fullName: '', email: '', phone: '' })
  const [paymentMethod, setPaymentMethod] = useState<'wire' | 'card' | 'cashier'>('wire')
  const [agreed, setAgreed] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const price = property.price || 0
  const deposit = property.depositRequired || Math.max(500, Math.round(price * 0.1))
  const value = marketValue(property)
  const profit = dealProfit(property)
  const roi = dealRoi(property)
  const cost = totalCost(property)

  const canNext =
    step === 0 ? true :
    step === 1 ? buyer.fullName.trim().length > 1 && /.+@.+\..+/.test(buyer.email) :
    step === 2 ? true :
    step === 3 ? agreed && !placing :
    false

  const next = () => { if (canNext && step < 4) setStep(step + 1) }
  const back = () => { if (step > 0 && step < 4) setStep(step - 1) }

  const placeOrder = async () => {
    if (!agreed || placing) return
    setPlacing(true)
    setOrderError(null)
    try {
      // 1) Save the order (id generated here — guests can't read orders back, so we don't use .select())
      const newOrderId = crypto.randomUUID()
      const { error } = await supabase
        .from('orders')
        .insert({
          id: newOrderId,
          property_id: property.id,
          property_address: `${property.address}, ${property.city}, ${property.state} ${property.zip}`,
          buyer_name: buyer.fullName.trim(),
          buyer_email: buyer.email.trim(),
          buyer_phone: buyer.phone.trim(),
          payment_method: paymentMethod,
          deposit_amount: deposit,
          total_price: price,
          user_id: userId,
        })

      if (error) throw new Error(error.message)
      setOrderId(newOrderId)

      // 2) Send the confirmation email (best effort — the order is safe either way)
      try {
        const { error: fnError } = await supabase.functions.invoke('send-order-confirmation', {
          body: {
            orderId: newOrderId,
            buyerName: buyer.fullName.trim(),
            buyerEmail: buyer.email.trim(),
            propertyAddress: property.address,
            propertyCityState: `${property.city}, ${property.state} ${property.zip}`,
            saleType: property.saleType,
            auctionType: property.auctionType,
            auctionDate: property.auctionDate,
            depositAmount: deposit,
            totalPrice: price,
            paymentMethod,
          },
        })
        setEmailSent(!fnError)
      } catch {
        setEmailSent(false)
      }

      setStep(4)
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Something went wrong placing your order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-6 pt-5 pb-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-white">Buy This Property</h2>
            <button aria-label="Close purchase" onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const active = i === step
              const done = i < step
              return (
                <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    done ? 'bg-emerald-500 text-zinc-950' :
                    active ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500' :
                    'bg-zinc-800 text-zinc-600'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-bold ${active ? 'text-emerald-400' : done ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {/* STEP 0 — The Deal */}
          {step === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h3 className="text-2xl font-extrabold text-white">Here's your deal 🏠</h3>
                <p className="text-zinc-400 text-sm mt-1">Simple numbers. No tricky words.</p>
              </div>

              <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-zinc-100">{property.address}</div>
                  <div className="text-sm text-zinc-500">{property.city}, {property.state} {property.zip}</div>
                  <div className="text-xs text-zinc-600 mt-1">{property.auctionType || property.saleType} · {property.source}</div>
                </div>
              </div>

              <div className={`grid gap-3 text-center ${property.valuationVerified === false ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800">
                  <div className="text-[11px] text-zinc-500 font-bold uppercase">You Pay</div>
                  <div className="text-xl font-extrabold text-white mt-1">{formatMoney(cost)}</div>
                </div>
                <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800">
                  <div className="text-[11px] text-zinc-500 font-bold uppercase">It's Worth</div>
                  <div className="text-xl font-extrabold text-white mt-1">{property.valuationVerified === false ? 'Unknown' : formatMoney(value)}</div>
                </div>
                {property.valuationVerified !== false && <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                  <div className="text-[11px] text-emerald-500 font-bold uppercase">You Could Make</div>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1">{formatMoney(profit)}</div>
                </div>}
              </div>

              {property.valuationVerified === false ? <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm text-zinc-300 leading-relaxed">
                <strong className="text-amber-400">Research before bidding.</strong> The county assessed value is not a market valuation. Verify title, liens, occupancy, condition, and resale value independently.
              </div> : <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-sm text-zinc-300 leading-relaxed">
                💡 <strong className="text-emerald-400">In plain words:</strong> you buy this for{' '}
                <strong>{formatMoney(cost)}</strong>, and similar homes sell for about{' '}
                <strong>{formatMoney(value)}</strong>. That's about{' '}
                <strong className="text-emerald-400">{roi.toFixed(0)}% return</strong> on your money.
              </div>}

              {onOpenGuide && (
                <button
                  onClick={onOpenGuide}
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  New to auctions? Read the Buyer Guide first
                </button>
              )}
            </div>
          )}

          {/* STEP 1 — About You */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h3 className="text-2xl font-extrabold text-white">Tell us who you are ✏️</h3>
                <p className="text-zinc-400 text-sm mt-1">We'll use this to prepare your purchase paperwork.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="buyer-name" className="block text-xs font-bold text-zinc-400 mb-1.5">Your full name</label>
                  <input
                    id="buyer-name"
                    type="text"
                    value={buyer.fullName}
                    onChange={(e) => setBuyer({ ...buyer, fullName: e.target.value })}
                    placeholder="e.g. Alex Johnson"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label htmlFor="buyer-email" className="block text-xs font-bold text-zinc-400 mb-1.5">Your email</label>
                  <input
                    id="buyer-email"
                    type="email"
                    value={buyer.email}
                    onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                    placeholder="you@email.com"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label htmlFor="buyer-phone" className="block text-xs font-bold text-zinc-400 mb-1.5">Phone (optional)</label>
                  <input
                    id="buyer-phone"
                    type="tel"
                    value={buyer.phone}
                    onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Payment */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h3 className="text-2xl font-extrabold text-white">How do you want to pay? 💳</h3>
                <p className="text-zinc-400 text-sm mt-1">
                  Today you only reserve with a deposit of <strong className="text-emerald-400">{formatMoney(deposit)}</strong>.
                </p>
              </div>

              <div className="space-y-3">
                {([
                  { id: 'wire', name: 'Bank Wire', desc: 'Send from your bank. Most common for auctions.', tag: 'Recommended' },
                  { id: 'cashier', name: "Cashier's Check", desc: 'A guaranteed check from your bank.' },
                  { id: 'card', name: 'Credit / Debit Card', desc: 'Fast, but some auctions limit card amounts.' },
                ] as const).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      paymentMethod === m.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-zinc-100">{m.name}</div>
                      {'tag' in m && m.tag && (
                        <span className="text-[10px] font-bold bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded-full">{m.tag}</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{m.desc}</div>
                  </button>
                ))}
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <strong className="text-zinc-200">About the deposit:</strong> this is a good-faith payment that reserves
                    your spot in the auction. It is paid to the auction authority (county, bank, or auction house) —
                    <strong className="text-zinc-200"> never to this website</strong> — using the instructions we email you.
                  </p>
                </div>
                <div className="flex items-start gap-3 pl-8">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    • If you <strong className="text-zinc-300">don't win</strong>, it's refunded in full.<br />
                    • If you <strong className="text-zinc-300">win</strong>, it counts toward your price — it's not an extra fee.<br />
                    • You only lose it if you win and then <strong className="text-zinc-300">don't pay the balance</strong> by the deadline.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Review */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h3 className="text-2xl font-extrabold text-white">Check everything 🔍</h3>
                <p className="text-zinc-400 text-sm mt-1">One last look before we lock it in.</p>
              </div>

              <div className="bg-zinc-950 rounded-2xl border border-zinc-800 divide-y divide-zinc-800/60">
                {[
                  ['Property', `${property.address}, ${property.city}, ${property.state}`],
                  ['Buyer', buyer.fullName],
                  ['Email', buyer.email],
                  ['Deposit due today', formatMoney(deposit)],
                  ['Total purchase price', formatMoney(price)],
                  ['Payment method', paymentMethod === 'wire' ? 'Bank Wire' : paymentMethod === 'cashier' ? "Cashier's Check" : 'Credit / Debit Card'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                    <span className="text-zinc-500">{k}</span>
                    <span className="text-zinc-100 font-semibold text-right">{v}</span>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-500"
                />
                <span className="text-xs text-zinc-400 leading-relaxed">
                  I understand buying at auction is <strong className="text-zinc-200">as-is</strong> — I should look at
                  the property (or have someone check it) before the auction. My deposit is refunded if I don't win.
                </span>
              </label>

              {orderError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-300 leading-relaxed">
                  <strong>Couldn't place your order:</strong> {orderError}
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Done */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in text-center py-4">
              <div className="inline-flex p-5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <PartyPopper className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">You're all set, {buyer.fullName.split(' ')[0]}! 🎉</h3>

              {emailSent ? (
                <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
                  We emailed your step-by-step guide to <strong className="text-zinc-200">{buyer.email}</strong>.
                  Don't see it? Check your spam folder.
                </p>
              ) : (
                <div className="max-w-sm mx-auto bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 flex items-start gap-3 text-left">
                  <MailWarning className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    Your order is <strong>saved</strong>, but the confirmation email couldn't be sent yet
                    (email delivery is still being activated on our side). Save your order reference below —
                    you don't need to order again.
                  </p>
                </div>
              )}

              {orderId && (
                <div className="inline-block bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-2.5">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold">Order reference&nbsp;&nbsp;</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{orderId.slice(0, 8).toUpperCase()}</span>
                </div>
              )}

              <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-5 text-left space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">What happens next</div>
                {[
                  ['1', 'Pay your deposit', `Send ${formatMoney(deposit)} to reserve your spot. Full instructions are in your email.`],
                  ['2', 'We handle the paperwork', 'Our team prepares the auction registration for you.'],
                  ['3', 'Auction day', property.auctionDate ? `Auction date: ${property.auctionDate}` : 'We bid for you (or guide you live) at the auction.'],
                  ['4', 'You win = you own it', 'Finish payment, get the title, and the property is yours. 🏡'],
                ].map(([n, t, d]) => (
                  <div key={n} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</div>
                    <div>
                      <div className="text-sm font-bold text-zinc-100">{t}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {onOpenGuide && (
                  <button
                    onClick={onOpenGuide}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold transition-all"
                  >
                    <BookOpen className="w-4 h-4" />
                    Read the Buyer Guide
                  </button>
                )}
                <button onClick={onClose} className="pill-btn w-full justify-center">
                  Back to Deals
                </button>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          {step < 4 && (
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  onClick={back}
                  disabled={placing}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold transition-all disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              {step === 3 ? (
                <button
                  onClick={placeOrder}
                  disabled={!canNext}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all ${
                    canNext
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 active:scale-[0.98]'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {placing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Placing your order...
                    </>
                  ) : (
                    <>
                      Place My Order 🚀
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={next}
                  disabled={!canNext}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all ${
                    canNext
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 active:scale-[0.98]'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
