import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateResearchReadiness,
  createEmptyResearchRecord,
  getCountyCallQuestions,
  getResearchSections,
  type PropertyResearchRecord,
} from '../src/lib/researchWorkspace'
import type { Property } from '../src/types/property'

const deedProperty = {
  id: 'deed-1',
  county: 'Brevard',
  state: 'FL',
  saleType: 'Tax Deed',
  propertyType: 'Single Family',
  sourceUrl: 'https://county.gov/tax-deed/1',
} as Property

test('starts a property in quick screen with every fact unknown', () => {
  const record = createEmptyResearchRecord(deedProperty.id)
  const readiness = calculateResearchReadiness(record, deedProperty)

  assert.equal(readiness.stage, 'quick-screen')
  assert.equal(readiness.ready, false)
  assert.equal(readiness.verified, 0)
  assert.equal(readiness.total, 14)
})

test('moves into due diligence after the quick screen is verified', () => {
  const record = createEmptyResearchRecord(deedProperty.id)
  record.items.official_listing = { status: 'verified', note: 'Official listing checked today.' }
  record.items.parcel_identity = { status: 'verified', note: 'Parcel and legal description match.' }
  record.items.budget_fit = { status: 'verified', note: 'Cash budget documented.' }

  const readiness = calculateResearchReadiness(record, deedProperty)

  assert.equal(readiness.stage, 'due-diligence')
  assert.equal(readiness.quickScreenComplete, true)
  assert.equal(readiness.ready, false)
})

test('requires every research item and an exit plan before calling a property bid ready', () => {
  const record = createEmptyResearchRecord(deedProperty.id)
  for (const section of getResearchSections(deedProperty)) {
    for (const item of section.items) record.items[item.key] = { status: 'verified', note: 'Evidence saved.' }
  }
  record.exitStrategy = 'resale'
  record.exitPlan = 'Sell to a local owner occupant after title and repairs are complete.'

  const readiness = calculateResearchReadiness(record, deedProperty)

  assert.equal(readiness.stage, 'bid-ready')
  assert.equal(readiness.ready, true)
  assert.equal(readiness.verified, readiness.total)
})

test('a stop finding blocks bid readiness even when every other item is verified', () => {
  const record = createEmptyResearchRecord(deedProperty.id)
  for (const section of getResearchSections(deedProperty)) {
    for (const item of section.items) record.items[item.key] = { status: 'verified', note: 'Evidence saved.' }
  }
  record.items.title_search = { status: 'stop', note: 'Unresolved superior lien.' }
  record.exitStrategy = 'rental'
  record.exitPlan = 'Hold as a rental after possession is legally available.'

  const readiness = calculateResearchReadiness(record, deedProperty)

  assert.equal(readiness.ready, false)
  assert.deepEqual(readiness.blockers, ['title_search'])
})

test('county questions cover sale logistics, unsold inventory, and sale-type risks', () => {
  const deedQuestions = getCountyCallQuestions(deedProperty)
  const lienQuestions = getCountyCallQuestions({ ...deedProperty, id: 'lien-1', saleType: 'Tax Lien' })

  assert.ok(deedQuestions.some((question) => question.toLowerCase().includes('unsold')))
  assert.ok(deedQuestions.some((question) => question.toLowerCase().includes('payment deadline')))
  assert.ok(deedQuestions.some((question) => question.toLowerCase().includes('deed')))
  assert.ok(lienQuestions.some((question) => question.toLowerCase().includes('interest')))
  assert.ok(lienQuestions.some((question) => question.toLowerCase().includes('foreclos')))
})

test('a verified button without an evidence note does not advance readiness', () => {
  const record = createEmptyResearchRecord(deedProperty.id)
  record.items.official_listing = { status: 'verified', note: '   ' }

  const readiness = calculateResearchReadiness(record, deedProperty)

  assert.equal(readiness.verified, 0)
  assert.equal(readiness.stage, 'quick-screen')
})

test('damaged saved research data stays incomplete instead of appearing bid ready', () => {
  const damaged = {
    propertyId: deedProperty.id,
    items: null,
    exitStrategy: 'resale',
    exitPlan: 'Sell it',
  } as unknown as PropertyResearchRecord

  const readiness = calculateResearchReadiness(damaged, deedProperty)

  assert.equal(readiness.ready, false)
  assert.equal(readiness.verified, 0)
})
