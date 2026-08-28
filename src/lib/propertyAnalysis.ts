import { analyzeTaxDeedScenario, type TaxDeedAnalysis, type TaxDeedScenario } from './calculator'
import type { Property } from '../types/property'

export type DealGrade = 'Great' | 'Good' | 'Bad' | 'Not ready'

export interface DealVerdict {
  grade: DealGrade
  summary: string
  roi: number | null
}

export interface StoredDealAnalysis {
  propertyId: string
  address: string
  scenario: TaxDeedScenario
  savedAt?: string
}

export interface RankedDealAnalysis extends StoredDealAnalysis {
  analysis: TaxDeedAnalysis
  verdict: DealVerdict
}

export interface VerifiedOpportunity {
  propertyId: string
  openingBid: number
  countyValue: number
  screeningSpread: number
  screeningDiscount: number
  valueToBidRatio: number
  evidenceCount: number
  evidenceTotal: number
  cautions: string[]
}

export const DEAL_ANALYSIS_STORAGE_PREFIX = 'verified-deal-analysis-v1-'

export function dealAnalysisStorageKey(propertyId: string): string {
  return `${DEAL_ANALYSIS_STORAGE_PREFIX}${propertyId}`
}

export interface DueDiligenceItem {
  title: string
  explanation: string
}

function money(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function getDealVerdict(analysis: TaxDeedAnalysis, scenario: TaxDeedScenario): DealVerdict {
  if (!analysis.complete || analysis.projectedProfit === null || analysis.maximumBid === null) {
    return {
      grade: 'Not ready',
      summary: 'Finish the evidence checks before trusting a grade.',
      roi: null,
    }
  }

  const allCosts = analysis.totalProjectCost + analysis.sellingCosts
  const roi = allCosts > 0
    ? analysis.projectedProfit / allCosts * 100
    : 0
  const meetsTarget = analysis.projectedProfit >= scenario.targetProfit
  const withinLimit = scenario.plannedBid <= analysis.maximumBid

  if (!meetsTarget || !withinLimit || analysis.maximumBid <= 0) {
    return {
      grade: 'Bad',
      summary: 'This bid does not leave the profit you asked for.',
      roi,
    }
  }

  if ((analysis.marginOfSafety ?? 0) >= 20 && roi >= 20) {
    return {
      grade: 'Great',
      summary: 'The planned bid leaves a strong cushion and meets your profit goal.',
      roi,
    }
  }

  return {
    grade: 'Good',
    summary: 'The planned bid meets your profit goal, but the cushion is smaller.',
    roi,
  }
}

export function rankDealAnalyses(records: StoredDealAnalysis[]): RankedDealAnalysis[] {
  const gradeWeight: Record<DealGrade, number> = {
    Great: 3,
    Good: 2,
    Bad: 1,
    'Not ready': 0,
  }

  return records
    .map((record) => {
      const analysis = analyzeTaxDeedScenario(record.scenario)
      return { ...record, analysis, verdict: getDealVerdict(analysis, record.scenario) }
    })
    .filter((record) => record.analysis.complete)
    .sort((a, b) => (
      gradeWeight[b.verdict.grade] - gradeWeight[a.verdict.grade] ||
      (b.analysis.marginOfSafety ?? -Infinity) - (a.analysis.marginOfSafety ?? -Infinity) ||
      (b.analysis.projectedProfit ?? -Infinity) - (a.analysis.projectedProfit ?? -Infinity)
    ))
}

export function rankVerifiedOpportunities(properties: Property[]): VerifiedOpportunity[] {
  return properties
    .filter((property) => property.saleType === 'Tax Deed' && property.status === 'Active')
    .map((property) => {
      const openingBid = (property.openingBid ?? 0) > 0 ? property.openingBid ?? 0 : property.price
      const countyValue = property.assessedValue
      const screeningSpread = countyValue - openingBid
      const evidence = [
        property.sourceUrl.startsWith('https://'),
        Boolean(property.parcelId),
        Boolean(property.address) && !property.address.toLowerCase().startsWith('parcel '),
        Boolean(property.latitude && property.longitude),
        Boolean(property.auctionDate),
        property.propertyType !== 'Unknown',
        Boolean(property.description),
      ]
      const cautions = [
        'The county assessed value is for screening and is not a resale price or appraisal.',
        'Title, surviving liens, occupancy, condition, repairs, and final fees are not verified yet.',
      ]
      if (property.propertyType === 'Condo' || property.propertyType === 'Townhouse') {
        cautions.push('Confirm association approval, assessments, liens, and use or rental restrictions.')
      } else if (property.propertyType === 'Land') {
        cautions.push('Confirm legal access, zoning, utilities, flood limits, wetlands, and buildability.')
      } else if (property.propertyType === 'Multi-Family') {
        cautions.push('Confirm the legal unit count, occupancy, code issues, and condition of every unit.')
      } else if (property.propertyType === 'Unknown') {
        cautions.push('The property type and current use are not confirmed.')
      }

      return {
        propertyId: property.id,
        openingBid,
        countyValue,
        screeningSpread,
        screeningDiscount: countyValue > 0 ? screeningSpread / countyValue * 100 : 0,
        valueToBidRatio: openingBid > 0 ? countyValue / openingBid : 0,
        evidenceCount: evidence.filter(Boolean).length,
        evidenceTotal: evidence.length,
        cautions,
        verified: property.valuationVerified === true,
      }
    })
    .filter((item) => item.verified && item.openingBid > 0 && item.countyValue > 0 && item.screeningSpread > 0)
    .sort((a, b) => (
      b.evidenceCount - a.evidenceCount ||
      b.valueToBidRatio - a.valueToBidRatio ||
      b.screeningSpread - a.screeningSpread
    ))
    .map(({ verified: _verified, ...item }) => item)
}

export function getPropertyProsAndCons(property: Property): { pros: string[]; cons: string[] } {
  const pros: string[] = []
  const cons: string[] = [
    'The listing does not prove clear title or identify every surviving lien.',
    'Occupancy and access are not verified in the listing.',
    'Property condition has not been verified by an inspection.',
  ]

  if (property.sourceUrl.startsWith('https://')) {
    pros.push('A source link is available for you to verify the listing.')
  }
  if (property.valuationVerified && (property.estimatedValue > 0 || property.assessedValue > 0)) {
    pros.push('A verified county value is available for screening, but it is not a resale appraisal.')
  } else {
    cons.push('No verified value is available, so profit and maximum bid cannot be trusted yet.')
  }
  if (property.parcelId) pros.push('A parcel ID is available for title, assessor, and map research.')
  else cons.push('No parcel ID is recorded in this listing.')
  if (property.latitude && property.longitude) pros.push('The parcel has a verified map location.')
  else cons.push('The parcel location is not mapped yet.')
  if (property.auctionDate) pros.push(`The official sale date is listed as ${property.auctionDate}.`)
  else if (property.saleType === 'Tax Deed') cons.push('The auction date is not confirmed.')
  if ((property.openingBid ?? 0) > 0) pros.push(`The listed opening bid is ${money(property.openingBid ?? 0)}.`)
  else if (property.saleType === 'Tax Deed') cons.push('The opening bid is not posted and must be checked with the county.')
  if (property.saleType === 'Tax Lien' && property.interestRate <= 0) {
    cons.push('The certificate interest rate is not published in the source list.')
  }
  if (property.saleType === 'Tax Lien' && property.redemptionPeriod <= 0) {
    cons.push('The redemption rules and timing must be confirmed with the Treasurer.')
  }

  return { pros, cons }
}

export function getDueDiligenceItems(property: Property): DueDiligenceItem[] {
  const items: DueDiligenceItem[] = [
    {
      title: 'Title and surviving liens',
      explanation: 'Search the court and land records to learn who owns the property and which mortgages, taxes, code fines, or other liens could remain after the sale.',
    },
    {
      title: 'Condition and repairs',
      explanation: 'Estimate the roof, structure, water, electrical, cleanup, and other repairs using legal access, public records, professionals, and exterior observations. Never trespass.',
    },
    {
      title: 'Occupancy and access',
      explanation: 'Find out whether anyone lives there and whether the parcel has legal road access. Eviction, relocation, or a landlocked parcel can add time and cost.',
    },
    {
      title: 'Real resale value',
      explanation: 'Use recent nearby sold properties with similar size and condition, or a professional appraisal. A tax assessment alone is not a resale price.',
    },
    {
      title: 'Property use',
      explanation: 'Confirm zoning, buildability, utilities, flood or environmental limits, HOA rules, and whether the legal description matches the property you expect.',
    },
    {
      title: 'Auction money and deadlines',
      explanation: 'Read the official rules for registration, deposits, buyer premiums, final payment, accepted payment methods, deed delivery, and what happens if payment is late.',
    },
  ]

  if (property.saleType === 'Tax Lien') {
    items.unshift({
      title: 'Certificate status and return',
      explanation: 'Ask the Treasurer whether the lien is still available, its exact payoff, certificate interest rate, transfer fee, redemption status, and the steps required before any foreclosure.',
    })
  }

  return items
}

export function getBidTips(property: Property, maximumBid: number | null): string[] {
  const tips = [
    maximumBid !== null && maximumBid > 0
      ? `Write down your maximum bid: ${money(maximumBid)}. Stop there even if another bidder continues.`
      : 'Do not choose a maximum bid until the value, title, condition, repairs, fees, and holding costs are checked.',
  ]

  if (property.saleType === 'Tax Lien') {
    tips.push('A tax lien is not ownership of the property. Confirm the certificate terms and payoff with the Treasurer before paying.')
    tips.push('Use only the county-confirmed certificate rate and redemption rules when estimating a return.')
  } else {
    tips.push('The deposit is money toward the purchase, not an extra cost, unless the official rules say it can be forfeited.')
    tips.push('Keep a cash cushion for costs discovered after the sale and never borrow based only on the tax assessment.')
  }

  tips.push('Open the official auction page again on sale day because properties and amounts can change or be removed.')
  return tips
}
