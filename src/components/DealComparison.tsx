import { useState } from 'react'
import { X, Scale, Check } from 'lucide-react'
import { Property } from '../types/property'

interface Props {
  properties: Property[]
  onClose: () => void
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function discountPercent(price: number, value: number) {
  return Math.round(((value - price) / value) * 100)
}

export default function DealComparison({ properties, onClose }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const selected = properties.filter((p) => selectedIds.includes(p.id))

  const fields = [
    { label: 'Price', get: (p: Property) => formatCurrency(p.price), lowerIsBetter: true },
    { label: 'Est. Value', get: (p: Property) => formatCurrency(p.estimatedValue), lowerIsBetter: false },
    { label: 'Discount', get: (p: Property) => `${discountPercent(p.price, p.estimatedValue)}%`, lowerIsBetter: false, raw: (p: Property) => discountPercent(p.price, p.estimatedValue) },
    { label: 'ARV', get: (p: Property) => formatCurrency(p.arv), lowerIsBetter: false },
    { label: 'Rehab Est.', get: (p: Property) => formatCurrency(p.rehabEstimate), lowerIsBetter: true },
    { label: 'Profit', get: (p: Property) => formatCurrency(p.arv - p.price - p.rehabEstimate), lowerIsBetter: false, raw: (p: Property) => p.arv - p.price - p.rehabEstimate },
    { label: 'Beds', get: (p: Property) => String(p.beds), lowerIsBetter: false },
    { label: 'Baths', get: (p: Property) => String(p.baths), lowerIsBetter: false },
    { label: 'Sqft', get: (p: Property) => p.sqft.toLocaleString(), lowerIsBetter: false },
    { label: 'Auction Type', get: (p: Property) => p.auctionType, lowerIsBetter: false },
    { label: 'Auction Date', get: (p: Property) => p.auctionDate ? new Date(p.auctionDate).toLocaleDateString() : 'TBD', lowerIsBetter: false },
    { label: 'Days on Market', get: (p: Property) => String(p.daysOnMarket), lowerIsBetter: false },
  ]

  function isBetter(prop: Property, other: Property | undefined, field: typeof fields[0]) {
    if (!other || !field.raw) return false
    const a = field.raw(prop)
    const b = field.raw(other)
    if (field.lowerIsBetter) return a < b
    return a > b
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <Scale className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Compare Deals</h2>
              <p className="text-sm text-gray-500">Select 2 properties to compare side-by-side</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Property picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {properties.slice(0, 12).map((p) => {
              const isSelected = selectedIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.address}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(p.price)}</div>
                  </div>
                  {isSelected && (
                    <div className="ml-auto p-1 bg-brand-600 rounded-full">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Comparison table */}
          {selected.length === 2 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
                <div className="px-4 py-3 text-sm font-semibold text-gray-700">Feature</div>
                <div className="px-4 py-3 text-sm font-semibold text-gray-900">{selected[0].address}</div>
                <div className="px-4 py-3 text-sm font-semibold text-gray-900">{selected[1].address}</div>
              </div>
              {fields.map((field, i) => {
                const aBetter = isBetter(selected[0], selected[1], field)
                const bBetter = isBetter(selected[1], selected[0], field)
                return (
                  <div
                    key={field.label}
                    className={`grid grid-cols-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-100 last:border-b-0`}
                  >
                    <div className="px-4 py-3 text-sm text-gray-600">{field.label}</div>
                    <div className={`px-4 py-3 text-sm font-medium ${aBetter ? 'text-brand-700 bg-brand-50/50' : 'text-gray-900'}`}>
                      {field.get(selected[0])}
                    </div>
                    <div className={`px-4 py-3 text-sm font-medium ${bBetter ? 'text-brand-700 bg-brand-50/50' : 'text-gray-900'}`}>
                      {field.get(selected[1])}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selected.length < 2 && (
            <div className="text-center py-12 text-gray-400">
              <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select 2 properties above to compare them</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
