import { useState, useMemo, useEffect } from 'react'
import { Search, Plus, BarChart3, Heart, ExternalLink, Menu, X, Map as MapIcon, Scale, Bell, LogIn, LogOut, User } from 'lucide-react'
import { Property, DealFilter } from './types/property'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useToast } from './components/ToastProvider.tsx'
import { useSupabaseAuth, useSupabaseProperties, useSupabaseFavorites } from './hooks/useSupabase.ts'
import { supabase } from './lib/supabase.ts'
import Logo from './components/Logo.tsx'
import FilterBar from './components/FilterBar'
import PropertyCard from './components/PropertyCard'
import DealCalculator from './components/DealCalculator'
import AddPropertyModal from './components/AddPropertyModal'
import MapView from './components/MapView'
import ImageCarousel from './components/ImageCarousel.tsx'
import ExportButton from './components/ExportButton.tsx'
import DealComparison from './components/DealComparison.tsx'
import AlertPreferences from './components/AlertPreferences.tsx'
import AuthModal from './components/AuthModal.tsx'
import './index.css'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function App() {
  const { showToast } = useToast()
  const { user } = useSupabaseAuth()
  const { properties: supabaseProperties, loading: propertiesLoading } = useSupabaseProperties()
  const { favorites: supabaseFavorites, toggleFavorite: toggleSupabaseFavorite } = useSupabaseFavorites(user?.id ?? null)

  // Fallback localStorage favorites when not signed in
  const [localFavorites, setLocalFavorites] = useLocalStorage<string[]>('favorites', [])
  const favorites = user?.id ? supabaseFavorites : localFavorites

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showCarousel, setShowCarousel] = useState(false)
  const [carouselImages, setCarouselImages] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [view, setView] = useState<'all' | 'favorites' | 'deals' | 'map'>('all')
  const [filter, setFilter] = useState<DealFilter>({
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

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const properties = supabaseProperties.length > 0 ? supabaseProperties : []

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

  const handleAddProperty = async (p: Property) => {
    const { data, error } = await supabase.from('properties').insert({
      id: p.id,
      address: p.address,
      city: p.city,
      state: p.state,
      zip: p.zip,
      price: p.price,
      estimated_value: p.estimatedValue,
      beds: p.beds,
      baths: p.baths,
      sqft: p.sqft,
      lot_size: p.lotSize,
      year_built: p.yearBuilt,
      property_type: p.propertyType,
      auction_date: p.auctionDate,
      auction_type: p.auctionType,
      source: p.source,
      source_url: p.sourceUrl,
      description: p.description,
      image_url: p.imageUrl,
      images: p.images,
      status: p.status,
      days_on_market: p.daysOnMarket,
      rehab_estimate: p.rehabEstimate,
      arv: p.arv,
      notes: p.notes,
      latitude: p.latitude,
      longitude: p.longitude,
      county: p.county,
      case_number: p.caseNumber,
      opening_bid: p.openingBid,
      deposit_required: p.depositRequired,
    }).select()
    if (error) {
      showToast('Failed to add property: ' + error.message, 'error')
    } else {
      showToast(`Added ${p.address}`, 'success')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    showToast('Signed out', 'info')
  }

  const filtered = useMemo(() => {
    let list = properties
    if (view === 'favorites') list = list.filter((p) => favorites.includes(p.id))
    if (view === 'deals') list = list.filter((p) => {
      const discount = ((p.estimatedValue - p.price) / p.estimatedValue) * 100
      const profit = p.arv - p.price - p.rehabEstimate
      return discount >= 30 && profit >= 30000
    })

    return list.filter((p) => {
      const discount = ((p.estimatedValue - p.price) / p.estimatedValue) * 100

      if (filter.state && p.state !== filter.state) return false
      if (filter.city && p.city !== filter.city) return false
      if (filter.propertyType && p.propertyType !== filter.propertyType) return false
      if (filter.auctionType && p.auctionType !== filter.auctionType) return false
      if (p.price < filter.minPrice) return false
      if (p.price > filter.maxPrice) return false
      if (discount < filter.minDiscount) return false
      if (p.rehabEstimate > filter.maxRehab) return false
      if (filter.keyword) {
        const kw = filter.keyword.toLowerCase()
        const match =
          p.address.toLowerCase().includes(kw) ||
          p.city.toLowerCase().includes(kw) ||
          p.state.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw) ||
          p.source.toLowerCase().includes(kw)
        if (!match) return false
      }
      return true
    })
  }, [properties, favorites, view, filter])

  const stats = useMemo(() => {
    const total = filtered.length
    const avgDiscount = total > 0
      ? filtered.reduce((sum, p) => sum + ((p.estimatedValue - p.price) / p.estimatedValue) * 100, 0) / total
      : 0
    const totalProfit = filtered.reduce((sum, p) => sum + Math.max(0, p.arv - p.price - p.rehabEstimate), 0)
    return { total, avgDiscount, totalProfit }
  }, [filtered])

  const navLink = (key: 'all' | 'favorites' | 'deals' | 'map', label: string, icon: React.ReactNode) => (
    <button
      key={key}
      onClick={() => { setView(key); setShowMobileMenu(false) }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        view === key ? 'bg-brand-100 text-brand-800' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
      {key === 'favorites' && favorites.length > 0 && (
        <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">{favorites.length}</span>
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo className="w-9 h-9" />
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Auction Flipper</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Find auction deals. Flip for profit.</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {navLink('all', 'All', <Search className="w-4 h-4" />)}
              {navLink('map', 'Map', <MapIcon className="w-4 h-4" />)}
              {navLink('favorites', 'Saved', <Heart className="w-4 h-4" />)}
              {navLink('deals', 'Hot Deals', <BarChart3 className="w-4 h-4" />)}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Deal
              </button>
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>

            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="p-2 text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {showMobileMenu && (
            <div className="md:hidden py-3 border-t border-gray-100 flex flex-col gap-2">
              {navLink('all', 'All Properties', <Search className="w-4 h-4" />)}
              {navLink('map', 'Map View', <MapIcon className="w-4 h-4" />)}
              {navLink('favorites', 'Saved', <Heart className="w-4 h-4" />)}
              {navLink('deals', 'Hot Deals', <BarChart3 className="w-4 h-4" />)}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Properties</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Avg Discount</div>
            <div className="text-2xl font-bold text-brand-700 mt-1">{stats.avgDiscount.toFixed(0)}%</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Profit Potential</div>
            <div className="text-2xl font-bold text-brand-700 mt-1">{formatCurrency(stats.totalProfit)}</div>
          </div>
        </div>

        <FilterBar filter={filter} onChange={setFilter} />

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ExportButton properties={filtered} />
          <button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Scale className="w-4 h-4" />
            Compare
          </button>
          <button
            onClick={() => setShowAlerts(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Bell className="w-4 h-4" />
            Alerts
          </button>
        </div>

        {propertiesLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-brand-600 rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading properties...</span>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="animate-in" key={view}>
          {view === 'map' ? (
            <MapView
              properties={filtered}
              onSelect={setSelectedProperty}
              favorites={favorites}
            />
          ) : !propertiesLoading && filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No properties found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your filters or add a new property.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Property
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in">
            {filtered.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                onSelect={setSelectedProperty}
                onToggleFavorite={toggleFavorite}
                isFavorite={favorites.includes(p.id)}
                onViewImages={(imgs) => {
                  setCarouselImages(imgs)
                  setShowCarousel(true)
                }}
              />
            ))}
          </div>
        )}
        </div>

        {/* Data Sources Info */}
        <div className="mt-12 bg-blue-50 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ExternalLink className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Free Data Sources You Can Connect</h3>
              <p className="text-sm text-blue-800 mt-1">
                This app is pre-loaded with sample deals. To get real live data, connect these free sources:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {[
                  { name: 'HUD Home Store', url: 'https://www.hudhomestore.com', desc: 'FHA foreclosure REOs' },
                  { name: 'Fannie Mae HomePath', url: 'https://www.homepath.com', desc: 'Fannie Mae REOs' },
                  { name: 'Freddie Mac HomeSteps', url: 'https://www.homesteps.com', desc: 'Freddie Mac REOs' },
                  { name: 'GSA Auctions', url: 'https://gsaauctions.gov', desc: 'Federal seized property' },
                  { name: 'IRS Auctions', url: 'https://www.treasury.gov/auctions/irs/', desc: 'IRS seized property' },
                  { name: 'County Courthouses', url: '#', desc: 'Local foreclosure sales' },
                ].map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-lg p-3 border border-blue-200 hover:border-blue-400 transition-colors"
                  >
                    <div className="text-sm font-medium text-blue-900">{s.name}</div>
                    <div className="text-xs text-blue-600 mt-0.5">{s.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {selectedProperty && (
        <DealCalculator property={selectedProperty} onClose={() => setSelectedProperty(null)} />
      )}
      {showAddModal && (
        <AddPropertyModal onClose={() => setShowAddModal(false)} onAdd={handleAddProperty} />
      )}
      {showCarousel && (
        <ImageCarousel images={carouselImages} onClose={() => setShowCarousel(false)} />
      )}
      {showComparison && (
        <DealComparison properties={filtered} onClose={() => setShowComparison(false)} />
      )}
      {showAlerts && (
        <AlertPreferences onClose={() => setShowAlerts(false)} />
      )}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  )
}
