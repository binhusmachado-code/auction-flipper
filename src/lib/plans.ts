import type { AlertFrequency, BillingInterval, PlanEntitlements, PlanTier } from '../types/product'

export interface PlanDefinition extends PlanEntitlements {
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  annualMonthlyEquivalent: number
  features: string[]
  recommended?: boolean
}

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: 'free',
    name: 'Free',
    description: 'Learn the process and preview upcoming auctions.',
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthlyEquivalent: 0,
    trackedPropertyLimit: 5,
    savedSearchLimit: 1,
    alertFrequency: 'none',
    fullPropertyRecords: false,
    csvExport: false,
    advancedReports: false,
    teamAccess: false,
    features: ['Limited listing previews', '5 tracked properties', '1 saved search', 'Auction learning guide'],
  },
  investor: {
    tier: 'investor',
    name: 'Investor',
    description: 'Research, compare, and prepare for live auctions.',
    monthlyPrice: 29,
    annualPrice: 290,
    annualMonthlyEquivalent: 24.17,
    trackedPropertyLimit: 100,
    savedSearchLimit: 10,
    alertFrequency: 'daily',
    fullPropertyRecords: true,
    csvExport: true,
    advancedReports: false,
    teamAccess: false,
    recommended: true,
    features: ['Complete property records', '100 tracked properties', '10 saved searches + daily alerts', 'Calendar, table, calculator, and CSV'],
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    description: 'Run a larger research pipeline with faster alerts.',
    monthlyPrice: 69,
    annualPrice: 690,
    annualMonthlyEquivalent: 57.5,
    trackedPropertyLimit: 500,
    savedSearchLimit: 20,
    alertFrequency: 'instant',
    fullPropertyRecords: true,
    csvExport: true,
    advancedReports: true,
    teamAccess: false,
    features: ['Everything in Investor', '500 tracked properties', '20 saved searches + instant alerts', 'Advanced reports and priority support'],
  },
}

export function isPaidTier(tier: PlanTier) {
  return tier === 'investor' || tier === 'pro'
}

export function priceFor(tier: PlanTier, interval: BillingInterval) {
  const plan = PLAN_DEFINITIONS[tier]
  return interval === 'year' ? plan.annualPrice : plan.monthlyPrice
}

export function permittedAlertFrequency(tier: PlanTier, requested: AlertFrequency): AlertFrequency {
  if (requested === 'none') return 'none'
  const allowed = PLAN_DEFINITIONS[tier].alertFrequency
  if (allowed === 'none') return 'none'
  if (requested === 'instant' && allowed !== 'instant') return 'daily'
  return requested
}
