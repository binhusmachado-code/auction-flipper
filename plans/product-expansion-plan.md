# Tax Deed & Lien Hunter product expansion plan

## Outcome

Turn the existing private owner workspace into a customer-ready auction research product with a useful free entry point, transparent paid tiers, and a repeatable workflow from discovery to post-sale follow-through.

## Shipped in this pass

- Public homepage with official-source preview listings and a clear research workflow.
- Free, Investor, and Pro plan presentation; annual billing is two months free.
- Supabase signup trigger that creates a free account and secure RLS-backed workspace records.
- Stripe checkout for four recurring prices and Stripe customer portal support.
- Member navigation for Discover, Calendar, Trackers, Alerts, Learn, pricing, table, grid, and map.
- Saved searches with tier-capped alert frequency and search counts.
- Property lifecycle tracking: Watching, Researching, Due diligence, Ready, Won, Paid, Lost, Removed.
- Property table with address, sale type, opening amount, auction date, source, freshness, and tracking state.
- Property source center, private notes, document uploads, freshness fields, and title/skip-trace referral handoff.
- Six guided lessons, knowledge checks, state field-guide starting points, buyer checklist download, and a non-live practice-property label.
- Tiered RLS schema for saved work, service requests, source records, learning progress, and private document storage.
- Build, behavior tests, responsive browser checks, and console-error check.

## Deployment order

1. Apply `supabase/migrations/202608300001_product_expansion.sql` after the existing membership and security migrations.
2. Create four Stripe recurring USD Prices: Investor $29/month, Investor $290/year, Pro $69/month, Pro $690/year.
3. Set the four `STRIPE_PRICE_*` variables and the Stripe secret/webhook variables described in `.env.example`.
4. Confirm the Stripe webhook delivers subscription created, updated, and deleted events to `api/stripe-webhook`.
5. Promote the owner account to `admin` using the existing owner setup guide.
6. Test a free signup, a checkout in test mode, portal access, an alert, a tracker, a note, a document upload, and a lesson completion before production launch.

## Guardrails

- Public preview is returned through a narrow security-definer function; full property rows remain paid/admin only.
- Every user-owned table is protected by ownership RLS and indexed on user/property foreign keys.
- The application enforces plan limits for tracked properties and saved searches; server-side rate limits can be added when alert workers are connected.
- Source links and freshness timestamps are treated as verification starting points, never as a guarantee of title, value, condition, or sale outcome.
- Partner services are request handoffs only; no title, skip-trace, legal, or financial result is promised.
