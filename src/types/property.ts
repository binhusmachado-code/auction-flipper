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
  analysisStatus: '' | 'complete' | 'needs-work' | 'not-started';
  dealGrade: '' | 'Great' | 'Good' | 'Bad';
  verifiedValueOnly: boolean;
  mappedOnly: boolean;
  auctionDateKnownOnly: boolean;
  sortBy: 'auction-soonest' | 'price-low' | 'price-high' | 'assessed-high' | 'screening-spread' | 'deal' | 'rank';
}
