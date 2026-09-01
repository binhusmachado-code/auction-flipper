import type { Property } from '../types/property'

const trustedLegacyPhotoSources = ['Fannie Mae HomePath', 'Freddie Mac HomeSteps', 'HUD Home Store', 'GSA Auctions', 'IRS Auctions']

function httpsUrl(value: string | null | undefined) {
  return Boolean(value?.startsWith('https://'))
}

function freshTimestamp(value: string | null | undefined, maximumAgeDays = 14) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  const now = Date.now()
  return Number.isFinite(timestamp) && timestamp <= now + 86_400_000 && now - timestamp <= maximumAgeDays * 86_400_000
}

export function hasDisplayablePropertyPhoto(property: Property) {
  if (!property.imageUrl && !property.images[0]) return false

  if (property.photoSource === 'member_upload') {
    return Boolean(property.photoSourceName)
  }

  if (property.photoSource === 'official_auction' || property.photoSource === 'government_listing') {
    return httpsUrl(property.photoSourceUrl) && freshTimestamp(property.photoVerifiedAt)
  }

  if (property.photoSource === 'licensed_provider' || property.photoSource === 'street_view') {
    return httpsUrl(property.photoSourceUrl)
      && freshTimestamp(property.photoVerifiedAt)
      && freshTimestamp(property.photoCapturedAt, 730)
  }

  if (property.photoSource === 'unverified') return false

  return httpsUrl(property.sourceUrl)
    && freshTimestamp(property.sourceVerifiedAt)
    && trustedLegacyPhotoSources.some((source) => property.source.toLowerCase().includes(source.toLowerCase()))
}
