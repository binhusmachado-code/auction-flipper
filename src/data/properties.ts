import { Property } from '../types/property'
import LIVE_PROPERTIES from './live_properties.json'

export const SAMPLE_PROPERTIES: Property[] = LIVE_PROPERTIES as Property[]

export const STATES = Array.from(new Set(SAMPLE_PROPERTIES.map(p => p.state))).sort()
export const CITIES = Array.from(new Set(SAMPLE_PROPERTIES.map(p => p.city))).sort()
export const AUCTION_TYPES = ['Foreclosure', 'Tax Lien', 'REO', 'Courthouse', 'Government', 'Estate']
export const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Commercial']
