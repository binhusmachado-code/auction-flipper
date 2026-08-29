import { lazy, Suspense, useState, useMemo, useEffect } from 'react'
import { Search, Heart, Map as MapIcon, Menu, X, ArrowUpRight, TrendingUp, DollarSign, BookOpen, CalendarDays, RefreshCw, ShieldCheck, Building2, LogOut, ChevronDown } from 'lucide-react'
import { Property, DealFilter } from './types/property'
import { useSupabaseAuth, useSupabaseProperties, useSupabaseFavorites } from './hooks/useSupabase.ts'
import { useAccountProfile } from './hooks/useAccount.ts'
import { supabase } from './lib/supabase.ts'
import FilterBar from './components/FilterBar'
import PropertyCard from './components/PropertyCard'
import MapView from './components/MapView'
import AuthModal from './components/AuthModal.tsx'
import OnboardingWizard from './components/OnboardingWizard.tsx'
import DealCalculator from './components/DealCalculator.tsx'
import PropertyAnalysisModal from './components/PropertyAnalysisModal.tsx'
import TopDealRanking from './components/TopDealRanking.tsx'
import AccountDashboard from './components/AccountDashboard.tsx'
import { analyzeTaxDeedScenario } from './lib/calculator.ts'
import { getListedBidAmount, getVerifiedScreeningSpread } from './lib/propertyBudget.ts'
import {
  dealAnalysisStorageKey,
  getDealVerdict,
  rankDealAnalyses,
  rankVerifiedOpportunities,
  type StoredDealAnalysis,
} from './lib/propertyAnalysis.ts'
import taxDeedMetadata from './data/tax_deed_metadata.json'
import './index.css'

const USDirectory = lazy(() => import('./components/USDirectory.tsx'))
const RESULT_PAGE_SIZE = 60

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatAuctionDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`))
}

export default function App() {
  const { user, loading: authLoading } = useSupabaseAuth()
  const { profile, loading: profileLoading } = useAccountProfile(user?.id ?? null, user?.email ?? '')
  const hasOwnerAccess = Boolean(user && profile?.role === 'admin' && profile.accountStatus === 'active')
  const { properties: supabaseProperties, loading: propertiesLoading } = useSupabaseProperties(hasOwnerAccess)
  const ownerDataUserId = hasOwnerAccess ? user?.id ?? null : null
  const { favorites, toggleFavorite: toggleSupabaseFavorite } = useSupabaseFavorites(ownerDataUserId)

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [calculatorProperty, setCalculatorProperty] = useState<Property | null>(null)
  const [showAccountDashboard, setShowAccountDashboard] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [visibleCount, setVisibleCount] = useState(RESULT_PAGE_SIZE)
  const [view, setView] = useState<'all' | 'favorites' | 'map' | 'directory'>('all')
  const [filter, setFilter] = useState<DealFilter>({
    state: '',
    county: '',
    city: '',
    minPrice: 0,
    maxPrice: 10_000_000,
    propertyType: '',
    saleType: '',
    auctionType: '',
    minInterestRate: 0,
    maxRedemptionPeriod: 60,
    keyword: '',
    analysisStatus: '',
    dealGrade: '',
    verifiedValueOnly: false,
    mappedOnly: false,
    auctionDateKnownOnly: false,
    sortBy: 'auction-soonest',
  })

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!window.location.hash.includes('account')) return
    if (hasOwnerAccess) {
      setShowAccountDashboard(true)
    }
  }, [hasOwnerAccess])

  const properties = supabaseProperties
  const currentProperties = useMemo(() => {
    const today = new Date()
    const todayKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
    return properties.filter((property) => {
      if (property.status === 'Sold' || property.status === 'Cancelled' || property.status === 'Removed') return false
      return !property.auctionDate || property.auctionDate >= todayKey
    })
  }, [properties])
  const counties = useMemo(
    () => [...new Set(currentProperties.map((property) => property.county).filter(Boolean))].sort(),
    [currentProperties]
  )
  const states = useMemo(
    () => [...new Set(currentProperties.map((property) => property.state).filter(Boolean))].sort(),
    [currentProperties]
  )
  const [savedAnalyses, setSavedAnalyses] = useState<Record<string, StoredDealAnalysis>>({})

  useEffect(() => {
    const loaded: Record<string, StoredDealAnalysis> = {}
    currentProperties.forEach((property) => {
      try {
        const raw = window.localStorage.getItem(dealAnalysisStorageKey(property.id))
        if (!raw) return
        const scenario = JSON.parse(raw)
        if (!scenario || typeof scenario !== 'object') return
        loaded[property.id] = { propertyId: property.id, address: property.address, scenario }
      } catch {
        // Ignore a damaged local draft instead of presenting calculations from it.
      }
    })
    setSavedAnalyses(loaded)
  }, [currentProperties])

  const rankedAnalyses = useMemo(() => rankDealAnalyses(Object.values(savedAnalyses)), [savedAnalyses])
  const screenedOpportunities = useMemo(() => rankVerifiedOpportunities(currentProperties), [currentProperties])
  const rankById = useMemo(
    () => new Map(rankedAnalyses.map((record, index) => [record.propertyId, index + 1])),
    [rankedAnalyses]
  )
  const screeningRankById = useMemo(
    () => new Map(screenedOpportunities.map((record, index) => [record.propertyId, index + 1])),
    [screenedOpportunities]
  )
  const screeningById = useMemo(
    () => new Map(screenedOpportunities.map((record) => [record.propertyId, record])),
    [screenedOpportunities]
  )

  const saveAnalysis = (record: StoredDealAnalysis) => {
    setSavedAnalyses((current) => ({ ...current, [record.propertyId]: record }))
  }

  const toggleFavorite = async (id: string) => {
    if (ownerDataUserId) await toggleSupabaseFavorite(id)
  }

  const openGuide = () => {
    setShowMobileMenu(false)
    setShowGuide(true)
  }

  const filtered = useMemo(() => {
    let list = currentProperties
    if (view === 'favorites') list = list.filter((p) => favorites.includes(p.id))

    return list.filter((p) => {
      const saved = savedAnalyses[p.id]
      const analysis = saved ? analyzeTaxDeedScenario(saved.scenario) : null
      const grade = analysis && saved ? getDealVerdict(analysis, saved.scenario).grade : 'Not ready'
      if (filter.analysisStatus === 'complete' && !analysis?.complete) return false
      if (filter.analysisStatus === 'needs-work' && (!saved || analysis?.complete)) return false
      if (filter.analysisStatus === 'not-started' && saved) return false
      if (filter.dealGrade && grade !== filter.dealGrade) return false
      if (filter.verifiedValueOnly && (!p.valuationVerified || !(p.estimatedValue > 0 || p.assessedValue > 0))) return false
      if (filter.mappedOnly && !(p.latitude && p.longitude)) return false
      if (filter.auctionDateKnownOnly && !p.auctionDate) return false
      if (filter.state && p.state !== filter.state) return false
      if (filter.county && p.county !== filter.county) return false
      if (filter.city && p.city !== filter.city) return false
      if (filter.propertyType && p.propertyType !== filter.propertyType) return false
      if (filter.saleType && p.saleType !== filter.saleType) return false
      if (filter.auctionType && p.auctionType !== filter.auctionType) return false
      const listedBidAmount = getListedBidAmount(p)
      if (listedBidAmount < filter.minPrice) return false
      if (listedBidAmount > filter.maxPrice) return false
      if (p.interestRate < filter.minInterestRate) return false
      if (filter.maxRedemptionPeriod < 60 && (p.redemptionPeriod <= 0 || p.redemptionPeriod > filter.maxRedemptionPeriod)) return false
      if (filter.keyword) {
        const kw = filter.keyword.toLowerCase()
        const match =
          p.address.toLowerCase().includes(kw) ||
          p.city.toLowerCase().includes(kw) ||
          p.state.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw) ||
          (p.parcelId && p.parcelId.toLowerCase().includes(kw)) ||
          p.source.toLowerCase().includes(kw)
        if (!match) return false
      }
      return true
    }).sort((a, b) => {
      if (filter.sortBy === 'price-low' || filter.sortBy === 'price-high') {
        const aAmount = getListedBidAmount(a)
        const bAmount = getListedBidAmount(b)
        const aHasPrice = aAmount > 0
        const bHasPrice = bAmount > 0
        if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1
        return filter.sortBy === 'price-low' ? aAmount - bAmount : bAmount - aAmount
      }
      if (filter.sortBy === 'assessed-high') {
        const aValue = a.valuationVerified ? a.assessedValue : -Infinity
        const bValue = b.valuationVerified ? b.assessedValue : -Infinity
        return bValue - aValue
      }
      if (filter.sortBy === 'screening-spread') {
        const aSpread = getVerifiedScreeningSpread(a)
        const bSpread = getVerifiedScreeningSpread(b)
        if (aSpread === null && bSpread === null) return 0
        if (aSpread === null) return 1
        if (bSpread === null) return -1
        return bSpread - aSpread
      }
      if (filter.sortBy === 'rank') {
        const aRank = rankById.get(a.id) ?? ((screeningRankById.get(a.id) ?? Number.MAX_SAFE_INTEGER) + 1_000)
        const bRank = rankById.get(b.id) ?? ((screeningRankById.get(b.id) ?? Number.MAX_SAFE_INTEGER) + 1_000)
        return aRank - bRank
      }
      if (filter.sortBy === 'deal') {
        const aSaved = savedAnalyses[a.id]
        const bSaved = savedAnalyses[b.id]
        const aProfit = aSaved ? analyzeTaxDeedScenario(aSaved.scenario).projectedProfit ?? -Infinity : -Infinity
        const bProfit = bSaved ? analyzeTaxDeedScenario(bSaved.scenario).projectedProfit ?? -Infinity : -Infinity
        return bProfit - aProfit
      }
      const aDate = a.auctionDate ? new Date(`${a.auctionDate}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER
      const bDate = b.auctionDate ? new Date(`${b.auctionDate}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER
      return aDate - bDate || getListedBidAmount(a) - getListedBidAmount(b)
    })
  }, [currentProperties, favorites, view, filter, rankById, savedAnalyses, screeningRankById])
  const visibleProperties = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  useEffect(() => {
    setVisibleCount(RESULT_PAGE_SIZE)
  }, [filter, view])

  const upcomingAuctions = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const auctions = new Map<string, { date: string; county: string; source: string; sourceUrl: string; count: number }>()
    currentProperties.forEach((property) => {
      if (property.saleType !== 'Tax Deed' || !property.auctionDate || property.status !== 'Active') return
      if (new Date(`${property.auctionDate}T12:00:00`) < today) return
      const key = `${property.county}|${property.auctionDate}`
      const existing = auctions.get(key)
      if (existing) {
        existing.count += 1
      } else {
        auctions.set(key, {
          date: property.auctionDate,
          county: property.county,
          source: property.source,
          sourceUrl: property.sourceUrl,
          count: 1,
        })
      }
    })
    return [...auctions.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [currentProperties])

  // Stats
  const totalTaxOwed = filtered.reduce((sum, property) => sum + getListedBidAmount(property), 0)
  const lienProperties = filtered.filter(p => p.saleType === 'Tax Lien')
  const knownLienRates = lienProperties.filter(property => property.interestRate > 0)
  const avgInterestRate = knownLienRates.length > 0
    ? (knownLienRates.reduce((sum, property) => sum + property.interestRate, 0) / knownLienRates.length).toFixed(1)
    : null
  const lienCount = lienProperties.length
  const deedCount = filtered.filter(p => p.saleType === 'Tax Deed').length

  const navLink = (key: 'all' | 'favorites' | 'map' | 'directory', label: string, icon: React.ReactNode) => (
    <button
      key={key}
      onClick={() => { setView(key); setShowGuide(false); setShowMobileMenu(false) }}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
        view === key
          ? 'bg-emerald-500 text-zinc-950'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
    >
      {icon}
      {label}
      {key === 'favorites' && favorites.length > 0 && (
        <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-zinc-950/20 text-zinc-950 rounded-full font-bold">{favorites.length}</span>
      )}
    </button>
  )

  const guideLink = (
    <button
      key="guide"
      onClick={openGuide}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all duration-300"
    >
      <BookOpen className="w-3.5 h-3.5" />
      Guide
    </button>
  )

  if (authLoading || (user && profileLoading)) {
    return <div className="grid min-h-screen place-items-center bg-zinc-950"><div className="flex items-center gap-3 text-sm font-semibold text-zinc-500"><div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />Checking owner access...</div></div>
  }

  if (!hasOwnerAccess) {
    if (!user) return <AuthModal />
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-4">
        <section className="w-full max-w-md rounded-lg border border-amber-500/25 bg-zinc-900 p-7 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-amber-400" />
          <h1 className="mt-4 text-xl font-extrabold text-white">Owner access only</h1>
          <p className="mt-2 text-sm text-zinc-500">The signed-in account is not the active owner administrator.</p>
          <button type="button" onClick={() => void supabase.auth.signOut()} className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-zinc-300 hover:bg-zinc-800"><LogOut className="h-4 w-4" />Sign out</button>
        </section>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Floating Nav */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
        <div className="glass rounded-full px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 pl-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-zinc-950" />
              </div>
              <span className="font-bold text-zinc-100 text-sm hidden sm:block">Tax Lien Hunter</span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {navLink('all', 'All', <Search className="w-3.5 h-3.5" />)}
              {navLink('map', 'Map', <MapIcon className="w-3.5 h-3.5" />)}
              {navLink('favorites', 'Saved', <Heart className="w-3.5 h-3.5" />)}
              {navLink('directory', 'Nationwide', <Building2 className="w-3.5 h-3.5" />)}
              {guideLink}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowAccountDashboard(true)}
                aria-label="Owner dashboard"
                className="pill-btn !px-3 !py-2 text-xs sm:!px-4"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Owner</span>
              </button>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
                className="md:hidden p-2.5 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showMobileMenu && (
            <div className="md:hidden mt-2 pt-2 border-t border-zinc-800 flex flex-col gap-1 animate-fade-in">
              {navLink('all', 'All Deals', <Search className="w-3.5 h-3.5" />)}
              {navLink('map', 'Map View', <MapIcon className="w-3.5 h-3.5" />)}
              {navLink('favorites', 'Saved', <Heart className="w-3.5 h-3.5" />)}
              {navLink('directory', 'Nationwide', <Building2 className="w-3.5 h-3.5" />)}
              {guideLink}
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <header className="relative pt-32 pb-16 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-[0.2em] rounded-full mb-6 border border-emerald-500/20">
            <TrendingUp className="w-3 h-3" />
            Official County Auction Records
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] text-balance">
            Tax Lien &<br className="hidden sm:block" /> Deed Investing
          </h1>
          <p className="mt-5 text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed text-balance">
            Review tax-sale opportunities, compare the numbers, and open the official auction source before you bid.
          </p>

          {/* Stats pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {[
              { name: 'Tax Liens', count: lienCount, color: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
              { name: 'Tax Deeds', count: deedCount, color: 'bg-amber-500/10 text-amber-400 ring-amber-500/20' },
              { name: 'Active Listings', count: currentProperties.length, color: 'bg-sky-500/10 text-sky-400 ring-sky-500/20' },
              { name: 'States + DC', count: 51, color: 'bg-zinc-800 text-zinc-300 ring-zinc-700' },
            ].map((s) => (
              <div
                key={s.name}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ring-1 ${s.color}`}
              >
                {s.name}
                <span className="px-1.5 py-0.5 bg-white/10 rounded-full text-[10px]">
                  {propertiesLoading && s.name !== 'States + DC' ? '...' : s.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={propertiesLoading}
              aria-busy={propertiesLoading}
              onClick={() => {
                const el = document.getElementById('deals')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="pill-btn disabled:cursor-wait disabled:opacity-70"
            >
              {propertiesLoading ? 'Loading Deals...' : `Browse ${filtered.length.toLocaleString()} Deals`}
              <span className="w-7 h-7 rounded-full bg-zinc-950/20 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </button>
            <button
              onClick={openGuide}
              className="pill-btn-outline"
            >
              <BookOpen className="w-4 h-4" />
              Buyer Guide
            </button>
          </div>
        </div>

        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      </header>

      {/* Main Content */}
      <main id="deals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 scroll-mt-28">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Active Listings</div>
            <div className="text-2xl font-extrabold text-white mt-1">{propertiesLoading ? '...' : filtered.length.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Avg Interest</div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">{propertiesLoading ? '...' : avgInterestRate ? `${avgInterestRate}%` : 'Verify'}</div>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Total Listed Amount</div>
            <div className="text-2xl font-extrabold text-white mt-1">{propertiesLoading ? '...' : formatCurrency(totalTaxOwed)}</div>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-5 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">States + DC</div>
            <div className="text-2xl font-extrabold text-white mt-1">51</div>
          </div>
        </div>

        {!propertiesLoading && view !== 'directory' && upcomingAuctions.length > 0 && (
          <section className="mb-8 scroll-mt-28" aria-labelledby="upcoming-auctions-title">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-amber-400" />
                  <h2 id="upcoming-auctions-title" className="text-lg font-bold text-zinc-100">Upcoming Tax Deed Auctions</h2>
                </div>
                <p className="mt-1 text-sm text-zinc-500">Next official county sale dates and active parcel counts.</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <RefreshCw className="h-3.5 w-3.5" />
                Verified {formatAuctionDate(taxDeedMetadata.refreshedAt)}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {upcomingAuctions.map((auction, index) => (
                <a
                  key={`${auction.county}-${auction.date}`}
                  href={auction.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group rounded-xl border p-4 transition-colors ${
                    index === 0
                      ? 'border-amber-500/30 bg-amber-500/10 hover:border-amber-400/60'
                      : 'border-zinc-800/60 bg-zinc-900/50 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      {index === 0 ? 'Next Auction' : auction.county}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-emerald-400" />
                  </div>
                  <div className="mt-2 text-base font-extrabold text-zinc-100">{formatAuctionDate(auction.date)}</div>
                  <div className="mt-1 text-xs text-zinc-400">{auction.county} County</div>
                  <div className="mt-3 text-xs font-bold text-emerald-400">{auction.count.toLocaleString()} active {auction.count === 1 ? 'property' : 'properties'}</div>
                </a>
              ))}
            </div>
          </section>
        )}

        {!propertiesLoading && view !== 'directory' && (
          <TopDealRanking
            ranked={rankedAnalyses}
            screened={screenedOpportunities}
            properties={currentProperties}
            onOpen={setSelectedProperty}
          />
        )}

        {!propertiesLoading && view !== 'directory' && <FilterBar filter={filter} states={states} counties={counties} onChange={setFilter} />}

        {propertiesLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading tax sales...</span>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="animate-fade-in" key={view}>
          {view === 'directory' ? (
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-sm font-semibold text-zinc-500"><div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />Loading U.S. directory...</div>}>
              <USDirectory
                properties={currentProperties}
                onOpenListings={(state, county) => {
                  setFilter((current) => ({ ...current, state, county }))
                  setView('all')
                  window.requestAnimationFrame(() => document.getElementById('deals')?.scrollIntoView({ behavior: 'smooth' }))
                }}
              />
            </Suspense>
          ) : view === 'map' ? (
            <MapView
              properties={filtered}
              onSelect={setSelectedProperty}
              favorites={favorites}
            />
          ) : !propertiesLoading && filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="inline-flex p-5 bg-zinc-900 rounded-full mb-5">
                <Search className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100">No deals found</h3>
              <p className="text-zinc-500 mt-2">Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleProperties.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    onSelect={setSelectedProperty}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favorites.includes(p.id)}
                    savedAnalysis={savedAnalyses[p.id]}
                    rank={rankById.get(p.id)}
                    screeningRank={screeningRankById.get(p.id)}
                  />
                ))}
              </div>
              {visibleProperties.length < filtered.length && (
                <div className="mt-8 flex flex-col items-center gap-3 border-t border-zinc-800 pt-6">
                  <p className="text-xs font-semibold text-zinc-500">Showing {visibleProperties.length.toLocaleString()} of {filtered.length.toLocaleString()} matching properties</p>
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + RESULT_PAGE_SIZE)}
                    className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-zinc-200 hover:border-emerald-500/50 hover:text-emerald-400"
                  >
                    <ChevronDown className="h-4 w-4" />Show more properties
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Data Sources */}
        <div className="mt-16 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-zinc-100 text-lg">Data Sources</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
                Live listings come from twelve official state and county inventories across Florida, Arkansas, New Mexico, and Colorado. The U.S. directory includes every state and county equivalent,
                with direct official links where verified and source-research links everywhere else. Always recheck status,
                title, liens, condition, and bid amount on the government or authorized auction site.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
                {[
                  { name: 'Arkansas State Tax-Deed Auctions', url: 'https://cosl.org/Home/Contents', desc: 'Official statewide COSL catalogs, minimum bids, and daily removals' },
                  { name: 'New Mexico Property-Tax Auctions', url: 'https://www.tax.newmexico.gov/businesses/property-tax-overview/delinquent-property-tax-auctions/', desc: 'Official statewide auction notices, cases, legal descriptions, and minimum bids' },
                  { name: 'Bay Tax Deeds', url: 'https://records2.baycoclerk.com/TaxDeed/', desc: 'Official Clerk case search and future sale calendar' },
                  { name: 'Brevard Tax Deeds', url: 'https://www.brevardclerk.us/tax-deed-sales', desc: 'Official sale schedules and bidder information' },
                  { name: 'Broward Tax Deeds', url: 'https://county-taxes.net/broward/reports/real-estate', desc: 'Official Tax Collector future auction reports and certified property lists' },
                  { name: 'Clay Tax Deeds', url: 'https://landmark.clayclerk.com/TaxDeed/', desc: 'Official Clerk case search and future sale calendar' },
                  { name: 'Collier Tax Deeds', url: 'https://notices.collierclerk.com/genre/tax-deeds/', desc: 'Official Clerk legal notices and auction dates' },
                  { name: 'Duval Tax Deeds', url: 'https://taxdeed.duvalclerk.com/', desc: 'Official Clerk case search and future sale calendar' },
                  { name: 'Gulf Tax Deeds', url: 'https://www.gulfclerk.com/courts/tax-deeds/', desc: 'Official active sale listings and reports' },
                  { name: 'Palm Beach Tax Deeds', url: 'https://taxdeed.mypalmbeachclerk.com/', desc: 'Official Clerk cases joined to public appraiser records' },
                  { name: 'Suwannee Tax Deeds', url: 'https://www.suwgov.org/tax-deed-sales/', desc: 'Official next-sale schedule and bidder rules' },
                  { name: 'Adams County Tax Liens', url: 'https://adamscountyco.gov/our-county/elected-officials/treasurer-public-trustee/treasurer-division/tax-lien-sale/', desc: 'Official Colorado county-held lien list joined to weekly assessor records' },
                ].map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800/40 hover:border-emerald-500/30 hover:bg-zinc-900/50 transition-all duration-300"
                  >
                    <div className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                      {s.name}
                      <ArrowUpRight className="w-3 h-3 text-zinc-500" />
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{s.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-zinc-600">
            Tax Lien Hunter — Auction research for educational purposes, not legal or financial advice.
            Verify every listing with the government auction source before investing.
          </p>
        </div>
      </footer>

      {/* Modals */}
      {selectedProperty && (
        <PropertyAnalysisModal
          property={selectedProperty}
          savedAnalysis={savedAnalyses[selectedProperty.id]}
          rank={rankById.get(selectedProperty.id)}
          screening={screeningById.get(selectedProperty.id)}
          screeningRank={screeningRankById.get(selectedProperty.id)}
          onClose={() => setSelectedProperty(null)}
          onOpenCalculator={() => {
            setCalculatorProperty(selectedProperty)
            setSelectedProperty(null)
          }}
        />
      )}

      {showAccountDashboard && user && profile && (
        <AccountDashboard
          user={user}
          profile={profile}
          properties={currentProperties}
          favoriteIds={favorites}
          onClose={() => setShowAccountDashboard(false)}
          onOpenGuide={() => {
            setShowAccountDashboard(false)
            openGuide()
          }}
          onOpenCalculator={(property) => {
            setShowAccountDashboard(false)
            setCalculatorProperty(property)
          }}
        />
      )}

      {showGuide && (
        <OnboardingWizard
          onClose={() => setShowGuide(false)}
          onOpenDirectory={() => {
            setShowGuide(false)
            setView('directory')
          }}
          onOpenCalculator={() => {
            const example = currentProperties.find((property) => property.saleType === 'Tax Deed')
            if (example) setCalculatorProperty(example)
          }}
        />
      )}

      {calculatorProperty?.saleType === 'Tax Deed' && (
        <DealCalculator property={calculatorProperty} onClose={() => setCalculatorProperty(null)} onSaved={saveAnalysis} />
      )}
    </div>
  )
}
