# Owner and Customer Access Setup

## What is now available

- Customers can create an account, sign in, reset their password, open a dashboard, manage billing, and save a guided bid workflow.
- The owner dashboard can invite customers, edit their name and email, grant temporary access, suspend access, send password resets, promote another administrator, and permanently delete an account.
- Every owner customer-management action is recorded in `admin_audit_log`.
- Admin access is checked on the server. Changing browser code or local storage cannot turn a customer into an owner.

## One-time owner activation

1. Deploy migrations `202608210001_paid_membership.sql` through `202608210004_security_hardening.sql` to the production Supabase project in order. These are already installed in the current production project.
2. Open the website, select **Membership**, create the owner's account, and confirm the email address.
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
- Stripe keys and exact monthly/yearly price IDs

Never expose `SUPABASE_SERVICE_ROLE_KEY` with a `VITE_` prefix.

For GitHub Pages, set `APP_URL` to the full site path, such as `https://binhusmachado-code.github.io/auction-flipper`, so invitations and billing returns land inside the app.

## Recommended production URL

Use `https://auction-flipper.vercel.app` as the main customer URL. GitHub Pages can remain a public mirror; signed-in owner actions use the same protected Supabase Edge Function from either allowed origin.
