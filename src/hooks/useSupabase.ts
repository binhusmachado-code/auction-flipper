import { useState, useEffect, useCallback } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase.ts'
import { useToast } from '../components/ToastProvider.tsx'
import type { Property } from '../types/property'
import taxDeedProperties from '../data/tax_deed_properties.json'
import { collectPages } from '../lib/pagination.ts'

type PropertyRecord = Record<string, unknown>

function optionalNumber(value: unknown): number | undefined {
  return value === null || value === undefined || value === '' ? undefined : Number(value)
}

function normalizeProperty(row: PropertyRecord): Property {
  const auctionType = String(row.auction_type ?? row.auctionType ?? 'Government') as Property['auctionType']
  const rawSaleType = row.sale_type ?? row.saleType
  const saleType = rawSaleType === 'Tax Lien' || rawSaleType === 'Tax Deed'
    ? rawSaleType
    : auctionType === 'Tax Lien' || auctionType === 'Tax Deed'
      ? auctionType
      : undefined

  return {
    id: String(row.id),
    address: String(row.address),
    city: String(row.city),
    state: String(row.state),
    zip: String(row.zip),
    price: Number(row.price),
    estimatedValue: Number(row.estimated_value ?? row.estimatedValue ?? 0),
    beds: Number(row.beds ?? 0),
    baths: Number(row.baths ?? 0),
    sqft: Number(row.sqft ?? 0),
    lotSize: optionalNumber(row.lot_size ?? row.lotSize),
    yearBuilt: optionalNumber(row.year_built ?? row.yearBuilt),
    propertyType: String(row.property_type ?? row.propertyType ?? 'Unknown') as Property['propertyType'],
    auctionDate: row.auction_date || row.auctionDate ? String(row.auction_date ?? row.auctionDate) : undefined,
    auctionType,
    source: String(row.source),
    sourceUrl: String(row.source_url ?? row.sourceUrl ?? '#'),
    description: String(row.description ?? ''),
    imageUrl: String(row.image_url ?? row.imageUrl ?? ''),
    images: (row.images as string[]) ?? [],
    status: String(row.status) as Property['status'],
    daysOnMarket: Number(row.days_on_market ?? row.daysOnMarket ?? 0),
    rehabEstimate: Number(row.rehab_estimate ?? row.rehabEstimate ?? 0),
    arv: Number(row.arv ?? 0),
    notes: String(row.notes ?? ''),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    county: String(row.county ?? ''),
    caseNumber: row.case_number || row.caseNumber ? String(row.case_number ?? row.caseNumber) : undefined,
    openingBid: optionalNumber(row.opening_bid ?? row.openingBid),
    depositRequired: optionalNumber(row.deposit_required ?? row.depositRequired),
    parcelId: row.parcel_id || row.parcelId ? String(row.parcel_id ?? row.parcelId) : undefined,
    taxAmount: Number(row.tax_amount ?? row.taxAmount ?? row.price ?? 0),
    interestRate: Number(row.interest_rate ?? row.interestRate ?? 0),
    redemptionPeriod: Number(row.redemption_period ?? row.redemptionPeriod ?? 0),
    saleType,
    assessedValue: Number(row.assessed_value ?? row.assessedValue ?? row.estimated_value ?? row.estimatedValue ?? 0),
    delinquentYears: Number(row.delinquent_years ?? row.delinquentYears ?? 0),
    ownerName: row.owner_name || row.ownerName ? String(row.owner_name ?? row.ownerName) : undefined,
    valuationVerified: row.valuation_verified === false || row.valuationVerified === false ? false : undefined,
  }
}

const officialTaxDeedProperties = (taxDeedProperties as PropertyRecord[]).map(normalizeProperty)

export function useSupabaseAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let mounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })
    supabase.auth.getUser().then(({ data }: any) => {
      if (mounted) {
        setUser(data.user)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}

export function useSupabaseProperties(hasPrivateAccess = false) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    if (!hasPrivateAccess) {
      setProperties([])
      setLoading(false)
      return
    }
    if (!isSupabaseConfigured) {
      setProperties(officialTaxDeedProperties)
      setLoading(false)
      return
    }

    let cancelled = false
    const loadProperties = async () => {
      const pageSize = 1000
      return collectPages<PropertyRecord>(async (offset, end) => {
        const { data, error }: any = await supabase
          .from('properties')
          .select('*')
          .order('price', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, end)
        if (error) throw error
        return (data ?? []) as PropertyRecord[]
      }, pageSize)
    }

    loadProperties()
      .then((rows) => {
        if (cancelled) return
        setProperties(rows.length ? rows.map(normalizeProperty) : officialTaxDeedProperties)
        setLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        console.warn('Live property data unavailable; using official county listings.', error)
        setProperties(officialTaxDeedProperties)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [hasPrivateAccess, showToast])

  const addProperty = useCallback(async (p: Property) => {
    if (!isSupabaseConfigured) {
      showToast('Online accounts are not configured', 'error')
      return false
    }

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
      .then(({ data, error }: any) => {
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
      .then(({ data, error }: any) => {
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
