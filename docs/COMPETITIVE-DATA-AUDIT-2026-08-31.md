# Competitive data and product audit

Date collected: 2026-08-31
Product: Tax Deed & Lien Hunter
Scope: PropertyOnion, FastLien, Regrid, ATTOM, PropertyRadar, PropStream, BatchData, LandGlide, and DataTree.

## Executive decision

The product should not try to become nine separate products at once. Its defensible center is an auction-specific command center that connects every claim to evidence, keeps tax deeds and tax liens distinct, calculates a conservative maximum bid, and refuses to label missing legal or physical facts as verified.

The immediate release therefore adds:

1. A photo-first property grid modeled on the supplied design.
2. Photo provenance. Only official listing, government, licensed provider, Street View, or member-supplied photos can appear as property photos. Stock images are rejected.
3. A nine-check automatic verification report with explicit Verified, Partial, Action required, and Stop states.
4. Field-level evidence capacity for source records and a saved audit trail for every verification run.
5. Selling authority, legal description, registration/payment deadlines, occupancy, access, permit, utility, and media provenance fields.
6. Removal of invented ARV, estimated value, and repair multipliers from the ingestion pipeline.
7. Removal of the destructive “clear every property” behavior from the legacy ingestion script.

Provider-dependent work is kept behind explicit integrations. Title documents, MLS photos/comps, nationwide owner/contact data, permits, AVMs, and nationwide parcel geometry require a licensed data agreement and API credentials. The application must never scrape or relabel those products’ licensed data.

## Competitive matrix

| Product | Strongest capabilities | Published source/data posture | Our gap | Product decision |
|---|---|---|---|---|
| PropertyOnion | Florida auction calendar, tracked tax deed auctions, O&E title searches, education, skip traces, alerts, CSV, discussion/support | Public information from Clerks, Property Appraisers, Tax Collectors, and other government agencies; users must still verify with official county sources | Title order workflow, community, skip trace | Keep official-source-first model; add evidence archive now. Title ordering and contact data require vetted partners and consent/privacy review. [Overview](https://propertyonion.com/what-we-are) · [terms/source disclosure](https://propertyonion.com/terms) |
| FastLien | Nationwide lien/deed lists, appraiser enrichment, maps, portfolio, ROI/deadline reminders, bid forecasting, analytics, overages, education | States that county records are canonical and nationally fragmented | Portfolio depth, overages, richer reminders | Our calculator is already more explicit about evidence. Add automatic deadline completeness and later add portfolio cash-flow/overage modules. [Product](https://fastlien.co/) · [data-source discussion](https://fastlien.co/blog/best-tax-lien-deed-data-websites-2026) |
| Regrid | Nationwide parcel boundaries and standardized ownership, zoning, structures, assessment, sale, legal-description, hazard, infrastructure, and provenance fields | County/local GIS plus named federal, derived, partner, and third-party sources; schema exposes lineage | Standard parcel schema, geometry, field-level freshness | Add field-level evidence schema now; prioritize Regrid as a parcel/geometry candidate after commercial terms and field-coverage testing. [Parcel schema](https://support.regrid.com/docs/regrid-parcel-schemas) · [source FAQ](https://support.regrid.com/parcel-data/parcel-data-faq) |
| ATTOM | Assessor, recorder, AVM, foreclosure, deed/mortgage, permit, school, hazard, and transaction data | County public records plus proprietary algorithms; ATTOM warns that assessor, recorder, and permit ownership may differ by timing | Permits, deed/mortgage chain, AVM, hazards, transactions | Candidate enrichment provider, not an official auction authority. Keep provider values separately sourced and timestamped. [API docs](https://api.developer.attomdata.com/docs) · [data differences](https://cloud-help.attomdata.com/article/695-why-is-the-data-different) |
| PropertyRadar | Owner/contact/demographic/distress signals, OwnerGraph, daily updates, search, marketing, foreclosure tracking, skip trace, automation | Multiple-source property/owner graph with county comparisons and proprietary signals | Distress/owner graph, outreach automation | Useful for later lead generation, not required for bid safety. Any contact enrichment needs privacy, permissible-use, and opt-out controls. [Product](https://www.propertyradar.com/) |
| PropStream | Public records plus MLS comps, 165+ filters, calculators, skip trace, demographics, marketing, teams, mobile | Public records and licensed MLS/other datasets | MLS comps/photos, filters, team/mobile | Expand saved filters and team workflow later. MLS photos/comps require a license; do not mimic with stock media. [Product](https://www.propstream.com/) |
| BatchData | Property/permit/AVM/assessor/demographic/mortgage/pre-foreclosure APIs, verification, skip trace, portfolio monitoring | Commercial API and enrichment products | API-first enrichment, permits, monitoring | Strong API candidate for permits/AVM/contact verification after sample-coverage and legal review. [Product](https://batchdata.io/) · [developer portal](https://developer.batchdata.com/) |
| LandGlide | Mobile parcel/GPS/offline workflow, owner/site facts, acreage, school district, sale/transfer, favorites/notes/CSV | County-updated parcel attributes; acknowledges coverage differences and deeds/plats as authority | Field/offline parcel workflow | Keep desktop web focus now; add field inspection/mobile capture after evidence core is stable. [Product](https://landglide.com/) · [source/update FAQ](https://landglide.com/faqs-support/) |
| DataTree | Recorded-document images, title chain/lien report, OCR search, maps/layers, open liens, foreclosure, ownership, AVM, two-source Verified Record | First American databases, public records, other databases, and courthouse abstractor network | Document retrieval, chain of title, two-source verification | Best conceptual match for the source center. Evaluate API/report pricing; never call title “clear” based only on automated property data. [Property research](https://dna.firstam.com/solutions/property-data/datatree-property-research) · [API](https://dna.firstam.com/api) · [verification approach](https://dna.firstam.com/make-the-switch-to-datatree) |

## Current-product audit

### Strengths already present

- Official auction source links and source health.
- Tax deed and tax lien types are kept separate.
- Saved searches, tracking, alerts, notes, documents, learning, CSV export, and owner controls.
- A maximum-bid calculator that requires value, condition, title, and fee confirmations.
- Source-specific guarded refresh jobs that retain the last verified snapshot when a source cannot be republished.

### High-risk gaps found and corrected

- The main discovery screen defaulted to a dense table. It now defaults to a modern grid with a list/table alternative.
- Legacy sample records contained generic Unsplash houses. The file was removed, and unverified images are no longer rendered as property photos.
- The legacy unified scraper manufactured estimated value, ARV, and repairs from price multipliers. Those calculations were removed; unknown means unknown.
- The legacy unified scraper attempted to delete the whole property table before an update. It now only upserts; removal remains limited to guarded source-specific snapshot jobs.
- “Official source checked” previously appeared even without a timestamp. Verification now depends on actual evidence and freshness.
- Research was primarily manual and local. Automatic reports now evaluate the current database record, source records, documents, calculator, and deadlines, and save a per-user audit trail.

## Photo policy and integration plan

Priority order:

1. Official auction or government listing image.
2. Licensed property-photo provider with source URL and capture date.
3. Member inspection/photo upload, private to that member unless explicitly promoted by an owner.
4. Street View as street-level context, always labeled with provider/capture date and never described as a parcel inspection.
5. Aerial parcel context, explicitly labeled “not a property photo.”

Google’s Street View Static API requires an enabled billing project, API key, per-request charges, visible attribution, and generally prohibits storing/caching imagery. It is therefore a provider connection, not a free image scraper. [API overview](https://developers.google.com/maps/documentation/streetview/overview) · [policy and attribution](https://developers.google.com/maps/documentation/streetview/policies)

## Nine-check acceptance contract

The software automatically evaluates:

1. Sale type and selling authority.
2. Address, parcel ID, case number, and legal description across at least two verified sources.
3. Sale status, auction date, opening amount, and deposit against listing/rules evidence.
4. Title, liens, parties, notices, and redemption evidence.
5. Lawful access, occupancy signal, current condition evidence, permits, and utilities.
6. Documented value source, repairs, holding, and sale costs.
7. A maximum bid with contingency and target profit.
8. Registration, auction, payment, and next-action/post-sale deadlines.
9. Saved official documents and a final source-verification timestamp.

Rules:

- “Verified” requires the evidence described in the check, not merely a populated card.
- “Partial” means useful evidence exists but corroboration is incomplete.
- “Action required” means required evidence is absent.
- “Stop” blocks bid readiness when sale status is removed/cancelled, verified identity conflicts, or an access/permit/utility concern is recorded.
- The engine never claims clear title, lawful possession, legal access, or safe condition on the basis of a listing alone.

## Provider evaluation order

1. Parcel/geometry pilot: Regrid versus ATTOM versus BatchData on the same 500 active parcels. Measure match rate, legal-description completeness, boundary coverage, freshness, and price.
2. Title/document pilot: DataTree/First American versus a licensed O&E/title partner. Measure document coverage, turnaround, chain/lien completeness, and permitted display/storage.
3. Photo pilot: official county/appraiser feeds first, then a licensed imagery provider or compliant Street View connection. Measure exact-address match and capture-date availability.
4. Contact/distress pilot: only after privacy/permissible-use review; compare PropertyRadar/BatchData/PropStream on match quality and opt-out obligations.

No provider should be activated nationally before a source-by-source field coverage report and a license review are stored with the connector configuration.
