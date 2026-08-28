import { useState } from 'react'
import { BadgeCheck, CalendarCheck, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import { DealFilter } from '../types/property'
import { SALE_TYPES, PROPERTY_TYPES, AUCTION_TYPES } from '../data/properties'

interface Props {
  filter: DealFilter
  states: string[]
  counties: string[]
  onChange: (f: DealFilter) => void
}

const MAX_PRICE = 10_000_000

export default function FilterBar({ filter, states, counties, onChange }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const update = (partial: Partial<DealFilter>) => {
    onChange({ ...filter, ...partial })
  }

  const clear = () => {
    onChange({
      state: '',
      county: '',
      city: '',
      minPrice: 0,
      maxPrice: MAX_PRICE,
      propertyType: '',
      saleType: '',
      auctionType: '',
      minInterestRate: 0,
      maxRedemptionPeriod: 60,
      keyword: '',
      analysisStatus: '',
      dealGrade: '',
      verifiedValueOnly: false,
      mappedOnly: false,
      auctionDateKnownOnly: false,
      sortBy: 'auction-soonest',
    })
  }

  const isFiltered =
    filter.state ||
    filter.county ||
    filter.city ||
    filter.minPrice > 0 ||
    filter.maxPrice < MAX_PRICE ||
    filter.propertyType ||
    filter.saleType ||
    filter.auctionType ||
    filter.minInterestRate > 0 ||
    filter.maxRedemptionPeriod < 60 ||
    filter.analysisStatus ||
    filter.dealGrade ||
    filter.verifiedValueOnly ||
    filter.mappedOnly ||
    filter.auctionDateKnownOnly ||
    filter.keyword

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 mb-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="relative sm:col-span-2 xl:col-span-2">
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
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filter.county}
          onChange={(e) => update({ county: e.target.value })}
          className="px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
        >
          <option value="">All Counties</option>
          {counties.map((county) => (
            <option key={county} value={county}>{county}</option>
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
          value={filter.sortBy}
          onChange={(e) => update({ sortBy: e.target.value as DealFilter['sortBy'] })}
          aria-label="Sort listings"
          className="px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
        >
          <option value="auction-soonest">Auction: soonest</option>
          <option value="price-low">Price: low to high</option>
          <option value="price-high">Price: high to low</option>
          <option value="assessed-high">Verified assessed value: high</option>
          <option value="rank">Best verified opportunities</option>
          <option value="deal">Analyzed profit: high</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          onClick={() => update({ analysisStatus: filter.analysisStatus === 'complete' ? '' : 'complete' })}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
            filter.analysisStatus === 'complete'
              ? 'bg-emerald-500 text-zinc-950'
              : 'bg-zinc-950 border border-zinc-800/60 text-zinc-400 hover:bg-zinc-800'
          }`}
          title="Only show properties with a completed evidence-based analysis"
        >
          <BadgeCheck className="w-4 h-4" />
          Analyzed Only
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
        <div className="grid grid-cols-1 gap-3 border-t border-zinc-800/60 pt-4 mt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 animate-fade-in">
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
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1.5">Auction Type</label>
            <select
              value={filter.auctionType}
              onChange={(e) => update({ auctionType: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="">All Auctions</option>
              {AUCTION_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1.5">Minimum Price</label>
            <input
              type="number"
              min={0}
              step={500}
              placeholder="No minimum"
              value={filter.minPrice || ''}
              onChange={(e) => update({ minPrice: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1.5">Maximum Price</label>
            <input
              type="number"
              min={0}
              step={500}
              placeholder="No maximum"
              value={filter.maxPrice === MAX_PRICE ? '' : filter.maxPrice}
              onChange={(e) => update({ maxPrice: Math.max(0, Number(e.target.value) || MAX_PRICE) })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
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

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1.5">Analysis Status</label>
            <select
              value={filter.analysisStatus}
              onChange={(e) => update({ analysisStatus: e.target.value as DealFilter['analysisStatus'] })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="">Any Status</option>
              <option value="complete">Analysis Complete</option>
              <option value="needs-work">Analysis Started</option>
              <option value="not-started">Not Started</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-1.5">Deal Grade</label>
            <select
              value={filter.dealGrade}
              onChange={(e) => update({ dealGrade: e.target.value as DealFilter['dealGrade'] })}
              className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="">Any Grade</option>
              <option value="Great">Great</option>
              <option value="Good">Good</option>
              <option value="Bad">Bad</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => update({ verifiedValueOnly: !filter.verifiedValueOnly })}
            className={`flex h-[42px] items-center justify-center gap-2 self-end rounded-lg border px-3 text-sm font-bold ${filter.verifiedValueOnly ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}
          >
            <BadgeCheck className="h-4 w-4" />Verified value
          </button>

          <button
            type="button"
            onClick={() => update({ mappedOnly: !filter.mappedOnly })}
            className={`flex h-[42px] items-center justify-center gap-2 self-end rounded-lg border px-3 text-sm font-bold ${filter.mappedOnly ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}
          >
            <MapPin className="h-4 w-4" />Mapped
          </button>

          <button
            type="button"
            onClick={() => update({ auctionDateKnownOnly: !filter.auctionDateKnownOnly })}
            className={`flex h-[42px] items-center justify-center gap-2 self-end rounded-lg border px-3 text-sm font-bold ${filter.auctionDateKnownOnly ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}
          >
            <CalendarCheck className="h-4 w-4" />Sale date known
          </button>
        </div>
      )}
    </div>
  )
}
