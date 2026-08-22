export interface TaxDeedScenario {
  plannedBid: number
  buyerPremiumRate: number
  otherCosts: number
  repairs: number
  holdingMonths: number
  monthlyHolding: number
  resaleValue: number
  resaleSource: string
  sellingCostRate: number
  targetProfit: number
}

export interface TaxDeedAnalysis {
  complete: boolean
  acquisitionCost: number
  holdingCosts: number
  nonBidCosts: number
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

export function analyzeTaxDeedScenario(input: TaxDeedScenario): TaxDeedAnalysis {
  const premiumRate = Math.max(0, input.buyerPremiumRate) / 100
  const sellingRate = Math.min(100, Math.max(0, input.sellingCostRate)) / 100
  const acquisitionCost = Math.max(0, input.plannedBid) * (1 + premiumRate)
  const holdingCosts = Math.max(0, input.holdingMonths) * Math.max(0, input.monthlyHolding)
  const nonBidCosts = [input.otherCosts, input.repairs, holdingCosts]
    .reduce((sum, value) => sum + Math.max(0, value), 0)
  const sellingCosts = Math.max(0, input.resaleValue) * sellingRate
  const netSaleProceeds = Math.max(0, input.resaleValue) - sellingCosts
  const totalProjectCost = acquisitionCost + nonBidCosts
  const complete = input.resaleValue > 0
  const projectedProfit = complete ? netSaleProceeds - totalProjectCost : null
  const maximumBid = complete
    ? Math.max(0, (netSaleProceeds - nonBidCosts - Math.max(0, input.targetProfit)) / (1 + premiumRate))
    : null
  const breakEvenResale = sellingRate < 1
    ? totalProjectCost / (1 - sellingRate)
    : Number.POSITIVE_INFINITY
  const marginOfSafety = complete && maximumBid !== null && maximumBid > 0
    ? (maximumBid - Math.max(0, input.plannedBid)) / maximumBid * 100
    : null

  const warnings: string[] = []
  if (input.resaleValue <= 0) warnings.push('Enter a supported resale value before relying on profit or maximum bid.')
  if (input.resaleSource.trim().length < 3) warnings.push('Record the source for the resale value, such as recent comparable sales or an appraisal.')
  if (input.otherCosts <= 0) warnings.push('Other costs are zero. Include title, legal, liens, auction fees, closing costs, and a safety cushion.')
  if (input.repairs <= 0) warnings.push('Repairs are zero. Confirm the property condition without trespassing.')
  if (input.plannedBid <= 0) warnings.push('Enter the amount you might actually bid, not only the opening bid.')
  if (complete && maximumBid !== null && input.plannedBid > maximumBid) warnings.push('Planned bid is above the maximum bid for the target profit.')

  return {
    complete,
    acquisitionCost,
    holdingCosts,
    nonBidCosts,
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
