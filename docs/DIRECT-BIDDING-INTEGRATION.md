# Direct Bidding and Winning-Bid Payments

## Current customer journey

The Bid Center provides one guided workspace for:

1. Official auction rules
2. Bidder registration
3. Property and title due diligence
4. A hard maximum-bid limit
5. Deposit readiness
6. The official auction result
7. Winning-bid deadline and payment confirmation

Progress is saved per customer and property. The official county or its auction vendor remains the bid and payment system of record.

## Why direct submission is locked

Tax sales are conducted by a county, clerk, treasurer, sheriff, or an authorized auction vendor. Registration, identity checks, tax forms, bidder deposits, bid transmission, receipts, and final payment rules vary by jurisdiction. The website cannot legally or reliably impersonate a bidder, collect county credentials, or accept property funds without written authorization and supported transaction interfaces.

Stripe is for the $89 monthly or $550 yearly website membership only. Do not use the membership Stripe account to hold bidder deposits, winning-bid funds, escrow, or county payments without Stripe's written approval and appropriate legal/payment structure.

## Authorized direct-bid release requirements

- A signed agreement with each auction vendor or county
- A documented API or approved embedded component for registration, deposits, bids, results, and receipts
- OAuth or delegated authorization; never store a customer's county auction password
- County-specific rule records with effective dates and official source links
- Two-step bid confirmation showing parcel, current bid, maximum bid, fees, deposit effect, and deadline
- Idempotency keys so a retry cannot place a duplicate bid or payment
- Immutable audit events containing the vendor response and official confirmation ID
- Real-time cancellation, redemption, postponement, and auction-close updates
- A regulated payment partner approved for the exact funds flow, or direct payment from the customer to the county
- Legal review, errors-and-omissions coverage, incident response, and customer support procedures

## Nationwide architecture

Build one adapter per official auction vendor, then configure it county by county. A county can be in one of three modes:

- `research_only`: listings and official links
- `guided_handoff`: the full Bid Center with official auction completion
- `connected`: authorized in-site bid and payment status APIs

The interface must never label a bid as submitted or a payment as processed until the official vendor returns a durable confirmation.

## First partnership target

Broward moved to the official RealAuction tax deed site in 2026, and Brevard also uses RealAuction. A supported RealAuction partnership could cover multiple counties, but access and authorization still need to be confirmed with RealAuction and each participating county before enabling direct bid transmission.

RealAuction customer service is listed by participating counties at `customerservice@realauction.com` and `(877) 361-7325`. The partnership request should ask specifically for an authorized bidder-registration, deposit, bid-submission, result, receipt, and payment-status API or embeddable component. Do not ask for or build against a customer's auction password.
