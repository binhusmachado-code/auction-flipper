import type { Property } from '../types/property'

export function getListedBidAmount(property: Property): number {
  const openingBid = Number(property.openingBid)
  if (Number.isFinite(openingBid) && openingBid > 0) return openingBid

  const listedAmount = Number(property.price)
  return Number.isFinite(listedAmount) ? Math.max(0, listedAmount) : 0
}

export function getVerifiedScreeningSpread(property: Property): number | null {
  if (property.valuationVerified !== true) return null
  const countyValue = Number(property.assessedValue)
  if (!Number.isFinite(countyValue) || countyValue <= 0) return null
  const listedAmount = getListedBidAmount(property)
  if (listedAmount <= 0) return null
  return countyValue - listedAmount
}
