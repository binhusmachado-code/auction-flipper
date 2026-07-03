import { useState } from 'react'
import { MapPin, Bed, Bath, Square, Calendar, DollarSign, Hammer, ArrowRight, TrendingUp, ExternalLink, Heart } from 'lucide-react'
import { Property } from '../types/property'

interface Props {
  property: Property
  onSelect: (p: Property) => void
  onToggleFavorite: (id: string) => void
  isFavorite: boolean
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function discountPercent(price: number, value: number) {
  return Math.round(((value - price) / value) * 100)
}

export default function PropertyCard({ property, onSelect, onToggleFavorite, isFavorite }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const discount = discountPercent(property.price, property.estimatedValue)
  const profit = property.arv - property.price - property.rehabEstimate

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <div className="relative h-48 overflow-hidden">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <img
          src={property.imageUrl}
          alt={property.address}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
        />
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 text-xs font-semibold bg-brand-600 text-white rounded-full">
            {property.auctionType}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(property.id)
            }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="px-2.5 py-1 text-xs font-bold bg-black/70 text-white rounded-full backdrop-blur-sm">
            {discount}% Below Market
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 leading-tight">{property.address}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {property.city}, {property.state} {property.zip}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-brand-700">{formatCurrency(property.price)}</div>
            <div className="text-xs text-gray-400 line-through">{formatCurrency(property.estimatedValue)}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4 text-gray-400" />
            {property.beds}
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4 text-gray-400" />
            {property.baths}
          </div>
          <div className="flex items-center gap-1">
            <Square className="w-4 h-4 text-gray-400" />
            {property.sqft.toLocaleString()} sqft
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {property.auctionDate ? new Date(property.auctionDate).toLocaleDateString() : 'TBD'}
          </div>
          <div className="flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" />
            {property.source}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <DollarSign className="w-3 h-3" /> Price
            </div>
            <div className="text-sm font-semibold text-gray-900">{formatCurrency(property.price)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <Hammer className="w-3 h-3" /> Rehab
            </div>
            <div className="text-sm font-semibold text-gray-900">{formatCurrency(property.rehabEstimate)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> Profit
            </div>
            <div className="text-sm font-semibold text-brand-700">{formatCurrency(profit)}</div>
          </div>
        </div>

        <button
          onClick={() => onSelect(property)}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          Analyze Deal
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
