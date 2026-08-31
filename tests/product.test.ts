import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { LESSONS } from '../src/lib/learning'
import { PLAN_DEFINITIONS, permittedAlertFrequency, priceFor } from '../src/lib/plans'

test('published plans keep the free preview useful and paid limits explicit', () => {
  assert.equal(PLAN_DEFINITIONS.free.monthlyPrice, 0)
  assert.equal(PLAN_DEFINITIONS.free.trackedPropertyLimit, 5)
  assert.equal(PLAN_DEFINITIONS.investor.monthlyPrice, 29)
  assert.equal(PLAN_DEFINITIONS.investor.annualPrice, 290)
  assert.equal(PLAN_DEFINITIONS.pro.monthlyPrice, 69)
  assert.equal(priceFor('pro', 'year'), 690)
})

test('alert delivery is capped by the member tier', () => {
  assert.equal(permittedAlertFrequency('free', 'daily'), 'none')
  assert.equal(permittedAlertFrequency('investor', 'instant'), 'daily')
  assert.equal(permittedAlertFrequency('pro', 'instant'), 'instant')
})

test('learning center contains the six required lessons with a knowledge check', () => {
  assert.equal(LESSONS.length, 6)
  assert.deepEqual(LESSONS.map((lesson) => lesson.title), [
    'Tax liens vs. tax deeds',
    'Read the official sale record',
    'Research title, liens, and parties',
    'Verify access and condition',
    'Calculate a maximum bid',
    'From auction to payment',
  ])
  LESSONS.forEach((lesson) => {
    assert.ok(lesson.transcript.length > 0)
    assert.ok(lesson.answers.length >= 3)
    assert.ok(lesson.correctAnswer >= 0 && lesson.correctAnswer < lesson.answers.length)
  })
})

test('product migration declares ownership RLS, preview boundaries, and document isolation', () => {
  const sql = readFileSync(new URL('../supabase/migrations/202608300001_product_expansion.sql', import.meta.url), 'utf8')
  assert.match(sql, /alter table public\.saved_searches enable row level security/)
  assert.match(sql, /Users manage own property tracking/)
  assert.match(sql, /list_property_previews/)
  assert.match(sql, /bucket_id = 'property-documents'/)
  assert.match(sql, /\(select auth\.uid\(\)\)/)
})
