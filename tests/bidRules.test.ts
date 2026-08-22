import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateBidReadiness, getBidRules } from '../src/lib/bidRules'
import type { Property } from '../src/types/property'

const floridaDeed = {
  id: 'test-property',
  state: 'FL',
  saleType: 'Tax Deed',
} as Property

test('Florida tax deed deposit uses the statutory minimum', () => {
  const rules = getBidRules(floridaDeed)
  assert.equal(rules.depositEstimate(1_000), 200)
  assert.equal(rules.depositEstimate(20_000), 1_000)
})

test('bid readiness requires every pre-auction safety step', () => {
  assert.deepEqual(calculateBidReadiness({ official_rules: true }), { complete: 1, total: 5, ready: false })
  assert.deepEqual(calculateBidReadiness({
    official_rules: true,
    registration: true,
    due_diligence: true,
    max_bid: true,
    deposit: true,
  }), { complete: 5, total: 5, ready: true })
})
