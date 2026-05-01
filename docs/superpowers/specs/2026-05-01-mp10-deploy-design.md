# MP10 · Landing Page Deployment Design

**Date:** 2026-05-01  
**Scope:** Deploy `apps/landing/` (Astro 5) to Cloudflare Pages via GitHub Actions CI/CD

---

## Goal

Ship the fully-built Meridian landing page to a free `*.pages.dev` subdomain with automatic deploys on every push to `main`.

## Infrastructure

- **Platform:** Cloudflare Pages (free tier)
- **Project name:** `meridian-landing`
- **URL:** `meridian-landing.pages.dev`
- **Build command:** `npm run build` (run inside `apps/landing/`)
- **Output directory:** `apps/landing/dist/`
- **Environments:** `production` (main branch) · preview (pull requests)

## GitHub Actions Workflow

File: `.github/workflows/deploy-landing.yml`

**Triggers:**
- `push` to `main` → production deploy
- `pull_request` → preview deploy (Cloudflare posts preview URL)

**Steps:**
1. `actions/checkout@v4`
2. `actions/setup-node@v4` — Node 20
3. `npm ci` scoped to `apps/landing/`
4. `npm run build` scoped to `apps/landing/`
5. `cloudflare/wrangler-action` → `wrangler pages deploy apps/landing/dist/`

**GitHub Secrets required:**
- `CLOUDFLARE_API_TOKEN` — token with `Cloudflare Pages: Edit` permission
- `CLOUDFLARE_ACCOUNT_ID` — found in CF dashboard sidebar

## One-Time Manual Setup

These steps are done once by the developer, outside of code:

1. Create Cloudflare account at cloudflare.com (free)
2. In CF dashboard → Workers & Pages → Create → Pages → name it `meridian-landing`
3. Generate API token: CF dashboard → My Profile → API Tokens → Create Token → use "Edit Cloudflare Pages" template
4. Add secrets to GitHub: repo Settings → Secrets → Actions → `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`

## Out of Scope

- Custom domain (requires paid domain purchase — deferred)
- API deployment (separate Workers setup, already scaffolded in `apps/api/`)
- Landing page content changes (already complete per MP10 checklist)

## Success Criteria

- Push to `main` triggers workflow and completes without error
- `meridian-landing.pages.dev` serves the landing page
- PR preview URLs generated automatically by Cloudflare
