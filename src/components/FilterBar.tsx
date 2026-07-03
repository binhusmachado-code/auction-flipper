import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { DealFilter } from '../types/property'
import { STATES, CITIES, AUCTION_TYPES, PROPERTY_TYPES } from '../data/properties'

interface Props {
  filter: DealFilter
  onChange: (f: DealFilter) => void
}

export default function FilterBar({ filter, onChange }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const update = (partial: Partial<DealFilter>) => {
    onChange({ ...filter, ...partial })
  }

  const clear = () => {
    onChange({
      state: '',
      city: '',
      minPrice: 0,
      maxPrice: 1000000,
      propertyType: '',
      auctionType: '',
      minDiscount: 0,
      maxRehab: 100000,
      keyword: '',
    })
  }

  const isFiltered =
    filter.state ||
    filter.city ||
    filter.minPrice > 0 ||
    filter.maxPrice < 1000000 ||
    filter.propertyType ||
    filter.auctionType ||
    filter.minDiscount > 0 ||
    filter.maxRehab < 100000 ||
    filter.keyword

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search address, city, keyword..."
            value={filter.keyword}
            onChange={(e) => update({ keyword: e.target.value })}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <select
          value={filter.state}
          onChange={(e) => update({ state: e.target.value })}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All States</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filter.auctionType}
          onChange={(e) => update({ auctionType: e.target.value })}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Auction Types</option>
          {AUCTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {isFiltered && (
            <span className="ml-1 w-2 h-2 bg-brand-500 rounded-full" />
          )}
        </button>

        {isFiltered && (
          <button
            onClick={clear}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
            <select
              value={filter.city}
              onChange={(e) => update({ city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Cities</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Property Type</label>
            <select
              value={filter.propertyType}
              onChange={(e) => update({ propertyType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Types</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min Price</label>
            <input
              type="number"
              placeholder="0"
              value={filter.minPrice || ''}
              onChange={(e) => update({ minPrice: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Price</label>
            <input
              type="number"
              placeholder="1,000,000"
              value={filter.maxPrice < 1000000 ? filter.maxPrice : ''}
              onChange={(e) => update({ maxPrice: Number(e.target.value) || 1000000 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min Discount %</label>
            <select
              value={filter.minDiscount}
              onChange={(e) => update({ minDiscount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={0}>Any</option>
              <option value={10}>10%+</option>
              <option value={20}>20%+</option>
              <option value={30}>30%+</option>
              <option value={40}>40%+</option>
              <option value={50}>50%+</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Rehab</label>
            <select
              value={filter.maxRehab}
              onChange={(e) => update({ maxRehab: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={100000}>Any</option>
              <option value={20000}>$20k</option>
              <option value={40000}>$40k</option>
              <option value={60000}>$60k</option>
              <option value={80000}>$80k</option>
              <option value={100000}>$100k</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
