import { useState, useMemo, useEffect } from 'react'
import { Search, Heart, Map as MapIcon, Menu, X, ArrowUpRight, TrendingUp, DollarSign, MapPin, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { Property, DealFilter, STATE_TAX_SALE_DATA } from './types/property'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useToast } from './components/ToastProvider.tsx'
import { useSupabaseAuth, useSupabaseProperties, useSupabaseFavorites } from './hooks/useSupabase.ts'
import { supabase } from './lib/supabase.ts'
import FilterBar from './components/FilterBar'
import PropertyCard from './components/PropertyCard'
import MapView from './components/MapView'
import AuthModal from './components/AuthModal.tsx'
import BuyWizard from './components/BuyWizard.tsx'
import Guide from './components/Guide.tsx'
import { isProfitable, dealProfit, marketValue } from './lib/deal.ts'
import './index.css'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function App() {
  const { showToast } = useToast()
  const { user } = useSupabaseAuth()
  const { properties: supabaseProperties, loading: propertiesLoading } = useSupabaseProperties()
  const { favorites: supabaseFavorites, toggleFavorite: toggleSupabaseFavorite } = useSupabaseFavorites(user?.id ?? null)

  const [localFavorites, setLocalFavorites] = useLocalStorage<string[]>('favorites', [])
  const favorites = user?.id ? supabaseFavorites : localFavorites

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [buyProperty, setBuyProperty] = useState<Property | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showStateDirectory, setShowStateDirectory] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [view, setView] = useState<'all' | 'favorites' | 'map'>('all')
  const [filter, setFilter] = useState<DealFilter>({
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

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const properties = supabaseProperties

  const toggleFavorite = async (id: string) => {
    if (user?.id) {
      await toggleSupabaseFavorite(id)
    } else {
      setLocalFavorites((prev) => {
        const isAdding = !prev.includes(id)
        const property = properties.find((p) => p.id === id)
        if (property) {
          showToast(
            isAdding ? `Saved ${property.address}` : `Removed ${property.address}`,
            isAdding ? 'success' : 'info'
          )
        }
        return isAdding ? [...prev, id] : prev.filter((f) => f !== id)
      })
    }
  }

  const openGuide = () => {
    setBuyProperty(null)
    setShowMobileMenu(false)
    setShowGuide(true)
  }

  const filtered = useMemo(() => {
    let list = properties
    if (view === 'favorites') list = list.filter((p) => favorites.includes(p.id))

    return list.filter((p) => {
      if (p.status === 'Sold' || p.status === 'Cancelled') return false
      if (filter.profitOnly && marketValue(p) > 0 && !isProfitable(p)) return false
      if (filter.state && p.state !== filter.state) return false
      if (filter.city && p.city !== filter.city) return false
      if (filter.propertyType && p.propertyType !== filter.propertyType) return false
      if (filter.saleType && p.saleType !== filter.saleType) return false
      if (filter.auctionType && p.auctionType !== filter.auctionType) return false
      if (p.price < filter.minPrice) return false
      if (p.price > filter.maxPrice) return false
      if (p.interestRate < filter.minInterestRate) return false
      if (p.redemptionPeriod > filter.maxRedemptionPeriod) return false
      if (filter.keyword) {
        const kw = filter.keyword.toLowerCase()
        const match =
          p.address.toLowerCase().includes(kw) ||
          p.city.toLowerCase().includes(kw) ||
          p.state.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw) ||
          (p.parcelId && p.parcelId.toLowerCase().includes(kw)) ||
          p.source.toLowerCase().includes(kw)
        if (!match) return false
      }
      return true
    }).sort((a, b) => dealProfit(b) - dealProfit(a))
  }, [properties, favorites, view, filter])

  // Stats
  const totalTaxOwed = filtered.reduce((s, p) => s + p.price, 0)
  const avgInterestRate = filtered.length > 0 ? (filtered.reduce((s, p) => s + p.interestRate, 0) / filtered.length).toFixed(1) : '0'
  const statesCount = new Set(filtered.map(p => p.state)).size
  const lienCount = filtered.filter(p => p.saleType === 'Tax Lien').length
  const deedCount = filtered.filter(p => p.saleType === 'Tax Deed').length

  const navLink = (key: 'all' | 'favorites' | 'map', label: string, icon: React.ReactNode) => (
    <button
      key={key}
      onClick={() => { setView(key); setShowGuide(false); setShowMobileMenu(false) }}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
        view === key
          ? 'bg-emerald-500 text-zinc-950'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
    >
      {icon}
      {label}
      {key === 'favorites' && favorites.length > 0 && (
        <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-zinc-950/20 text-zinc-950 rounded-full font-bold">{favorites.length}</span>
      )}
    </button>
  )

  const guideLink = (
    <button
      key="guide"
      onClick={openGuide}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all duration-300"
    >
      <BookOpen className="w-3.5 h-3.5" />
      Guide
    </button>
  )

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Floating Nav */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
        <div className="glass rounded-full px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 pl-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-zinc-950" />
              </div>
              <span className="font-bold text-zinc-100 text-sm hidden sm:block">Tax Lien Hunter</span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {navLink('all', 'All', <Search className="w-3.5 h-3.5" />)}
              {navLink('map', 'Map', <MapIcon className="w-3.5 h-3.5" />)}
              {navLink('favorites', 'Saved', <Heart className="w-3.5 h-3.5" />)}
              {guideLink}
            </div>

            <div className="flex items-center gap-1.5">
              {user ? (
                <button
                  onClick={async () => { await supabase.auth.signOut(); showToast('Signed out', 'info') }}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="pill-btn !px-4 !py-2 text-xs"
                >
                  Sign In
                </button>
              )}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
                className="md:hidden p-2.5 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showMobileMenu && (
            <div className="md:hidden mt-2 pt-2 border-t border-zinc-800 flex flex-col gap-1 animate-fade-in">
              {navLink('all', 'All Deals', <Search className="w-3.5 h-3.5" />)}
              {navLink('map', 'Map View', <MapIcon className="w-3.5 h-3.5" />)}
              {navLink('favorites', 'Saved', <Heart className="w-3.5 h-3.5" />)}
              {guideLink}
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <header className="relative pt-32 pb-16 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-[0.2em] rounded-full mb-6 border border-emerald-500/20">
            <TrendingUp className="w-3 h-3" />
            Official & Aggregated Auction Leads
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] text-balance">
            Tax Lien &<br className="hidden sm:block" /> Deed Investing
          </h1>
          <p className="mt-5 text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed text-balance">
            Review tax-sale opportunities, compare the numbers, and open the official auction source before you bid.
          </p>

          {/* Stats pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {[
              { name: 'Tax Liens', count: lienCount, color: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
              { name: 'Tax Deeds', count: deedCount, color: 'bg-amber-500/10 text-amber-400 ring-amber-500/20' },
              { name: 'All Listings', count: properties.length, color: 'bg-sky-500/10 text-sky-400 ring-sky-500/20' },
            ].map((s) => (
              <div
                key={s.name}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ring-1 ${s.color}`}
              >
                {s.name}
                <span className="px-1.5 py-0.5 bg-white/10 rounded-full text-[10px]">{s.count.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById('deals')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="pill-btn"
            >
              Browse {filtered.length.toLocaleString()} Deals
              <span className="w-7 h-7 rounded-full bg-zinc-950/20 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </button>
            <button
              onClick={openGuide}
              className="pill-btn-outline"
            >
              <BookOpen className="w-4 h-4" />
              Buyer Guide
            </button>
          </div>
        </div>

        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      </header>

      {/* Main Content */}
      <main id="deals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Active Listings</div>
            <div className="text-2xl font-extrabold text-white mt-1">{filtered.length.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Avg Interest</div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">{avgInterestRate}%</div>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Total Listed Amount</div>
            <div className="text-2xl font-extrabold text-white mt-1">{formatCurrency(totalTaxOwed)}</div>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">States</div>
            <div className="text-2xl font-extrabold text-white mt-1">{statesCount}</div>
          </div>
        </div>

        <FilterBar filter={filter} onChange={setFilter} />

        {propertiesLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading tax sales...</span>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="animate-fade-in" key={view}>
          {view === 'map' ? (
            <MapView
              properties={filtered}
              onSelect={setSelectedProperty}
              favorites={favorites}
            />
          ) : !propertiesLoading && filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="inline-flex p-5 bg-zinc-900 rounded-full mb-5">
                <Search className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100">No deals found</h3>
              <p className="text-zinc-500 mt-2">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onSelect={setSelectedProperty}
                  onToggleFavorite={toggleFavorite}
                  onBuy={setBuyProperty}
                  isFavorite={favorites.includes(p.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* State Directory */}
        <div className="mt-20">
          <button
            onClick={() => setShowStateDirectory(!showStateDirectory)}
            className="flex w-full min-w-0 items-center gap-3 mb-6"
          >
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800/60">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <h3 className="font-bold text-zinc-100 text-base sm:text-lg break-words">State-by-State Directory</h3>
              <p className="text-sm text-zinc-500">Which states are Tax Lien vs Tax Deed</p>
            </div>
            {showStateDirectory ? <ChevronUp className="w-5 h-5 flex-shrink-0 text-zinc-500" /> : <ChevronDown className="w-5 h-5 flex-shrink-0 text-zinc-500" />}
          </button>

          {showStateDirectory && (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {STATE_TAX_SALE_DATA.map((s) => (
                  <div
                    key={s.state}
                    className={`p-4 rounded-xl border ${
                      s.type === 'Tax Lien'
                        ? 'bg-emerald-500/5 border-emerald-500/10'
                        : s.type === 'Tax Deed'
                        ? 'bg-amber-500/5 border-amber-500/10'
                        : 'bg-zinc-800/30 border-zinc-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-zinc-200">{s.state}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        s.type === 'Tax Lien'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : s.type === 'Tax Deed'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-zinc-700/30 text-zinc-400'
                      }`}>
                        {s.type}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 space-y-0.5">
                      <div>Rate: <span className="text-zinc-300">{s.interestRate}</span></div>
                      <div>Redemption: <span className="text-zinc-300">{s.redemptionPeriod}</span></div>
                      {s.countiesWithData.length > 0 && (
                        <div className="text-emerald-400 mt-1">Data available: {s.countiesWithData.join(', ')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Data Sources */}
        <div className="mt-16 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-zinc-100 text-lg">Data Sources</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
                Broward tax deeds and NYC lien records link to their official sources. Other aggregated auction leads may be incomplete.
                Always verify the current county file, title, liens, condition, and bid amount independently.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
                {[
                  { name: 'NYC OpenData', url: 'https://data.cityofnewyork.us/City-Government/Tax-Lien-Sale-Lists/9rz4-mjek', desc: 'NYC Tax Lien Sale Lists — 260K+ records' },
                  { name: 'Broward Tax Deeds', url: 'https://broward.deedauction.net/auctions', desc: 'Official upcoming Broward County tax deed auctions' },
                  { name: 'data.gov', url: 'https://catalog.data.gov/dataset?q=tax+lien', desc: 'Federal open data catalog' },
                ].map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800/40 hover:border-emerald-500/30 hover:bg-zinc-900/50 transition-all duration-300"
                  >
                    <div className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                      {s.name}
                      <ArrowUpRight className="w-3 h-3 text-zinc-500" />
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{s.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-zinc-600">
            Tax Lien Hunter — Auction research for educational purposes, not legal or financial advice.
            Verify every listing with the government auction source before investing.
          </p>
        </div>
      </footer>

      {/* Modals */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedProperty(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Investment Analysis</h2>
                <button aria-label="Close analysis" onClick={() => setSelectedProperty(null)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <h3 className="font-bold text-zinc-200">{selectedProperty.address}</h3>
                <p className="text-sm text-zinc-500">{selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {selectedProperty.saleType === 'Tax Lien' ? 'Tax Owed' : 'Opening Bid'}
                  </div>
                  <div className="text-lg font-bold text-emerald-400">{formatCurrency(selectedProperty.price)}</div>
                </div>
                <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {selectedProperty.saleType === 'Tax Lien' ? 'Interest Rate' : 'Auction Date'}
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    {selectedProperty.saleType === 'Tax Lien' ? `${selectedProperty.interestRate}%` : (selectedProperty.auctionDate || 'TBD')}
                  </div>
                </div>
                <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {selectedProperty.saleType === 'Tax Lien' ? 'Redemption' : 'Required Deposit'}
                  </div>
                  <div className="text-lg font-bold text-zinc-200">
                    {selectedProperty.saleType === 'Tax Lien' ? `${selectedProperty.redemptionPeriod} mo` : formatCurrency(selectedProperty.depositRequired ?? 0)}
                  </div>
                </div>
                <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Assessed Value</div>
                  <div className="text-lg font-bold text-zinc-200">{formatCurrency(selectedProperty.assessedValue)}</div>
                </div>
              </div>

              {/* Projected returns */}
              {selectedProperty.saleType === 'Tax Lien' ? <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10 mb-4">
                <h4 className="text-sm font-bold text-emerald-400 mb-2">Projected Returns</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Annual interest earned:</span>
                    <span className="text-white font-bold">{formatCurrency(selectedProperty.price * selectedProperty.interestRate / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total over {selectedProperty.redemptionPeriod} months:</span>
                    <span className="text-emerald-400 font-bold">
                      {formatCurrency(selectedProperty.price * selectedProperty.interestRate / 100 * selectedProperty.redemptionPeriod / 12)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">ROI (annualized):</span>
                    <span className="text-emerald-400 font-bold">{selectedProperty.interestRate}%</span>
                  </div>
                </div>
              </div> : <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/20 mb-4">
                <h4 className="text-sm font-bold text-amber-400 mb-1">Due diligence required</h4>
                <p className="text-xs leading-relaxed text-zinc-400">
                  The assessed value is not a resale estimate. Check title, surviving liens, occupancy, land use, condition, and the current county auction file before bidding.
                </p>
              </div>}

              {selectedProperty.parcelId && (
                <div className="text-xs text-zinc-500 mb-2">
                  Parcel ID: <span className="text-zinc-300 font-mono">{selectedProperty.parcelId}</span>
                </div>
              )}
              {selectedProperty.description && (
                <p className="text-xs text-zinc-500 leading-relaxed">{selectedProperty.description}</p>
              )}
              
              <a
                href={selectedProperty.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold rounded-xl transition-all"
              >
                View Source Data
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {buyProperty && (
        <BuyWizard
          property={buyProperty}
          userId={user?.id ?? null}
          onClose={() => setBuyProperty(null)}
          onOpenGuide={openGuide}
        />
      )}

      {showGuide && (
        <Guide onClose={() => setShowGuide(false)} />
      )}
    </div>
  )
}
