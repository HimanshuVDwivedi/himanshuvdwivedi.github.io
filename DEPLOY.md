# AS Collections — Deployment Guide (M10)

This takes the project from your machine to a live, payment-taking store on a
custom domain. Work top to bottom; each step ends with a way to confirm it worked.

---

## ⚠️ The one hard requirement: deploy at a DOMAIN ROOT
The site uses absolute paths (`/css/…`, `/js/…`, `/dist/…`, `/product/…`,
`/assets/…`). They resolve correctly only when the site is served from the **root**
of a domain. So host it as **either**:

- a **custom domain** — `https://www.ascollections.com` (recommended for a brand), or
- a **user/org GitHub Pages site** — `https://<username>.github.io`.

**Do NOT** use a project page like `https://<username>.github.io/as-collections/`
— the `/css/…` paths would resolve to the wrong place and the site would break.
(If you must use a project subpath, every absolute path needs a `<base>` rewrite —
avoid this; just use a custom domain.)

---

## Prerequisites
- A Google account (for Sheets + Apps Script).
- A GitHub account + a repo for the site, and a second repo for images.
- A domain you control (for the custom-domain route).
- A Razorpay account.
- Node 18+ locally (for building, unless you use the GitHub Action).

---

## Step 1 — Images (GitHub repo + jsDelivr CDN)
1. Create a **public** repo, e.g. `as-collections-images`.
2. Add your product photos following the paths in the catalogue's `images`
   column (e.g. `rings/aria-1.webp`). WebP, ~1200px on the long edge.
3. They're served free via jsDelivr at:
   `https://cdn.jsdelivr.net/gh/<USER>/as-collections-images@main/<path>`
4. **Confirm:** open one image URL in a browser — it should load.

> No images yet? The site renders tasteful placeholders, so you can launch and
> add photography later (re-run the build afterwards so OG/JSON-LD use real images).

## Step 2 — Backend (Google Sheet + Apps Script)
1. **Create the Sheet:** import `AS_Collections_Seed.xlsx` into a new Google Sheet
   (File → Import → Upload → *Replace spreadsheet*). It has all 11 tabs.
2. **Create the Apps Script project:** Extensions → Apps Script. Create one file per
   `api/*.gs` (`Config`, `SheetDB`, `Cache`, `Security`, `Handlers`, `Code`) and
   paste the contents. In `Config.gs`, confirm the tab names match your Sheet.
3. **Add the Razorpay secret** (Project Settings ⚙ → Script Properties):
   `RAZORPAY_KEY_ID` = your `rzp_test_…` id, `RAZORPAY_KEY_SECRET` = your secret.
   (Test mode first. The secret lives ONLY here — never in the repo or client.)
4. **Deploy as a Web App:** Deploy → New deployment → *Web app* →
   Execute as **Me**, Who has access **Anyone** → **Deploy** → copy the **/exec URL**.
5. **Confirm:** open `…/exec?path=ping` — you should get `{"ok":true,"data":{"pong":true}}`.
   Then `…/exec?path=products&pageSize=1` should return a product.

(Full payment details are in `api/M6_PAYMENTS_GUIDE.md`; security notes in
`api/M8_A11Y_SECURITY_GUIDE.md`.)

## Step 3 — Point the frontend at your backend
Edit `js/config/config.js`:
```js
API_BASE: "https://script.google.com/macros/s/XXXX/exec",   // your /exec URL
IMAGE_CDN: "https://cdn.jsdelivr.net/gh/<USER>/as-collections-images@main/",
RAZORPAY_KEY_ID: "rzp_test_xxxxxxxx",                        // publishable id only
USE_MOCK: false,                                             // go live
```
**Confirm:** `node scripts/healthcheck.mjs` with `API_BASE` set (Step 9) — or just
load the site after building and check products come from the Sheet.

## Step 4 — Build
```bash
npm install
SITE_URL="https://www.ascollections.com" npm run build
```
Generates `dist/` (bundles), `product/<slug>.html` (SEO pages), `sitemap.xml`,
`robots.txt`. Re-run whenever the catalogue, CSS, or JS changes.

## Step 5 — Publish to GitHub Pages
**Option A — automated (recommended):** the included
`.github/workflows/deploy.yml` builds and deploys on every push to `main`.
- Repo → Settings → Pages → **Source: GitHub Actions**.
- Repo → Settings → Secrets and variables → Actions → **Variables** → add
  `SITE_URL` = your live origin.
- Push to `main`. The Action builds, assembles a clean `_site/`, and publishes.

**Option B — manual:** run the build locally, commit the generated `dist/`,
`product/`, `sitemap.xml`, `robots.txt`, then Settings → Pages → Source:
*Deploy from a branch* → `main` / root.

**Confirm:** your Pages URL loads the homepage with real products.

## Step 6 — Custom domain + HTTPS
1. Commit a file named `CNAME` at the repo root containing just your domain
   (e.g. `www.ascollections.com`). The Action copies it into the publish dir.
2. At your DNS provider:
   - **www** → CNAME to `<username>.github.io`.
   - **apex** (`ascollections.com`) → four A records to GitHub Pages
     (`185.199.108.153`, `…109.153`, `…110.153`, `…111.153`) or an ALIAS to
     `<username>.github.io`.
3. Repo → Settings → Pages → set the custom domain, then tick **Enforce HTTPS**
   (wait for the cert to issue — can take a few minutes to an hour).
4. **Confirm:** `https://www.ascollections.com` loads with a valid padlock.

## Step 7 — Front with Cloudflare (recommended)
Apps Script can't see client IPs, so it can't rate-limit per client (M8 note).
Cloudflare closes that gap and adds caching + WAF:
1. Add your domain to Cloudflare; switch your nameservers to theirs.
2. Proxy (orange cloud) the site records.
3. Add a **Rate Limiting rule** (e.g. cap requests/min per IP to the site and,
   if you proxy it, to the API path).
4. Optionally proxy the Apps Script `/exec` behind a Cloudflare Worker/route so
   the API also sits behind rate limiting + WAF. (Keep CORS working: the API
   already returns `Access-Control-Allow-Origin: *`.)
5. **Confirm:** site still loads; Cloudflare analytics show traffic.

## Step 8 — Razorpay go-live
1. Test thoroughly in **Test mode** first (Step 9).
2. Complete Razorpay **KYC**.
3. Swap to **Live** keys: Key ID in `config.js`, Key Secret in Script Properties.
4. Re-deploy the Apps Script (**new version**) and rebuild/redeploy the site.
5. (Recommended) Add a Razorpay **webhook** as a payment-capture backstop.

## Step 9 — Verify the whole thing
1. **API:** `API_BASE="…/exec" npm run healthcheck` → all ✓.
2. **Test order (Test mode):** browse → add to cart → apply `WELCOME10` →
   checkout → pay with test card `4111 1111 1111 1111` (any future expiry/CVV/OTP).
3. **Confirm server-side:** the `Orders` row flips to `paid` with a
   `razorpay_payment_id`; the purchased `Variants` stock decrements; you receive
   the confirmation email.
4. **SEO:** run a product URL through Google's Rich Results Test → Product +
   Breadcrumb detected. Submit `sitemap.xml` in Google Search Console.

## Rollback
GitHub Pages keeps deployment history — re-run a previous successful
*deploy-pages* run, or revert the commit and push. For the backend, Apps Script
keeps versions: Deploy → Manage deployments → select a previous version.

---

You're live. Day-2 operations — adding products, fulfilling orders, monitoring,
incident response, and when to graduate off Sheets — are in **`RUNBOOK.md`**.
