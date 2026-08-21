import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeTaxDeedScenario, type TaxDeedScenario } from '../src/lib/calculator'

const completeScenario: TaxDeedScenario = {
  plannedBid: 50_000,
  buyerPremiumRate: 5,
  auctionFees: 1_000,
  titleLegal: 5_000,
  obligationsReserve: 4_000,
  repairs: 20_000,
  holdingMonths: 6,
  monthlyHolding: 1_000,
  resaleValue: 150_000,
  resaleSource: 'Three nearby sold comparables',
  sellingCostRate: 8,
  fixedExitCosts: 1_500,
  targetProfit: 30_000,
}

test('calculates all-in profit and maximum bid without double-counting a deposit', () => {
  const result = analyzeTaxDeedScenario(completeScenario)

  assert.equal(result.complete, true)
  assert.equal(result.acquisitionCost, 52_500)
  assert.equal(result.nonBidCosts, 36_000)
  assert.equal(result.projectedProfit, 48_000)
  assert.ok(result.maximumBid !== null)
  assert.ok(Math.abs(result.maximumBid - 67_142.85714285714) < 0.001)
})

test('withholds profit and maximum bid until resale evidence is entered', () => {
  const result = analyzeTaxDeedScenario({ ...completeScenario, resaleValue: 0, resaleSource: '' })

  assert.equal(result.complete, false)
  assert.equal(result.projectedProfit, null)
  assert.equal(result.maximumBid, null)
  assert.ok(result.warnings.some((warning) => warning.includes('resale value')))
})

test('warns when a planned bid is above the target-profit limit', () => {
  const result = analyzeTaxDeedScenario({ ...completeScenario, plannedBid: 80_000 })

  assert.ok(result.warnings.some((warning) => warning.includes('above the maximum bid')))
})
