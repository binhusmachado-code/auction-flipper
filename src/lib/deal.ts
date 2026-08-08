import type { Property } from '../types/property'

/**
 * Best estimate of what the property is really worth once fixed up.
 * Falls back through the value fields the different scrapers provide.
 */
export function marketValue(p: Property): number {
  return p.arv || p.estimatedValue || p.assessedValue || 0
}

/** All-in cost to buy and make the property sellable. */
export function totalCost(p: Property): number {
  return (p.price || 0) + (p.rehabEstimate || 0)
}

/** Expected profit if bought, fixed, and sold near market value. */
export function dealProfit(p: Property): number {
  const value = marketValue(p)
  if (!value) return 0
  return value - totalCost(p)
}

/** Return on the money you put in, as a percentage. */
export function dealRoi(p: Property): number {
  const cost = totalCost(p)
  if (!cost) return 0
  return (dealProfit(p) / cost) * 100
}

/** A deal only shows up when the numbers say you can actually make money. */
export function isProfitable(p: Property): boolean {
  return dealProfit(p) > 0
}

/** Simple 1-5 score so kids can spot the best deals at a glance. */
export function dealScore(p: Property): number {
  const roi = dealRoi(p)
  if (roi >= 80) return 5
  if (roi >= 50) return 4
  if (roi >= 30) return 3
  if (roi >= 15) return 2
  if (roi > 0) return 1
  return 0
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}
