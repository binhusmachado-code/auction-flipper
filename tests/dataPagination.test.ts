import test from 'node:test'
import assert from 'node:assert/strict'
import { collectPages } from '../src/lib/pagination.ts'

test('property loader retrieves every database page', async () => {
  const ranges: Array<[number, number]> = []
  const rows = await collectPages(async (from, to) => {
    ranges.push([from, to])
    return from === 0 ? [{ id: 'a' }, { id: 'b' }] : [{ id: 'c' }]
  }, 2)

  assert.deepEqual(ranges, [[0, 1], [2, 3]])
  assert.deepEqual(rows.map((row) => row.id), ['a', 'b', 'c'])
})
