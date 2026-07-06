import { useState } from 'react'
import { X, Calculator, DollarSign, HardHat, Percent, Home, FileText, Info, Building, Wallet } from 'lucide-react'
import { Property, FlipAnalysis } from '../types/property'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Props {
  property: Property
  onClose: () => void
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function DealCalculator({ property, onClose }: Props) {
  const [purchasePrice, setPurchasePrice] = useState(property.price)
  const [rehabCost, setRehabCost] = useState(property.rehabEstimate)
  const [arv, setArv] = useState(property.arv)
  const [closingCostsPct, setClosingCostsPct] = useState(3)
  const [holdingMonths, setHoldingMonths] = useState(6)
  const [holdingCostMonthly, setHoldingCostMonthly] = useState(800)
  const [sellingCostsPct, setSellingCostsPct] = useState(6)
  const [downPaymentPct, setDownPaymentPct] = useState(25)
  const [interestRate, setInterestRate] = useState(10)
  const [loanTerm, setLoanTerm] = useState(30)
  const [propertyTax, setPropertyTax] = useState(1.2)
  const [insurance, setInsurance] = useState(1200)
  const [hoaMonthly, setHoaMonthly] = useState(0)
  const [rentalIncome, setRentalIncome] = useState(0)
  const [notes, setNotes] = useLocalStorage(`notes-${property.id}`, property.notes)

  const closingCosts = purchasePrice * (closingCostsPct / 100)
  const holdingCosts = holdingMonths * holdingCostMonthly
  const sellingCosts = arv * (sellingCostsPct / 100)
  const loanAmount = purchasePrice * (1 - downPaymentPct / 100)
  const interestCosts = loanAmount * (interestRate / 100) * (holdingMonths / 12)
  const totalHolding = holdingCosts + interestCosts
  const profit = arv - purchasePrice - rehabCost - closingCosts - totalHolding - sellingCosts
  const totalInvestment = purchasePrice + rehabCost + closingCosts
  const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0
  const cashInvested = (purchasePrice * (downPaymentPct / 100)) + rehabCost + closingCosts
  const cashOnCash = cashInvested > 0 ? (profit / cashInvested) * 100 : 0

  // Mortgage calculations
  const r = interestRate / 100 / 12
  const n = loanTerm * 12
  const monthlyPI = r > 0 ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loanAmount / n
  const monthlyTax = (purchasePrice * (propertyTax / 100)) / 12
  const monthlyIns = insurance / 12
  const totalMonthlyPayment = monthlyPI + monthlyTax + monthlyIns + hoaMonthly
  const monthlyCashFlow = rentalIncome - totalMonthlyPayment - holdingCostMonthly
  const annualCashFlow = monthlyCashFlow * 12
  const cashOnCashRental = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0

  const analysis: FlipAnalysis = {
    purchasePrice,
    rehabCost,
    arv,
    closingCosts,
    holdingCosts: totalHolding,
    sellingCosts,
    profit,
    roi,
    cashOnCash,
  }

  const isGoodDeal = profit > 30000 && roi > 20

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <Calculator className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Deal Analyzer</h2>
              <p className="text-sm text-gray-500">{property.address}, {property.city}, {property.state}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Inputs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <DollarSign className="w-4 h-4 text-brand-600" />
              Financial Inputs
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Price</label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ARV (After Repair Value)</label>
                <input
                  type="number"
                  value={arv}
                  onChange={(e) => setArv(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rehab Cost</label>
              <input
                type="number"
                value={rehabCost}
                onChange={(e) => setRehabCost(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mt-6">
              <HardHat className="w-4 h-4 text-brand-600" />
              Cost Assumptions
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Closing Costs (%)</label>
                <input
                  type="number"
                  value={closingCostsPct}
                  onChange={(e) => setClosingCostsPct(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Selling Costs (%)</label>
                <input
                  type="number"
                  value={sellingCostsPct}
                  onChange={(e) => setSellingCostsPct(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hold Time (months)</label>
                <input
                  type="number"
                  value={holdingMonths}
                  onChange={(e) => setHoldingMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Holding Cost</label>
                <input
                  type="number"
                  value={holdingCostMonthly}
                  onChange={(e) => setHoldingCostMonthly(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mt-6">
              <Percent className="w-4 h-4 text-brand-600" />
              Financing
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Down Payment (%)</label>
                <input
                  type="number"
                  value={downPaymentPct}
                  onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mt-6">
              <Building className="w-4 h-4 text-brand-600" />
              Mortgage Calculator (Hold Scenario)
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loan Term (years)</label>
                <select
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value={15}>15 years</option>
                  <option value={20}>20 years</option>
                  <option value={30}>30 years</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Property Tax (%/yr)</label>
                <input
                  type="number"
                  step="0.1"
                  value={propertyTax}
                  onChange={(e) => setPropertyTax(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Insurance ($/yr)</label>
                <input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">HOA ($/mo)</label>
                <input
                  type="number"
                  value={hoaMonthly}
                  onChange={(e) => setHoaMonthly(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rental Income ($/mo) — if holding as rental</label>
              <input
                type="number"
                value={rentalIncome}
                onChange={(e) => setRentalIncome(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. 1800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Your Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Add your inspection notes, contact info, etc..."
              />
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border-2 ${isGoodDeal ? 'border-brand-200 bg-brand-50' : 'border-yellow-200 bg-yellow-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Home className={`w-5 h-5 ${isGoodDeal ? 'text-brand-700' : 'text-yellow-700'}`} />
                <h3 className={`font-bold ${isGoodDeal ? 'text-brand-800' : 'text-yellow-800'}`}>
                  {isGoodDeal ? '✅ Good Deal' : '⚠️ Review Carefully'}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Projected Profit</div>
                  <div className={`text-2xl font-bold ${profit >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
                    {formatCurrency(profit)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Total ROI</div>
                  <div className={`text-2xl font-bold ${roi >= 20 ? 'text-brand-700' : 'text-yellow-700'}`}>
                    {roi.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Cash on Cash</div>
                  <div className="text-lg font-semibold text-gray-900">{cashOnCash.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Cash Needed</div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(cashInvested)}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText className="w-4 h-4 text-gray-500" />
                Cost Breakdown
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Purchase Price</span>
                  <span className="font-medium">{formatCurrency(analysis.purchasePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rehab Cost</span>
                  <span className="font-medium">{formatCurrency(analysis.rehabCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Closing Costs ({closingCostsPct}%)</span>
                  <span className="font-medium">{formatCurrency(analysis.closingCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Holding Costs ({holdingMonths} mo)</span>
                  <span className="font-medium">{formatCurrency(analysis.holdingCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Selling Costs ({sellingCostsPct}%)</span>
                  <span className="font-medium">{formatCurrency(analysis.sellingCosts)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold">
                  <span className="text-gray-900">Total Investment</span>
                  <span className="text-gray-900">{formatCurrency(totalInvestment + totalHolding + sellingCosts)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span className="text-gray-900">Sale Price (ARV)</span>
                  <span className="text-gray-900">{formatCurrency(arv)}</span>
                </div>
                <div className="border-t-2 border-gray-900 pt-2 flex justify-between text-lg font-bold">
                  <span className={profit >= 0 ? 'text-brand-700' : 'text-red-600'}>
                    {profit >= 0 ? 'Profit' : 'Loss'}
                  </span>
                  <span className={profit >= 0 ? 'text-brand-700' : 'text-red-600'}>
                    {formatCurrency(Math.abs(profit))}
                  </span>
                </div>
              </div>
            </div>

            {/* Mortgage Summary */}
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-purple-900">Hold as Rental</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Loan Amount</span>
                  <span className="font-medium">{formatCurrency(loanAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly P&I</span>
                  <span className="font-medium">{formatCurrency(monthlyPI)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax + Insurance</span>
                  <span className="font-medium">{formatCurrency(monthlyTax + monthlyIns)}</span>
                </div>
                {hoaMonthly > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">HOA</span>
                    <span className="font-medium">{formatCurrency(hoaMonthly)}</span>
                  </div>
                )}
                <div className="border-t border-purple-200 pt-2 flex justify-between font-bold">
                  <span className="text-gray-900">Total Monthly</span>
                  <span className="text-gray-900">{formatCurrency(totalMonthlyPayment)}</span>
                </div>
                {rentalIncome > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rental Income</span>
                      <span className="font-medium text-brand-700">{formatCurrency(rentalIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash Flow / Month</span>
                      <span className={`font-bold ${monthlyCashFlow >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
                        {monthlyCashFlow >= 0 ? '+' : ''}{formatCurrency(monthlyCashFlow)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Cash Flow</span>
                      <span className={`font-bold ${annualCashFlow >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
                        {annualCashFlow >= 0 ? '+' : ''}{formatCurrency(annualCashFlow)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash-on-Cash (Rental)</span>
                      <span className={`font-bold ${cashOnCashRental >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
                        {cashOnCashRental.toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Flip Rule Check</p>
                <p>70% Rule: Buy at {formatCurrency(arv * 0.7)} or less. You're at {formatCurrency(purchasePrice + rehabCost)}.</p>
                <p className="mt-1">
                  {(purchasePrice + rehabCost) <= arv * 0.7 ? (
                    <span className="text-brand-700 font-medium">✅ Meets 70% rule</span>
                  ) : (
                    <span className="text-yellow-700 font-medium">⚠️ Exceeds 70% rule</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
