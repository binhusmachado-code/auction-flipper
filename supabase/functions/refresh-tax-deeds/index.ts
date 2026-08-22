import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const expectedTokenHash = 'cbd74246419459c30ba4bc413a878f1a8a40d2dba31983a067275cd84b5d5004'
const allowedSourceHosts = new Set([
  'broward.realtaxdeed.com',
  'county-taxes.net',
  'www.brevardclerk.us',
  'www.suwgov.org',
  'www.gulfclerk.com',
  'notices.collierclerk.com',
  'taxdeed.mypalmbeachclerk.com',
  'taxdeed.duvalclerk.com',
  'records2.baycoclerk.com',
  'landmark.clayclerk.com',
])

type CatalogRecord = Record<string, unknown>

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function number(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalize(record: CatalogRecord, verifiedAt: string | null) {
  return {
    id: String(record.id ?? ''),
    address: String(record.address ?? ''),
    city: String(record.city ?? ''),
    state: String(record.state ?? 'FL'),
    zip: String(record.zip ?? ''),
    county: String(record.county ?? ''),
    price: number(record.price),
    opening_bid: optionalNumber(record.openingBid),
    deposit_required: optionalNumber(record.depositRequired),
    assessed_value: number(record.assessedValue),
    estimated_value: number(record.estimatedValue),
    valuation_verified: record.valuationVerified === true,
    property_type: String(record.propertyType ?? 'Unknown'),
    auction_type: String(record.auctionType ?? 'Tax Deed'),
    sale_type: String(record.saleType ?? 'Tax Deed'),
    auction_date: record.auctionDate ? String(record.auctionDate) : null,
    case_number: record.caseNumber ? String(record.caseNumber) : null,
    parcel_id: record.parcelId ? String(record.parcelId) : null,
    owner_name: record.ownerName ? String(record.ownerName) : null,
    source: String(record.source ?? ''),
    source_url: String(record.sourceUrl ?? ''),
    description: String(record.description ?? ''),
    image_url: String(record.imageUrl ?? ''),
    images: Array.isArray(record.images) ? record.images : [],
    status: String(record.status ?? 'Active'),
    latitude: number(record.latitude),
    longitude: number(record.longitude),
    beds: number(record.beds),
    baths: number(record.baths),
    sqft: number(record.sqft),
    lot_size: optionalNumber(record.lotSize),
    year_built: optionalNumber(record.yearBuilt),
    days_on_market: number(record.daysOnMarket),
    rehab_estimate: number(record.rehabEstimate),
    arv: number(record.arv),
    notes: String(record.notes ?? ''),
    tax_amount: number(record.taxAmount),
    interest_rate: number(record.interestRate),
    redemption_period: number(record.redemptionPeriod),
    delinquent_years: number(record.delinquentYears),
    source_hash: null,
    source_verified_at: verifiedAt,
    updated_at: new Date().toISOString(),
  }
}

function denormalize(record: CatalogRecord) {
  return {
    id: String(record.id ?? ''),
    address: String(record.address ?? ''),
    city: String(record.city ?? ''),
    state: String(record.state ?? 'FL'),
    zip: String(record.zip ?? ''),
    county: String(record.county ?? ''),
    price: number(record.price),
    openingBid: optionalNumber(record.opening_bid),
    depositRequired: optionalNumber(record.deposit_required),
    assessedValue: number(record.assessed_value),
    estimatedValue: number(record.estimated_value),
    valuationVerified: record.valuation_verified === true,
    propertyType: String(record.property_type ?? 'Unknown'),
    auctionType: String(record.auction_type ?? 'Tax Deed'),
    saleType: String(record.sale_type ?? 'Tax Deed'),
    auctionDate: record.auction_date ? String(record.auction_date) : null,
    caseNumber: record.case_number ? String(record.case_number) : '',
    parcelId: record.parcel_id ? String(record.parcel_id) : '',
    ownerName: record.owner_name ? String(record.owner_name) : '',
    source: String(record.source ?? ''),
    sourceUrl: String(record.source_url ?? ''),
    description: String(record.description ?? ''),
    imageUrl: String(record.image_url ?? ''),
    images: Array.isArray(record.images) ? record.images : [],
    status: String(record.status ?? 'Active'),
    latitude: number(record.latitude),
    longitude: number(record.longitude),
    beds: number(record.beds),
    baths: number(record.baths),
    sqft: number(record.sqft),
    lotSize: optionalNumber(record.lot_size),
    yearBuilt: optionalNumber(record.year_built),
    daysOnMarket: number(record.days_on_market),
    rehabEstimate: number(record.rehab_estimate),
    arv: number(record.arv),
    notes: String(record.notes ?? ''),
    taxAmount: number(record.tax_amount),
    interestRate: number(record.interest_rate),
    redemptionPeriod: number(record.redemption_period),
    delinquentYears: number(record.delinquent_years),
  }
}

async function databaseSettings() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Database service credentials are unavailable')
  return { supabaseUrl, serviceRoleKey }
}

async function loadCurrentInventory() {
  const { supabaseUrl, serviceRoleKey } = await databaseSettings()
  const records: CatalogRecord[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/properties?select=*&sale_type=eq.Tax%20Deed&status=eq.Active&order=id&offset=${offset}&limit=${pageSize}`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    )
    if (!response.ok) throw new Error(`Current inventory could not be loaded: ${await response.text()}`)
    const page = await response.json() as CatalogRecord[]
    records.push(...page)
    if (page.length < pageSize) break
  }
  return records.map(denormalize)
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

Deno.serve(async (request) => {
  if (!['GET', 'POST'].includes(request.method)) return json(405, { error: 'Method not allowed' })
  const token = request.headers.get('x-refresh-token') ?? ''
  if (!token || await sha256(token) !== expectedTokenHash) {
    return json(401, { error: 'Invalid refresh credential' })
  }

  try {
    if (request.method === 'GET') {
      const records = await loadCurrentInventory()
      return json(200, { records, total: records.length })
    }

    const payload = await request.json() as {
      records?: CatalogRecord[]
      metadata?: { total?: number; sources?: Array<Record<string, unknown>> }
    }
    const records = payload.records ?? []
    const metadata = payload.metadata ?? {}
    if (!Array.isArray(records) || records.length < 100 || records.length !== metadata.total) {
      throw new Error('Published inventory failed the minimum-count check')
    }
    if (new Set(records.map((record) => String(record.id))).size !== records.length) {
      throw new Error('Published inventory contains duplicate property IDs')
    }

    const today = new Date().toISOString().slice(0, 10)
    for (const record of records) {
      const source = new URL(String(record.sourceUrl ?? ''))
      if (!allowedSourceHosts.has(source.hostname)) throw new Error(`Unapproved source host: ${source.hostname}`)
      if (String(record.saleType) !== 'Tax Deed' || String(record.auctionDate ?? '') < today) {
        throw new Error(`Invalid active auction record: ${String(record.id)}`)
      }
    }

    const verified = new Set(
      (metadata.sources ?? [])
        .filter((source) => source.status === 'verified')
        .map((source) => String(source.county)),
    )
    const verifiedAt = new Date().toISOString()
    const normalized = records.map((record) => normalize(
      record,
      verified.has(String(record.county)) ? verifiedAt : null,
    ))

    const { supabaseUrl, serviceRoleKey } = await databaseSettings()
    const syncResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sync_tax_deed_inventory`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: normalized, source_metadata: metadata }),
    })
    if (!syncResponse.ok) throw new Error(`Database sync failed: ${await syncResponse.text()}`)
    const result = await syncResponse.json()
    return json(200, { ok: true, result })
  } catch (error) {
    console.error(error)
    return json(500, { error: error instanceof Error ? error.message : 'Refresh failed' })
  }
})
