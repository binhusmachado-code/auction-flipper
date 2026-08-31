# Auction Flipper Paid Membership Product Plan

## Product Decision

Build Auction Flipper as a nationwide paid research and education service for first-time tax-sale buyers. The product scope is all 50 states plus Washington, D.C., including tax certificates, tax liens, tax deeds, redeemable deeds, foreclosure-style tax sales, and officially published unsold inventory. It should help a member find an auction, understand exactly what is being sold, complete jurisdiction-specific due diligence, and calculate a conservative maximum bid or certificate rate. It should never imply that assessed value is market value, guarantee title, guarantee profit, or place a bid for the member.

The existing public GitHub Pages site can remain a preview and county calendar. Paid property data, saved work, calculations, and learning progress must move behind authenticated database access. GitHub Pages is static hosting, so hiding a page in the React interface is not a real paywall when the data is bundled into downloadable JSON.

## Current Starting Point

- 172 future official tax-deed records are prepared from four counties.
- Brevard: 70 properties for September 17, 2026 and 65 for October 22, 2026.
- Suwannee: 21 properties for September 3, 2026.
- Broward: 15 properties for October 26, 2026.
- Gulf: 1 property for September 2, 2026.
- All 15 Broward records have official property-appraiser photos.
- The other records use exact parcel maps when an official property photo is unavailable.
- County, sale type, opening-bid range, property type, auction type, search, and sorting controls are implemented locally.
- Generated demo properties have been removed from the production fallback so customers are not shown invented listings.

This is a good Florida data prototype, but it is not nationwide coverage and is not ready to charge customers until access control, billing, data monitoring, the analysis model, onboarding, policies, support operations, and transparent national coverage reporting are complete.

## Recommended Offer

### Public Preview

- Upcoming nationwide auction calendar with state and sale-type filters.
- State and supported-jurisdiction coverage and freshness page.
- Three clearly labeled preview properties.
- A beginner explanation of tax deeds versus tax liens.
- Pricing, terms, privacy, refund policy, and sign-in.

### Paid Membership

Launch with one plan to keep the decision simple:

- Standard price: $89 per month or $550 per year.
- The annual plan saves $518 compared with twelve monthly payments.
- Private beta: 10 to 20 invited users free in exchange for structured feedback.
- Do not publish a separate founding discount at launch; keep the two customer choices consistent.
- Do not charge the full standard price until the calculator, alerts, freshness monitoring, and advertised county coverage are working.
- Do not create Basic, Pro, Team, API, or coaching tiers at launch.

Comparable products currently advertise roughly $49 to $79 per month. At $89 monthly, Auction Flipper is a premium-priced service and must earn that position through simplicity, education, transparent sources, reliable alerts, support, and conservative analysis instead of promising the highest score or the biggest profit.

## Membership And Billing

Use Supabase Auth and Postgres with Stripe Billing.

### Customer Flow

1. Visitor sees the public calendar and product preview.
2. Visitor creates an account with email/password or a magic link.
3. The app sends the customer to Stripe-hosted Checkout for a subscription.
4. A signed Stripe webhook records the customer and subscription in Supabase.
5. Database access is granted only when the subscription is in an allowed state.
6. The customer can update payment details, view invoices, or cancel through Stripe's Customer Portal.
7. Webhooks revoke or limit access after cancellation, nonpayment, or expiration according to the written policy.

### Security Rules

- Never place Stripe secret keys in the browser or repository.
- Verify every Stripe webhook signature before changing access.
- Do not rely on the Checkout success page alone to grant access.
- Enable Row Level Security on every exposed Supabase table.
- Members may read paid listing data only through an active membership policy.
- A member may read and edit only their own saves, notes, scenarios, alerts, and learning progress.
- Admin actions require a separate server-side role.
- Keep the public preview in a separate limited view or API response.
- Stop shipping the full property dataset inside the JavaScript bundle or a public JSON file.

## Beginner Experience

Use both an interactive guided path and short videos. The interactive path should be primary because a long video is easy to skip and hard to remember.

### First Login

Ask only four useful questions:

- Have you purchased real estate before?
- What is your maximum available cash?
- Which states and local jurisdictions interest you?
- Is your likely strategy resale, rental, land, or learning only?

Use the answers to set default locations, budget filters, explanation level, sale type, and checklist. Do not use them to claim that a property is suitable for the customer.

### Guided Start

1. A two-minute welcome explains what the site does and does not do.
2. A five-step tour points to auction dates, filters, property sources, the risk checklist, and the calculator.
3. A practice property teaches the process without using a live auction.
4. The member completes one guided analysis and sees why opening bid is not the expected purchase price.
5. The member saves a state, jurisdiction, and auction alert.
6. Before opening a live bidding site for the first time, the member acknowledges the buyer-beware warning.

### Learning Center

Create six short lessons, each with captions, transcript, glossary links, and a three-question knowledge check:

1. Tax deed versus tax lien.
2. How tax certificates, liens, deeds, redeemable deeds, and tax foreclosures differ by state.
3. Reading the official auction record and parcel record.
4. Title, governmental liens, occupancy, access, zoning, flood, and condition risks.
5. Calculating total cost and a maximum bid.
6. Auction day, payment deadlines, deed issuance, title work, and exit planning.

Keep each video between three and six minutes. Also provide the same content as a written checklist so the product remains usable without sound.

## Property Workspace

Each property page should answer five questions in order:

1. What exactly is being auctioned?
2. When and where is the official auction?
3. What is known from official records?
4. What is unknown or risky?
5. What is my maximum bid under conservative assumptions?

### Required Sections

- Official status, auction date, state, responsible jurisdiction, sale instrument, case number, parcel ID, opening bid or certificate amount, and source links.
- Property photo when legitimately available; otherwise an exact parcel map.
- Appraiser facts such as land use, assessed value, building area, year built, and lot size, each labeled by source and verification time.
- Auction change history, including cancellations, redemptions, reschedules, and opening-bid changes.
- Due-diligence checklist with Not started, In progress, Verified, Concern, and Not applicable states.
- Member notes and document links.
- Save, compare, export, and alert controls.
- A visible last-verified timestamp and stale-data warning.

### Risk Checklist

- Parcel ID, legal description, and mapped location agree.
- Legal road access and physical access are confirmed.
- Property type and buildability are confirmed.
- Flood, wetland, environmental, and zoning checks are complete.
- Occupancy and exterior condition have been investigated without trespassing.
- Title search and potentially surviving liens have been reviewed.
- Code enforcement, utility, special assessment, and association issues have been investigated.
- Current auction status has been rechecked directly with the responsible government office or its authorized platform.
- Funds, deposit, payment deadline, recording fees, and post-sale process are understood.
- Exit strategy and title-insurability plan have been reviewed with the appropriate professional.

Unknown information should reduce confidence. It must never be silently treated as zero risk or zero cost.

## Conservative Analysis And Calculator

The calculator should be a scenario tool, not a prediction engine. Every number must show whether it came from an official source, a third-party source, a member entry, or an assumption.

### Inputs

- Planned winning bid, separate from the opening bid.
- Buyer premium, if any.
- Documentary stamps, recording, wire, and auction fees.
- Title search, attorney, quiet-title, or title-curative allowance.
- Known liens, code issues, utilities, association items, and a risk reserve.
- Repairs, cleanout, security, and immediate stabilization.
- Holding period and monthly insurance, taxes, financing, utilities, lawn, and maintenance.
- Expected resale value or rental value with source and confidence.
- Selling commission, seller closing percentage, and fixed exit costs.
- Target profit and target return.

### Outputs

- Cash needed immediately after the auction.
- Total project cost.
- Break-even resale price.
- Maximum bid for the member's target profit.
- Conservative, base, and optimistic profit scenarios.
- Margin of safety and return on cash.
- Missing-information warnings and hard-stop risks.

### Core Math

```text
net sale proceeds = resale value - selling costs - fixed exit costs

total project cost = winning bid + auction/acquisition fees + title/legal costs
                   + known obligations + risk reserve + repairs + holding costs

estimated profit = net sale proceeds - total project cost

maximum bid = (net sale proceeds - all non-bid costs - target profit)
              / (1 + buyer-premium rate)
```

The deposit is part of the winning bid, not an extra project cost. Deposit and payment rules must come from the current law and operating instructions for the specific sale. Florida's statutory high-bidder deposit is generally $200 or 5% of the final bid, whichever is greater, but that rule must not be shown for another state.

### Accuracy Standard

- Never use assessed value as market value.
- Do not show estimated profit until the user supplies or confirms a defensible resale value and required costs.
- Separate financial opportunity from risk. A low bid does not cancel a title, access, flood, occupancy, or buildability problem.
- Show ranges when costs are uncertain.
- Keep a calculation audit trail with the input, source, user, and timestamp.
- Label the result Estimate, not Appraisal, Recommendation, or Guaranteed Profit.

## Auction Data System

Create one normalized adapter per responsible government jurisdiction or authorized auction platform with these responsibilities:

- Discover future sales.
- Fetch every active case.
- Parse auction date, case, parcel, opening bid, and status.
- Enrich from the official property appraiser/GIS where permitted.
- Preserve the official source URL and raw source hash.
- Detect added, changed, cancelled, redeemed, sold, and rescheduled records.
- Reject impossible dates, duplicate IDs, empty identifiers, and unexplained count collapses.

### Update Schedule

- Discover state and local auction calendars daily.
- Refresh future property lists at least every six hours.
- Refresh auctions inside the next 72 hours every hour.
- Run a final status refresh shortly before the sale.
- Keep the last successful snapshot if a source is temporarily unavailable, but mark it Cached or Stale rather than Verified.
- Alert the operator when a source fails, the record count unexpectedly drops, a legal-rule record expires, or freshness exceeds the service target.

### Coverage Standard

- Publish a national coverage page for all 50 states and Washington, D.C. Each state must show Live parcels, Auction events only, Partial, In development, No future auction published, or Source unavailable.
- Within each state, list the responsible counties, municipalities, parishes, boroughs, sheriffs, treasurers, collectors, clerks, land banks, or authorized platforms that are actually monitored.
- Never advertise a state as fully live until the advertised selling jurisdictions have monitored adapters and current rules. Do not turn an unverified directory link into a live property record.
- Add jurisdictions in platform-based batches, then validate each against the responsible government calendar, rules, and inventory.
- Keep Brevard September and October and every later published Brevard auction in the same automated discovery process. Do not hard-code only those two dates.

## Admin And Customer Operations

Build a private operator dashboard for:

- State and jurisdiction feed status, last success, failures, record counts, rule freshness, and stale auctions.
- Customer accounts, subscription status, onboarding progress, and support notes.
- Refund and cancellation workflow through Stripe.
- Content and video publishing.
- Data correction with an audit log.
- Report-a-problem queue on every property.
- Email delivery and alert failures.

Send members:

- Welcome and onboarding emails.
- New-auction and saved-state or jurisdiction alerts.
- Saved-property status-change alerts.
- Auction reminders at configurable times.
- Payment-failure and trial/renewal messages.
- A plain cancellation confirmation.

## Legal And Trust Requirements

Before charging customers, have qualified counsel review the Terms of Service, membership disclosures, refund/cancellation policy, privacy policy, data-source terms, and all investment-related wording. Add state-specific legal review before publishing detailed legal interpretations or automated risk conclusions for that state.

The product must clearly state:

- It is a research and education service, not legal, title, appraisal, brokerage, tax, or investment advice.
- Auction status and property facts can change at any time.
- The responsible government record and authorized auction platform control if the app conflicts with them.
- Tax deeds do not guarantee clear or insurable title.
- Properties are commonly sold as-is and require independent research.
- Members are responsible for verifying title, liens, use, access, occupancy, condition, funds, and deadlines before bidding.
- Subscription price, renewal timing, cancellation method, refund terms, and support contact are shown before payment.

Avoid marketing claims such as guaranteed deal, verified profit, clear title, safe investment, or buy a house for the opening bid.

## Delivery Roadmap

### Phase 0: Stabilize The Public Prototype

- Publish the 172 official future records and remove demo data.
- Finish the current photo/map, filter, sort, source-link, mobile, and auction-calendar release.
- Show exact current state and jurisdiction coverage and freshness.
- Acceptance: every listing is official, future-dated, source-linked, and visually usable on phone and desktop.

### Phase 1: Protected Data Foundation

- Move listings, auctions, source health, and change history to Supabase.
- Add RLS and a server-side membership check.
- Remove paid data from public bundles and repository artifacts.
- Acceptance: an unauthenticated browser cannot download the paid property dataset.

### Phase 2: Accounts And Billing

- Complete Supabase sign-up, login, password recovery, and account screens.
- Add Stripe Checkout, signed webhooks, subscription synchronization, and Customer Portal.
- Add public preview and paid route guards.
- Acceptance: payment grants access, cancellation/nonpayment changes access, and no secret is exposed client-side.

### Phase 3: Beginner Property Workspace

- Build the ordered property page, source labels, risk checklist, saves, notes, compare, and alerts.
- Add visible unknown and stale states.
- Acceptance: a new user can identify the official record, unresolved risks, and next research action without training.

### Phase 4: Calculator And Analysis

- Implement scenario inputs, max-bid math, source tracking, range outputs, and calculation history.
- Add tests for all formulas, zero/negative values, percentage fees, and missing inputs.
- Acceptance: the same inputs always produce traceable results and no unverified value becomes projected profit.

### Phase 5: Guided Onboarding And Academy

- Add first-login questions, product tour, practice deal, six lessons, transcripts, quizzes, glossary, and progress.
- Acceptance: a first-time buyer completes a practice analysis and saves an alert in 15 minutes or less.

### Phase 6: Nationwide Expansion And Monitoring

- Add every state and Washington, D.C. through platform-based and jurisdiction-based connector batches.
- Add source failure alerts, count anomaly checks, legal-rule freshness, change history, and the public national coverage page.
- Acceptance: every advertised state and jurisdiction meets the published coverage status, freshness target, and tested official-source path.

### Phase 7: Private Beta And Launch

- Recruit 10 to 20 beginners and experienced investors.
- Observe onboarding, calculator use, support questions, and misunderstood labels.
- Fix critical confusion and data gaps before accepting general subscriptions.
- Launch one paid plan, monitor refunds and chargebacks, then adjust pricing from actual retention and usage.

## Launch Gates

Do not charge the public until all of these pass:

- No demo or fabricated property appears as a live listing.
- Paid listing data is not publicly downloadable.
- Stripe test-mode purchase, renewal, failure, cancellation, and refund paths pass.
- All exposed database tables have reviewed RLS policies.
- Every listing shows its official source and last verification time.
- Source failures and unexpected record-count changes alert the operator.
- Calculator formulas have automated tests and an audit trail.
- Mobile, desktop, keyboard, and screen-reader paths pass.
- Terms, privacy, refund, cancellation, and risk disclosures are published and reviewed.
- Support contact and response process are ready.

## Success Measures

- 99% or better scheduled source-job success.
- 95% or better of live listings verified within the published freshness target.
- Zero unsourced opening bids, dates, parcel IDs, or claimed market values.
- At least 70% onboarding completion.
- Median time to first saved, analyzed property under 15 minutes.
- Fewer than 5% of new members ask where the official source or max-bid result came from.
- Refund, chargeback, cancellation, and support reasons reviewed every week during launch.

## Reference Decisions

- Stripe Billing with hosted Checkout and Customer Portal: https://docs.stripe.com/billing/subscriptions/build-subscriptions
- Stripe subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Supabase Auth and Row Level Security: https://supabase.com/docs/guides/auth and https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Functions for signed Stripe webhooks: https://supabase.com/docs/guides/functions
- GitHub Pages static-hosting limitation: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Florida public-auction and deposit rule: https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0197/Sections/0197.542.html
- Brevard buyer-beware and title guidance: https://www.brevardclerk.us/index.cfm/faqs-tax
- Pricing references: https://deedtrail.com/ and https://deedsnipe.com/
