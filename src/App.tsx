import { lazy, Suspense, useState, useMemo, useEffect } from 'react'
import { Search, Heart, Map as MapIcon, Menu, X, ArrowUpRight, TrendingUp, DollarSign, BookOpen, CalendarDays, RefreshCw, ShieldCheck, Building2, LogOut, ChevronDown, Table2, LayoutGrid, Bell, Target, UserRound, Download } from 'lucide-react'
import { Property, DealFilter } from './types/property'
import { useSupabaseAuth, useSupabaseProperties, useSupabaseFavorites, usePublicPropertyPreviews } from './hooks/useSupabase.ts'
import { useAccountProfile } from './hooks/useAccount.ts'
import { useLearningProgress, useMembership, usePropertyTracking, useSavedSearches } from './hooks/useMemberProduct.ts'
import { supabase } from './lib/supabase.ts'
import { openBillingPortal, startCheckout } from './lib/billing.ts'
import FilterBar from './components/FilterBar'
import PropertyCard from './components/PropertyCard'
import MapView from './components/MapView'
import AuthModal from './components/AuthModal.tsx'
import PublicHome from './components/PublicHome.tsx'
import PricingSection from './components/PricingSection.tsx'
import PropertyTable from './components/PropertyTable.tsx'
import AuctionCalendar from './components/AuctionCalendar.tsx'
import TrackingBoard from './components/TrackingBoard.tsx'
import SavedSearchesPanel from './components/SavedSearchesPanel.tsx'
import LearningCenter from './components/LearningCenter.tsx'
import ExportButton from './components/ExportButton.tsx'
import { useToast } from './components/ToastProvider.tsx'
import OnboardingWizard from './components/OnboardingWizard.tsx'
import DealCalculator from './components/DealCalculator.tsx'
import PropertyAnalysisModal from './components/PropertyAnalysisModal.tsx'
import TopDealRanking from './components/TopDealRanking.tsx'
import AccountDashboard from './components/AccountDashboard.tsx'
import CommandCenterLayout from './components/CommandCenterLayout.tsx'
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
import type { BillingInterval, PlanTier } from './types/product.ts'
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
  const { membership, entitlements, loading: membershipLoading } = useMembership(user?.id ?? null, hasOwnerAccess)
  const hasPrivateAccess = hasOwnerAccess || membership.paidActive
  const { properties: supabaseProperties, loading: privatePropertiesLoading } = useSupabaseProperties(hasPrivateAccess)
  const { properties: previewProperties, loading: previewPropertiesLoading } = usePublicPropertyPreviews()
  const accountUserId = user?.id ?? null
  const { favorites, toggleFavorite: toggleSupabaseFavorite } = useSupabaseFavorites(accountUserId)
  const { searches: savedSearches, save: saveSearch, remove: removeSearch } = useSavedSearches(accountUserId, membership.tier)
  const { trackers, byPropertyId: trackerByPropertyId, update: updateTracker } = usePropertyTracking(accountUserId, membership.tier)
  const { progress: lessonProgress, save: saveLessonProgress } = useLearningProgress(accountUserId)
  const { showToast } = useToast()

  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-up')
  const [pendingPlan, setPendingPlan] = useState<{ tier: Exclude<PlanTier, 'free'>; interval: BillingInterval } | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [calculatorProperty, setCalculatorProperty] = useState<Property | null>(null)
  const [showAccountDashboard, setShowAccountDashboard] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [visibleCount, setVisibleCount] = useState(RESULT_PAGE_SIZE)
  const [view, setView] = useState<'all' | 'favorites' | 'map' | 'directory' | 'table' | 'calendar' | 'trackers' | 'alerts' | 'learn' | 'pricing'>('table')
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
    const hash = window.location.hash
    if (hash.includes('account') && hasOwnerAccess) setShowAccountDashboard(true)
    if (hash.includes('pricing')) setView('pricing')
  }, [hasOwnerAccess])

  useEffect(() => {
    if (!user || !pendingPlan) return
    const requested = pendingPlan
    setPendingPlan(null)
    startCheckout(requested.tier, requested.interval)
      .then((url) => { window.location.assign(url) })
      .catch((error) => showToast(error instanceof Error ? error.message : 'Unable to start checkout', 'error'))
  }, [pendingPlan, showToast, user])

  const choosePlan = async (tier: PlanTier, interval: BillingInterval) => {
    if (!user) {
      if (tier !== 'free') setPendingPlan({ tier, interval })
      setAuthMode('sign-up')
      setShowAuth(true)
      return
    }
    if (tier === 'free') {
      setView('all')
      return
    }
    try {
      const url = await startCheckout(tier, interval)
      window.location.assign(url)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to start checkout', 'error')
    }
  }

  const manageBilling = async () => {
    try {
      const url = await openBillingPortal()
      window.location.assign(url)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to open billing', 'error')
    }
  }

  const properties = hasPrivateAccess ? supabaseProperties : previewProperties
  const propertiesLoading = hasPrivateAccess ? privatePropertiesLoading : previewPropertiesLoading
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
    if (accountUserId) await toggleSupabaseFavorite(id)
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

  const navLink = (key: 'all' | 'favorites' | 'map' | 'directory' | 'table' | 'calendar' | 'trackers' | 'alerts' | 'learn' | 'pricing', label: string, icon: React.ReactNode) => (
    <button
      key={key}
      onClick={() => { setView(key); setShowGuide(false); setShowMobileMenu(false) }}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
        view === key
          ? 'bg-emerald-800 text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      {icon}
      {label}
      {key === 'favorites' && favorites.length > 0 && (
        <span className="ml-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-current">{favorites.length}</span>
      )}
    </button>
  )

  if (authLoading || (user && (profileLoading || membershipLoading))) {
    return <div className="grid min-h-screen place-items-center bg-emerald-50/60"><div className="flex items-center gap-3 text-sm font-semibold text-slate-600"><div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />Preparing your research workspace…</div></div>
  }

  if (!user) {
    return showAuth
      ? <AuthModal initialMode={authMode} onBack={() => setShowAuth(false)} />
      : <PublicHome onSignIn={() => { setAuthMode('sign-in'); setShowAuth(true) }} onStartFree={() => { setAuthMode('sign-up'); setShowAuth(true) }} onChoosePlan={choosePlan} />
  }

  if (profile?.accountStatus === 'suspended') {
    return (
      <main className="grid min-h-screen place-items-center bg-emerald-50/60 px-4">
        <section className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-7 text-center shadow-xl">
          <ShieldCheck className="mx-auto h-8 w-8 text-amber-400" />
          <h1 className="mt-4 text-xl font-extrabold text-slate-950">Account access paused</h1>
          <p className="mt-2 text-sm text-slate-600">Please contact support if you think this is a mistake.</p>
          <button type="button" onClick={() => void supabase.auth.signOut()} className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" />Sign out</button>
        </section>
      </main>
    )
  }

  const overlays = (
    <>
      {selectedProperty && (
        <PropertyAnalysisModal
          property={selectedProperty}
          savedAnalysis={savedAnalyses[selectedProperty.id]}
          rank={rankById.get(selectedProperty.id)}
          screening={screeningById.get(selectedProperty.id)}
          screeningRank={screeningRankById.get(selectedProperty.id)}
          onClose={() => setSelectedProperty(null)}
          userId={accountUserId}
          paidAccess={hasPrivateAccess}
          tracker={trackerByPropertyId.get(selectedProperty.id)}
          onTrack={async (propertyId, status) => {
            try { await updateTracker(propertyId, status); showToast('Tracking status updated', 'success') }
            catch (error) { showToast(error instanceof Error ? error.message : 'Unable to update tracking', 'error'); throw error }
          }}
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
    </>
  )

  if (view === 'table') {
    return (
      <>
        <CommandCenterLayout
          filter={filter}
          states={states}
          counties={counties}
          onFilterChange={setFilter}
          filteredProperties={filtered}
          trackers={trackerByPropertyId}
          savedSearches={savedSearches}
          entitlements={entitlements}
          upcomingAuctions={upcomingAuctions}
          membershipTier={membership.tier}
          hasOwnerAccess={hasOwnerAccess}
          favoriteIds={favorites}
          onOpenProperty={setSelectedProperty}
          onToggleFavorite={(propertyId) => void toggleFavorite(propertyId)}
          onViewChange={(nextView) => setView(nextView)}
          onOpenAccount={() => hasOwnerAccess ? setShowAccountDashboard(true) : setView('pricing')}
          onSignOut={() => void supabase.auth.signOut()}
          exportControl={entitlements.csvExport ? <ExportButton properties={filtered} filename="tax-deed-lien-hunter-properties" variant="primary" /> : <button type="button" onClick={() => setView('pricing')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-[13px] font-bold text-amber-900 hover:bg-amber-100"><Download className="h-4 w-4" />Upgrade to export</button>}
        />
        {overlays}
      </>
    )
  }

  const legacyView = view as 'all' | 'favorites' | 'map' | 'directory' | 'table' | 'calendar' | 'trackers' | 'alerts' | 'learn' | 'pricing'

  return (
    <div className="min-h-screen bg-white text-slate-950">
      {/* Floating Nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 pl-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 shadow-sm">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="hidden text-sm font-black tracking-tight text-emerald-950 sm:block">TAX DEED &amp; LIEN HUNTER</span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {navLink('all', 'Discover', <Search className="w-3.5 h-3.5" />)}
              {navLink('calendar', 'Calendar', <CalendarDays className="w-3.5 h-3.5" />)}
              {navLink('trackers', 'Trackers', <Target className="w-3.5 h-3.5" />)}
              {navLink('favorites', 'Saved', <Heart className="w-3.5 h-3.5" />)}
              {navLink('alerts', 'Alerts', <Bell className="w-3.5 h-3.5" />)}
              {navLink('learn', 'Learn', <BookOpen className="w-3.5 h-3.5" />)}
              {navLink('directory', 'Nationwide', <Building2 className="w-3.5 h-3.5" />)}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => hasOwnerAccess ? setShowAccountDashboard(true) : setView('pricing')}
                aria-label="Account and membership"
                className="pill-btn !px-3 !py-2 text-xs sm:!px-4"
              >
                {hasOwnerAccess ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{hasOwnerAccess ? 'Owner' : membership.tier === 'free' ? 'Upgrade' : 'Billing'}</span>
              </button>
              {membership.paidActive && !hasOwnerAccess && <button type="button" onClick={() => void manageBilling()} className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 sm:inline-flex">Manage billing</button>}
              {!hasOwnerAccess && <button type="button" onClick={() => void supabase.auth.signOut()} aria-label="Sign out" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"><LogOut className="h-4 w-4" /></button>}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
                className="p-2.5 text-slate-500 transition-colors hover:text-slate-950 md:hidden"
              >
                {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {showMobileMenu && (
            <div className="mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2 md:hidden animate-fade-in">
              {navLink('all', 'Discover', <Search className="w-3.5 h-3.5" />)}
              {navLink('table', 'Table', <Table2 className="w-3.5 h-3.5" />)}
              {navLink('map', 'Map', <MapIcon className="w-3.5 h-3.5" />)}
              {navLink('calendar', 'Calendar', <CalendarDays className="w-3.5 h-3.5" />)}
              {navLink('trackers', 'Trackers', <Target className="w-3.5 h-3.5" />)}
              {navLink('favorites', 'Saved', <Heart className="w-3.5 h-3.5" />)}
              {navLink('alerts', 'Alerts', <Bell className="w-3.5 h-3.5" />)}
              {navLink('learn', 'Learn', <BookOpen className="w-3.5 h-3.5" />)}
              {navLink('directory', 'Nationwide', <Building2 className="w-3.5 h-3.5" />)}
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <header className="border-b border-slate-200 bg-white px-4 py-7 sm:py-9">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">{hasPrivateAccess ? `${membership.tier} member` : 'Free preview'}</span>{!hasPrivateAccess && <button type="button" onClick={() => setView('pricing')} className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-900">Unlock full records →</button>}</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Property command center
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Screen official auction records, keep due diligence visible, and make every bid decision traceable.
          </p>
          </div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => setView('alerts')} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-black text-slate-700"><Bell className="h-4 w-4 text-emerald-800" />{savedSearches.length} saved</button><button type="button" onClick={() => setView('table')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-3 py-2.5 text-xs font-black text-white"><Table2 className="h-4 w-4" />Open table</button></div>
          </div>

          {/* Stats pills */}
          <div className="hidden">
            {[
              { name: 'Tax Liens', count: lienCount, color: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
              { name: 'Tax Deeds', count: deedCount, color: 'bg-amber-50 text-amber-800 ring-amber-200' },
              { name: 'Active Listings', count: currentProperties.length, color: 'bg-sky-50 text-sky-800 ring-sky-200' },
              { name: 'States + DC', count: 51, color: 'bg-white text-slate-700 ring-slate-200' },
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

          <div className="hidden">
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
              How auctions work
            </button>
          </div>
        </div>

      </header>

      {/* Main Content */}
      <main id="deals" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {/* Stats row */}
        <div className="hidden">
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Active Listings</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-950">{propertiesLoading ? '...' : filtered.length.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Avg Interest</div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-800">{propertiesLoading ? '...' : avgInterestRate ? `${avgInterestRate}%` : 'Verify'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Total Listed Amount</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-950">{propertiesLoading ? '...' : formatCurrency(totalTaxOwed)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">States + DC</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-950">51</div>
          </div>
        </div>

        {!propertiesLoading && view !== 'directory' && upcomingAuctions.length > 0 && (
          <section className="hidden" aria-labelledby="upcoming-auctions-title">
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
          <div className="hidden">
            <TopDealRanking ranked={rankedAnalyses} screened={screenedOpportunities} properties={currentProperties} onOpen={setSelectedProperty} />
          </div>
        )}

        {!propertiesLoading && ['all', 'favorites', 'map', 'table'].includes(legacyView) && <FilterBar filter={filter} states={states} counties={counties} onChange={setFilter} />}
        {!propertiesLoading && ['all', 'favorites', 'map', 'table'].includes(legacyView) && <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button type="button" onClick={() => setView('all')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black ${legacyView === 'all' ? 'bg-emerald-800 text-white' : 'text-slate-600'}`}><LayoutGrid className="h-3.5 w-3.5" />Grid</button><button type="button" onClick={() => setView('table')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black ${legacyView === 'table' ? 'bg-emerald-800 text-white' : 'text-slate-600'}`}><Table2 className="h-3.5 w-3.5" />Table</button><button type="button" onClick={() => setView('map')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black ${legacyView === 'map' ? 'bg-emerald-800 text-white' : 'text-slate-600'}`}><MapIcon className="h-3.5 w-3.5" />Map</button></div><div className="flex items-center gap-2">{entitlements.csvExport ? <ExportButton properties={filtered} filename="tax-lien-hunter-properties" /> : <button type="button" onClick={() => setView('pricing')} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-900">CSV export is in Investor →</button>}<button type="button" onClick={() => setView('alerts')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700"><Bell className="h-4 w-4" />Save search</button></div></div>}
        {!propertiesLoading && ['all', 'favorites', 'map', 'table'].includes(view) && <div className="mb-7 grid gap-3 lg:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Upcoming deadlines</div><CalendarDays className="h-4 w-4 text-emerald-800" /></div><div className="mt-3 space-y-2">{upcomingAuctions.slice(0, 2).map((auction) => <button type="button" key={`${auction.county}-${auction.date}`} onClick={() => setView('calendar')} className="flex w-full items-center justify-between gap-2 text-left text-xs"><span className="truncate font-bold text-slate-700">{auction.county} County</span><span className="font-black text-emerald-800">{formatAuctionDate(auction.date)}</span></button>)}{upcomingAuctions.length === 0 && <p className="text-xs text-slate-500">No dated auctions in this view.</p>}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Saved searches</div><Bell className="h-4 w-4 text-emerald-800" /></div><div className="mt-3 flex items-end justify-between"><div className="text-2xl font-black">{savedSearches.length}<span className="ml-1 text-sm font-bold text-slate-400">/ {entitlements.savedSearchLimit}</span></div><button type="button" onClick={() => setView('alerts')} className="text-xs font-black text-emerald-800">Manage →</button></div></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Alert delivery</div><Bell className="h-4 w-4 text-emerald-800" /></div><div className="mt-3 text-sm font-black capitalize">{entitlements.alertFrequency === 'none' ? 'Upgrade to unlock alerts' : `${entitlements.alertFrequency} delivery enabled`}</div><p className="mt-1 text-xs text-slate-500">Official-source refresh timing can vary.</p></div></div>}

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
          ) : view === 'calendar' ? (
            <AuctionCalendar properties={filtered} onOpen={setSelectedProperty} />
          ) : view === 'trackers' ? (
            <TrackingBoard properties={currentProperties} trackers={trackers} onOpen={setSelectedProperty} onUpdate={async (propertyId, status) => { try { await updateTracker(propertyId, status) } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to update tracker', 'error') } }} />
          ) : view === 'alerts' ? (
            <SavedSearchesPanel searches={savedSearches} currentFilter={filter} tier={membership.tier} onSave={async (name, filters, frequency) => { try { await saveSearch(name, filters, frequency); showToast('Search saved', 'success') } catch (error) { throw error } }} onApply={(nextFilter) => { setFilter(nextFilter); setView('all') }} onRemove={async (id) => { try { await removeSearch(id); showToast('Saved search removed', 'info') } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to remove search', 'error') } }} />
          ) : view === 'learn' ? (
            <LearningCenter progress={lessonProgress} onSaveProgress={async (lessonId, completed, quizScore, notes) => { try { await saveLessonProgress(lessonId, completed, quizScore, notes); showToast('Learning progress saved', 'success') } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save progress', 'error') } }} />
          ) : view === 'pricing' ? (
            <PricingSection currentTier={membership.tier} onChoose={choosePlan} onManageBilling={membership.paidActive ? manageBilling : undefined} />
          ) : legacyView === 'table' ? (
            <PropertyTable properties={filtered} trackers={trackerByPropertyId} onOpen={setSelectedProperty} />
          ) : !propertiesLoading && filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="mb-5 inline-flex rounded-full bg-slate-100 p-5">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-950">No properties found</h3>
              <p className="mt-2 text-slate-500">Try widening your search or clearing a filter.</p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">Available properties</h2>
                  <p className="mt-1 text-sm text-slate-500">{filtered.length.toLocaleString()} matching properties · sorted by {filter.sortBy === 'auction-soonest' ? 'auction date' : 'your selection'}</p>
                </div>
                <p className="text-xs font-semibold text-slate-500">Showing 1–{visibleProperties.length.toLocaleString()} of {filtered.length.toLocaleString()}</p>
              </div>
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
                <div className="mt-8 flex flex-col items-center gap-3 border-t border-slate-200 pt-6">
                  <p className="text-xs font-semibold text-slate-500">Showing {visibleProperties.length.toLocaleString()} of {filtered.length.toLocaleString()} matching properties</p>
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + RESULT_PAGE_SIZE)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-emerald-800 hover:border-emerald-700"
                  >
                    <ChevronDown className="h-4 w-4" />Show more properties
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Data Sources */}
        <div className="mt-16 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="rounded-2xl border border-emerald-200 bg-white p-3">
              <DollarSign className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-slate-950">Official data sources</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
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
                    className="block rounded-xl border border-emerald-100 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                      {s.name}
                      <ArrowUpRight className="h-3 w-3 text-emerald-700" />
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-500">{s.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-slate-500">
            Tax Deed &amp; Lien Hunter — Auction research for educational purposes, not legal or financial advice.
            Verify every listing with the government auction source before investing.
          </p>
        </div>
      </footer>

      {overlays}
    </div>
  )
}
