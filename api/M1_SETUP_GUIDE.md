# AS Collections — M1 Setup & Deploy Guide
## Catalogue read path: Google Sheet → Apps Script API → live frontend

This turns the M0 mock into a real backend. ~20 minutes, no coding. At the end,
the homepage rails render from a live Google Sheet you can edit like a normal
spreadsheet.

---

## What M1 delivers
- A **seed Google Sheet** (all tables, pre-filled to match the demo data).
- An **Apps Script Web App** exposing four read endpoints with caching:
  `products`, `product`, `categories`, `collections`.
- The frontend flipped from mock → live by changing **two config lines**.

The Apps Script output matches the mock data field-for-field, so nothing on the
page changes visually — it's the same render, now backed by a real database.

---

## Step 1 — Create the Sheet from the seed

1. Go to **drive.google.com → New → File upload** and upload
   `AS_Collections_Seed.xlsx`.
2. Right-click it → **Open with → Google Sheets**.
3. **File → Save as Google Sheets** (converts it to a native Sheet). Delete the
   uploaded `.xlsx` copy if you like.
4. Confirm the tabs are intact and named exactly:
   `Products, Variants, Categories, Collections, Coupons, Orders, OrderItems,
   Customers, Addresses, Reviews, Wishlist`.

> Tab names must match `Config.gs` exactly — they're how the API finds data.

## Step 2 — Add the Apps Script backend

1. In the Sheet: **Extensions → Apps Script**. This opens a **bound** script
   (it already "knows" this sheet — no ID needed).
2. Delete the default `Code.gs` contents.
3. Create these files (the **+** next to "Files" → Script) and paste each one
   from the `api/` folder:
   - `Config.gs`
   - `SheetDB.gs`
   - `Cache.gs`
   - `Handlers.gs`
   - `Code.gs`
4. **Save** (💾).

> Standalone instead of bound? Paste the Sheet's id into `CONFIG.SHEET_ID` in
> `Config.gs` (the long string in the Sheet URL between `/d/` and `/edit`).

## Step 3 — Deploy as a Web App

1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. Set:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*  ← required so the public site can read it.
4. **Deploy** → authorize when prompted (review the scopes; it only touches this
   Sheet).
5. Copy the **Web app URL** — it ends in `/exec`. This is your `API_BASE`.

**Quick health check:** paste this in a browser tab (your URL + the ping path):
```
https://script.google.com/macros/s/XXXX/exec?path=ping
```
You should see: `{"ok":true,"data":{"pong":true},"error":null}`.
Then try `?path=products` and confirm you get the six products with `variants`.

## Step 4 — Point the frontend at it

Edit `js/config/config.js`:

```js
API_BASE: "https://script.google.com/macros/s/XXXX/exec",   // ← your /exec URL
IMAGE_CDN: "https://cdn.jsdelivr.net/gh/USER/REPO@main/",    // ← your image repo
USE_MOCK: false,                                             // ← flip the switch
```

Serve locally and open it:
```bash
python3 -m http.server 8000   # from the project root
# http://localhost:8000/index.html
```
The rails now populate from the live Sheet. Edit a price in the Sheet, wait for
the cache to expire (or run `clearCatalogueCache` once in the Apps Script editor),
refresh — the change appears. **That's the M1 exit criterion met.**

---

## Operating notes

**Caching.** Reads are cached for 5 minutes (`CONFIG.CACHE_TTL`) so traffic
rarely hits the Sheet. After editing the catalogue, either wait it out or run the
`clearCatalogueCache` function once in the Apps Script editor for an instant
refresh.

**Booleans.** For `is_featured / is_trending / is_bestseller / is_active`, use
checkboxes (Insert → Checkbox) or type `TRUE`/`FALSE`. The API coerces them.

**Images.** The `images` column is a comma-separated list of paths *relative to
your image repo* (e.g. `rings/aria-1.webp,rings/aria-2.webp`). The frontend
prepends `IMAGE_CDN`. Until you commit real photos, the designed placeholder
shows automatically.

**Re-deploying after code edits.** Apps Script pins a deployment to a version.
After editing `.gs` files: **Deploy → Manage deployments → edit (✏️) → Version:
New version → Deploy**. The `/exec` URL stays the same.

**CORS (why POST is built the way it is).** Apps Script web apps return
`Access-Control-Allow-Origin: *`, so cross-origin **GET** from GitHub Pages just
works. Cross-origin **POST** with `application/json` would trigger a preflight
Apps Script can't answer — so the client sends POST bodies as `text/plain`
(a "simple request", no preflight) and the server `JSON.parse`s them. This is
already wired for the M6 order/coupon endpoints; you don't need to do anything.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `?path=ping` shows a Google login page | "Who has access" isn't *Anyone* — redeploy with the right setting |
| Rails empty, console shows NETWORK | `API_BASE` wrong, or `USE_MOCK` still `true` |
| Rails empty, `?path=products` works in browser | `USE_MOCK` not flipped to `false`, or hard-refresh needed |
| Edited the Sheet but site unchanged | Cache TTL — run `clearCatalogueCache` |
| `BAD_PATH` error | Path param missing/misspelled in the request |
| Authorization error on deploy | Re-run deploy; accept the scope prompt (Sheet access only) |

---

## Next: M2 — Homepage
With the live catalogue flowing, M2 builds the real components on top of it:
Header (transparent→solid on scroll), auto-sliding AnnouncementBar, the hero,
category cards, the rails (already proven), reviews, trust strip, Instagram,
newsletter, and footer — plus scroll-reveal with reduced-motion respected.
