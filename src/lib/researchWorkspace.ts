import type { Property } from '../types/property'

export type ResearchStatus = 'unknown' | 'verified' | 'concern' | 'stop'
export type ResearchStage = 'quick-screen' | 'due-diligence' | 'bid-ready'
export type ExitStrategy = '' | 'resale' | 'rental' | 'hold-land' | 'personal-use' | 'other'

export type ResearchItemKey =
  | 'official_listing'
  | 'parcel_identity'
  | 'budget_fit'
  | 'fresh_photos'
  | 'title_search'
  | 'local_charges'
  | 'occupancy_access'
  | 'property_use'
  | 'market_value'
  | 'repair_estimate'
  | 'auction_rules'
  | 'registration'
  | 'funding'
  | 'final_status'

export interface ResearchItemState {
  status: ResearchStatus
  note: string
  checkedAt?: string
}

export interface PropertyResearchRecord {
  propertyId: string
  items: Partial<Record<ResearchItemKey, ResearchItemState>>
  exitStrategy: ExitStrategy
  exitPlan: string
  updatedAt?: string
}

export interface ResearchItemDefinition {
  key: ResearchItemKey
  title: string
  help: string
}

export interface ResearchSection {
  key: 'quick-screen' | 'due-diligence' | 'auction-prep'
  title: string
  description: string
  items: ResearchItemDefinition[]
}

export interface ResearchReadiness {
  stage: ResearchStage
  ready: boolean
  verified: number
  total: number
  concerns: ResearchItemKey[]
  blockers: ResearchItemKey[]
  quickScreenComplete: boolean
  exitPlanComplete: boolean
}

export const RESEARCH_WORKSPACE_STORAGE_PREFIX = 'property-research-v1-'

export function researchWorkspaceStorageKey(propertyId: string) {
  return `${RESEARCH_WORKSPACE_STORAGE_PREFIX}${propertyId}`
}

export function createEmptyResearchRecord(propertyId: string): PropertyResearchRecord {
  return {
    propertyId,
    items: {},
    exitStrategy: '',
    exitPlan: '',
  }
}

export function hasVerifiedEvidence(item?: ResearchItemState): boolean {
  return item?.status === 'verified' && typeof item.note === 'string' && Boolean(item.note.trim())
}

export function getResearchSections(property: Property): ResearchSection[] {
  const isLien = property.saleType === 'Tax Lien'
  const isLand = property.propertyType === 'Land'

  return [
    {
      key: 'quick-screen',
      title: 'Quick screen',
      description: 'Confirm this is the right parcel and it fits your cash limit before spending hours on it.',
      items: [
        {
          key: 'official_listing',
          title: 'Official listing is active',
          help: 'Open the government or authorized auction page and confirm the property is still available.',
        },
        {
          key: 'parcel_identity',
          title: 'Parcel identity matches',
          help: 'Match the parcel number, legal description, address, map location, and property type.',
        },
        {
          key: 'budget_fit',
          title: isLien ? 'Certificate fits the cash budget' : 'Possible bid fits the cash budget',
          help: 'Include the deposit, possible bid, immediate payment deadline, and money reserved for surprises.',
        },
      ],
    },
    {
      key: 'due-diligence',
      title: 'Due diligence',
      description: 'Replace guesses with current evidence. A map image or low opening bid is not enough.',
      items: [
        {
          key: 'fresh_photos',
          title: 'Current condition checked',
          help: 'Use a legal inspection or recent photos arranged by you. Record the date and never trespass.',
        },
        {
          key: 'title_search',
          title: isLien ? 'Ownership and lien position checked' : 'Title and surviving interests checked',
          help: isLien
            ? 'Confirm the owner, certificate status, other taxes, bankruptcy flags, and what must happen before foreclosure.'
            : 'Research ownership, mortgages, judgments, government liens, notice, bankruptcy, and interests that may survive.',
        },
        {
          key: 'local_charges',
          title: 'Municipal, HOA, and utility charges checked',
          help: 'Ask about code fines, mowing or demolition charges, special assessments, utilities, and association balances.',
        },
        {
          key: 'occupancy_access',
          title: 'Occupancy and legal access checked',
          help: 'Confirm who may be occupying the property and whether the parcel has legal and practical access.',
        },
        {
          key: 'property_use',
          title: isLand ? 'Buildability and land use checked' : 'Legal use and restrictions checked',
          help: isLand
            ? 'Confirm zoning, dimensions, road access, utilities, flood limits, wetlands, and buildability.'
            : 'Confirm zoning, permits, legal units, flood exposure, association restrictions, and intended use.',
        },
        {
          key: 'market_value',
          title: 'Conservative value checked',
          help: 'Use recent comparable sales or an appraisal. Treat assessed values and automated estimates only as clues.',
        },
        {
          key: 'repair_estimate',
          title: 'Repairs and cleanup estimated',
          help: 'Include structure, systems, cleanout, exterior work, permits, demolition, and a separate surprise reserve.',
        },
      ],
    },
    {
      key: 'auction-prep',
      title: 'Auction preparation',
      description: 'Finish the official rules, money, and last-minute checks before placing any bid.',
      items: [
        {
          key: 'auction_rules',
          title: 'Official auction rules reviewed',
          help: isLien
            ? 'Confirm the bidding method, exact return, redemption rules, certificate expiration, transfer rules, and foreclosure process.'
            : 'Confirm the bidding method, deposit, buyer charges, deed type, payment deadline, redemption, and title process.',
        },
        {
          key: 'registration',
          title: 'Registration is approved',
          help: 'Complete the official bidder account, identity documents, tax forms, and registration deadline.',
        },
        {
          key: 'funding',
          title: 'Deposit and purchase funds are ready',
          help: 'Use only an accepted payment method and send money only to the government or authorized auction provider.',
        },
        {
          key: 'final_status',
          title: 'Final status checked on sale day',
          help: 'Recheck the parcel, amount, withdrawals, redemptions, rules, and deadline immediately before bidding.',
        },
      ],
    },
  ]
}

export function calculateResearchReadiness(record: PropertyResearchRecord, property: Property): ResearchReadiness {
  const sections = getResearchSections(property)
  const definitions = sections.flatMap((section) => section.items)
  const items = record && record.items && typeof record.items === 'object' ? record.items : {}
  const statusFor = (key: ResearchItemKey): ResearchStatus => {
    const status = items[key]?.status
    return status === 'verified' || status === 'concern' || status === 'stop' ? status : 'unknown'
  }
  const verified = definitions.filter((item) => hasVerifiedEvidence(items[item.key])).length
  const concerns = definitions.filter((item) => statusFor(item.key) === 'concern').map((item) => item.key)
  const blockers = definitions.filter((item) => statusFor(item.key) === 'stop').map((item) => item.key)
  const quickKeys = sections[0].items.map((item) => item.key)
  const quickScreenComplete = quickKeys.every((key) => hasVerifiedEvidence(items[key]))
  const exitPlanComplete = Boolean(record?.exitStrategy) && Boolean(record?.exitPlan?.trim())
  const ready = verified === definitions.length && blockers.length === 0 && concerns.length === 0 && exitPlanComplete
  const stage: ResearchStage = ready ? 'bid-ready' : quickScreenComplete ? 'due-diligence' : 'quick-screen'

  return {
    stage,
    ready,
    verified,
    total: definitions.length,
    concerns,
    blockers,
    quickScreenComplete,
    exitPlanComplete,
  }
}

export function getCountyCallQuestions(property: Property): string[] {
  const jurisdiction = property.county ? `${property.county} County` : 'the selling authority'
  const questions = [
    `When and where is the next ${property.saleType?.toLowerCase() ?? 'tax sale'}, and is it online, in person, or sealed bid?`,
    'Where is the current official property list posted, how often is it updated, and can I join an email or mailing list?',
    'What is the bidder registration deadline, and which identity or tax documents are required?',
    'What deposit is required, which payment methods are accepted, and who must the payment be made to?',
    'What is the final payment deadline after a winning bid, including the exact time and time zone?',
    'How are redeemed, withdrawn, canceled, or corrected parcels shown before and during the sale?',
    `What happens to properties or certificates that are unsold, and does ${jurisdiction} publish an over-the-counter or county-held list?`,
    'Can you explain the parcel codes and provide the official assessor, map, land-record, and court-record links?',
    'May a beginner observe the auction without bidding, and is official bidder training available?',
    'Where can I find last year\'s list and results, including opening bids, winning bids, withdrawals, and unsold parcels?',
  ]

  if (property.saleType === 'Tax Lien') {
    questions.push('What is the exact certificate interest or penalty, how is bidding conducted, and when does interest begin?')
    questions.push('What are the redemption, certificate expiration, transfer, and foreclosure requirements for this specific sale?')
  } else {
    questions.push('What deed or ownership document is issued, when is it issued, and is there any post-sale redemption period?')
    questions.push('Which government liens, assessments, easements, or other interests may survive this specific deed sale?')
  }

  return questions
}
