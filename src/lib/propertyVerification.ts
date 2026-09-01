import { analyzeTaxDeedScenario, type TaxDeedAnalysis } from './calculator'
import type { StoredDealAnalysis } from './propertyAnalysis'
import type { Property } from '../types/property'
import type { PropertyDocument, PropertySourceRecord, PropertyTracker } from '../types/product'
import { hasDisplayablePropertyPhoto } from './propertyPhoto'

export type VerificationStatus = 'verified' | 'partial' | 'action_required' | 'stop'
export type VerificationCheckKey =
  | 'sale_authority'
  | 'identity'
  | 'auction_terms'
  | 'title_and_rules'
  | 'access_condition'
  | 'value_and_costs'
  | 'maximum_bid'
  | 'deadlines'
  | 'documents_and_timestamp'

export interface VerificationCheck {
  key: VerificationCheckKey
  title: string
  status: VerificationStatus
  summary: string
  evidence: string[]
  missing: string[]
}

export interface PropertyVerificationReport {
  engineVersion: string
  authoritative: boolean
  checkedAt: string
  lastSourceVerifiedAt: string | null
  overallStatus: VerificationStatus
  verifiedCount: number
  checks: VerificationCheck[]
}

export interface ServerVerificationRun {
  engine_version?: unknown
  engineVersion?: unknown
  overall_status?: unknown
  overallStatus?: unknown
  verified_count?: unknown
  verifiedCount?: unknown
  checks?: unknown
  checked_at?: unknown
  checkedAt?: unknown
  last_source_verified_at?: unknown
  lastSourceVerifiedAt?: unknown
}

export interface PropertyVerificationInput {
  property: Property
  sources?: PropertySourceRecord[]
  documents?: PropertyDocument[]
  savedAnalysis?: StoredDealAnalysis
  tracker?: PropertyTracker
  checkedAt?: string
}

const usable = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== ''
const positive = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) && value > 0
const normalized = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const numericMatch = (left: unknown, right: unknown) => Number.isFinite(Number(left)) && Number.isFinite(Number(right)) && Math.abs(Number(left) - Number(right)) < 0.01
const dateMatch = (left: unknown, right: unknown) => String(left ?? '').slice(0, 10) !== '' && String(left ?? '').slice(0, 10) === String(right ?? '').slice(0, 10)

function sourceEvidence(source: PropertySourceRecord, keys: string[]) {
  const key = keys.find((candidate) => usable(source.evidence[candidate]))
  return key ? source.evidence[key] : undefined
}

function trustedSources(sources: PropertySourceRecord[]) {
  return sources.filter((source) => source.official && source.evidence.providerValidated === true && source.status === 'available' && Boolean(source.verifiedAt))
}

function isFreshTimestamp(value: string | null | undefined, checkedAt: string, maximumAgeDays = 14) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  const checked = new Date(checkedAt).getTime()
  if (!Number.isFinite(timestamp) || !Number.isFinite(checked) || timestamp > checked + 86_400_000) return false
  return checked - timestamp <= maximumAgeDays * 86_400_000
}

function latestTimestamp(sources: PropertySourceRecord[], checkedAt: string) {
  const verifiedSources = trustedSources(sources)
  const timestamps = [
    ...verifiedSources.map((source) => source.verifiedAt).filter((value) => isFreshTimestamp(value, checkedAt)),
  ].filter((value): value is string => Boolean(value))
  if (!timestamps.length) return null
  return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
}

function fieldsConflict(property: Property, sources: PropertySourceRecord[]) {
  const fields: Array<[string, unknown]> = [
    ['address', property.address],
    ['parcelId', property.parcelId],
    ['caseNumber', property.caseNumber],
    ['legalDescription', property.legalDescription],
  ]
  return fields.some(([field, current]) => {
    if (!usable(current)) return false
    const recorded = sources.map((source) => source.evidence[field]).filter(usable)
    return recorded.some((value) => normalized(value) !== normalized(current))
  })
}

function identityCoverage(property: Property, sources: PropertySourceRecord[]) {
  const fields: Array<[string, keyof Pick<Property, 'address' | 'parcelId' | 'caseNumber' | 'legalDescription'>]> = [
    ['address', 'address'],
    ['parcel ID', 'parcelId'],
    ['case number', 'caseNumber'],
    ['legal description', 'legalDescription'],
  ]
  const evidence: string[] = []
  const missing: string[] = []
  fields.forEach(([label, field]) => {
    if (!usable(property[field])) {
      missing.push(label)
      return
    }
    const corroborating = sources.filter((source) => usable(source.evidence[field]) && normalized(source.evidence[field]) === normalized(property[field]))
    if (corroborating.length >= 2) evidence.push(`${label} matched by ${corroborating.length} verified sources`)
    else missing.push(`two-source match for ${label}`)
  })
  return { evidence, missing }
}

function check(
  key: VerificationCheckKey,
  title: string,
  status: VerificationStatus,
  summary: string,
  evidence: string[],
  missing: string[],
): VerificationCheck {
  return { key, title, status, summary, evidence, missing }
}

function statusFor(verified: boolean, hasSomeEvidence: boolean): VerificationStatus {
  if (verified) return 'verified'
  return hasSomeEvidence ? 'partial' : 'action_required'
}

export function buildPropertyVerificationReport({
  property,
  sources = [],
  documents = [],
  savedAnalysis,
  tracker,
  checkedAt = new Date().toISOString(),
}: PropertyVerificationInput): PropertyVerificationReport {
  const officialSources = trustedSources(sources).filter((source) => isFreshTimestamp(source.verifiedAt, checkedAt))
  const officialAuctionSource = officialSources.some((source) => source.sourceType === 'auction')
  const rulesSources = officialSources.filter((source) => source.sourceType === 'rules')
  const rulesSource = rulesSources.length > 0
  const identitySources = officialSources.filter((source) => ['auction', 'appraiser', 'tax_collector', 'clerk', 'gis'].includes(source.sourceType))
  const verifiedDocuments = documents.filter((document) => (
    document.sourceUrl?.startsWith('https://')
    && document.evidence.providerValidated === true
    && isFreshTimestamp(document.verifiedAt, checkedAt, 30)
  ))
  const analysis: TaxDeedAnalysis | null = savedAnalysis ? analyzeTaxDeedScenario(savedAnalysis.scenario) : null
  const latestVerifiedAt = latestTimestamp(sources, checkedAt)
  const stopped = property.status === 'Cancelled' || property.status === 'Removed'

  const authoritySources = officialSources.filter((source) => source.sourceType === 'auction' || source.sourceType === 'clerk')
  const saleTypeValues = authoritySources.map((source) => sourceEvidence(source, ['saleType', 'auctionType'])).filter(usable)
  const authorityValues = authoritySources.map((source) => sourceEvidence(source, ['sellingAuthority', 'authority'])).filter(usable)
  const saleType = property.saleType ?? property.auctionType
  const saleTypeMatch = usable(saleType) && saleTypeValues.some((value) => normalized(value) === normalized(saleType))
  const authorityMatch = usable(property.sellingAuthority) && authorityValues.some((value) => normalized(value) === normalized(property.sellingAuthority))
  const authorityConflict = (saleTypeValues.length > 0 && !saleTypeMatch) || (authorityValues.length > 0 && !authorityMatch)

  const authorityEvidence = [
    saleTypeMatch ? `Sale type ${saleType} matches official evidence` : '',
    authorityMatch ? `Selling authority ${property.sellingAuthority} matches official evidence` : '',
    officialAuctionSource ? 'Official auction source has a fresh verification timestamp' : '',
  ].filter(Boolean)
  const authorityMissing = [
    !saleTypeMatch ? 'official match for sale type' : '',
    !authorityMatch ? 'official match for selling authority' : '',
    !officialAuctionSource ? 'verified official auction source' : '',
  ].filter(Boolean)

  const identity = identityCoverage(property, identitySources)
  const identityConflict = fieldsConflict(property, identitySources)

  const auctionEvidenceSources = officialSources.filter((source) => source.sourceType === 'auction' || source.sourceType === 'rules')
  const auctionTerms = [
    { label: 'active sale status', value: property.status, keys: ['saleStatus', 'status'], matches: (sourceValue: unknown) => normalized(sourceValue) === normalized(property.status) && property.status === 'Active' },
    { label: 'auction date', value: property.auctionDate, keys: ['auctionDate', 'saleDate'], matches: (sourceValue: unknown) => normalized(sourceValue) === normalized(property.auctionDate) },
    { label: 'opening amount', value: property.openingBid ?? property.price, keys: ['openingAmount', 'openingBid'], matches: (sourceValue: unknown) => numericMatch(sourceValue, property.openingBid ?? property.price) },
    { label: 'deposit', value: property.depositRequired, keys: ['deposit', 'depositRequired'], matches: (sourceValue: unknown) => numericMatch(sourceValue, property.depositRequired) },
  ]
  const auctionEvidence: string[] = []
  const auctionMissing: string[] = []
  let auctionConflict = false
  auctionTerms.forEach((term) => {
    if (!usable(term.value) || (typeof term.value === 'number' && !positive(term.value))) {
      auctionMissing.push(term.label)
      return
    }
    const recorded = auctionEvidenceSources.map((source) => sourceEvidence(source, term.keys)).filter(usable)
    if (recorded.some(term.matches)) auctionEvidence.push(`${term.label} matches official evidence`)
    else auctionMissing.push(`official match for ${term.label}`)
    if (recorded.some((value) => !term.matches(value))) auctionConflict = true
  })

  const titleDocument = verifiedDocuments.some((document) => document.documentType === 'title_search')
  const legalSources = officialSources.filter((source) => source.sourceType === 'title' || source.sourceType === 'clerk')
  const legalEvidenceFields = ['ownership', 'liens', 'parties', 'notices']
  const legalEvidenceRecorded = legalEvidenceFields.filter((field) => legalSources.some((source) => usable(source.evidence[field])))
  const legalEvidenceComplete = titleDocument || legalEvidenceRecorded.length === legalEvidenceFields.length
  const redemptionFromRules = rulesSources.some((source) => usable(sourceEvidence(source, ['redemptionRules', 'redemptionPeriod'])))
  const redemptionEvidence = rulesSource && redemptionFromRules
  const titleEvidence = [
    legalEvidenceRecorded.length ? `${legalEvidenceRecorded.length}/4 legal evidence fields recorded` : '',
    titleDocument ? 'Fresh title-search document with an official source link is saved' : '',
    rulesSource ? 'Verified auction rules source is connected' : '',
    redemptionEvidence ? 'Redemption terms are recorded in official rules evidence' : '',
  ].filter(Boolean)
  const titleMissing = [
    !legalEvidenceComplete ? `title evidence: ${legalEvidenceFields.filter((field) => !legalEvidenceRecorded.includes(field)).join(', ')}` : '',
    !redemptionEvidence ? 'redemption rules' : '',
  ].filter(Boolean)

  const verifiedPropertyPhoto = hasDisplayablePropertyPhoto(property)
    && isFreshTimestamp(property.photoVerifiedAt, checkedAt)
    && isFreshTimestamp(property.photoCapturedAt, checkedAt, 730)
  const verifiedPhotoDocument = verifiedDocuments.some((document) => document.documentType === 'photo')
  const physicalSources = officialSources.filter((source) => ['appraiser', 'clerk', 'gis', 'other'].includes(source.sourceType))
  const physicalTerms = [
    { label: 'lawful access', value: property.accessStatus, keys: ['accessStatus', 'lawfulAccess'], valid: property.accessStatus === 'verified' },
    { label: 'occupancy signal', value: property.occupancySignal, keys: ['occupancySignal', 'occupancy'], valid: Boolean(property.occupancySignal && property.occupancySignal !== 'unknown') },
    { label: 'permits', value: property.permitStatus, keys: ['permitStatus', 'permits'], valid: property.permitStatus === 'verified' },
    { label: 'utilities', value: property.utilityStatus, keys: ['utilityStatus', 'utilities'], valid: property.utilityStatus === 'verified' },
  ]
  const accessEvidence: string[] = []
  const accessMissing: string[] = []
  let physicalConflict = false
  physicalTerms.forEach((term) => {
    const recorded = physicalSources.map((source) => sourceEvidence(source, term.keys)).filter((value) => usable(value) && normalized(value) !== 'unknown')
    const matched = term.valid && recorded.some((value) => normalized(value) === normalized(term.value))
    if (matched) accessEvidence.push(`${term.label} matches fresh official evidence`)
    else accessMissing.push(`official evidence for ${term.label}`)
    if (usable(term.value) && normalized(term.value) !== 'unknown' && recorded.some((value) => normalized(value) !== normalized(term.value))) physicalConflict = true
  })
  if (verifiedPropertyPhoto || verifiedPhotoDocument) accessEvidence.push('current condition photo has validated provenance')
  else accessMissing.push('validated current condition photo')
  const sourceConcern = physicalSources.some((source) => ['accessStatus', 'permitStatus', 'utilityStatus'].some((key) => normalized(source.evidence[key]) === 'concern'))
  const accessConcern = sourceConcern || physicalConflict || property.accessStatus === 'concern' || property.permitStatus === 'concern' || property.utilityStatus === 'concern'

  const scenario = savedAnalysis?.scenario
  const valueSignals = [
    ['documented value source', Boolean(scenario?.resaleSource?.trim()) && scenario?.valueChecked === true],
    ['repair allowance', positive(scenario?.repairs) && scenario?.conditionChecked === true],
    ['holding costs', positive(scenario?.holdingMonths) && positive(scenario?.monthlyHolding)],
    ['sale costs', positive(scenario?.sellingCostRate)],
  ] as const
  const valueMissing = valueSignals.filter(([, present]) => !present).map(([label]) => label)
  const valueEvidence = valueSignals.filter(([, present]) => present).map(([label]) => `${label} recorded`)

  const bidSignals = [
    ['completed analysis', analysis?.complete === true],
    ['maximum bid', positive(analysis?.maximumBid)],
    ['contingency', positive(scenario?.contingency)],
    ['target profit', positive(scenario?.targetProfit)],
  ] as const
  const plannedBidAboveMaximum = analysis?.complete === true
    && positive(analysis.maximumBid)
    && positive(scenario?.plannedBid)
    && scenario!.plannedBid > analysis!.maximumBid!
  const bidMissing = bidSignals.filter(([, present]) => !present).map(([label]) => label)
  const bidEvidence = bidSignals.filter(([, present]) => present).map(([label]) => `${label} recorded`)
  if (!plannedBidAboveMaximum && analysis?.complete && positive(analysis.maximumBid)) bidEvidence.push('planned bid is within the calculated maximum')

  const deadlineTerms = [
    { label: 'registration deadline', value: property.registrationDeadline, keys: ['registrationDeadline', 'registrationCutoff'] },
    { label: 'auction deadline', value: property.auctionDate, keys: ['auctionDate', 'saleDate'] },
    { label: 'payment deadline', value: property.paymentDeadline, keys: ['paymentDeadline', 'paymentCutoff'] },
  ]
  const deadlineEvidence: string[] = []
  const deadlineMissing: string[] = []
  deadlineTerms.forEach((term) => {
    const recorded = auctionEvidenceSources.map((source) => sourceEvidence(source, term.keys)).filter(usable)
    if (usable(term.value) && recorded.some((value) => dateMatch(value, term.value))) deadlineEvidence.push(`${term.label} matches official evidence`)
    else deadlineMissing.push(`official match for ${term.label}`)
  })
  if (usable(tracker?.dueAt)) deadlineEvidence.push('post-sale or next-action deadline is calendared')
  else deadlineMissing.push('post-sale or next-action calendar deadline')

  const officialDocuments = verifiedDocuments.filter((document) => document.documentType !== 'photo' && document.documentType !== 'other')
  const archiveEvidence = [
    officialDocuments.length ? `${officialDocuments.length} verified official document${officialDocuments.length === 1 ? '' : 's'} saved` : '',
    latestVerifiedAt ? `Final source verification: ${latestVerifiedAt}` : '',
  ].filter(Boolean)
  const archiveMissing = [
    !officialDocuments.length ? 'verified official document' : '',
    !latestVerifiedAt ? 'final source-verification timestamp' : '',
  ].filter(Boolean)

  const checks: VerificationCheck[] = [
    check(
      'sale_authority',
      'Sale type & selling authority',
      stopped || authorityConflict ? 'stop' : statusFor(authorityMissing.length === 0, authorityEvidence.length > 1),
      stopped ? `Sale status is ${property.status}; do not bid.` : authorityConflict ? 'Official sale-authority evidence conflicts with the property. Stop until resolved.' : authorityMissing.length ? 'The sale is listed, but its type and authority are not field-level corroborated.' : 'Sale type and selling authority match fresh official evidence.',
      authorityEvidence,
      stopped ? [`sale status is ${property.status}`] : authorityConflict ? ['conflicting official sale-authority evidence'] : authorityMissing,
    ),
    check(
      'identity',
      'Address, parcel, case & legal description',
      identityConflict ? 'stop' : statusFor(identity.missing.length === 0, identity.evidence.length > 0),
      identityConflict ? 'Verified source values conflict. Stop until the correct parcel is resolved.' : identity.missing.length ? 'Identity is incomplete or lacks field-level two-source corroboration.' : 'Every identity field matches across at least two verified sources.',
      identity.evidence,
      identityConflict ? ['conflicting official identity values'] : identity.missing,
    ),
    check(
      'auction_terms',
      'Status, date, opening amount & deposit',
      stopped || auctionConflict ? 'stop' : statusFor(auctionMissing.length === 0 && officialAuctionSource && rulesSource, auctionEvidence.length >= 2),
      stopped ? `Sale status is ${property.status}; do not bid.` : auctionConflict ? 'Official auction evidence conflicts with the displayed terms. Stop until resolved.' : auctionMissing.length || !rulesSource ? 'Auction terms are not fully verified against the official listing and rules.' : 'Current auction terms match field-level official evidence.',
      auctionEvidence,
      stopped ? [`sale status is ${property.status}`] : auctionConflict ? ['conflicting official auction terms'] : [...auctionMissing, ...(!officialAuctionSource ? ['verified auction source'] : []), ...(!rulesSource ? ['verified auction rules'] : [])],
    ),
    check(
      'title_and_rules',
      'Title, liens, parties, notices & redemption',
      statusFor(titleMissing.length === 0, titleEvidence.length > 0),
      titleMissing.length ? 'A listing is not a title report. Legal and redemption evidence still needs review.' : 'Title and redemption evidence is attached and verified.',
      titleEvidence,
      titleMissing,
    ),
    check(
      'access_condition',
      'Access, occupancy, condition, permits & utilities',
      accessConcern ? 'stop' : statusFor(accessMissing.length === 0, accessEvidence.length > 0),
      accessConcern ? 'A recorded conflict or access, permit, or utility concern must be resolved before bidding.' : accessMissing.length ? 'Physical and municipal facts lack fresh field-level evidence.' : 'Access, occupancy, condition, permit, and utility facts match validated evidence.',
      accessEvidence,
      accessConcern ? ['recorded property-use concern'] : accessMissing,
    ),
    check(
      'value_and_costs',
      'Value, repairs, holding & sale costs',
      statusFor(valueMissing.length === 0 && analysis?.complete === true, valueEvidence.length > 0),
      valueMissing.length ? 'The investment model still contains undocumented or missing costs.' : 'Value and project costs have documented inputs.',
      valueEvidence,
      valueMissing,
    ),
    check(
      'maximum_bid',
      'Maximum bid with contingency',
      plannedBidAboveMaximum ? 'stop' : statusFor(bidMissing.length === 0, bidEvidence.length > 0),
      plannedBidAboveMaximum ? 'The planned bid exceeds the calculated maximum. Lower the bid or revise documented assumptions.' : bidMissing.length ? 'A defensible maximum bid is not complete.' : 'Maximum bid, target profit, contingency, and bid-limit compliance are recorded.',
      bidEvidence,
      plannedBidAboveMaximum ? ['planned bid exceeds maximum bid'] : bidMissing,
    ),
    check(
      'deadlines',
      'Registration, auction, payment & post-sale deadlines',
      statusFor(deadlineMissing.length === 0, deadlineEvidence.length > 0),
      deadlineMissing.length ? 'One or more required deadlines are not calendared.' : 'All required bidding deadlines are recorded.',
      deadlineEvidence,
      deadlineMissing,
    ),
    check(
      'documents_and_timestamp',
      'Official documents & final verification timestamp',
      statusFor(archiveMissing.length === 0, archiveEvidence.length > 0),
      archiveMissing.length ? 'The final evidence archive is incomplete.' : 'Official documents and the final verification timestamp are saved.',
      archiveEvidence,
      archiveMissing,
    ),
  ]

  const overallStatus: VerificationStatus = checks.some((item) => item.status === 'stop')
    ? 'stop'
    : checks.some((item) => item.status === 'action_required')
      ? 'action_required'
      : checks.some((item) => item.status === 'partial')
        ? 'partial'
        : 'verified'

  return {
    engineVersion: '2026.08.31',
    authoritative: false,
    checkedAt,
    lastSourceVerifiedAt: latestVerifiedAt,
    overallStatus,
    verifiedCount: checks.filter((item) => item.status === 'verified').length,
    checks,
  }
}

const verificationStatuses = new Set<VerificationStatus>(['verified', 'partial', 'action_required', 'stop'])

export function applyServerVerificationRun(
  provisional: PropertyVerificationReport,
  serverRun: ServerVerificationRun | null,
): PropertyVerificationReport {
  if (!serverRun) return provisional
  const rawChecks = Array.isArray(serverRun.checks) ? serverRun.checks : []
  const statusByKey = new Map<VerificationCheckKey, VerificationStatus>()
  rawChecks.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return
    const key = String((raw as { key?: unknown }).key ?? '') as VerificationCheckKey
    const status = String((raw as { status?: unknown }).status ?? '') as VerificationStatus
    if (provisional.checks.some((item) => item.key === key) && verificationStatuses.has(status)) statusByKey.set(key, status)
  })
  const overallStatus = String(serverRun.overall_status ?? serverRun.overallStatus ?? '') as VerificationStatus
  const verifiedCount = Number(serverRun.verified_count ?? serverRun.verifiedCount)
  const checkedAt = String(serverRun.checked_at ?? serverRun.checkedAt ?? '')
  const lastSourceVerifiedAt = serverRun.last_source_verified_at ?? serverRun.lastSourceVerifiedAt
  if (!verificationStatuses.has(overallStatus) || !Number.isInteger(verifiedCount) || verifiedCount < 0 || verifiedCount > 9 || !Number.isFinite(new Date(checkedAt).getTime())) return provisional
  return {
    ...provisional,
    engineVersion: String(serverRun.engine_version ?? serverRun.engineVersion ?? 'server'),
    authoritative: true,
    checkedAt,
    lastSourceVerifiedAt: typeof lastSourceVerifiedAt === 'string' ? lastSourceVerifiedAt : null,
    overallStatus,
    verifiedCount,
    checks: provisional.checks.map((item) => ({ ...item, status: statusByKey.get(item.key) ?? 'action_required' })),
  }
}
