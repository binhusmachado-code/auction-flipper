export interface AccountProfile {
  id: string
  email: string
  displayName: string
  role: 'member' | 'admin'
  accountStatus: 'active' | 'suspended'
  manualAccessUntil: string | null
  createdAt: string | null
}

export type CustomerAccessStatus = 'subscription' | 'manual' | 'inactive' | 'suspended'

export interface AdminCustomer {
  id: string
  email: string
  displayName: string
  role: 'member' | 'admin'
  accountStatus: 'active' | 'suspended'
  accessStatus: CustomerAccessStatus
  manualAccessUntil: string | null
  plan: 'monthly' | 'yearly' | null
  subscriptionStatus: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  createdAt: string
  lastSignInAt: string | null
}

export interface AdminSourceHealth {
  source_id: string
  county: string
  status: string
  record_count: number
  last_attempt_at: string | null
  last_success_at: string | null
  error_message: string | null
}

export interface AdminAuditEntry {
  id: string
  actor_user_id: string | null
  target_user_id: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
}

export interface AdminBidWorkflow {
  id: string
  userId: string
  customerEmail: string
  propertyId: string
  address: string
  county: string
  status: string
  maxBid: number | null
  paymentDeadline: string | null
  updatedAt: string
}

export interface AdminDashboardData {
  customers: AdminCustomer[]
  page: number
  hasMore: boolean
  sourceHealth: AdminSourceHealth[]
  auditLog: AdminAuditEntry[]
  bidWorkflows: AdminBidWorkflow[]
}
