import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, MapPin } from 'lucide-react'
import type { Property } from '../types/property'

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
      image: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=600,338&format=png32&transparent=false&f=image`,
      link: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
    }
  }

  const query = encodeURIComponent([property.address, property.city, property.state, property.zip].filter(Boolean).join(', '))
  return {
    image: '',
    link: `https://www.google.com/maps/search/?api=1&query=${query}`,
  }
}

export default function PropertyMedia({ property, variant = 'card' }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const maps = useMemo(() => mapUrls(property), [property])
  const showPhoto = Boolean(property.imageUrl) && !imageFailed

  useEffect(() => {
    setImageFailed(false)
    setMapFailed(false)
  }, [property.id, property.imageUrl])

  return (
    <div className={`relative overflow-hidden border-b border-slate-200 bg-slate-100 ${variant === 'detail' ? 'aspect-[3.7/1] min-h-[250px]' : 'aspect-[16/10]'}`}>
      {showPhoto ? (
        <img
          src={property.imageUrl}
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
          <span className="absolute bottom-1.5 right-2 text-[9px] font-medium text-zinc-700">Map © Esri contributors</span>
        </>
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-100 px-8 text-center">
          <div>
            <MapPin className="mx-auto h-8 w-8 text-emerald-700" />
            <div className="mt-2 text-xs font-semibold text-slate-600">Open the address map</div>
          </div>
        </div>
      )}

      {!showPhoto && (
        <a
          href={maps.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open map for ${property.address}`}
          className="absolute bottom-3 left-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/60 bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-emerald-700 hover:text-white"
        >
          <ArrowUpRight className="h-4 w-4" />
        </a>
      )}
    </div>
  )
}
