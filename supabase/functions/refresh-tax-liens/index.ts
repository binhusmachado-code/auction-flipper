import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const expectedTokenHash = '1db6083d01ed590b90dd37f67076dcebf4d1cd0454ebc15c85bc975b89f276ff'
const allowedSourceHosts = new Set(['adamscountyco.gov'])

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

function isPlaceholderImage(value: unknown) {
  const url = String(value ?? '').toLowerCase()
  return !url.startsWith('https://') || ['unsplash.com', 'noimage', 'no-image', 'placeholder', 'default-image', 'fallback', 'coming-soon']
    .some((marker) => url.includes(marker))
}

async function trustedPhotoProvenance(record: CatalogRecord, verifiedAt: string | null) {
  if (!verifiedAt || record.photoAssetVerified !== true || !['official_auction', 'government_listing'].includes(String(record.photoSource ?? ''))) return null
  try {
    const recordUrl = new URL(String(record.sourceUrl ?? ''))
    const photoPageUrl = new URL(String(record.photoSourceUrl ?? ''))
    const imageUrl = new URL(String(record.imageUrl ?? ''))
    if (imageUrl.protocol !== 'https:' || photoPageUrl.protocol !== 'https:' || isPlaceholderImage(imageUrl.href)) return null
    if (!allowedSourceHosts.has(photoPageUrl.hostname) || photoPageUrl.href !== recordUrl.href) return null
    const [listingResponse, imageResponse] = await Promise.all([
      fetch(photoPageUrl, { signal: AbortSignal.timeout(10_000) }),
      fetch(imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(10_000) }),
    ])
    if (!listingResponse.ok || !imageResponse.ok || !String(imageResponse.headers.get('content-type')).startsWith('image/')) return null
    const listingHtml = await listingResponse.text()
    if (!listingHtml.includes(imageUrl.href) && !listingHtml.includes(imageUrl.pathname)) return null
    const capturedAt = record.photoCapturedAt ? new Date(String(record.photoCapturedAt)) : null
    return {
      source: String(record.photoSource),
      name: record.photoSourceName ? String(record.photoSourceName) : String(record.source ?? 'Official auction photo'),
      url: photoPageUrl.href,
      capturedAt: capturedAt && Number.isFinite(capturedAt.getTime()) ? capturedAt.toISOString() : null,
      verifiedAt,
    }
  } catch {
    return null
  }
}

async function normalize(record: CatalogRecord, verifiedAt: string) {
  const photo = await trustedPhotoProvenance(record, verifiedAt)
  const imageUrl = isPlaceholderImage(record.imageUrl) ? '' : String(record.imageUrl ?? '')
  return {
    id: String(record.id ?? ''),
    address: String(record.address ?? ''),
    city: String(record.city ?? ''),
    state: String(record.state ?? ''),
    zip: String(record.zip ?? ''),
    county: String(record.county ?? ''),
    price: number(record.price),
    opening_bid: optionalNumber(record.openingBid),
    deposit_required: optionalNumber(record.depositRequired),
    assessed_value: number(record.assessedValue),
    estimated_value: number(record.estimatedValue),
    valuation_verified: record.valuationVerified === true,
    property_type: String(record.propertyType ?? 'Unknown'),
    auction_type: 'Tax Lien',
    sale_type: 'Tax Lien',
    auction_date: record.auctionDate ? String(record.auctionDate) : null,
    case_number: record.caseNumber ? String(record.caseNumber) : null,
    parcel_id: record.parcelId ? String(record.parcelId) : null,
    owner_name: record.ownerName ? String(record.ownerName) : null,
    source: String(record.source ?? ''),
    source_url: String(record.sourceUrl ?? ''),
    description: String(record.description ?? ''),
    image_url: imageUrl,
    images: Array.isArray(record.images) ? record.images : [],
    status: 'Active',
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
    selling_authority: record.sellingAuthority ? String(record.sellingAuthority) : null,
    legal_description: record.legalDescription ? String(record.legalDescription) : null,
    registration_deadline: record.registrationDeadline ? String(record.registrationDeadline) : null,
    payment_deadline: record.paymentDeadline ? String(record.paymentDeadline) : null,
    photo_source: photo?.source ?? (imageUrl ? 'unverified' : null),
    photo_source_name: photo?.name ?? null,
    photo_source_url: photo?.url ?? null,
    photo_captured_at: photo?.capturedAt ?? null,
    photo_verified_at: photo?.verifiedAt ?? null,
    occupancy_signal: String(record.occupancySignal ?? 'unknown'),
    access_status: String(record.accessStatus ?? 'unknown'),
    permit_status: String(record.permitStatus ?? 'unknown'),
    utility_status: String(record.utilityStatus ?? 'unknown'),
    updated_at: new Date().toISOString(),
  }
}

function denormalize(record: CatalogRecord) {
  return {
    id: String(record.id ?? ''),
    address: String(record.address ?? ''),
    city: String(record.city ?? ''),
    state: String(record.state ?? ''),
    zip: String(record.zip ?? ''),
    county: String(record.county ?? ''),
    price: number(record.price),
    assessedValue: number(record.assessed_value),
    estimatedValue: number(record.estimated_value),
    valuationVerified: record.valuation_verified === true,
    propertyType: String(record.property_type ?? 'Unknown'),
    auctionType: 'Tax Lien',
    saleType: 'Tax Lien',
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
    sourceVerifiedAt: record.source_verified_at ? String(record.source_verified_at) : null,
    sellingAuthority: record.selling_authority ? String(record.selling_authority) : null,
    legalDescription: record.legal_description ? String(record.legal_description) : null,
    registrationDeadline: record.registration_deadline ? String(record.registration_deadline) : null,
    paymentDeadline: record.payment_deadline ? String(record.payment_deadline) : null,
    photoSource: record.photo_source ? String(record.photo_source) : null,
    photoSourceName: record.photo_source_name ? String(record.photo_source_name) : null,
    photoSourceUrl: record.photo_source_url ? String(record.photo_source_url) : null,
    photoCapturedAt: record.photo_captured_at ? String(record.photo_captured_at) : null,
    photoVerifiedAt: record.photo_verified_at ? String(record.photo_verified_at) : null,
    occupancySignal: String(record.occupancy_signal ?? 'unknown'),
    accessStatus: String(record.access_status ?? 'unknown'),
    permitStatus: String(record.permit_status ?? 'unknown'),
    utilityStatus: String(record.utility_status ?? 'unknown'),
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
  const response = await fetch(
    `${supabaseUrl}/rest/v1/properties?select=*&sale_type=eq.Tax%20Lien&status=eq.Active&order=id&limit=1000`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  )
  if (!response.ok) throw new Error(`Current lien inventory could not be loaded: ${await response.text()}`)
  const records = await response.json() as CatalogRecord[]
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
    if (!Array.isArray(records) || records.length < 25 || records.length !== metadata.total) {
      throw new Error('Published lien inventory failed the minimum-count check')
    }
    if (new Set(records.map((record) => String(record.id))).size !== records.length) {
      throw new Error('Published lien inventory contains duplicate IDs')
    }
    for (const record of records) {
      const source = new URL(String(record.sourceUrl ?? ''))
      if (!allowedSourceHosts.has(source.hostname)) throw new Error(`Unapproved source host: ${source.hostname}`)
      if (
        String(record.saleType) !== 'Tax Lien' || String(record.state) !== 'CO' ||
        String(record.county) !== 'Adams' || number(record.price) <= 0
      ) {
        throw new Error(`Invalid active lien record: ${String(record.id)}`)
      }
    }
    const sources = metadata.sources ?? []
    if (!sources.some((source) => source.status === 'verified' && Number(source.count) === records.length)) {
      throw new Error('No verified lien source matches the published inventory')
    }

    const verifiedAt = new Date().toISOString()
    const normalized = await Promise.all(records.map((record) => normalize(record, verifiedAt)))
    const { supabaseUrl, serviceRoleKey } = await databaseSettings()
    const syncResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sync_tax_lien_inventory_v2`, {
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
