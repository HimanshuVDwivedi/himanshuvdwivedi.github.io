# AS Collections — M8: Accessibility & Security Hardening

## Accessibility — now 100/100 (Lighthouse, all pages)

| Page | A11y | Perf | Best Practices | SEO |
|---|---|---|---|---|
| Home | 100 | 99 | 96 | 100 |
| Product (generated) | 100 | 98 | 96 | 100 |
| Shop / PLP | 100 | 79\* | 96 | 100 |

\* PLP performance is the client-rendered grid measured against a local HTTP/1.1
server; higher on GitHub Pages (HTTP/2) with real sized images.

### What was fixed
- **Overlays no longer trap focus when closed.** The mobile drawer, search modal,
  cart drawer, quick view, and filter sheet are marked `inert` + `aria-hidden`
  while closed, so their controls leave the tab order and the accessibility tree.
  Opening clears both; closing restores them. (Fixes `aria-hidden-focus`.)
- **Real focus management on every overlay** (`js/utilities/focus.js`): focus is
  trapped inside the open overlay (Tab/Shift-Tab cycle), moved to a sensible first
  element on open, and **restored to the trigger** on close. Esc closes everywhere.
  The hamburger now reports `aria-expanded`.
- **Heading order is sequential** (no skipped levels): footer column titles and
  filter-group titles were re-levelled, and the PLP gained screen-reader-only
  section headings ("Filter products", "Products"). (Fixes `heading-order`.)
- **Product card markup corrected.** The Quick View button and the
  discount/sold-out badge were moved *out of* the product link — they were
  previously nested inside an `<a>` (invalid, and the badge text made the link's
  accessible name mismatch its visible content). (Fixes `label-content-name-mismatch`
  and invalid interactive nesting.)
- Existing good practices retained: skip-link, landmarks, labelled icon buttons,
  form labels + inline errors, `prefers-reduced-motion` honoured, zoom not blocked,
  colour contrast within AA.

Keyboard paths verified end-to-end with automation: open via Enter/`/`, focus lands
inside, Tab stays trapped, Esc closes, focus returns to the opener.

## Security hardening (Apps Script backend)

The payment design from M6 already kept the model safe (client never sends prices;
server re-prices; HMAC signature verified server-side; Razorpay secret only in
Script Properties; stock decremented under a lock). M8 adds defence-in-depth on
everything that reaches the Sheet (`api/Security.gs`):

- **Input validation + bounds** on `order/create`: items must be a non-empty array
  (≤ 50 lines), each with string ids and an integer quantity **1–10**; email and
  phone are format-checked server-side. Invalid requests are rejected before any
  Razorpay order is created.
- **Spreadsheet formula-injection protection.** Every customer-supplied string
  (name, address lines, city, state, gift note, email, phone) is sanitized before
  it's written: control characters stripped, length capped, and any value starting
  with `=`, `+`, `-`, `@`, tab, or CR is prefixed with a quote so it can't execute
  as a formula when the Sheet is opened.
- **Coupon codes** are normalised to uppercase alphanumerics and length-capped
  (blocks odd payloads / probing), and the verify endpoint requires all payment
  fields to be present strings before the signature check.
- **Rate limiting** on the write endpoints (`checkRateLimit`): a CacheService-based
  global cap per rolling minute, to blunt runaway loops and abusive bursts.

### Known limitation (and the production recommendation)
Apps Script web apps **cannot see the client IP**, so the built-in limiter is a
coarse *global* cap, not per-client. For real per-client rate limiting and DDoS
protection in production, **front the `/exec` URL with Cloudflare** (or a similar
proxy / API gateway) and apply rate rules there. This also gives you HTTPS on a
custom domain, caching, and WAF rules. (Covered further in the M10 deploy guide.)

### Deploying these changes
`api/Security.gs` is a new file — add it to your Apps Script project alongside the
others, then **Deploy → Manage deployments → New version**. No config changes are
required; the limiter and sanitizers activate immediately.
