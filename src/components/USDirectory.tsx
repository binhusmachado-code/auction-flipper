import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Building2, CheckCircle2, Database, Landmark, MapPin, Search } from 'lucide-react'
import jurisdictionData from '../data/us_jurisdictions.json'
import { stateSaleGuides } from '../data/stateSaleGuides'
import type { Property } from '../types/property'

interface CountyRecord {
  name: string
  fips: string
  latitude: number
  longitude: number
}

interface StateRecord {
  name: string
  abbreviation: string
  fips: string
  latitude: number
  longitude: number
  counties: CountyRecord[]
}

interface Props {
  properties: Property[]
  onOpenListings: (state: string, county: string) => void
}

const data = jurisdictionData as {
  source: { name: string; url: string; retrievedAt: string }
  states: StateRecord[]
}

const officialAuctionSources: Record<string, string> = {
  'FL|Bay County': 'https://records2.baycoclerk.com/TaxDeed/',
  'FL|Brevard County': 'https://www.brevardclerk.us/tax-deed-sales',
  'FL|Broward County': 'https://www.broward.org/RecordsTaxesTreasury/taxcollector/Pages/TaxDeeds.aspx',
  'FL|Clay County': 'https://landmark.clayclerk.com/TaxDeed/',
  'FL|Collier County': 'https://notices.collierclerk.com/genre/tax-deeds/',
  'FL|Duval County': 'https://taxdeed.duvalclerk.com/',
  'FL|Gulf County': 'https://www.gulfclerk.com/courts/tax-deeds/',
  'FL|Palm Beach County': 'https://taxdeed.mypalmbeachclerk.com/',
  'FL|Suwannee County': 'https://www.suwgov.org/tax-deed-sales/',
}

const federalAuctionSources = [
  {
    name: 'U.S. Treasury Auctions',
    url: 'https://home.treasury.gov/services/treasury-auctions/',
    description: 'Official starting point for IRS and Treasury forfeited-property auctions.',
  },
  {
    name: 'IRS Auctions',
    url: 'https://www.irsauctions.gov/',
    description: 'Official notices for property seized for unpaid federal taxes. Read each notice and payment terms.',
  },
  {
    name: 'USAGov Real Estate Sales',
    url: 'https://www.usa.gov/real-estate-sales',
    description: 'Official directory for Treasury, GSA, HUD, USDA, FDIC, U.S. Marshals, and federal land sources.',
  },
]

function countySearchUrl(county: CountyRecord, state: StateRecord) {
  const query = `${county.name} ${state.name} official tax sale tax deed tax lien auction`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

function stateRulesSearchUrl(state: StateRecord) {
  const query = `site:.gov ${state.name} official delinquent property tax sale rules`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

function cleanCountyName(name: string) {
  return name.replace(/ County$| Parish$| Borough$| Census Area$| Municipality$| city and borough$/i, '')
}

export default function USDirectory({ properties, onOpenListings }: Props) {
  const [query, setQuery] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const coverage = useMemo(() => {
    const result = new Map<string, number>()
    properties.forEach((property) => {
      const key = `${property.state}|${property.county}`
      result.set(key, (result.get(key) ?? 0) + 1)
    })
    return result
  }, [properties])

  const selected = data.states.find((state) => state.abbreviation === selectedState) ?? null
  const normalizedQuery = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return []
    const matches: Array<{ state: StateRecord; county: CountyRecord }> = []
    for (const state of data.states) {
      for (const county of state.counties) {
        if (`${county.name} ${state.name} ${state.abbreviation}`.toLowerCase().includes(normalizedQuery)) {
          matches.push({ state, county })
          if (matches.length === 150) return matches
        }
      }
    }
    return matches
  }, [normalizedQuery])

  const visibleCounties = selected?.counties ?? []
  const liveStates = new Set(properties.map((property) => property.state)).size

  const countyRow = (state: StateRecord, county: CountyRecord) => {
    const normalizedCounty = cleanCountyName(county.name)
    const listingCount = coverage.get(`${state.abbreviation}|${normalizedCounty}`) ?? 0
    const officialUrl = officialAuctionSources[`${state.abbreviation}|${county.name}`]

    return (
      <div key={county.fips} className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/45 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-zinc-100">{county.name}</h3>
            <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${listingCount > 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-zinc-700 bg-zinc-950 text-zinc-500'}`}>
              {listingCount > 0 ? `${listingCount.toLocaleString()} live records` : 'Source research'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="h-3.5 w-3.5" />
            {state.name} · FIPS {county.fips}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {listingCount > 0 && (
            <button type="button" onClick={() => onOpenListings(state.abbreviation, normalizedCounty)} className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-500 px-3 text-xs font-bold text-zinc-950 hover:bg-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Open listings
            </button>
          )}
          <a href={officialUrl ?? countySearchUrl(county, state)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-xs font-bold text-zinc-300 hover:border-zinc-600 hover:text-white">
            {officialUrl ? 'Official auction' : 'Find official sale'}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <a href={`https://explorer.naco.org/?county_info=${county.fips}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-800 px-3 text-xs font-bold text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300">
            County profile
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <section className="animate-fade-in" aria-labelledby="us-directory-title">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Building2 className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">National research directory</span>
          </div>
          <h2 id="us-directory-title" className="mt-2 text-2xl font-extrabold text-white">Nationwide tax-sale research</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
            All 50 states, the District of Columbia, and 3,144 county equivalents are included. Every county has an official-source search; green rows are the {liveStates} state{liveStates === 1 ? '' : 's'} with live records currently loaded.
          </p>
        </div>
        <a href={data.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300">
          <Database className="h-4 w-4" />
          Census 2025 geography
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <section className="border-b border-zinc-800 py-6" aria-labelledby="federal-auctions-title">
        <div className="flex items-start gap-3">
          <Landmark className="mt-0.5 h-5 w-5 flex-none text-sky-400" />
          <div>
            <h3 id="federal-auctions-title" className="font-black text-white">Federal and seized-property sources</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500">These are separate from county tax deed and tax lien sales. Verify the specific notice, inspection rules, deposit, encumbrances, payment deadline, and deed before bidding.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {federalAuctionSources.map((source) => (
            <a key={source.name} href={source.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4 hover:border-sky-500/35 hover:bg-zinc-900">
              <div className="flex items-center justify-between gap-2 text-sm font-bold text-zinc-100"><span>{source.name}</span><ArrowUpRight className="h-3.5 w-3.5 flex-none text-zinc-600" /></div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{source.description}</p>
            </a>
          ))}
        </div>
      </section>

      <div className="my-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
        <label className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-600" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search any county, parish, borough, or state" className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-sm text-white outline-none focus:border-emerald-500" />
        </label>
        <select value={selectedState} onChange={(event) => { setSelectedState(event.target.value); setQuery('') }} className="h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-300 outline-none focus:border-emerald-500" aria-label="Select a state">
          <option value="">All states</option>
          {data.states.map((state) => <option key={state.fips} value={state.abbreviation}>{state.name} ({state.counties.length})</option>)}
        </select>
      </div>

      {normalizedQuery ? (
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">{searchResults.length === 150 ? 'First 150 matches' : `${searchResults.length} matches`}</div>
          <div className="grid gap-2">{searchResults.map(({ state, county }) => countyRow(state, county))}</div>
        </div>
      ) : selected ? (
        <div>
          <button type="button" onClick={() => setSelectedState('')} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-white"><ArrowLeft className="h-4 w-4" />All states</button>
          <div className="mb-5 flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-end">
            <div>
              <h3 className="text-xl font-extrabold text-white">{selected.name}</h3>
              <p className="mt-1 text-sm font-semibold text-emerald-400">{stateSaleGuides[selected.abbreviation].salePaths}</p>
              <p className="mt-1 text-xs text-zinc-500">{visibleCounties.length.toLocaleString()} county equivalents. This is a research starting point; verify the current sale instrument and rules with the selling authority.</p>
            </div>
            <a href={stateRulesSearchUrl(selected)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 flex-none items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-xs font-bold text-zinc-300 hover:border-zinc-600 hover:text-white">
              Find state rules
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="grid gap-2">{visibleCounties.map((county) => countyRow(selected, county))}</div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.states.map((state) => {
            const stateListings = properties.filter((property) => property.state === state.abbreviation).length
            return (
              <button key={state.fips} type="button" onClick={() => setSelectedState(state.abbreviation)} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/45 p-4 text-left hover:border-emerald-500/35 hover:bg-zinc-900">
                <div className="min-w-0">
                  <div className="font-bold text-zinc-100">{state.name}</div>
                  <div className="mt-1 text-xs leading-relaxed text-zinc-500">{stateSaleGuides[state.abbreviation].salePaths}</div>
                  <div className="mt-2 text-[10px] font-bold uppercase text-zinc-600">{state.counties.length} county equivalents</div>
                </div>
                <div className="text-right"><div className="text-xs font-extrabold text-emerald-400">{state.abbreviation}</div>{stateListings > 0 && <div className="mt-1 text-[10px] font-bold text-zinc-500">{stateListings.toLocaleString()} live</div>}</div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
