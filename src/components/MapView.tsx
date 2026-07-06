import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Property } from '../types/property'
import { Bed, Bath, Square, ArrowRight } from 'lucide-react'

interface Props {
  properties: Property[]
  onSelect: (p: Property) => void
  favorites: string[]
}

// Color-coded icons based on deal quality
function getMarkerColor(property: Property): string {
  const profit = property.arv - property.price - property.rehabEstimate
  const discount = ((property.estimatedValue - property.price) / property.estimatedValue) * 100
  if (profit >= 50000 && discount >= 40) return '#16a34a' // brand-600 (great deal)
  if (profit >= 30000 && discount >= 30) return '#22c55e' // brand-500 (good deal)
  if (profit >= 15000) return '#eab308' // yellow-500 (ok deal)
  return '#ef4444' // red-500 (review carefully)
}

function createColoredIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 28px; height: 28px; 
      background: ${color}; 
      border: 3px solid white; 
      border-radius: 50%; 
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: bold; color: white;
    ">$</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function MapBounds({ properties }: { properties: Property[] }) {
  const map = useMap()
  useMemo(() => {
    if (properties.length > 0) {
      const valid = properties.filter(p => p.latitude !== 0 && p.longitude !== 0)
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map(p => [p.latitude, p.longitude]))
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [properties, map])
  return null
}

export default function MapView({ properties, onSelect, favorites }: Props) {
  const validProperties = properties.filter(p => p.latitude !== 0 && p.longitude !== 0)
  const center = validProperties.length > 0
    ? [validProperties.reduce((s, p) => s + p.latitude, 0) / validProperties.length,
       validProperties.reduce((s, p) => s + p.longitude, 0) / validProperties.length]
    : [39.8283, -98.5795] // Center of US

  return (
    <div className="h-[50vh] min-h-[350px] md:h-[600px] rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
      <MapContainer
        center={center as [number, number]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds properties={validProperties} />
        {validProperties.map(p => {
          const color = getMarkerColor(p)
          const profit = p.arv - p.price - p.rehabEstimate
          const discount = Math.round(((p.estimatedValue - p.price) / p.estimatedValue) * 100)
          return (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={createColoredIcon(color)}
            >
              <Popup className="min-w-[240px]">
                <div className="p-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: color, color: 'white' }}>
                      {p.auctionType}
                    </span>
                    {favorites.includes(p.id) && <span className="text-red-500 text-lg">♥</span>}
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">{p.address}</h3>
                  <p className="text-xs text-gray-500">{p.city}, {p.state}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{p.beds}</span>
                    <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{p.baths}</span>
                    <span className="flex items-center gap-1"><Square className="w-3 h-3" />{p.sqft.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <div><span className="text-gray-500">Price:</span> <span className="font-semibold">{formatCurrency(p.price)}</span></div>
                    <div><span className="text-gray-500">Discount:</span> <span className="font-semibold text-brand-700">{discount}%</span></div>
                    <div><span className="text-gray-500">ARV:</span> <span className="font-semibold">{formatCurrency(p.arv)}</span></div>
                    <div><span className="text-gray-500">Profit:</span> <span className={`font-semibold ${profit >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{formatCurrency(profit)}</span></div>
                  </div>
                  <button
                    onClick={() => onSelect(p)}
                    className="mt-3 w-full flex items-center justify-center gap-1 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    Analyze Deal <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm text-xs">
        <div className="font-semibold text-gray-700 mb-1.5">Deal Quality</div>
        <div className="space-y-1">
          {[
            { color: '#16a34a', label: 'Great Deal ($50k+ profit)' },
            { color: '#22c55e', label: 'Good Deal ($30k+ profit)' },
            { color: '#eab308', label: 'OK Deal ($15k+ profit)' },
            { color: '#ef4444', label: 'Review Carefully' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ background: item.color }} />
              <span className="text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Count badge */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-gray-200 shadow-sm text-xs font-medium text-gray-700">
        {validProperties.length} properties on map
      </div>
    </div>
  )
}
