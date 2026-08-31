import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { PLAN_DEFINITIONS, permittedAlertFrequency } from '../lib/plans'
import type { DealFilter } from '../types/property'
import type {
  AlertFrequency,
  LessonProgress,
  Membership,
  PlanEntitlements,
  PlanTier,
  PropertyDocument,
  PropertyNote,
  PropertySourceRecord,
  PropertyTracker,
  PropertyTrackingStatus,
  SavedSearch,
} from '../types/product'

type Row = Record<string, unknown>

const FREE_MEMBERSHIP: Membership = {
  tier: 'free',
  billingInterval: null,
  status: 'active',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  paidActive: false,
}

function paidIsActive(tier: PlanTier, status: string, periodEnd: string | null) {
  return tier !== 'free'
    && (status === 'active' || status === 'trialing')
    && Boolean(periodEnd && new Date(periodEnd).getTime() > Date.now())
}

export function useMembership(userId: string | null, isAdmin = false) {
  const [membership, setMembership] = useState<Membership>(FREE_MEMBERSHIP)
  const [loading, setLoading] = useState(Boolean(userId))

  const refresh = useCallback(async () => {
    if (isAdmin) {
      setMembership({ ...FREE_MEMBERSHIP, tier: 'pro', paidActive: true, status: 'active' })
      setLoading(false)
      return
    }
    if (!userId || !isSupabaseConfigured) {
      setMembership(FREE_MEMBERSHIP)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('subscriptions')
      .select('tier, billing_interval, status, current_period_end, cancel_at_period_end')
      .eq('user_id', userId)
      .maybeSingle()
    const row = data as Row | null
    const tier = row?.tier === 'pro' || row?.tier === 'investor' ? row.tier : 'free'
    const status = String(row?.status ?? 'active')
    const currentPeriodEnd = row?.current_period_end ? String(row.current_period_end) : null
    setMembership({
      tier,
      billingInterval: row?.billing_interval === 'month' || row?.billing_interval === 'year' ? row.billing_interval : null,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd: row?.cancel_at_period_end === true,
      paidActive: paidIsActive(tier, status, currentPeriodEnd),
    })
    setLoading(false)
  }, [isAdmin, userId])

  useEffect(() => { void refresh() }, [refresh])

  const entitlements: PlanEntitlements = useMemo(() => PLAN_DEFINITIONS[membership.tier], [membership.tier])
  return { membership, entitlements, loading, refresh }
}

function mapSavedSearch(row: Row): SavedSearch {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    filters: row.filters as unknown as DealFilter,
    alertFrequency: (row.alert_frequency ?? 'none') as AlertFrequency,
    enabled: row.enabled !== false,
    lastMatchAt: row.last_match_at ? String(row.last_match_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function useSavedSearches(userId: string | null, tier: PlanTier) {
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(Boolean(userId))

  const refresh = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setSearches([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('saved_searches').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    setSearches(((data ?? []) as Row[]).map(mapSavedSearch))
    setLoading(false)
  }, [userId])
  useEffect(() => { void refresh() }, [refresh])

  const save = useCallback(async (name: string, filters: DealFilter, frequency: AlertFrequency = 'none') => {
    if (!userId) throw new Error('Sign in to save this search')
    if (searches.length >= PLAN_DEFINITIONS[tier].savedSearchLimit) throw new Error(`Your plan includes ${PLAN_DEFINITIONS[tier].savedSearchLimit} saved searches`)
    const { data, error } = await supabase.from('saved_searches').insert({
      user_id: userId,
      name: name.trim(),
      filters,
      alert_frequency: permittedAlertFrequency(tier, frequency),
    }).select('*').single()
    if (error) throw error
    setSearches((current) => [mapSavedSearch(data as Row), ...current])
  }, [searches.length, tier, userId])

  const remove = useCallback(async (id: string) => {
    if (!userId) return
    const { error } = await supabase.from('saved_searches').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    setSearches((current) => current.filter((search) => search.id !== id))
  }, [userId])

  return { searches, loading, save, remove, refresh }
}

function mapTracker(row: Row): PropertyTracker {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    propertyId: String(row.property_id),
    status: row.status as PropertyTrackingStatus,
    nextAction: row.next_action ? String(row.next_action) : null,
    dueAt: row.due_at ? String(row.due_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function usePropertyTracking(userId: string | null, tier: PlanTier) {
  const [trackers, setTrackers] = useState<PropertyTracker[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const refresh = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setTrackers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('property_tracking').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    setTrackers(((data ?? []) as Row[]).map(mapTracker))
    setLoading(false)
  }, [userId])
  useEffect(() => { void refresh() }, [refresh])

  const update = useCallback(async (propertyId: string, status: PropertyTrackingStatus, nextAction?: string, dueAt?: string | null) => {
    if (!userId) throw new Error('Sign in to track this property')
    const exists = trackers.some((tracker) => tracker.propertyId === propertyId)
    if (!exists && trackers.length >= PLAN_DEFINITIONS[tier].trackedPropertyLimit) {
      throw new Error(`Your plan includes ${PLAN_DEFINITIONS[tier].trackedPropertyLimit} tracked properties`)
    }
    const { data, error } = await supabase.from('property_tracking').upsert({
      user_id: userId,
      property_id: propertyId,
      status,
      next_action: nextAction?.trim() || null,
      due_at: dueAt || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,property_id' }).select('*').single()
    if (error) throw error
    const mapped = mapTracker(data as Row)
    setTrackers((current) => [mapped, ...current.filter((tracker) => tracker.propertyId !== propertyId)])
  }, [tier, trackers, userId])

  const remove = useCallback(async (propertyId: string) => {
    if (!userId) return
    const { error } = await supabase.from('property_tracking').delete().eq('user_id', userId).eq('property_id', propertyId)
    if (error) throw error
    setTrackers((current) => current.filter((tracker) => tracker.propertyId !== propertyId))
  }, [userId])

  const byPropertyId = useMemo(() => new Map(trackers.map((tracker) => [tracker.propertyId, tracker])), [trackers])
  return { trackers, byPropertyId, loading, update, remove, refresh }
}

function mapNote(row: Row): PropertyNote {
  return {
    id: String(row.id), userId: String(row.user_id), propertyId: String(row.property_id), body: String(row.body),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }
}

function mapDocument(row: Row): PropertyDocument {
  return {
    id: String(row.id), userId: String(row.user_id), propertyId: String(row.property_id), storagePath: String(row.storage_path),
    filename: String(row.filename), mimeType: row.mime_type ? String(row.mime_type) : null,
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes), documentType: row.document_type as PropertyDocument['documentType'],
    verifiedAt: row.verified_at ? String(row.verified_at) : null, createdAt: String(row.created_at),
  }
}

export function usePropertyResearch(userId: string | null, propertyId: string | null, paidAccess: boolean) {
  const [notes, setNotes] = useState<PropertyNote[]>([])
  const [documents, setDocuments] = useState<PropertyDocument[]>([])
  const [sources, setSources] = useState<PropertySourceRecord[]>([])
  const [loading, setLoading] = useState(Boolean(userId && propertyId))

  const refresh = useCallback(async () => {
    if (!userId || !propertyId || !isSupabaseConfigured) {
      setNotes([]); setDocuments([]); setSources([]); setLoading(false); return
    }
    setLoading(true)
    const [notesResult, documentsResult, sourcesResult] = await Promise.all([
      supabase.from('property_notes').select('*').eq('user_id', userId).eq('property_id', propertyId).order('created_at', { ascending: false }),
      supabase.from('property_documents').select('*').eq('user_id', userId).eq('property_id', propertyId).order('created_at', { ascending: false }),
      paidAccess
        ? supabase.from('property_source_records').select('*').eq('property_id', propertyId).order('verified_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])
    setNotes(((notesResult.data ?? []) as Row[]).map(mapNote))
    setDocuments(((documentsResult.data ?? []) as Row[]).map(mapDocument))
    setSources(((sourcesResult.data ?? []) as Row[]).map((row) => ({
      id: String(row.id), propertyId: String(row.property_id), sourceType: row.source_type as PropertySourceRecord['sourceType'],
      sourceName: String(row.source_name), sourceUrl: String(row.source_url), status: row.status as PropertySourceRecord['status'],
      verifiedAt: row.verified_at ? String(row.verified_at) : null, retrievedAt: row.retrieved_at ? String(row.retrieved_at) : null,
    })))
    setLoading(false)
  }, [paidAccess, propertyId, userId])
  useEffect(() => { void refresh() }, [refresh])

  const addNote = useCallback(async (body: string) => {
    if (!userId || !propertyId) throw new Error('Sign in to add a note')
    const { data, error } = await supabase.from('property_notes').insert({ user_id: userId, property_id: propertyId, body: body.trim() }).select('*').single()
    if (error) throw error
    setNotes((current) => [mapNote(data as Row), ...current])
  }, [propertyId, userId])

  const uploadDocument = useCallback(async (file: File, documentType: PropertyDocument['documentType']) => {
    if (!userId || !propertyId) throw new Error('Sign in to add a document')
    if (file.size > 25_000_000) throw new Error('Documents must be 25 MB or smaller')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
    const storagePath = `${userId}/${propertyId}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('property-documents').upload(storagePath, file, { upsert: false })
    if (uploadError) throw uploadError
    const { data, error } = await supabase.from('property_documents').insert({
      user_id: userId, property_id: propertyId, storage_path: storagePath, filename: file.name,
      mime_type: file.type || null, size_bytes: file.size, document_type: documentType,
    }).select('*').single()
    if (error) {
      await supabase.storage.from('property-documents').remove([storagePath])
      throw error
    }
    setDocuments((current) => [mapDocument(data as Row), ...current])
  }, [propertyId, userId])

  return { notes, documents, sources, loading, addNote, uploadDocument, refresh }
}

export function useLearningProgress(userId: string | null) {
  const [progress, setProgress] = useState<LessonProgress[]>([])
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) { setProgress([]); return }
    supabase.from('learning_progress').select('*').eq('user_id', userId).then(({ data }) => {
      setProgress(((data ?? []) as Row[]).map((row) => ({
        lessonId: String(row.lesson_id), completed: row.completed === true,
        quizScore: row.quiz_score == null ? null : Number(row.quiz_score), notes: String(row.notes ?? ''), updatedAt: String(row.updated_at),
      })))
    })
  }, [userId])

  const save = useCallback(async (lessonId: string, completed: boolean, quizScore: number | null, notes = '') => {
    if (!userId) throw new Error('Sign in to save learning progress')
    const now = new Date().toISOString()
    const { error } = await supabase.from('learning_progress').upsert({
      user_id: userId, lesson_id: lessonId, completed, quiz_score: quizScore, notes, updated_at: now,
    }, { onConflict: 'user_id,lesson_id' })
    if (error) throw error
    setProgress((current) => [{ lessonId, completed, quizScore, notes, updatedAt: now }, ...current.filter((item) => item.lessonId !== lessonId)])
  }, [userId])

  return { progress, save }
}
