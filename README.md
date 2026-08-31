# Tax Deed & Lien Hunter

Auction research workspace — discover official tax-deed and tax-lien records, document due diligence, calculate a maximum bid, and keep every deadline visible.

> Open the app through a web server. Opening `index.html` directly with a `file://` URL will not load the React modules. Run `npm run dev`, then open <http://localhost:5173/>.

## 🌐 Live Sites (Free Domains)

| Environment | URL | Branch | Updates |
|---|---|---|---|
| **Production** | https://binhusmachado-code.github.io/auction-flipper/ | `main` | Auto on every push |
| **Staging** | https://binhusmachado-code.github.io/auction-flipper-staging/ | `staging` | Auto every 15 min + manual |

Both are **completely free** — no credit card or domain purchase needed.

## 🚀 Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + Leaflet maps
- Supabase (PostgreSQL + Auth) — property records, tiered memberships, saved searches, tracking, notes, documents, and learning progress
- Stripe Billing — Investor and Pro recurring memberships
- PWA — installable on mobile/desktop

## 🛠️ Development Workflow

```bash
# Start a feature
git checkout staging
git checkout -b feature/my-change

# Test on staging
# Push to staging branch → auto-deploys to staging URL in ~2 min

# Ship to production
git checkout main
git merge staging
git push origin main  # → auto-deploys to production
```

## ⚙️ Supabase Backend

- **Project**: `dlnurzizylroqchedfbf` (us-east-1)
- **Tables**: `properties`, `profiles`, `subscriptions`, `user_favorites`, `user_alerts`, `saved_searches`, `property_tracking`, `property_notes`, `property_documents`, `property_source_records`, `learning_progress`, `service_requests`
- **Auth**: Email/password with auto-profile creation
- **RLS**: Row-level security per user
- **Product migration**: apply `supabase/migrations/202608300001_product_expansion.sql` after the existing membership/security migrations

### Membership tiers

- **Free** — official-source previews, 5 tracked properties, 1 saved search, and the learning center.
- **Investor** — complete records, 100 tracked properties, 10 searches, daily alerts, calculator, calendar, table, and CSV export ($29/month or $290/year).
- **Pro** — 500 tracked properties, 20 searches, instant alerts, advanced reports, and priority support ($69/month or $690/year).

Stripe price IDs and deployment steps are documented in `.env.example`, `plans/product-expansion-plan.md`, and `docs/OWNER-ADMIN-SETUP.md`.

## 📱 PWA Install

Open the production URL on your phone → tap "Add to Home Screen" → works offline.

---

## 🔧 Setup Checklist (One-Time)

### 1. Move workflow files to `.github/workflows/`

The GitHub API blocks automated writes to `.github/workflows/` for security. You need to move these files manually:

- In **main repo**: move `deploy.yml` → `.github/workflows/deploy.yml`
- In **staging repo**: move `deploy.yml` → `.github/workflows/deploy.yml`

Steps: go to the file → click ⋮ → Move → type `.github/workflows/` → Commit.

### 2. Enable GitHub Pages

For **both** repos:
1. Go to **Settings → Pages**
2. Under "Build and deployment" → set **Source** to **"GitHub Actions"**
3. Save

### 3. Trigger First Deploy

After moving the workflow files, go to **Actions → Deploy to GitHub Pages → Run workflow** in each repo to trigger the first build.

---

## 📝 Custom Domain (Optional, Free)

Want a custom domain like `auctionflipper.com`? Add a `CNAME` file:

1. Buy a domain (Namecheap, Cloudflare, etc. — ~$10/year)
2. Create a file `CNAME` in the `public/` folder with your domain
3. Add DNS records pointing to GitHub Pages
4. Enable "Enforce HTTPS" in Settings → Pages

For now, the free `github.io` subdomains work perfectly.
