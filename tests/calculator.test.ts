import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeTaxDeedScenario, type TaxDeedScenario } from '../src/lib/calculator'

const completeScenario: TaxDeedScenario = {
  plannedBid: 50_000,
  buyerPremiumRate: 5,
  auctionFees: 1_500,
  closingCosts: 4_000,
  titleAndLienCosts: 3_000,
  repairs: 20_000,
  contingency: 1_500,
  holdingMonths: 6,
  monthlyHolding: 1_000,
  resaleValue: 150_000,
  resaleSource: 'Three nearby sold properties verified on 2026-08-22',
  sellingCostRate: 8,
  targetProfit: 30_000,
  valueChecked: true,
  conditionChecked: true,
  titleChecked: true,
  feesChecked: true,
}

test('calculates every cost and maximum bid without double-counting a deposit', () => {
  const result = analyzeTaxDeedScenario(completeScenario)

  assert.equal(result.complete, true)
  assert.equal(result.acquisitionCost, 54_000)
  assert.equal(result.nonBidCosts, 34_500)
  assert.equal(result.projectedProfit, 49_500)
  assert.ok(result.maximumBid !== null)
  assert.ok(Math.abs(result.maximumBid - 68_571.42857142857) < 0.001)
})

test('withholds profit and maximum bid until a resale value is entered', () => {
  const result = analyzeTaxDeedScenario({ ...completeScenario, resaleValue: 0 })

  assert.equal(result.complete, false)
  assert.equal(result.projectedProfit, null)
  assert.equal(result.maximumBid, null)
  assert.ok(result.warnings.some((warning) => warning.includes('resale value')))
})

test('withholds profit and maximum bid until every evidence check is complete', () => {
  const result = analyzeTaxDeedScenario({ ...completeScenario, titleChecked: false })

  assert.equal(result.complete, false)
  assert.equal(result.projectedProfit, null)
  assert.equal(result.maximumBid, null)
  assert.ok(result.warnings.some((warning) => warning.includes('title and liens')))
})

test('warns when a planned bid is above the target-profit limit', () => {
  const result = analyzeTaxDeedScenario({ ...completeScenario, plannedBid: 80_000 })

  assert.ok(result.warnings.some((warning) => warning.includes('above the maximum bid')))
})

test('treats damaged saved inputs as missing instead of producing NaN or crashing', () => {
  const damaged = {
    ...completeScenario,
    plannedBid: undefined,
    resaleValue: 'not-a-number',
    resaleSource: undefined,
  } as unknown as TaxDeedScenario

  const result = analyzeTaxDeedScenario(damaged)

  assert.equal(result.complete, false)
  assert.equal(result.projectedProfit, null)
  assert.ok(Number.isFinite(result.totalProjectCost))
  assert.ok(Number.isFinite(result.netSaleProceeds))
})
