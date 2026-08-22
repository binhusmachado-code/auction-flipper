import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { stateSaleGuides } from '../src/data/stateSaleGuides'

const jurisdictions = JSON.parse(
  readFileSync(new URL('../src/data/us_jurisdictions.json', import.meta.url), 'utf8'),
) as { states: Array<{ abbreviation: string }> }

test('every state and DC has a nationwide sale-path guide', () => {
  const expected = jurisdictions.states.map((state) => state.abbreviation).sort()
  const actual = Object.keys(stateSaleGuides).sort()

  assert.deepEqual(actual, expected)
  assert.equal(actual.length, 51)
  Object.values(stateSaleGuides).forEach((guide) => {
    assert.ok(guide.salePaths.length > 4)
  })
})
