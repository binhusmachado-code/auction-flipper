import test from 'node:test'
import assert from 'node:assert/strict'
import { collectKnownPages, collectPages } from '../src/lib/pagination.ts'

test('property loader retrieves every database page', async () => {
  const ranges: Array<[number, number]> = []
  const rows = await collectPages(async (from, to) => {
    ranges.push([from, to])
    return from === 0 ? [{ id: 'a' }, { id: 'b' }] : [{ id: 'c' }]
  }, 2)

  assert.deepEqual(ranges, [[0, 1], [2, 3]])
  assert.deepEqual(rows.map((row) => row.id), ['a', 'b', 'c'])
})

test('property loader retrieves known remaining pages together and preserves order', async () => {
  const ranges: Array<[number, number]> = []
  let activeRequests = 0
  let peakRequests = 0

  const rows = await collectKnownPages(async (from, to) => {
    ranges.push([from, to])
    activeRequests += 1
    peakRequests = Math.max(peakRequests, activeRequests)
    await new Promise((resolve) => setTimeout(resolve, from === 2 ? 15 : 5))
    activeRequests -= 1
    return [{ id: String(from) }]
  }, [{ id: '0' }], 5, 2)

  assert.deepEqual(ranges, [[2, 3], [4, 4]])
  assert.equal(peakRequests, 2)
  assert.deepEqual(rows.map((row) => row.id), ['0', '2', '4'])
})
