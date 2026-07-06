import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  images: string[]
  initialIndex?: number
  onClose: () => void
}

export default function ImageCarousel({ images, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [loaded, setLoaded] = useState(false)

  const allImages = images.length > 0 ? images : []
  const current = allImages[index] || ''

  const prev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : allImages.length - 1))
    setLoaded(false)
  }, [allImages.length])

  const next = useCallback(() => {
    setIndex((i) => (i < allImages.length - 1 ? i + 1 : 0))
    setLoaded(false)
  }, [allImages.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, prev, next])

  if (allImages.length === 0) return null

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {allImages.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev() }}
          className="absolute left-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      <div className="relative max-w-5xl max-h-[85vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {!loaded && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse rounded-lg" />
        )}
        <img
          src={current}
          alt={`Property image ${index + 1}`}
          className={`w-full max-h-[85vh] object-contain rounded-lg transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />

        {allImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2">
            <span className="text-white text-sm font-medium">
              {index + 1} / {allImages.length}
            </span>
          </div>
        )}
      </div>

      {allImages.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next() }}
          className="absolute right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
    </div>
  )
}
