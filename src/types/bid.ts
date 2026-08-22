export type BidStepKey =
  | 'official_rules'
  | 'registration'
  | 'due_diligence'
  | 'max_bid'
  | 'deposit'
  | 'official_bid'
  | 'final_payment'

export type BidWorkflowStatus =
  | 'researching'
  | 'ready'
  | 'official_bid_submitted'
  | 'won'
  | 'lost'
  | 'payment_due'
  | 'paid'
  | 'closed'

export interface BidWorkflow {
  id?: string
  userId: string
  propertyId: string
  status: BidWorkflowStatus
  maxBid: number | null
  estimatedDeposit: number | null
  completedSteps: Partial<Record<BidStepKey, boolean>>
  officialBidReference: string
  paymentDeadline: string | null
  paymentConfirmation: string
  updatedAt?: string
}
