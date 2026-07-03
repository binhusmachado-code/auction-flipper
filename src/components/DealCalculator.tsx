import { useState } from 'react'
import { Calculator, DollarSign, TrendingUp, Home, AlertTriangle, Percent, CheckCircle, Banknote, Building } from 'lucide-react'

interface DealCalculatorProps {
  initialPrice?: number
  initialArv?: number
  initialRehab?: number
}

export default function DealCalculator({ initialPrice = 0, initialArv = 0, initialRehab = 0 }: DealCalculatorProps) {
  const [purchasePrice, setPurchasePrice] = useState(initialPrice)
  const [arv, setArv] = useState(initialArv)
  const [rehab, setRehab] = useState(initialRehab)
  const [holdingMonths, setHoldingMonths] = useState(6)
  const [monthlyHoldingCost, setMonthlyHoldingCost] = useState(800)
  const [sellingCostsPercent, setSellingCostsPercent] = useState(8)
  const [desiredProfit, setDesiredProfit] = useState(50000)
  const [cashDownPercent, setCashDownPercent] = useState(25)
  const [interestRate, setInterestRate] = useState(7.5)
  const [loanTerm, setLoanTerm] = useState(30)
  const [propertyTax, setPropertyTax] = useState(1.2)
  const [insurance, setInsurance] = useState(1200)
  const [hoaMonthly, setHoaMonthly] = useState(0)
  const [rentalIncome, setRentalIncome] = useState(0)

  // Flip analysis
  const sellingCosts = (arv * sellingCostsPercent) / 100
  const totalInvestment = purchasePrice + rehab + (holdingMonths * monthlyHoldingCost)
  const netProfit = arv - totalInvestment - sellingCosts
  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0
  const maxOffer = arv - rehab - (holdingMonths * monthlyHoldingCost) - sellingCosts - desiredProfit
  const isGoodDeal = netProfit >= desiredProfit && purchasePrice <= maxOffer
  const seventyPercentRule = arv * 0.7 - rehab
  const passes70Rule = purchasePrice <= seventyPercentRule

  // Mortgage analysis
  const loanAmount = purchasePrice * (1 - cashDownPercent / 100)
  const cashDown = purchasePrice * (cashDownPercent / 100)
  const r = interestRate / 100 / 12
  const n = loanTerm * 12
  const monthlyPI = r > 0 ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loanAmount / n
  const monthlyTax = (purchasePrice * (propertyTax / 100)) / 12
  const monthlyIns = insurance / 12
  const totalMonthlyPayment = monthlyPI + monthlyTax + monthlyIns + hoaMonthly
  const monthlyCashFlow = rentalIncome - totalMonthlyPayment - monthlyHoldingCost

  // Cash-on-cash for rental
  const totalCashInvested = cashDown + rehab
  const annualCashFlow = monthlyCashFlow * 12
  const cashOnCash = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const Section = ({ title, icon, children, color = 'brand' }: { title: string, icon: React.ReactNode, children: React.ReactNode, color?: 'brand' | 'green' | 'red' | 'blue' }) => {
    const colorMap = {
      brand: 'bg-brand-50 text-brand-700 border-brand-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
    }
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className={`flex items-center gap-2 mb-4 px-3 py-1.5 rounded-lg border ${colorMap[color]} w-fit`}>
          {icon}
          <h3 className="font-bold text-sm">{title}</h3>
        </div>
        {children}
      </div>
    )
  }

  const Input = ({ label, value, onChange, suffix = '', type = 'number' }: { label: string, value: number, onChange: (v: number) => void, suffix?: string, type?: 'number' | 'percent' }) => (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        {type === 'number' && <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
        {type === 'percent' && <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={`w-full ${type === 'number' || type === 'percent' ? 'pl-9' : 'pl-3'} pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Deal Analyzer</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-6">
          <Section title="Purchase & ARV" icon={<Home className="w-4 h-4" />}>
            <Input label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} />
            <Input label="After Repair Value (ARV)" value={arv} onChange={setArv} />
            <Input label="Rehab Estimate" value={rehab} onChange={setRehab} />
          </Section>

          <Section title="Holding Costs" icon={<TrendingUp className="w-4 h-4" />}>
            <Input label="Holding Period (months)" value={holdingMonths} onChange={setHoldingMonths} suffix="mo" />
            <Input label="Monthly Holding Cost" value={monthlyHoldingCost} onChange={setMonthlyHoldingCost} />
            <Input label="Selling Costs %" value={sellingCostsPercent} onChange={setSellingCostsPercent} type="percent" suffix="%" />
          </Section>

          <Section title="Financing" icon={<Banknote className="w-4 h-4" />} color="blue">
            <Input label="Cash Down %" value={cashDownPercent} onChange={setCashDownPercent} type="percent" suffix="%" />
            <Input label="Interest Rate" value={interestRate} onChange={setInterestRate} type="percent" suffix="%" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Loan Term (years)" value={loanTerm} onChange={setLoanTerm} suffix="yr" />
              <Input label="Property Tax %" value={propertyTax} onChange={setPropertyTax} type="percent" suffix="%" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Annual Insurance" value={insurance} onChange={setInsurance} />
              <Input label="HOA Monthly" value={hoaMonthly} onChange={setHoaMonthly} />
            </div>
          </Section>

          <Section title="Hold as Rental" icon={<Building className="w-4 h-4" />} color="green">
            <Input label="Monthly Rental Income" value={rentalIncome} onChange={setRentalIncome} />
          </Section>
        </div>

        {/* Results */}
        <div className="space-y-6">
          <Section title="Flip Analysis" icon={<Calculator className="w-4 h-4" />} color={isGoodDeal ? 'green' : 'red'}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Investment</span>
                <span className="font-semibold">{fmt(totalInvestment)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Selling Costs</span>
                <span className="font-semibold">{fmt(sellingCosts)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Net Profit</span>
                <span className={`font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(netProfit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ROI</span>
                <span className={`font-semibold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>{roi.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Max Offer (for ${desiredProfit.toLocaleString()} profit)</span>
                <span className="font-semibold text-brand-700">{fmt(maxOffer)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">70% Rule Check</span>
                <span className={`font-semibold ${passes70Rule ? 'text-green-600' : 'text-red-600'}`}>
                  {passes70Rule ? '✓ Pass' : '✗ Fail'} ({fmt(seventyPercentRule)})
                </span>
              </div>
              <div className="mt-3 p-3 rounded-lg bg-gray-50 text-sm">
                <div className="flex items-center gap-2">
                  {isGoodDeal ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  <span className={isGoodDeal ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                    {isGoodDeal ? 'This looks like a good deal!' : 'Caution — review numbers carefully'}
                  </span>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Mortgage Analysis" icon={<Banknote className="w-4 h-4" />} color="blue">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Loan Amount</span>
                <span className="font-semibold">{fmt(loanAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cash Down</span>
                <span className="font-semibold">{fmt(cashDown)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monthly P&I</span>
                <span className="font-semibold">{fmt(monthlyPI)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monthly Tax</span>
                <span className="font-semibold">{fmt(monthlyTax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monthly Insurance</span>
                <span className="font-semibold">{fmt(monthlyIns)}</span>
              </div>
              {hoaMonthly > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Monthly HOA</span>
                  <span className="font-semibold">{fmt(hoaMonthly)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-500 font-medium">Total Monthly Payment</span>
                <span className="font-bold text-brand-700">{fmt(totalMonthlyPayment)}</span>
              </div>
            </div>
          </Section>

          <Section title="Rental Cash Flow" icon={<Building className="w-4 h-4" />} color={monthlyCashFlow >= 0 ? 'green' : 'red'}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monthly Rental Income</span>
                <span className="font-semibold">{fmt(rentalIncome)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Monthly Expenses</span>
                <span className="font-semibold text-red-600">{fmt(totalMonthlyPayment + monthlyHoldingCost)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-500 font-medium">Monthly Cash Flow</span>
                <span className={`font-bold ${monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(monthlyCashFlow)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Annual Cash Flow</span>
                <span className={`font-semibold ${annualCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(annualCashFlow)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cash-on-Cash Return</span>
                <span className={`font-semibold ${cashOnCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>{cashOnCash.toFixed(1)}%</span>
              </div>
              <div className="mt-3 p-3 rounded-lg bg-gray-50 text-sm">
                <div className="flex items-center gap-2">
                  {monthlyCashFlow >= 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  <span className={monthlyCashFlow >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                    {monthlyCashFlow >= 0 ? 'Positive cash flow — good rental candidate!' : 'Negative cash flow — review rental income or expenses'}
                  </span>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
