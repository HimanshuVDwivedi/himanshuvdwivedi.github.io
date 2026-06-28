# AS Collections — Operations Runbook (M10)

Day-2 operations once the store is live. Keep this with the repo.

## Architecture at a glance
```
Browser ── static site (GitHub Pages + Cloudflare)
   │            • HTML/CSS/JS, pre-built SEO product pages
   │            • images via jsDelivr CDN
   └── fetch ─▶ Apps Script Web App (/exec)  ──▶ Google Sheet (the database)
                • re-prices orders, validates coupons
                • creates Razorpay orders, verifies signatures
                • decrements stock under a lock
```
One seam (`js/api/client.js`) is the only backend-aware code. Everything money-
related is recomputed and verified server-side.

---

## Routine: catalogue & content
**Add or edit a product**
1. Edit the Google Sheet: add a row in `Products` (+ its rows in `Variants`).
   Use a unique `product_id`/`slug`; set `is_active`, `price`, `images` (CDN paths).
2. Upload the images to the image repo at those paths.
3. **Rebuild SEO pages:** push to `main` (the Action rebuilds) or run
   `SITE_URL=… npm run build` and redeploy. New product → new `/product/<slug>.html`
   + sitemap entry.
> Catalogue reads are cached server-side for 5 minutes (`CACHE_TTL`). A new
> product appears on the live PLP within ~5 min; its static SEO page appears after
> the next build.

**Edit a coupon** — edit the `Coupons` tab (active/expiry/min/usage). No rebuild
needed; validation reads it live.

**Change announcements / nav / shipping thresholds** — edit `js/config/config.js`,
rebuild, redeploy.

## Orders & fulfilment
- Every order lands in the **`Orders`** tab; line items in **`OrderItems`**.
- **Statuses:** `created` (payment started) → `paid` (verified, stock decremented)
  → you fulfil. `failed_stock` = paid but an item sold out mid-payment → **refund
  in the Razorpay dashboard** and contact the customer.
- **Fulfilment:** filter `Orders` by `status = paid`; ship to
  `shipping_address_json`; honour any `gift_note`. (Add your own `tracking`/
  `fulfilled_at` columns as you like — the API ignores extra columns.)
- **Refunds/cancellations:** issue in the Razorpay dashboard. To restock, increment
  the relevant `Variants.stock` back in the Sheet.

## Inventory & the oversell guard
Stock decrements at **payment verification, under a `LockService` lock** with a
re-read — this closes the common Sheets oversell window. It is robust at low/medium
concurrency, **not** at flash-sale scale. If you run big drops, see *Migration
triggers* below before the event.

## Monitoring
- **Uptime:** point a free monitor (UptimeRobot/Cronitor) at `…/exec?path=ping`
  (expects `{"ok":true}`) and at the homepage.
- **Scheduled health check:** run `npm run healthcheck` (with `API_BASE`) from cron
  or a GitHub Action on a schedule; non-zero exit = page someone.
- **Payments:** watch the Razorpay dashboard; reconcile `paid` orders in the Sheet
  vs captured payments in Razorpay daily.
- **Search/SEO:** Google Search Console for coverage + rich-result status.

## Common incidents → fixes
| Symptom | Likely cause | Fix |
|---|---|---|
| Site loads but **no products / CORS errors** | `USE_MOCK` still true, wrong `API_BASE`, or web app not "Anyone" | Set `API_BASE`, `USE_MOCK:false`, redeploy web app with access **Anyone**; rebuild |
| **Images broken** (placeholders show) | wrong `IMAGE_CDN` or image paths | Fix `IMAGE_CDN`/paths; confirm a jsDelivr URL loads |
| **Payment won't start** | Razorpay keys missing/wrong; not redeployed | Check Script Properties; redeploy Apps Script *new version* |
| **"Payment verification failed"** | secret mismatch between create + verify | Ensure the same `RAZORPAY_KEY_SECRET`; redeploy |
| **`RATE_LIMITED` errors** | global write cap hit (or abuse) | Raise the cap in `Security.gs` and/or add Cloudflare per-IP limiting |
| **Stale catalogue** after a Sheet edit | 5-min server cache | Wait ~5 min, or temporarily lower `CACHE_TTL` |
| **Apps Script quota / "exceeded maximum execution time"** | traffic/volume beyond Sheets tier | See *Migration triggers* |
| **Site 404 / broken CSS** after deploy | served from a project **subpath** | Must serve at a **domain root** (custom domain / user page) |

## Backups
- **Catalogue/orders:** File → Version history in the Sheet; also export the Sheet
  to xlsx weekly (or script a Drive copy).
- **Code:** it's all in Git — tag releases.

## Migration triggers (when to graduate off Google Sheets)
From SDLC Part 1 §4.3 — move the **backend** (not the frontend) to a real DB +
API when you hit any of these. The `client.js` seam means the frontend barely
changes.
- **Catalogue > ~2–3k SKUs**, or list/API latency creeping past ~1–2s.
- **Concurrency / flash sales** causing Apps Script timeouts (6-min limit) or
  near the ~30 simultaneous-execution ceiling — real oversell risk.
- **Orders volume** making the Sheet unwieldy or hitting Apps Script daily quotas.
- Need for **accounts, search, analytics, or multi-user admin** at scale.

**Target migration:** keep the static frontend + CDN; replace the Sheets+Apps
Script API with Postgres (e.g. Supabase/Neon) behind a small API (Cloud
Functions/Workers/Render). Re-point `API_BASE`; keep the same response envelope so
the frontend is unchanged.

## Security maintenance
- Rotate the Razorpay key secret periodically (Script Properties only).
- Keep access to the Sheet + Apps Script + Cloudflare on least-privilege.
- The backend already validates/sanitizes input and guards against spreadsheet
  formula injection (`Security.gs`); keep those checks when extending handlers.

## Escalation (fill in)
- Domain/DNS + Cloudflare: __________
- Google account owner (Sheet/Apps Script): __________
- Razorpay account owner: __________
- On-call / who to page: __________
