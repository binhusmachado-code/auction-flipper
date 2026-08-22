export interface TaxDeedScenario {
  plannedBid: number
  buyerPremiumRate: number
  auctionFees: number
  closingCosts: number
  titleAndLienCosts: number
  repairs: number
  contingency: number
  holdingMonths: number
  monthlyHolding: number
  resaleValue: number
  resaleSource: string
  sellingCostRate: number
  targetProfit: number
  valueChecked: boolean
  conditionChecked: boolean
  titleChecked: boolean
  feesChecked: boolean
}

export interface TaxDeedAnalysis {
  complete: boolean
  buyerPremium: number
  auctionFees: number
  closingCosts: number
  titleAndLienCosts: number
  repairs: number
  contingency: number
  acquisitionCost: number
  holdingCosts: number
  nonBidCosts: number
  fixedCosts: number
  sellingCosts: number
  netSaleProceeds: number
  totalProjectCost: number
  projectedProfit: number | null
  maximumBid: number | null
  breakEvenResale: number
  cashNeeded: number
  marginOfSafety: number | null
  warnings: string[]
}

function nonNegativeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

export function analyzeTaxDeedScenario(input: TaxDeedScenario): TaxDeedAnalysis {
  const premiumRate = nonNegativeNumber(input.buyerPremiumRate) / 100
  const sellingRate = Math.min(100, nonNegativeNumber(input.sellingCostRate)) / 100
  const plannedBid = nonNegativeNumber(input.plannedBid)
  const resaleValue = nonNegativeNumber(input.resaleValue)
  const resaleSource = typeof input.resaleSource === 'string' ? input.resaleSource.trim() : ''
  const targetProfit = nonNegativeNumber(input.targetProfit)
  const buyerPremium = plannedBid * premiumRate
  const auctionFees = nonNegativeNumber(input.auctionFees)
  const closingCosts = nonNegativeNumber(input.closingCosts)
  const titleAndLienCosts = nonNegativeNumber(input.titleAndLienCosts)
  const repairs = nonNegativeNumber(input.repairs)
  const contingency = nonNegativeNumber(input.contingency)
  const acquisitionCost = plannedBid + buyerPremium + auctionFees
  const holdingCosts = nonNegativeNumber(input.holdingMonths) * nonNegativeNumber(input.monthlyHolding)
  const nonBidCosts = closingCosts + titleAndLienCosts + repairs + contingency + holdingCosts
  const fixedCosts = auctionFees + nonBidCosts
  const sellingCosts = resaleValue * sellingRate
  const netSaleProceeds = resaleValue - sellingCosts
  const totalProjectCost = acquisitionCost + nonBidCosts
  const complete = (
    resaleValue > 0 &&
    resaleSource.length >= 3 &&
    targetProfit > 0 &&
    plannedBid > 0 &&
    input.valueChecked === true &&
    input.conditionChecked === true &&
    input.titleChecked === true &&
    input.feesChecked === true
  )
  const projectedProfit = complete ? netSaleProceeds - totalProjectCost : null
  const maximumBid = complete
    ? Math.max(0, (netSaleProceeds - fixedCosts - targetProfit) / (1 + premiumRate))
    : null
  const breakEvenResale = sellingRate < 1
    ? totalProjectCost / (1 - sellingRate)
    : Number.POSITIVE_INFINITY
  const marginOfSafety = complete && maximumBid !== null && maximumBid > 0
    ? (maximumBid - plannedBid) / maximumBid * 100
    : null

  const warnings: string[] = []
  if (resaleValue <= 0) warnings.push('Enter a supported resale value before relying on profit or maximum bid.')
  if (resaleSource.length < 3) warnings.push('Record the resale value source, such as recent sold properties or an appraisal.')
  if (input.valueChecked !== true) warnings.push('Confirm the resale value and keep its source.')
  if (input.conditionChecked !== true) warnings.push('Confirm the property condition and repair estimate without trespassing.')
  if (input.titleChecked !== true) warnings.push('Research the title and liens that could survive the sale.')
  if (input.feesChecked !== true) warnings.push('Check auction fees, payment rules, closing costs, and required deposits.')
  if (targetProfit <= 0) warnings.push('Enter the minimum profit you want to keep.')
  if (plannedBid <= 0) warnings.push('Enter the amount you might actually bid, not only the opening bid.')
  if (complete && maximumBid !== null && plannedBid > maximumBid) warnings.push('Planned bid is above the maximum bid for the target profit.')

  return {
    complete,
    buyerPremium,
    auctionFees,
    closingCosts,
    titleAndLienCosts,
    repairs,
    contingency,
    acquisitionCost,
    holdingCosts,
    nonBidCosts,
    fixedCosts,
    sellingCosts,
    netSaleProceeds,
    totalProjectCost,
    projectedProfit,
    maximumBid,
    breakEvenResale,
    cashNeeded: totalProjectCost,
    marginOfSafety,
    warnings,
  }
}
