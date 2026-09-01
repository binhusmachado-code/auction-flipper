import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Property } from '../types/property'
import type { BidWorkflow } from '../types/bid'

type WorkflowRow = Record<string, unknown>

function fromRow(row: WorkflowRow): BidWorkflow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    propertyId: String(row.property_id),
    status: row.status as BidWorkflow['status'],
    maxBid: row.max_bid === null ? null : Number(row.max_bid),
    estimatedDeposit: row.estimated_deposit === null ? null : Number(row.estimated_deposit),
    completedSteps: (row.completed_steps ?? {}) as BidWorkflow['completedSteps'],
    officialBidReference: String(row.official_bid_reference ?? ''),
    paymentDeadline: row.payment_deadline ? String(row.payment_deadline) : null,
    paymentConfirmation: String(row.payment_confirmation ?? ''),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  }
}

export function useBidWorkflows(userId: string, enabled: boolean) {
  const [workflows, setWorkflows] = useState<Record<string, BidWorkflow>>({})
  const [loading, setLoading] = useState(enabled)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('bid_workflows').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    if (data) setWorkflows(Object.fromEntries(data.map((row) => {
      const workflow = fromRow(row)
      return [workflow.propertyId, workflow]
    })))
    setLoading(false)
  }, [enabled, userId])

  useEffect(() => { void load() }, [load])

  const save = useCallback(async (property: Property, patch: Partial<BidWorkflow>) => {
    const current = workflows[property.id]
    const initial: BidWorkflow = {
      userId,
      propertyId: property.id,
      status: 'researching',
      maxBid: null,
      estimatedDeposit: null,
      completedSteps: {},
      officialBidReference: '',
      paymentDeadline: null,
      paymentConfirmation: '',
    }
    const next: BidWorkflow = {
      ...initial,
      ...current,
      ...patch,
    }
    setWorkflows((previous) => ({ ...previous, [property.id]: next }))

    if (!isSupabaseConfigured || !enabled) return next
    const { data, error } = await supabase.from('bid_workflows').upsert({
      user_id: userId,
      property_id: property.id,
      property_snapshot: {
        address: property.address,
        city: property.city,
        state: property.state,
        county: property.county,
        saleType: property.saleType,
        auctionDate: property.auctionDate,
        source: property.source,
        sourceUrl: property.sourceUrl,
      },
      status: next.status,
      max_bid: next.maxBid,
      estimated_deposit: next.estimatedDeposit,
      completed_steps: next.completedSteps,
      official_bid_reference: next.officialBidReference || null,
      payment_deadline: next.paymentDeadline,
      payment_confirmation: next.paymentConfirmation || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,property_id' }).select('*').single()
    if (error) {
      setWorkflows((previous) => {
        const restored = { ...previous }
        if (current) restored[property.id] = current
        else delete restored[property.id]
        return restored
      })
      throw error
    }
    const saved = fromRow(data)
    setWorkflows((previous) => ({ ...previous, [property.id]: saved }))
    return saved
  }, [enabled, userId, workflows])

  return { workflows, loading, save, refresh: load }
}
