import assert from 'node:assert/strict'
import test from 'node:test'
import { applyServerVerificationRun, buildPropertyVerificationReport } from '../src/lib/propertyVerification'
import type { Property } from '../src/types/property'
import type { PropertyDocument, PropertySourceRecord } from '../src/types/product'

const property = {
  id: 'parcel-1', address: '10 Main St', city: 'Tampa', state: 'FL', zip: '33601', county: 'Hillsborough',
  price: 20_000, openingBid: 20_000, depositRequired: 1_000, estimatedValue: 0, assessedValue: 100_000,
  beds: 0, baths: 0, sqft: 0, propertyType: 'Land', auctionDate: '2026-09-15', auctionType: 'Tax Deed',
  saleType: 'Tax Deed', source: 'County Clerk', sourceUrl: 'https://county.example/sale', description: '', imageUrl: '', images: [],
  status: 'Active', daysOnMarket: 0, rehabEstimate: 0, arv: 0, notes: '', latitude: 1, longitude: 1,
  taxAmount: 0, interestRate: 0, redemptionPeriod: 0, delinquentYears: 0, valuationVerified: true,
  parcelId: 'A-100', caseNumber: 'TD-1', legalDescription: 'LOT 1 BLOCK A', sellingAuthority: 'County Clerk',
  sourceVerifiedAt: '2026-08-31T12:00:00.000Z',
} as Property

const source = (sourceType: PropertySourceRecord['sourceType'], evidence: Record<string, unknown> = {}): PropertySourceRecord => ({
  id: sourceType, propertyId: property.id, sourceType, sourceName: sourceType, sourceUrl: 'https://county.example',
  status: 'available', verifiedAt: '2026-08-31T12:00:00.000Z', retrievedAt: '2026-08-31T12:00:00.000Z', official: true,
  evidence: { providerValidated: true, ...evidence },
})

test('does not auto-certify legal and physical facts from a listing alone', () => {
  const report = buildPropertyVerificationReport({ property, checkedAt: '2026-08-31T12:30:00.000Z' })
  assert.notEqual(report.overallStatus, 'verified')
  assert.equal(report.checks.find((item) => item.key === 'title_and_rules')?.status, 'action_required')
  assert.equal(report.checks.find((item) => item.key === 'access_condition')?.status, 'action_required')
})

test('does not verify authority, physical facts, or deadlines from populated columns alone', () => {
  const report = buildPropertyVerificationReport({
    property: {
      ...property,
      registrationDeadline: '2026-09-14T17:00:00.000Z',
      paymentDeadline: '2026-09-16T17:00:00.000Z',
      accessStatus: 'verified',
      occupancySignal: 'vacant',
      permitStatus: 'verified',
      utilityStatus: 'verified',
    },
    tracker: {
      id: 'tracker-1', userId: 'user-1', propertyId: property.id, status: 'due_diligence',
      nextAction: 'Check post-sale deadline', dueAt: '2026-09-17T17:00:00.000Z',
      createdAt: '2026-08-31T12:00:00.000Z', updatedAt: '2026-08-31T12:00:00.000Z',
    },
    checkedAt: '2026-08-31T12:30:00.000Z',
  })
  assert.notEqual(report.checks.find((item) => item.key === 'sale_authority')?.status, 'verified')
  assert.notEqual(report.checks.find((item) => item.key === 'access_condition')?.status, 'verified')
  assert.notEqual(report.checks.find((item) => item.key === 'deadlines')?.status, 'verified')
})

test('ignores a source that was not server validated', () => {
  const unvalidated = source('auction', { saleType: 'Tax Deed', sellingAuthority: 'County Clerk' })
  unvalidated.evidence.providerValidated = false
  const report = buildPropertyVerificationReport({ property, sources: [unvalidated] })
  assert.notEqual(report.checks.find((item) => item.key === 'sale_authority')?.status, 'verified')
})

test('stops a property when verified identity evidence conflicts', () => {
  const report = buildPropertyVerificationReport({
    property,
    sources: [source('auction', { parcelId: 'DIFFERENT' }), source('appraiser', { parcelId: 'A-100' })],
  })
  assert.equal(report.checks.find((item) => item.key === 'identity')?.status, 'stop')
  assert.equal(report.overallStatus, 'stop')
})

test('stops cancelled inventory even when auction fields are populated', () => {
  const report = buildPropertyVerificationReport({ property: { ...property, status: 'Cancelled' } })
  assert.equal(report.checks.find((item) => item.key === 'sale_authority')?.status, 'stop')
  assert.equal(report.checks.find((item) => item.key === 'auction_terms')?.status, 'stop')
})

test('does not verify auction terms from empty source rows', () => {
  const report = buildPropertyVerificationReport({ property, sources: [source('auction'), source('rules')] })
  assert.notEqual(report.checks.find((item) => item.key === 'auction_terms')?.status, 'verified')
})

test('stops when the planned bid exceeds the calculated maximum', () => {
  const report = buildPropertyVerificationReport({
    property,
    savedAnalysis: {
      propertyId: property.id,
      address: property.address,
      scenario: {
        plannedBid: 150_000,
        buyerPremiumRate: 0,
        auctionFees: 500,
        closingCosts: 2_000,
        titleAndLienCosts: 2_000,
        repairs: 10_000,
        contingency: 5_000,
        holdingMonths: 6,
        monthlyHolding: 1_000,
        resaleValue: 150_000,
        resaleSource: 'Three recent sold comparables',
        sellingCostRate: 5,
        targetProfit: 20_000,
        valueChecked: true,
        conditionChecked: true,
        titleChecked: true,
        feesChecked: true,
      },
    },
  })
  assert.equal(report.checks.find((item) => item.key === 'maximum_bid')?.status, 'stop')
  assert.equal(report.overallStatus, 'stop')
})

test('does not treat a member-attested upload as server-validated title evidence', () => {
  const memberUpload: PropertyDocument = {
    id: 'document-1', userId: 'user-1', propertyId: property.id, storagePath: 'private/title.pdf',
    filename: 'title.pdf', mimeType: 'application/pdf', sizeBytes: 100, documentType: 'title_search',
    verifiedAt: '2026-08-31T12:00:00.000Z', sourceUrl: 'https://example.com/title', documentDate: '2026-08-31',
    evidence: { memberAttested: true, providerValidated: false }, createdAt: '2026-08-31T12:00:00.000Z',
  }
  const report = buildPropertyVerificationReport({ property, documents: [memberUpload], checkedAt: '2026-08-31T12:30:00.000Z' })
  const titleCheck = report.checks.find((item) => item.key === 'title_and_rules')
  assert.equal(titleCheck?.status, 'action_required')
  assert.ok(titleCheck?.missing.some((item) => item.startsWith('title evidence:')))
})

test('treats browser verification as provisional until a valid server run is applied', () => {
  const provisional = buildPropertyVerificationReport({ property })
  assert.equal(provisional.authoritative, false)
  const authoritative = applyServerVerificationRun(provisional, {
    engine_version: 'server-v1',
    overall_status: 'stop',
    verified_count: 2,
    checked_at: '2026-08-31T12:45:00.000Z',
    last_source_verified_at: '2026-08-31T12:00:00.000Z',
    checks: [{ key: 'identity', status: 'stop' }, { key: 'sale_authority', status: 'verified' }],
  })
  assert.equal(authoritative.authoritative, true)
  assert.equal(authoritative.overallStatus, 'stop')
  assert.equal(authoritative.verifiedCount, 2)
  assert.equal(authoritative.checks.find((item) => item.key === 'identity')?.status, 'stop')
  assert.equal(authoritative.checks.find((item) => item.key === 'auction_terms')?.status, 'action_required')
})

test('rejects malformed server runs instead of promoting a browser report', () => {
  const provisional = buildPropertyVerificationReport({ property })
  const result = applyServerVerificationRun(provisional, {
    overall_status: 'verified', verified_count: 99, checked_at: 'not-a-date', checks: [],
  })
  assert.equal(result.authoritative, false)
})
