export type MembershipStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'none'

export interface Membership {
  status: MembershipStatus
  plan: 'monthly' | 'yearly' | null
  currentPeriodEnd: string | null
  active: boolean
}
