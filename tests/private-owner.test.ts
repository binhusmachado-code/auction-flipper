import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('national directory contains all states, DC, and Census county equivalents', () => {
  const data = JSON.parse(read('../src/data/us_jurisdictions.json')) as {
    states: Array<{ abbreviation: string; counties: Array<{ fips: string }> }>
  }
  const countyFips = data.states.flatMap((state) => state.counties.map((county) => county.fips))

  assert.equal(data.states.length, 51)
  assert.equal(countyFips.length, 3_144)
  assert.equal(new Set(countyFips).size, countyFips.length)
  assert.equal(data.states.some((state) => state.abbreviation === 'DC'), true)
  assert.equal(data.states.some((state) => state.abbreviation === 'PR'), false)
})

test('customer access exposes signup, pricing, and keeps admin controls gated', () => {
  const auth = read('../src/components/AuthModal.tsx')
  const app = read('../src/App.tsx')

  assert.match(auth, /signUp/)
  assert.match(auth, /signInWithPassword/)
  assert.match(app, /PublicHome/)
  assert.match(app, /startCheckout/)
  assert.match(app, /public preview|Free preview/i)
  assert.match(app, /profile\?\.role === 'admin'/)
})
