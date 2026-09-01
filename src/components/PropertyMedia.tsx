import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Camera, MapPin } from 'lucide-react'
import type { Property } from '../types/property'
import { hasDisplayablePropertyPhoto } from '../lib/propertyPhoto'

interface Props {
  property: Property
  variant?: 'card' | 'detail'
}

function mapUrls(property: Property) {
  if (property.latitude && property.longitude) {
    const latitude = property.latitude
    const longitude = property.longitude
    const latitudeOffset = 0.006
    const longitudeOffset = 0.009 / Math.max(Math.cos(latitude * Math.PI / 180), 0.4)
    const bbox = [
      longitude - longitudeOffset,
      latitude - latitudeOffset,
      longitude + longitudeOffset,
      latitude + latitudeOffset,
    ].join(',')
    return {
      image: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=900,506&format=jpg&transparent=false&f=image`,
      link: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
      streetView: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude}%2C${longitude}`,
    }
  }

  const query = encodeURIComponent([property.address, property.city, property.state, property.zip].filter(Boolean).join(', '))
  return {
    image: '',
    link: `https://www.google.com/maps/search/?api=1&query=${query}`,
    streetView: `https://www.google.com/maps/search/?api=1&query=${query}`,
  }
}

function photoLabel(property: Property) {
  if (property.photoSourceName) return property.photoSourceName
  if (property.photoSource === 'street_view') return 'Street View'
  if (property.photoSource === 'member_upload') return 'Member inspection photo'
  if (property.photoSource === 'licensed_provider') return 'Licensed property photo'
  return 'Official listing photo'
}

function capturedLabel(value?: string) {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(parsed)
}

export default function PropertyMedia({ property, variant = 'card' }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const maps = useMemo(() => mapUrls(property), [property])
  const primaryPhoto = property.imageUrl || property.images[0] || ''
  const showPhoto = hasDisplayablePropertyPhoto(property) && !imageFailed

  useEffect(() => {
    setImageFailed(false)
    setMapFailed(false)
  }, [property.id, primaryPhoto])

  return (
    <div className={`relative overflow-hidden border-b border-slate-200 bg-slate-100 ${variant === 'detail' ? 'h-[270px] sm:h-auto sm:min-h-[270px] sm:aspect-[3.2/1]' : 'aspect-[16/10]'}`}>
      {showPhoto ? (
        <img
          src={primaryPhoto}
          alt={`${property.address} property`}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : maps.image && !mapFailed ? (
        <>
          <img
            src={maps.image}
            alt={`Street map centered on ${property.address}`}
            loading="lazy"
            onError={() => setMapFailed(true)}
            className="h-full w-full object-cover opacity-90"
          />
          <MapPin className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-full fill-emerald-700 text-white drop-shadow-lg" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-2 pt-10 text-[10px] font-semibold text-white"><span>Aerial parcel context · not a property photo</span><span>Imagery © Esri</span></div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-100 px-8 text-center">
          <div>
            <MapPin className="mx-auto h-8 w-8 text-emerald-700" />
            <div className="mt-2 text-xs font-semibold text-slate-700">Verified property photo not available</div>
            <div className="mt-1 text-[10px] text-slate-500">Add an official, licensed, or inspection photo—never a stock image.</div>
          </div>
        </div>
      )}

      {showPhoto && <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent px-3 pb-2 pt-12 text-white"><span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-bold"><Camera className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{photoLabel(property)}{capturedLabel(property.photoCapturedAt) ? ` · ${capturedLabel(property.photoCapturedAt)}` : ''}</span></span>{property.photoSourceUrl && <a href={property.photoSourceUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold hover:underline">Photo source</a>}</div>}

      {!showPhoto && (
        <div className="absolute bottom-3 left-3 flex gap-2">
          <a href={maps.link} target="_blank" rel="noopener noreferrer" aria-label={`Open map for ${property.address}`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/60 bg-white/95 px-2.5 text-[10px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-emerald-700 hover:text-white"><MapPin className="h-3.5 w-3.5" />Map<ArrowUpRight className="h-3 w-3" /></a>
          <a href={maps.streetView} target="_blank" rel="noopener noreferrer" aria-label={`Open street view near ${property.address}`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/60 bg-white/95 px-2.5 text-[10px] font-bold text-slate-700 shadow-sm transition-colors hover:bg-emerald-700 hover:text-white"><Camera className="h-3.5 w-3.5" />Street view<ArrowUpRight className="h-3 w-3" /></a>
        </div>
      )}
    </div>
  )
}
