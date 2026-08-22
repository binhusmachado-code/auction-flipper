import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeTaxDeedScenario, type TaxDeedScenario } from '../src/lib/calculator'
import {
  getBidTips,
  getDealVerdict,
  getDueDiligenceItems,
  getPropertyProsAndCons,
  rankDealAnalyses,
} from '../src/lib/propertyAnalysis'
import type { Property } from '../src/types/property'

const scenario: TaxDeedScenario = {
  plannedBid: 50_000,
  buyerPremiumRate: 0,
  auctionFees: 1_000,
  closingCosts: 4_000,
  titleAndLienCosts: 5_000,
  repairs: 15_000,
  contingency: 5_000,
  holdingMonths: 5,
  monthlyHolding: 1_000,
  resaleValue: 150_000,
  resaleSource: 'Three nearby sold properties',
  sellingCostRate: 8,
  targetProfit: 30_000,
  valueChecked: true,
  conditionChecked: true,
  titleChecked: true,
  feesChecked: true,
}

test('labels complete deals Great, Good, or Bad using profit and safety margin', () => {
  const greatAnalysis = analyzeTaxDeedScenario(scenario)
  const goodScenario = { ...scenario, plannedBid: 70_000 }
  const badScenario = { ...scenario, plannedBid: 85_000 }

  assert.equal(getDealVerdict(greatAnalysis, scenario).grade, 'Great')
  assert.equal(getDealVerdict(analyzeTaxDeedScenario(goodScenario), goodScenario).grade, 'Good')
  assert.equal(getDealVerdict(analyzeTaxDeedScenario(badScenario), badScenario).grade, 'Bad')
})

test('calculates return on cost using every project cost, including selling costs', () => {
  const analysis = analyzeTaxDeedScenario(scenario)
  const verdict = getDealVerdict(analysis, scenario)
  const allCosts = analysis.totalProjectCost + analysis.sellingCosts

  assert.ok(verdict.roi !== null)
  assert.ok(Math.abs(verdict.roi - (analysis.projectedProfit ?? 0) / allCosts * 100) < 0.001)
})

test('never grades or ranks an analysis with unfinished evidence checks', () => {
  const unfinishedScenario = { ...scenario, conditionChecked: false }
  const unfinished = analyzeTaxDeedScenario(unfinishedScenario)

  assert.equal(getDealVerdict(unfinished, unfinishedScenario).grade, 'Not ready')
  assert.deepEqual(rankDealAnalyses([
    { propertyId: 'unfinished', address: 'Unknown condition', scenario: unfinishedScenario },
  ]), [])
})

test('ranks completed deals by verdict, safety margin, then projected profit', () => {
  const goodScenario = { ...scenario, plannedBid: 70_000 }
  const badScenario = { ...scenario, plannedBid: 85_000 }
  const ranked = rankDealAnalyses([
    { propertyId: 'bad', address: 'Bad deal', scenario: badScenario },
    { propertyId: 'great', address: 'Great deal', scenario },
    { propertyId: 'good', address: 'Good deal', scenario: goodScenario },
  ])

  assert.deepEqual(ranked.map((deal) => deal.propertyId), ['great', 'good', 'bad'])
})

test('explains due diligence and property facts without inventing unknowns', () => {
  const property = {
    id: 'property-1',
    saleType: 'Tax Deed',
    sourceUrl: 'https://county.gov/tax-deed/1',
    valuationVerified: true,
    assessedValue: 120_000,
    estimatedValue: 150_000,
    parcelId: '123-456',
    latitude: 28.1,
    longitude: -80.6,
    auctionDate: '2026-09-17',
    openingBid: 20_000,
    imageUrl: '',
    images: [],
  } as Property

  const facts = getPropertyProsAndCons(property)
  const diligence = getDueDiligenceItems(property)
  const tips = getBidTips(property, 68_571)

  assert.ok(facts.pros.some((item) => item.includes('source link')))
  assert.ok(facts.pros.some((item) => item.includes('verified county value')))
  assert.ok(facts.cons.some((item) => item.includes('condition')))
  assert.ok(facts.cons.some((item) => item.includes('title')))
  assert.ok(diligence.some((item) => item.title === 'Title and surviving liens'))
  assert.ok(diligence.every((item) => item.explanation.length > 20))
  assert.ok(tips[0].includes('$68,571'))
})
