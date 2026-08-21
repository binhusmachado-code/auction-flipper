import assert from 'node:assert/strict'
import test from 'node:test'
import { MEMBERSHIP_PRICING } from '../src/lib/pricing'

test('publishes the approved membership prices and annual savings', () => {
  assert.equal(MEMBERSHIP_PRICING.monthly, 89)
  assert.equal(MEMBERSHIP_PRICING.yearly, 550)
  assert.equal(MEMBERSHIP_PRICING.yearlySavings, 518)
})
