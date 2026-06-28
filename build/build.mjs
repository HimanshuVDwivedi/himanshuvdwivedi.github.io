/* =============================================================================
   AS COLLECTIONS — BUILD
   Run: `npm run build`  (set SITE_URL=https://yourdomain for correct absolutes)

   Does three jobs:
   1. Bundles + minifies CSS into dist/app.min.css and each page's JS into
      dist/<entry>.min.js  (one CSS + one JS request per page → fast, Lighthouse-
      friendly even without HTTP/2).
   2. Generates a STATIC SEO page per product at /product/<slug>.html with baked
      <title>, meta, Open Graph, Twitter, canonical, and Schema.org JSON-LD
      (Product + BreadcrumbList) — so crawlers get full HTML. The same page
      hydrates client-side via the bundled product script.
   3. Emits sitemap.xml and robots.txt.

   Catalogue source: live API when configured (USE_MOCK:false + real API_BASE),
   otherwise the bundled mock catalogue.
   ============================================================================= */

import esbuild from "esbuild";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "../js/api/mock-data.js";
import { CONFIG } from "../js/config/config.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_URL = (process.env.SITE_URL || "https://ascollections.example").replace(/\/$/, "");
const BRAND = "AS Collections";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const imageUrl = (p) => (!p ? "" : /^https?:\/\//.test(p) ? p : CONFIG.IMAGE_CDN + String(p).replace(/^\//, ""));
const productUrl = (slug) => `/product/${slug}.html`;
const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/* Mirror of the JS productPlaceholder so the pre-rendered LCP image matches hydration. */
function placeholderDataUri(title, i = 0) {
  const tints = ["#F0EBE4", "#EFE7E6", "#ECEAE3", "#F1E9E2"];
  const bg = tints[i % tints.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${bg}"/><circle cx="200" cy="180" r="62" fill="none" stroke="#C9A86A" stroke-width="2"/><circle cx="200" cy="118" r="6" fill="#C9A86A"/><text x="200" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#1C1A19">${esc(title)}</text><text x="200" y="328" text-anchor="middle" font-family="sans-serif" font-size="11" letter-spacing="2" fill="#6B6460">AS COLLECTIONS</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* Above-the-fold HTML baked into the static page (instant LCP; JS re-hydrates). */
function aboveFold(p) {
  const img = p.images && p.images[0] ? imageUrl(p.images[0]) : placeholderDataUri(p.title);
  const discount = p.old_price && p.old_price > p.price ? Math.round(((p.old_price - p.price) / p.old_price) * 100) : 0;
  const breadcrumb = `<div class="container" id="breadcrumb" style="padding-top:var(--s-5)"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/pages/shop.html">Shop</a> › <span>${esc(p.title)}</span></nav></div>`;
  const gallery = `<div id="gallery"><div class="gallery gallery--single"><div class="gallery__stage"><img class="gallery__img" src="${img}" alt="${esc(p.title)}" width="800" height="800" fetchpriority="high" decoding="async"></div></div></div>`;
  const buy = `<div class="buy" id="buy"><h1 class="buy__title">${esc(p.title)}</h1>` +
    `<div class="buy__rating"><span class="card__star">★</span> ${p.rating_avg} (${p.rating_count} reviews)</div>` +
    `<div class="buy__price card__price"><span class="card__price-now">${inr(p.price)}</span>` +
    (p.old_price ? `<span class="card__price-old">${inr(p.old_price)}</span>` : "") +
    (discount ? `<span class="card__price-off">${discount}% off</span>` : "") + `</div></div>`;
  return { breadcrumb, gallery, buy };
}

/* ---- Catalogue ------------------------------------------------------------ */
async function loadCatalogue() {
  if (!CONFIG.USE_MOCK && CONFIG.API_BASE && !/REPLACE/.test(CONFIG.API_BASE)) {
    try {
      const pr = await (await fetch(`${CONFIG.API_BASE}?path=products&pageSize=9999`)).json();
      const ca = await (await fetch(`${CONFIG.API_BASE}?path=categories`)).json();
      if (pr.ok && ca.ok) { console.log("• Catalogue: live API"); return { products: pr.data.items, categories: ca.data }; }
    } catch (e) { console.warn("! Live fetch failed, using mock catalogue:", e.message); }
  }
  console.log("• Catalogue: mock");
  return { products: MOCK_PRODUCTS, categories: MOCK_CATEGORIES };
}

/* ---- Bundles -------------------------------------------------------------- */
const CSS_ORDER = [
  "tokens.css", "base.css", "components/button.css", "components/announcement-bar.css",
  "components/header.css", "components/hero.css", "components/section.css", "components/category-card.css",
  "components/product-card.css", "components/collection-band.css", "components/reviews.css", "components/trust.css",
  "components/plp.css", "components/search-modal.css", "components/quick-view.css", "components/pdp.css",
  "components/cart-drawer.css", "components/checkout.css",
];
const JS_ENTRIES = { main: "js/main.js", shop: "js/pages/shop.js", product: "js/pages/product.js", checkout: "js/pages/checkout.js", confirmation: "js/pages/confirmation.js" };

async function buildBundles() {
  await mkdir(path.join(ROOT, "dist"), { recursive: true });
  // CSS: an in-memory entry that @imports each file in order; esbuild inlines + minifies.
  const cssEntry = CSS_ORDER.map((f) => `@import "${f}";`).join("\n");
  await esbuild.build({
    stdin: { contents: cssEntry, resolveDir: path.join(ROOT, "css"), loader: "css" },
    bundle: true, minify: true, outfile: path.join(ROOT, "dist", "app.min.css"),
    external: ["*.woff2", "*.woff", "*.ttf", "*.png", "*.jpg", "*.webp", "*.svg"],
    logLevel: "warning",
  });
  for (const [name, entry] of Object.entries(JS_ENTRIES)) {
    await esbuild.build({
      entryPoints: [path.join(ROOT, entry)], bundle: true, minify: true, format: "iife",
      target: "es2019", outfile: path.join(ROOT, "dist", `${name}.min.js`), logLevel: "warning",
    });
  }
  console.log("• Bundled CSS + JS → dist/");
}

/* ---- Static product pages ------------------------------------------------- */
function jsonLd(p) {
  const inStock = (p.variants || []).some((v) => v.stock > 0);
  const product = {
    "@context": "https://schema.org/", "@type": "Product",
    name: p.title, description: p.description, sku: p.product_id,
    brand: { "@type": "Brand", name: BRAND },
    ...(p.images && p.images[0] ? { image: [imageUrl(p.images[0])] } : {}),
    ...(p.rating_count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating_avg, reviewCount: p.rating_count } } : {}),
    offers: { "@type": "Offer", priceCurrency: "INR", price: p.price, availability: `https://schema.org/${inStock ? "InStock" : "OutOfStock"}`, url: SITE_URL + productUrl(p.slug) },
  };
  const crumbs = {
    "@context": "https://schema.org/", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Shop", item: SITE_URL + "/pages/shop.html" },
      { "@type": "ListItem", position: 3, name: p.title, item: SITE_URL + productUrl(p.slug) },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(product)}</script>\n<script type="application/ld+json">${JSON.stringify(crumbs)}</script>`;
}

async function buildProductPages(products) {
  const tpl = await readFile(path.join(ROOT, "pages", "product.html"), "utf8");
  await mkdir(path.join(ROOT, "product"), { recursive: true });

  for (const p of products) {
    const canonical = SITE_URL + productUrl(p.slug);
    const desc = (p.description || `${p.title} — premium jewellery from ${BRAND}.`).slice(0, 160);
    const ogImg = p.images && p.images[0] ? imageUrl(p.images[0]) : "";
    const af = aboveFold(p);

    const head = `  <title>${esc(p.title)} — ${BRAND}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="theme-color" content="#7A2E2A" />
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="${BRAND}" />
  <meta property="og:title" content="${esc(p.title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${canonical}" />
  ${ogImg ? `<meta property="og:image" content="${esc(ogImg)}" />` : ""}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(p.title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  ${ogImg ? `<meta name="twitter:image" content="${esc(ogImg)}" />` : ""}
  <link rel="stylesheet" href="/dist/app.min.css" />
  ${jsonLd(p)}`;

    let html = tpl
      // swap the dev <title>
      .replace(/<title>[\s\S]*?<\/title>/, "")
      // swap the generic description meta
      .replace(/<meta name="description"[\s\S]*?\/>/, "")
      // swap all dev CSS links for the single bundle + add SEO head
      .replace(/<link rel="stylesheet" href="\/css\/tokens\.css"[\s\S]*?cart-drawer\.css" \/>/, head)
      // pre-render above-the-fold (instant LCP) — JS re-hydrates these
      .replace('<div class="container" id="breadcrumb" style="padding-top:var(--s-5)"></div>', af.breadcrumb)
      .replace('<div id="gallery"></div>', af.gallery)
      .replace('<div class="buy" id="buy"></div>', af.buy)
      // swap the module script for the bundle + bake the slug
      .replace(
        /<script type="module" src="\/js\/pages\/product\.js"><\/script>/,
        `<script>window.__SLUG__=${JSON.stringify(p.slug)}</script>\n  <script defer src="/dist/product.min.js"></script>`
      );

    await writeFile(path.join(ROOT, "product", `${p.slug}.html`), html, "utf8");
  }
  console.log(`• Generated ${products.length} static product pages → /product/`);
}

/* ---- sitemap + robots ----------------------------------------------------- */
async function buildSitemap(products, categories) {
  const urls = [
    { loc: SITE_URL + "/", priority: "1.0" },
    { loc: SITE_URL + "/pages/shop.html", priority: "0.8" },
    ...categories.map((c) => ({ loc: `${SITE_URL}/pages/shop.html?category=${c.category_id}`, priority: "0.7" })),
    ...products.map((p) => ({ loc: SITE_URL + productUrl(p.slug), priority: "0.9" })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join("\n") +
    `\n</urlset>\n`;
  await writeFile(path.join(ROOT, "sitemap.xml"), xml, "utf8");

  const robots = `User-agent: *\nAllow: /\nDisallow: /pages/checkout.html\nDisallow: /pages/order-confirmation.html\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  await writeFile(path.join(ROOT, "robots.txt"), robots, "utf8");
  console.log("• Wrote sitemap.xml + robots.txt");
}

/* ---- Run ------------------------------------------------------------------ */
const { products, categories } = await loadCatalogue();
await buildBundles();
await buildProductPages(products);
await buildSitemap(products, categories);
console.log(`✓ Build complete. SITE_URL=${SITE_URL}`);
