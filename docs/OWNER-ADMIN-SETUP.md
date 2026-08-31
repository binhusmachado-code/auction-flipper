# Owner and Customer Access Setup

## What is now available

- Customers can create a free account, sign in, reset their password, preview upcoming auctions, save searches, track properties, follow lessons, and upgrade to Investor or Pro.
- The owner dashboard can invite customers, edit their name and email, grant temporary access, suspend access, send password resets, promote another administrator, and permanently delete an account.
- Every owner customer-management action is recorded in `admin_audit_log`.
- Admin access is checked on the server. Changing browser code or local storage cannot turn a customer into an owner.

## One-time owner activation

1. The production Supabase project already has the membership, security, refresh, and product-expansion migrations applied. If you set up another environment, deploy migrations `202608210001_paid_membership.sql` through `202608210004_security_hardening.sql`, then `202608300001_product_expansion.sql`, in order. The expansion migration adds tiered access, saved searches, tracking, notes/documents, source verification, lesson progress, and secure document storage.
2. Open the website, select **Start free**, create the owner's account, and confirm the email address.
3. In the Supabase SQL Editor, replace the placeholder email and run:

```sql
update public.profiles
set role = 'admin', account_status = 'active', updated_at = now()
where id = (
  select id from auth.users
  where lower(email) = lower('OWNER_EMAIL_HERE')
);
```

4. Sign out and sign back in. The navigation button will read **Owner**. Open it to reach **Owner dashboard**.

Do not create an owner password in source code, an environment variable, or this document. The owner uses the normal Supabase login and password-reset system.

## Production configuration

These browser-safe values are configured on the current Vercel production deployment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MEMBERSHIP_ENABLED=true`
- `VITE_BILLING_ENABLED=true` only after Stripe is ready
- `VITE_API_BASE_URL` blank on Vercel, or the Vercel app URL when the frontend is on GitHub Pages

The owner customer-management API runs as the protected Supabase Edge Function `admin-customers`; the master database key never enters the website or Vercel owner-dashboard bundle.

When billing is enabled, set these private values only in Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `ALLOWED_APP_ORIGINS`
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_INVESTOR_MONTHLY`, `STRIPE_PRICE_INVESTOR_YEARLY`, `STRIPE_PRICE_PRO_MONTHLY`, and `STRIPE_PRICE_PRO_YEARLY`

The four Stripe Prices must be recurring USD Prices for $29/month, $290/year, $69/month, and $690/year respectively. The checkout endpoint validates the amount and interval before creating a subscription.

Never expose `SUPABASE_SERVICE_ROLE_KEY` with a `VITE_` prefix.

For GitHub Pages, set `APP_URL` to the full site path, such as `https://binhusmachado-code.github.io/auction-flipper`, so invitations and billing returns land inside the app.

## Recommended production URL

Use `https://auction-flipper.vercel.app` as the main customer URL. GitHub Pages can remain a public mirror; signed-in owner actions use the same protected Supabase Edge Function from either allowed origin.
