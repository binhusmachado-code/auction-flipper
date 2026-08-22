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
