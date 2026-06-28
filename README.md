# AS Collections

A premium jewellery storefront — fast static frontend, Google Sheets + Apps
Script backend, Razorpay payments. Built to run at near-zero cost and scale up
cleanly when it needs to.

## What it does
Browse → filter & search → product detail → cart → guest checkout → pay → confirm.
Server-side pricing, coupons, stock control, and signature-verified payments.
SEO-ready static product pages, 100/100 accessibility, sub-second loads.

## Stack
- **Frontend:** vanilla ES modules + CSS (no framework), built/bundled with esbuild.
- **Hosting:** GitHub Pages (at a domain root) + Cloudflare; images via jsDelivr.
- **Backend:** Google Apps Script Web App over a Google Sheet (the database).
- **Payments:** Razorpay (server-created orders + HMAC signature verification).

The frontend talks to exactly one backend-aware module — `js/api/client.js` (the
"seam") — so the same UI runs against mock data, the live Sheet, or a future real
database with only a config change.

## Quick start (local, mock data)
```bash
python3 -m http.server 8000   # serve at root; mock catalogue, no backend needed
# open http://localhost:8000
```
Toggle `USE_MOCK` in `js/config/config.js` to switch between mock and live.

## Build (production)
```bash
npm install
SITE_URL="https://www.yourdomain.com" npm run build
```
Produces minified bundles (`dist/`), static SEO product pages (`product/`),
`sitemap.xml`, and `robots.txt`.

## Project layout
```
index.html                 Homepage
pages/                     shop (PLP), product, checkout, order-confirmation
css/ + css/components/      Design tokens + per-component styles
js/
  api/client.js            <- the backend seam (mock <-> live)
  config/config.js         <- all knobs (API_BASE, keys, thresholds, nav...)
  components/ pages/ state/ utilities/
api/*.gs                   Apps Script backend (deploy to Google)
build/build.mjs            SEO + bundle build
scripts/healthcheck.mjs    Live API smoke test
dist/ product/             Build output (generated)
.github/workflows/         CI build + deploy to Pages
```

## Configuration
Everything tunable lives in `js/config/config.js`: `API_BASE`, `IMAGE_CDN`,
`RAZORPAY_KEY_ID`, `USE_MOCK`, free-shipping threshold, shipping fee,
announcements, nav, page size, price brackets, sort options. The Razorpay
**secret** is never here — it lives in Apps Script Script Properties only.

## Guides
- **`DEPLOY.md`** — full production deployment (images, backend, domain, Cloudflare, go-live).
- **`RUNBOOK.md`** — day-2 ops: catalogue, orders, monitoring, incidents, migration triggers.
- **`api/M1_SETUP_GUIDE.md`** — Sheet + Apps Script setup.
- **`api/M6_PAYMENTS_GUIDE.md`** — Razorpay wiring + security model.
- **`build/M7_SEO_PERF_GUIDE.md`** — the build, SEO output, performance.
- **`api/M8_A11Y_SECURITY_GUIDE.md`** — accessibility + backend hardening.
- **`AS_Collections_SDLC_Phase1.md` / `Phase2.md`** — research, architecture, design system, roadmap.

## Status
Launch-complete: M0–M8 + M10. Accessibility 100, SEO 100, payments verified
end-to-end in test mode. Accounts (M9) are optional/post-launch.

> WARNING: Must be served from a DOMAIN ROOT (custom domain or user.github.io),
> not a project subpath — the site uses absolute /paths. See DEPLOY.md.
