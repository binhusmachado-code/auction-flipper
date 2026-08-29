export async function collectPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000,
) {
  const rows: T[] = []
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchPage(offset, offset + pageSize - 1)
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

export async function collectKnownPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  firstPage: T[],
  totalRows: number,
  pageSize = 1000,
) {
  if (totalRows <= firstPage.length) return firstPage

  const ranges: Array<[number, number]> = []
  for (let offset = pageSize; offset < totalRows; offset += pageSize) {
    ranges.push([offset, Math.min(offset + pageSize - 1, totalRows - 1)])
  }

  const remainingPages = await Promise.all(
    ranges.map(([from, to]) => fetchPage(from, to)),
  )
  return [...firstPage, ...remainingPages.flat()]
}
