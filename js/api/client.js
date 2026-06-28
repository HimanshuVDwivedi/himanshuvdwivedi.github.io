/* =============================================================================
   AS COLLECTIONS — API CLIENT  (★ THE MIGRATION SEAM ★)
   This is the ONLY module in the frontend that knows where data comes from.
   Every component calls these functions and never fetches directly.

   Today (M0): USE_MOCK = true → returns local mock data.
   M1: flip USE_MOCK = false → same functions hit the Apps Script Web App.
   Migration (later): rewrite ONLY the fetch internals here to point at a new
   backend. No component changes. This is why §4 of Part 1 calls it the seam.

   Every response uses one envelope, mirroring the live API exactly:
     { ok: true,  data: <payload>, error: null }
     { ok: false, data: null,     error: { code, message } }
   ============================================================================= */

import { CONFIG } from "../config/config.js";
import { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_COLLECTIONS, MOCK_COUPONS } from "./mock-data.js";

/* ---- envelope helpers ----------------------------------------------------- */
const ok = (data) => ({ ok: true, data, error: null });
const fail = (code, message) => ({ ok: false, data: null, error: { code, message } });

/* Simulate realistic network latency so loading states are exercised in dev. */
/* Dev mock latency. 0 by default so it doesn't double-count against Lighthouse's
   own throttling; real latency comes from the live API in production. */
const delay = (ms = 0) => (ms ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

/* Resolve a stored image path to a full jsDelivr CDN URL. */
export const imageUrl = (path) =>
  /^https?:\/\//.test(path) ? path : CONFIG.IMAGE_CDN + path.replace(/^\//, "");

/* ---- live transport (used when USE_MOCK = false) --------------------------
   Two Apps-Script realities handled here:
   1) Web App responses are always HTTP 200 and carry status in the envelope,
      so we trust the envelope, not res.ok.
   2) Cross-origin POST with application/json triggers a CORS preflight that
      Apps Script can't answer. Sending the body as text/plain keeps it a
      "simple request" (no preflight); doPost() JSON.parses it server-side. */
async function request(path, { method = "GET", body, params } = {}) {
  try {
    const url = new URL(CONFIG.API_BASE);
    url.searchParams.set("path", path);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
      }
    }

    const opts = { method, redirect: "follow" };
    if (method !== "GET" && body) {
      opts.headers = { "Content-Type": "text/plain;charset=utf-8" }; // avoid preflight
      opts.body = JSON.stringify({ path, ...body });
    }

    const res = await fetch(url, opts);
    const json = await res.json();           // backend already returns the envelope
    return json && "ok" in json ? json : fail("BAD_RESPONSE", "Unexpected server response");
  } catch (err) {
    return fail("NETWORK", "Could not reach the server. Please try again.");
  }
}

/* =============================================================================
   PUBLIC API — components depend on these signatures, not on the transport.
   ============================================================================= */

/**
 * List products with optional filtering/sorting/paging.
 * @param {object} opts { category, collection, sort, page, pageSize, search }
 */
export async function getProducts(opts = {}) {
  if (CONFIG.USE_MOCK) {
    await delay();
    let items = [...MOCK_PRODUCTS];

    if (opts.category)   items = items.filter((p) => p.category_id === opts.category);
    if (opts.collection) items = items.filter((p) => p.collection_ids.includes(opts.collection));
    if (opts.priceMin != null && opts.priceMin !== "") items = items.filter((p) => p.price >= +opts.priceMin);
    if (opts.priceMax != null && opts.priceMax !== "") items = items.filter((p) => p.price <= +opts.priceMax);
    if (opts.availability === "in") {
      items = items.filter((p) => !(Array.isArray(p.variants) && p.variants.every((v) => v.stock <= 0)));
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      items = items.filter((p) => p.title.toLowerCase().includes(q));
    }
    switch (opts.sort) {
      case "price-asc":  items.sort((a, b) => a.price - b.price); break;
      case "price-desc": items.sort((a, b) => b.price - a.price); break;
      case "newest":     items.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case "az":         items.sort((a, b) => a.title.localeCompare(b.title)); break;
      default: /* best-selling = mock order */ break;
    }
    const page = opts.page || 1;
    const size = opts.pageSize || items.length;
    const total = items.length;
    const paged = items.slice((page - 1) * size, page * size);
    return ok({ items: paged, total, page, pageSize: size });
  }
  return request("products", { params: opts });
}

/** One product (+ variants) by slug. */
export async function getProduct(slug) {
  if (CONFIG.USE_MOCK) {
    await delay();
    const product = MOCK_PRODUCTS.find((p) => p.slug === slug);
    return product ? ok(product) : fail("NOT_FOUND", "Product not found");
  }
  return request("product", { params: { slug } });
}

/** Category taxonomy. */
export async function getCategories() {
  if (CONFIG.USE_MOCK) { await delay(120); return ok(MOCK_CATEGORIES); }
  return request("categories");
}

/** Collection taxonomy. */
export async function getCollections() {
  if (CONFIG.USE_MOCK) { await delay(120); return ok(MOCK_COLLECTIONS); }
  return request("collections");
}

/**
 * Validate a coupon against the current subtotal. Returns the coupon descriptor
 * { code, type, value, min_order } on success; the cart recomputes the discount.
 * Authoritative re-validation happens server-side again at order/create (M6).
 */
export async function validateCoupon(code, subtotal) {
  if (CONFIG.USE_MOCK) {
    await delay(160);
    const c = MOCK_COUPONS.find((x) => x.code.toUpperCase() === String(code).trim().toUpperCase());
    if (!c || !c.is_active) return fail("INVALID_COUPON", "That code isn’t valid.");
    if (c.expires_at && new Date(c.expires_at) < new Date()) return fail("EXPIRED", "This code has expired.");
    if (c.usage_limit && c.used_count >= c.usage_limit) return fail("USED_UP", "This code is no longer available.");
    if (subtotal < (c.min_order || 0)) {
      const need = c.min_order - subtotal;
      return fail("MIN_ORDER", `Add ₹${need.toLocaleString("en-IN")} more to use this code.`);
    }
    return ok({ code: c.code, type: c.type, value: c.value, min_order: c.min_order });
  }
  return request("coupon/validate", { method: "POST", body: { code, subtotal } });
}

/* ---- Checkout / orders (M6) ------------------------------------------------
   SECURITY: the client sends ONLY items+qty, the coupon code, and customer/
   address details — NEVER prices or totals. The server (mock here, Apps Script
   live) re-prices from the catalogue authoritatively. */

/* Mock-only re-pricing, mirroring the server's authoritative calculation. */
function priceOrderMock(items, couponCode) {
  let subtotal = 0;
  const lines = [];
  for (const it of items) {
    const p = MOCK_PRODUCTS.find((x) => x.product_id === it.product_id);
    if (!p) return { error: fail("BAD_ITEM", "A product in your cart is unavailable.") };
    const v = (p.variants || []).find((x) => x.variant_id === it.variant_id) || {};
    const unit = p.price + (v.price_delta || 0);
    const line_total = unit * it.qty;
    subtotal += line_total;
    lines.push({ product_id: p.product_id, variant_id: it.variant_id, qty: it.qty, unit_price: unit, line_total });
  }
  let discount = 0;
  if (couponCode) {
    const c = MOCK_COUPONS.find((x) => x.code.toUpperCase() === String(couponCode).toUpperCase());
    if (c && c.is_active && subtotal >= (c.min_order || 0)) {
      discount = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
    }
  }
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping = afterDiscount >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_FEE;
  const total = afterDiscount + shipping;
  return { lines, subtotal, discount, shipping, total };
}

/**
 * Create an order. Body: { items:[{product_id,variant_id,qty}], coupon,
 * customer:{email,phone,name}, shipping, billing, giftNote }.
 * Returns { order_id, razorpay_order_id, amount(paise), currency, key_id, summary }.
 */
export async function createOrder(body) {
  if (CONFIG.USE_MOCK) {
    await delay(300);
    const priced = priceOrderMock(body.items || [], body.coupon);
    if (priced.error) return priced.error;
    return ok({
      order_id: "AS-" + Date.now(),
      razorpay_order_id: "order_mock_" + Math.random().toString(36).slice(2, 10),
      amount: priced.total * 100,
      currency: "INR",
      key_id: CONFIG.RAZORPAY_KEY_ID,
      mock: true,
      summary: { subtotal: priced.subtotal, discount: priced.discount, shipping: priced.shipping, total: priced.total },
    });
  }
  return request("order/create", { method: "POST", body });
}

/** Verify payment + finalise the order (signature check + stock decrement server-side). */
export async function verifyOrder(body) {
  if (CONFIG.USE_MOCK) {
    await delay(400);
    return ok({ order_id: body.order_id, status: "paid" });
  }
  return request("order/verify", { method: "POST", body });
}
export const getNewArrivals = () => getProducts({ sort: "newest", pageSize: 8 });
export const getBestSellers = async () => {
  const r = await getProducts({ pageSize: 12 });
  if (r.ok) r.data.items = r.data.items.filter((p) => p.is_bestseller).slice(0, 8);
  return r;
};
export const getTrending = async () => {
  const r = await getProducts({ pageSize: 12 });
  if (r.ok) r.data.items = r.data.items.filter((p) => p.is_trending).slice(0, 8);
  return r;
};
