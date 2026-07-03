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
  propertyType: 'Single Family' | 'Condo' | 'Townhouse' | 'Multi-Family' | 'Land' | 'Commercial';
  auctionDate?: string;
  auctionType: 'Foreclosure' | 'Tax Lien' | 'REO' | 'Courthouse' | 'Government' | 'Estate';
  source: string;
  sourceUrl: string;
  description: string;
  imageUrl: string;
  images: string[];
  status: 'Active' | 'Pending' | 'Sold' | 'Cancelled';
  daysOnMarket: number;
  rehabEstimate: number;
  arv: number; // After Repair Value
  notes: string;
  latitude: number;
  longitude: number;
  county: string;
  caseNumber?: string;
  openingBid?: number;
  depositRequired?: number;
}

export interface DealFilter {
  state: string;
  city: string;
  minPrice: number;
  maxPrice: number;
  propertyType: string;
  auctionType: string;
  minDiscount: number; // % below market
  maxRehab: number;
  keyword: string;
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