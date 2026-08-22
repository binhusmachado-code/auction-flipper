import type { Property } from '../types/property'

export interface BidRules {
  depositEstimate: (maxBid: number) => number | null
  depositLabel: string
  paymentTiming: string
  registrationNote: string
  directConnection: 'connected' | 'guided'
}

export function getBidRules(property: Property): BidRules {
  if (property.state === 'FL' && property.saleType === 'Tax Deed') {
    return {
      depositEstimate: (maxBid) => Math.max(200, maxBid * 0.05),
      depositLabel: '$200 or 5% of the bid, whichever is greater',
      paymentTiming: 'Full balance, documentary stamp tax, and recording fees are generally due within 24 hours. The county may set an earlier daily cutoff.',
      registrationNote: 'Register with the county auction provider and fund the bidder account before the county cutoff.',
      directConnection: 'guided',
    }
  }

  return {
    depositEstimate: () => property.depositRequired ?? null,
    depositLabel: property.depositRequired ? 'County-listed deposit estimate' : 'Verify the official auction rules',
    paymentTiming: 'The official county or auction provider controls the winning-bid payment deadline and accepted payment methods.',
    registrationNote: 'Complete identity, tax, and bidder registration required by the official auction provider.',
    directConnection: 'guided',
  }
}

export function calculateBidReadiness(completed: Record<string, boolean | undefined>) {
  const required = ['official_rules', 'registration', 'due_diligence', 'max_bid', 'deposit']
  const complete = required.filter((step) => completed[step]).length
  return { complete, total: required.length, ready: complete === required.length }
}
