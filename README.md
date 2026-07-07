# 🔨 Auction Flipper

Property auction deal finder — discover foreclosure, REO, and courthouse auction properties to flip for profit.

## 🌐 Live Sites (Free Domains)

| Environment | URL | Branch | Updates |
|---|---|---|---|
| **Production** | https://binhusmachado-code.github.io/auction-flipper/ | `main` | Auto on every push |
| **Staging** | https://binhusmachado-code.github.io/auction-flipper-staging/ | `staging` | Auto every 15 min + manual |

Both are **completely free** — no credit card or domain purchase needed.

## 🚀 Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + Leaflet maps
- Supabase (PostgreSQL + Auth) — 50 sample properties seeded
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

- **Project**: `weguwjxuvibbyqrrvqcw` (us-east-1)
- **Tables**: `properties`, `user_favorites`, `user_alerts`, `profiles`
- **Auth**: Email/password with auto-profile creation
- **RLS**: Row-level security per user

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
