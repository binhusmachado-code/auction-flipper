export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  estimatedValue: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType: 'Single Family' | 'Condo' | 'Townhouse' | 'Multi-Family' | 'Land' | 'Commercial' | 'Unknown';
  auctionDate?: string;
  auctionType: 'Tax Lien' | 'Tax Deed' | 'Foreclosure' | 'REO' | 'Courthouse' | 'Government' | 'Estate';
  source: string;
  sourceUrl: string;
  description: string;
  imageUrl: string;
  images: string[];
  status: 'Active' | 'Pending' | 'Sold' | 'Cancelled' | 'Removed';
  daysOnMarket: number;
  rehabEstimate: number;
  arv: number;
  notes: string;
  latitude: number;
  longitude: number;
  county: string;
  caseNumber?: string;
  openingBid?: number;
  depositRequired?: number;
  // Tax Lien / Deed specific fields
  parcelId?: string;
  taxAmount: number;
  interestRate: number;
  redemptionPeriod: number;
  saleType?: 'Tax Lien' | 'Tax Deed';
  assessedValue: number;
  delinquentYears: number;
  ownerName?: string;
  valuationVerified?: boolean;
  waterDebtOnly?: string;
  borough?: string;
  block?: string;
  lotNumber?: string;
  buildingClass?: string;
  communityBoard?: string;
}

export interface DealFilter {
  state: string;
  county: string;
  city: string;
  minPrice: number;
  maxPrice: number;
  propertyType: string;
  saleType: string;
  auctionType: string;
  minInterestRate: number;
  maxRedemptionPeriod: number;
  keyword: string;
  profitOnly: boolean;
  sortBy: 'auction-soonest' | 'price-low' | 'price-high' | 'assessed-high' | 'deal';
}

export interface FlipAnalysis {
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  closingCosts: number;
  holdingCosts: number;
  sellingCosts: number;
  profit: number;
  roi: number;
  cashOnCash: number;
}

// State-by-state tax sale info
export interface StateTaxSaleInfo {
  state: string;
  type: 'Tax Lien' | 'Tax Deed' | 'Hybrid';
  interestRate: string;
  redemptionPeriod: string;
  notes: string;
  countiesWithData: string[];
}

export const STATE_TAX_SALE_DATA: StateTaxSaleInfo[] = [
  { state: 'Alabama', type: 'Tax Lien', interestRate: '12%', redemptionPeriod: '3 years', notes: 'AL has both lien and deed sales by county', countiesWithData: [] },
  { state: 'Arizona', type: 'Tax Lien', interestRate: '16%', redemptionPeriod: '3 years', notes: 'One of the highest interest rates', countiesWithData: [] },
  { state: 'California', type: 'Hybrid', interestRate: 'Varies', redemptionPeriod: '5 years', notes: 'Deed states with some lien sales', countiesWithData: [] },
  { state: 'Colorado', type: 'Tax Lien', interestRate: '9% + 3% penalty', redemptionPeriod: '3 years', notes: 'Sold via public auction', countiesWithData: [] },
  { state: 'Florida', type: 'Tax Deed', interestRate: '18% max', redemptionPeriod: 'N/A', notes: 'Most active tax deed state. High volume.', countiesWithData: ['Bay', 'Brevard', 'Broward', 'Clay', 'Collier', 'Duval', 'Gulf', 'Palm Beach', 'Suwannee'] },
  { state: 'Georgia', type: 'Hybrid', interestRate: '20% / $0.50 per $1', redemptionPeriod: '1 year', notes: 'One-year redemption, then deed', countiesWithData: [] },
  { state: 'Illinois', type: 'Tax Lien', interestRate: '18% / 1.5% per month', redemptionPeriod: '2-3 years', notes: 'Cook County has huge volume', countiesWithData: ['Cook'] },
  { state: 'Indiana', type: 'Tax Lien', interestRate: '10-15%', redemptionPeriod: '1 year', notes: 'Short redemption period', countiesWithData: [] },
  { state: 'Iowa', type: 'Tax Lien', interestRate: '2% per month', redemptionPeriod: '1.75-2 years', notes: 'Sold at county treasurers sale', countiesWithData: [] },
  { state: 'Kentucky', type: 'Tax Lien', interestRate: '12%', redemptionPeriod: '1 year', notes: 'Annual tax sales', countiesWithData: [] },
  { state: 'Louisiana', type: 'Hybrid', interestRate: '12% + 5% penalty', redemptionPeriod: '3 years', notes: 'Some parishes are deed, some lien', countiesWithData: [] },
  { state: 'Maryland', type: 'Tax Lien', interestRate: '6-24%', redemptionPeriod: '2 years', notes: 'Baltimore City very active', countiesWithData: ['Baltimore City'] },
  { state: 'Massachusetts', type: 'Tax Lien', interestRate: '16%', redemptionPeriod: '6 months - 2 years', notes: 'Short redemption in some towns', countiesWithData: [] },
  { state: 'Michigan', type: 'Tax Deed', interestRate: 'N/A', redemptionPeriod: '1 year', notes: 'One-year redemption, then deed', countiesWithData: [] },
  { state: 'Mississippi', type: 'Tax Lien', interestRate: '1% per month', redemptionPeriod: '2 years', notes: 'Sold by chancery clerk', countiesWithData: [] },
  { state: 'Missouri', type: 'Tax Lien', interestRate: '10%', redemptionPeriod: '1-3 years', notes: 'Varies by county', countiesWithData: [] },
  { state: 'Nebraska', type: 'Tax Lien', interestRate: '14%', redemptionPeriod: '3 years', notes: 'Sold at county treasurer sale', countiesWithData: [] },
  { state: 'Nevada', type: 'Tax Lien', interestRate: 'Up to 12%', redemptionPeriod: '2 years', notes: 'Sold at county treasurer sale', countiesWithData: [] },
  { state: 'New Jersey', type: 'Tax Lien', interestRate: '18% max', redemptionPeriod: '2 years', notes: 'Very competitive market', countiesWithData: [] },
  { state: 'New York', type: 'Tax Lien', interestRate: '18%', redemptionPeriod: '2 years', notes: 'NYC has annual lien sales. Huge volume.', countiesWithData: ['New York City (All 5 Boroughs)'] },
  { state: 'Ohio', type: 'Hybrid', interestRate: '18%', redemptionPeriod: '1 year', notes: 'County treasurer sales', countiesWithData: [] },
  { state: 'Oklahoma', type: 'Tax Lien', interestRate: '8%', redemptionPeriod: '2 years', notes: 'County sheriff sales', countiesWithData: [] },
  { state: 'Pennsylvania', type: 'Hybrid', interestRate: '10% max', redemptionPeriod: '1-2 years', notes: 'Some counties use upset sales', countiesWithData: ['Allegheny'] },
  { state: 'South Carolina', type: 'Tax Lien', interestRate: '3% + 8-12%', redemptionPeriod: '1 year', notes: 'Penalty-based system', countiesWithData: [] },
  { state: 'South Dakota', type: 'Tax Lien', interestRate: '12%', redemptionPeriod: '3 years', notes: 'County treasurer sales', countiesWithData: [] },
  { state: 'Tennessee', type: 'Hybrid', interestRate: '10%', redemptionPeriod: '1 year', notes: 'Some counties are deed, some lien', countiesWithData: [] },
  { state: 'Texas', type: 'Tax Deed', interestRate: 'N/A', redemptionPeriod: '6 months - 2 years', notes: 'Most active tax deed state. Very competitive.', countiesWithData: ['Harris', 'Dallas', 'Travis', 'Bexar', 'Tarrant'] },
  { state: 'West Virginia', type: 'Tax Lien', interestRate: '12%', redemptionPeriod: '2 years', notes: 'County sheriff sales', countiesWithData: [] },
  { state: 'Wyoming', type: 'Tax Lien', interestRate: '15%', redemptionPeriod: '4 years', notes: 'County treasurer sales', countiesWithData: [] },
];
