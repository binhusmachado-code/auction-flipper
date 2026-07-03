import { useState, useMemo } from 'react'
import { Search, Plus, BarChart3, Heart, Home, ExternalLink, Menu, X, Map as MapIcon } from 'lucide-react'
import { Property, PropertyType, AuctionType } from './types/property'
import { properties as sampleProperties } from './data/properties'
import liveProperties from './data/live_properties.json'
import PropertyCard from './components/PropertyCard'
import FilterBar from './components/FilterBar'
import AddPropertyModal from './components/AddPropertyModal'
import DealCalculator from './components/DealCalculator'
import MapView from './components/MapView'
import useLocalStorage from './hooks/useLocalStorage'

const allProperties: Property[] = [...liveProperties, ...sampleProperties]

export default function App() {
  const [view, setView] = useState<'all' | 'favorites' | 'deals' | 'map'>('all')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<PropertyType | 'all'>('all')
  const [auctionFilter, setAuctionFilter] = useState<AuctionType | 'all'>('all')
  const [minDiscount, setMinDiscount] = useState(0)
  const [maxPrice, setMaxPrice] = useState(2_000_000)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [favorites, setFavorites] = useLocalStorage<string[]>('favorites', [])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const filtered = useMemo(() => {
    return allProperties.filter(p => {
      const matchesSearch = !search || p.address.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase()) || p.zip.includes(search)
      const matchesType = typeFilter === 'all' || p.type === typeFilter
      const matchesAuction = auctionFilter === 'all' || p.auctionType === auctionFilter
      const discount = ((p.estimatedValue - p.price) / p.estimatedValue) * 100
      const matchesDiscount = discount >= minDiscount
      const matchesPrice = p.price <= maxPrice
      return matchesSearch && matchesType && matchesAuction && matchesDiscount && matchesPrice
    })
  }, [search, typeFilter, auctionFilter, minDiscount, maxPrice])

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const favoritesList = allProperties.filter(p => favorites.includes(p.id))

  const navLink = (v: typeof view, label: string, icon: React.ReactNode) => (
    <button
      key={v}
      onClick={() => { setView(v); setMobileMenuOpen(false); }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${view === v ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
    >
      {icon}
      {label}
      {v === 'favorites' && favorites.length > 0 && (
        <span className="ml-1 bg-white text-brand-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{favorites.length}</span>
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Home className="w-6 h-6 text-brand-600" />
              <h1 className="text-xl font-bold text-gray-900">Auction Flipper</h1>
              <span className="hidden sm:inline text-xs text-gray-400 font-medium ml-1">Find deals. Flip properties.</span>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {navLink('all', 'All', <Search className="w-4 h-4" />)}
              {navLink('deals', 'Deal Analyzer', <BarChart3 className="w-4 h-4" />)}
              {navLink('favorites', 'Favorites', <Heart className="w-4 h-4" />)}
              {navLink('map', 'Map', <MapIcon className="w-4 h-4" />)}
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-brand-600 text-white rounded-full text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Property
              </button>
            </div>

            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 px-4 py-3 flex flex-wrap gap-2 bg-white">
            {navLink('all', 'All', <Search className="w-4 h-4" />)}
            {navLink('deals', 'Deal Analyzer', <BarChart3 className="w-4 h-4" />)}
            {navLink('favorites', 'Favorites', <Heart className="w-4 h-4" />)}
            {navLink('map', 'Map', <MapIcon className="w-4 h-4" />)}
            <button
              onClick={() => { setShowAdd(true); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 px-4 py-1.5 bg-brand-600 text-white rounded-full text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Property
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'map' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Property Map</h2>
              <p className="text-sm text-gray-500">Click a marker to see details</p>
            </div>
            <MapView properties={filtered} onSelect={setSelectedProperty} favorites={favorites} />
          </div>
        ) : view === 'deals' ? (
          <DealCalculator />
        ) : view === 'favorites' ? (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Your Favorites ({favoritesList.length})</h2>
            {favoritesList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No favorites yet. Click the heart on any property to save it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoritesList.map(p => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    onSelect={() => setSelectedProperty(p)}
                    isFavorite={true}
                    onToggleFavorite={() => toggleFavorite(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <FilterBar
              search={search}
              onSearch={setSearch}
              typeFilter={typeFilter}
              onTypeFilter={setTypeFilter}
              auctionFilter={auctionFilter}
              onAuctionFilter={setAuctionFilter}
              minDiscount={minDiscount}
              onMinDiscount={setMinDiscount}
              maxPrice={maxPrice}
              onMaxPrice={setMaxPrice}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(p => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onSelect={() => setSelectedProperty(p)}
                  isFavorite={favorites.includes(p.id)}
                  onToggleFavorite={() => toggleFavorite(p.id)}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No properties match your filters.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{selectedProperty.address}</h2>
              <button onClick={() => setSelectedProperty(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              <img src={selectedProperty.imageUrl} alt={selectedProperty.address} className="w-full h-48 object-cover rounded-lg" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Price:</span> <span className="font-semibold">${selectedProperty.price.toLocaleString()}</span></div>
                <div><span className="text-gray-500">Est. Value:</span> <span className="font-semibold">${selectedProperty.estimatedValue.toLocaleString()}</span></div>
                <div><span className="text-gray-500">ARV:</span> <span className="font-semibold">${selectedProperty.arv.toLocaleString()}</span></div>
                <div><span className="text-gray-500">Rehab:</span> <span className="font-semibold">${selectedProperty.rehabEstimate.toLocaleString()}</span></div>
                <div><span className="text-gray-500">Discount:</span> <span className="font-semibold text-brand-700">{Math.round(((selectedProperty.estimatedValue - selectedProperty.price) / selectedProperty.estimatedValue) * 100)}%</span></div>
                <div><span className="text-gray-500">Profit:</span> <span className="font-semibold text-brand-700">${(selectedProperty.arv - selectedProperty.price - selectedProperty.rehabEstimate).toLocaleString()}</span></div>
                <div><span className="text-gray-500">Beds:</span> <span className="font-semibold">{selectedProperty.beds}</span></div>
                <div><span className="text-gray-500">Baths:</span> <span className="font-semibold">{selectedProperty.baths}</span></div>
                <div><span className="text-gray-500">Sqft:</span> <span className="font-semibold">{selectedProperty.sqft.toLocaleString()}</span></div>
                <div><span className="text-gray-500">Lot:</span> <span className="font-semibold">{selectedProperty.lotSize.toLocaleString()} sqft</span></div>
              </div>
              <div className="text-sm text-gray-600">{selectedProperty.description}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFavorite(selectedProperty.id)}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${favorites.includes(selectedProperty.id) ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {favorites.includes(selectedProperty.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                </button>
                <a
                  href={selectedProperty.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-brand-600 text-white rounded-lg font-medium text-sm text-center hover:bg-brand-700 transition-colors flex items-center justify-center gap-1"
                >
                  View Listing <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddPropertyModal onClose={() => setShowAdd(false)} onAdd={(p) => { /* handle add */ }} />}
    </div>
  )
}
