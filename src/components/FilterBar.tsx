import { useState } from 'react'
import { Search, SlidersHorizontal, X, TrendingUp } from 'lucide-react'
import { DealFilter } from '../types/property'
import { STATES, SALE_TYPES, PROPERTY_TYPES, AUCTION_TYPES } from '../data/properties'

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
      maxPrice: 500000,
      propertyType: '',
      saleType: '',
      auctionType: '',
      minInterestRate: 0,
      maxRedemptionPeriod: 60,
      keyword: '',
      profitOnly: true,
    })
  }

  const isFiltered =
    filter.state ||
    filter.city ||
    filter.minPrice > 0 ||
    filter.maxPrice < 500000 ||
    filter.propertyType ||
    filter.saleType ||
    filter.auctionType ||
    filter.minInterestRate > 0 ||
    filter.keyword

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 mb-6">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search address, city, parcel ID..."
            value={filter.keyword}
            onChange={(e) => update({ keyword: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
          />
        </div>

        <select
          value={filter.state}
          onChange={(e) => update({ state: e.target.value })}
          className="px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
        >
          <option value="">All States</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filter.saleType}
          onChange={(e) => update({ saleType: e.target.value })}
          className="px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
        >
          <option value="">Lien & Deed</option>
          {SALE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={filter.auctionType}
          onChange={(e) => update({ auctionType: e.target.value })}
          className="px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
        >
          <option value="">All Auction Types</option>
          {AUCTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button
          onClick={() => update({ profitOnly: !filter.profitOnly })}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
            filter.profitOnly
              ? 'bg-emerald-500 text-zinc-950'
              : 'bg-zinc-950 border border-zinc-800/60 text-zinc-400 hover:bg-zinc-800'
          }`}
          title="Only show deals where the numbers say you make money"
        >
          <TrendingUp className="w-4 h-4" />
          Money-Makers Only
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
            showAdvanced
              ? 'bg-emerald-500 text-zinc-950'
              : 'bg-zinc-950 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {isFiltered && (
            <span className="ml-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
          )}
        </button>

        {isFiltered && (
          <button
            onClick={clear}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800/60 animate-fade-in">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1.5">Property Type</label>
            <select
              value={filter.propertyType}
              onChange={(e) => update({ propertyType: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="">All Types</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1.5">Min Interest Rate</label>
            <select
              value={filter.minInterestRate}
              onChange={(e) => update({ minInterestRate: Number(e.target.value) })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value={0}>Any</option>
              <option value={10}>10%+</option>
              <option value={12}>12%+</option>
              <option value={15}>15%+</option>
              <option value={18}>18%+</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1.5">Max Tax Owed</label>
            <select
              value={filter.maxPrice < 500000 ? filter.maxPrice : 500000}
              onChange={(e) => update({ maxPrice: Number(e.target.value) || 500000 })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value={500000}>Any</option>
              <option value={25000}>$25k</option>
              <option value={50000}>$50k</option>
              <option value={100000}>$100k</option>
              <option value={250000}>$250k</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1.5">Max Redemption</label>
            <select
              value={filter.maxRedemptionPeriod}
              onChange={(e) => update({ maxRedemptionPeriod: Number(e.target.value) })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value={60}>Any</option>
              <option value={6}>6 months</option>
              <option value={12}>1 year</option>
              <option value={24}>2 years</option>
              <option value={36}>3 years</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
