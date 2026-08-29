import assert from 'node:assert/strict'
import test from 'node:test'
import { getListedBidAmount, getVerifiedScreeningSpread } from '../src/lib/propertyBudget'
import type { Property } from '../src/types/property'

test('uses an official opening bid before a generic listed amount', () => {
  const property = { openingBid: 12_500, price: 18_000 } as Property
  assert.equal(getListedBidAmount(property), 12_500)
})

test('falls back to the listed amount when no opening bid is posted', () => {
  const property = { openingBid: 0, price: 18_000 } as Property
  assert.equal(getListedBidAmount(property), 18_000)
})

test('only calculates a screening spread from a verified county value', () => {
  const verified = { openingBid: 20_000, price: 20_000, assessedValue: 100_000, estimatedValue: 150_000, valuationVerified: true } as Property
  const unverified = { ...verified, valuationVerified: false } as Property

  assert.equal(getVerifiedScreeningSpread(verified), 80_000)
  assert.equal(getVerifiedScreeningSpread(unverified), null)
})
