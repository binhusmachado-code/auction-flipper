import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.ts'
import { useToast } from '../components/ToastProvider.tsx'
import type { Property } from '../types/property'

export function useSupabaseAuth() {
  const [user, setUser] = useState(supabase.auth.getUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

export function useSupabaseProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false
    supabase
      .from('properties')
      .select('*')
      .order('price', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          showToast('Failed to load properties', 'error')
          console.error(error)
        } else if (data) {
          const mapped: Property[] = data.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            address: String(row.address),
            city: String(row.city),
            state: String(row.state),
            zip: String(row.zip),
            price: Number(row.price),
            estimatedValue: Number(row.estimated_value),
            beds: Number(row.beds ?? 0),
            baths: Number(row.baths ?? 0),
            sqft: Number(row.sqft ?? 0),
            lotSize: row.lot_size ? Number(row.lot_size) : undefined,
            yearBuilt: row.year_built ? Number(row.year_built) : undefined,
            propertyType: String(row.property_type) as Property['propertyType'],
            auctionDate: row.auction_date ? String(row.auction_date) : undefined,
            auctionType: String(row.auction_type) as Property['auctionType'],
            source: String(row.source),
            sourceUrl: String(row.source_url ?? '#'),
            description: String(row.description ?? ''),
            imageUrl: String(row.image_url ?? ''),
            images: (row.images as string[]) ?? [],
            status: String(row.status) as Property['status'],
            daysOnMarket: Number(row.days_on_market ?? 0),
            rehabEstimate: Number(row.rehab_estimate ?? 0),
            arv: Number(row.arv ?? 0),
            notes: String(row.notes ?? ''),
            latitude: Number(row.latitude ?? 0),
            longitude: Number(row.longitude ?? 0),
            county: String(row.county ?? ''),
            caseNumber: row.case_number ? String(row.case_number) : undefined,
            openingBid: row.opening_bid ? Number(row.opening_bid) : undefined,
            depositRequired: row.deposit_required ? Number(row.deposit_required) : undefined,
          }))
          setProperties(mapped)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [showToast])

  const addProperty = useCallback(async (p: Property) => {
    const row = {
      id: p.id,
      address: p.address,
      city: p.city,
      state: p.state,
      zip: p.zip,
      price: p.price,
      estimated_value: p.estimatedValue,
      beds: p.beds,
      baths: p.baths,
      sqft: p.sqft,
      lot_size: p.lotSize,
      year_built: p.yearBuilt,
      property_type: p.propertyType,
      auction_date: p.auctionDate,
      auction_type: p.auctionType,
      source: p.source,
      source_url: p.sourceUrl,
      description: p.description,
      image_url: p.imageUrl,
      images: p.images,
      status: p.status,
      days_on_market: p.daysOnMarket,
      rehab_estimate: p.rehabEstimate,
      arv: p.arv,
      notes: p.notes,
      latitude: p.latitude,
      longitude: p.longitude,
      county: p.county,
      case_number: p.caseNumber,
      opening_bid: p.openingBid,
      deposit_required: p.depositRequired,
    }
    const { error } = await supabase.from('properties').insert(row)
    if (error) {
      showToast('Failed to add property', 'error')
      console.error(error)
      return false
    }
    setProperties((prev) => [p, ...prev])
    return true
  }, [showToast])

  return { properties, loading, addProperty }
}

export function useSupabaseFavorites(userId: string | null) {
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    if (!userId) {
      setFavorites([])
      setLoading(false)
      return
    }
    let cancelled = false
    supabase
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          showToast('Failed to load favorites', 'error')
        } else if (data) {
          setFavorites(data.map((d: Record<string, unknown>) => String(d.property_id)))
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, showToast])

  const toggleFavorite = useCallback(async (propertyId: string) => {
    if (!userId) {
      showToast('Please sign in to save favorites', 'error')
      return
    }
    const isAdding = !favorites.includes(propertyId)
    if (isAdding) {
      const { error } = await supabase.from('user_favorites').insert({
        user_id: userId,
        property_id: propertyId,
      })
      if (error) {
        showToast('Failed to save favorite', 'error')
        return
      }
      setFavorites((prev) => [...prev, propertyId])
      showToast('Saved to favorites', 'success')
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('property_id', propertyId)
      if (error) {
        showToast('Failed to remove favorite', 'error')
        return
      }
      setFavorites((prev) => prev.filter((id) => id !== propertyId))
      showToast('Removed from favorites', 'info')
    }
  }, [favorites, userId, showToast])

  return { favorites, loading, toggleFavorite }
}

export function useSupabaseAlerts(userId: string | null) {
  const [alerts, setAlerts] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    if (!userId) {
      setAlerts([])
      setLoading(false)
      return
    }
    let cancelled = false
    supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          showToast('Failed to load alerts', 'error')
        } else if (data) {
          setAlerts(data)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, showToast])

  const addAlert = useCallback(async (alert: Record<string, unknown>) => {
    if (!userId) {
      showToast('Please sign in to set alerts', 'error')
      return false
    }
    const { error } = await supabase.from('user_alerts').insert({
      user_id: userId,
      ...alert,
    })
    if (error) {
      showToast('Failed to save alert', 'error')
      return false
    }
    setAlerts((prev) => [...prev, alert])
    showToast('Alert saved!', 'success')
    return true
  }, [userId, showToast])

  const deleteAlert = useCallback(async (alertId: string) => {
    if (!userId) return
    const { error } = await supabase
      .from('user_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', userId)
    if (error) {
      showToast('Failed to delete alert', 'error')
      return
    }
    setAlerts((prev) => prev.filter((a) => a.id !== alertId))
    showToast('Alert removed', 'info')
  }, [userId, showToast])

  return { alerts, loading, addAlert, deleteAlert }
}
