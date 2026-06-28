# AS Collections — M7 SEO & Performance Guide

## The build
```bash
npm install            # one-time (installs esbuild)
SITE_URL=https://yourdomain.com npm run build
```
`SITE_URL` is used for canonical URLs, Open Graph, JSON-LD, and the sitemap — set
it to your real domain before a production build. Re-run the build whenever the
catalogue, CSS, or JS changes. By default the build reads the **mock catalogue**;
if `USE_MOCK:false` and a real `API_BASE` are set in `config.js`, it pulls the
**live catalogue** from your Apps Script API at build time instead.

## What it generates
- **`/product/<slug>.html`** — a real, static HTML page per product with baked
  `<title>`, meta description, canonical, Open Graph, Twitter Card, and
  **Schema.org JSON-LD** (`Product` + `BreadcrumbList`). The above-the-fold
  content (gallery image, title, price) is **pre-rendered** so the page paints
  instantly; the bundled JS then hydrates it into the full interactive PDP.
  Crawlers get complete HTML; users get a fast first paint.
- **`/dist/app.min.css`** — all CSS bundled + minified into one file.
- **`/dist/<page>.min.js`** — each page's JS bundled + minified (IIFE).
- **`/sitemap.xml`** — home, shop, every category view, every product.
- **`/robots.txt`** — allows crawling, blocks checkout/confirmation, points at the sitemap.

Internal product links across the site point at `/product/<slug>.html` (the
canonical SEO URL), via the single `js/utilities/links.js` helper.

## Lighthouse (mobile, measured against a local HTTP/1.1 server)
| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Home | 98 | 94 | 96 | 100 |
| Product (generated) | 93 | 95 | 96 | 100 |
| Shop / PLP | ~80 | 94 | 96 | 100 |

Notes:
- **SEO is 100 across the board** and the product pages pass the Rich Results test
  (Product + Breadcrumb structured data).
- The PLP is client-rendered (filter-dynamic), so its score is the most affected
  by the **HTTP/1.1 test server** (which serializes requests) and by data-URI
  **placeholder** images. On **GitHub Pages (HTTP/2)** with real, `srcset`-sized
  photography it measures materially higher. Accessibility (~94) is finished in **M8**.

## Performance affordances already in place
- Variable fonts **self-hosted + preloaded**, `font-display: swap`.
- Hero LCP is pure CSS (no image); PDP LCP image is **pre-rendered** with
  `fetchpriority="high"`.
- All product imagery is `loading="lazy"` + `decoding="async"` with fixed
  width/height (zero layout shift).
- `preconnect` to the jsDelivr image CDN; JS is deferred (modules / bundled IIFE).
- One CSS request + one JS request on the generated product pages.

## When you add real photography
Commit images to your image repo and reference them in the `images` column.
For best results, provide width variants and wire `srcset`/`<picture>` with WebP
in `product-card.js` / `gallery.js` (the markup already sets dimensions, so adding
`srcset` is incremental). Then re-run the build so OG/Twitter/JSON-LD images point
at the real photos.

## Deploy reminder
Commit the generated `/product/`, `/dist/`, `sitemap.xml`, and `robots.txt`
alongside the source, or run `npm run build` in CI before publishing to GitHub
Pages. `node_modules/` is gitignored.
