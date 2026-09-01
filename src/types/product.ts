import type { DealFilter } from './property'

export type PlanTier = 'free' | 'investor' | 'pro'
export type BillingInterval = 'month' | 'year'
export type AlertFrequency = 'none' | 'daily' | 'instant'

export interface PlanEntitlements {
  tier: PlanTier
  trackedPropertyLimit: number
  savedSearchLimit: number
  alertFrequency: AlertFrequency
  fullPropertyRecords: boolean
  csvExport: boolean
  advancedReports: boolean
  teamAccess: boolean
}

export interface Membership {
  tier: PlanTier
  billingInterval: BillingInterval | null
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  paidActive: boolean
}

export interface SavedSearch {
  id: string
  userId: string
  name: string
  filters: DealFilter
  alertFrequency: AlertFrequency
  enabled: boolean
  lastMatchAt: string | null
  createdAt: string
  updatedAt: string
}

export type PropertyTrackingStatus =
  | 'watching'
  | 'researching'
  | 'due_diligence'
  | 'ready'
  | 'won'
  | 'lost'
  | 'paid'
  | 'removed'

export interface PropertyTracker {
  id: string
  userId: string
  propertyId: string
  status: PropertyTrackingStatus
  nextAction: string | null
  dueAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PropertyNote {
  id: string
  userId: string
  propertyId: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface PropertyDocument {
  id: string
  userId: string
  propertyId: string
  storagePath: string
  filename: string
  mimeType: string | null
  sizeBytes: number | null
  documentType: 'auction_notice' | 'title_search' | 'tax_record' | 'appraiser_record' | 'map' | 'photo' | 'other'
  verifiedAt: string | null
  sourceUrl: string | null
  documentDate: string | null
  evidence: Record<string, unknown>
  createdAt: string
  displayUrl?: string
}

export interface PropertySourceRecord {
  id: string
  propertyId: string
  sourceType: 'auction' | 'appraiser' | 'tax_collector' | 'clerk' | 'gis' | 'rules' | 'title' | 'other'
  sourceName: string
  sourceUrl: string
  status: 'available' | 'stale' | 'unavailable'
  verifiedAt: string | null
  retrievedAt: string | null
  official: boolean
  evidence: Record<string, unknown>
}

export interface LessonProgress {
  lessonId: string
  completed: boolean
  quizScore: number | null
  notes: string
  updatedAt: string
}
