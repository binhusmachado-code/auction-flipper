import assert from 'node:assert/strict'
import test from 'node:test'
import { hasDisplayablePropertyPhoto } from '../src/lib/propertyPhoto'
import type { Property } from '../src/types/property'

const property = {
  id: 'photo-1', address: '10 Main St', city: 'Tampa', state: 'FL', zip: '33601', county: 'Hillsborough',
  price: 1, estimatedValue: 0, assessedValue: 0, beds: 0, baths: 0, sqft: 0, propertyType: 'Land',
  auctionDate: '2026-09-15', auctionType: 'Tax Deed', source: 'County Clerk', sourceUrl: 'https://county.example',
  description: '', imageUrl: 'https://images.example/property.jpg', images: [], status: 'Active', daysOnMarket: 0,
  rehabEstimate: 0, arv: 0, notes: '', latitude: 1, longitude: 1, taxAmount: 0, interestRate: 0,
  redemptionPeriod: 0, delinquentYears: 0,
} as Property

test('requires full provenance for licensed property photos', () => {
  assert.equal(hasDisplayablePropertyPhoto({ ...property, photoSource: 'licensed_provider' }), false)
  assert.equal(hasDisplayablePropertyPhoto({
    ...property,
    photoSource: 'licensed_provider',
    photoSourceUrl: 'https://provider.example/photo/1',
    photoCapturedAt: '2026-08-20T12:00:00.000Z',
    photoVerifiedAt: '2026-08-31T12:00:00.000Z',
  }), true)
})

test('shows a private member photo without claiming provider verification', () => {
  assert.equal(hasDisplayablePropertyPhoto({
    ...property,
    photoSource: 'member_upload',
    photoSourceName: 'Private member photo',
    photoCapturedAt: '2026-08-31T12:00:00.000Z',
  }), true)
})

test('does not show an explicitly unverified image', () => {
  assert.equal(hasDisplayablePropertyPhoto({ ...property, photoSource: 'unverified' }), false)
})

test('expires provider photo claims when verification is stale', () => {
  assert.equal(hasDisplayablePropertyPhoto({
    ...property,
    photoSource: 'government_listing',
    photoSourceUrl: 'https://provider.example/photo/1',
    photoCapturedAt: '2025-08-31T12:00:00.000Z',
    photoVerifiedAt: '2020-08-31T12:00:00.000Z',
  }), false)
})
