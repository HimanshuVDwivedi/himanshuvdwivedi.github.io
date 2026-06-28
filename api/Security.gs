/** =============================================================================
 *  AS COLLECTIONS — SECURITY HARDENING (M8)
 *  Server-side input validation, sanitization, and rate limiting for the write
 *  endpoints. Belt-and-braces: the client validates too, but the server NEVER
 *  trusts client input — it re-validates, bounds, and sanitizes everything that
 *  reaches the Sheet.
 *  ========================================================================== */

/**
 * Sanitize a free-text value before it's written to the Sheet.
 * - caps length, strips control characters
 * - neutralises spreadsheet FORMULA INJECTION: a cell beginning with = + - @
 *   (or a tab/CR) can execute when the sheet is opened, so we prefix a quote.
 */
function sanitizeCell(s, maxLen) {
  if (s == null) return "";
  s = String(s).slice(0, maxLen || 500).replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "")); }
function isPhone(s) { return /^[6-9]\d{9}$/.test(String(s || "")); }

/** Coupon codes: uppercase alphanumerics only, capped length. */
function sanitizeCouponCode(s) {
  return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
}

/** Validate the structure + bounds of an order body. Throws on violation. */
function validateOrderInput(body) {
  const items = body && body.items;
  if (!Array.isArray(items) || !items.length) throw { code: "EMPTY", message: "Your cart is empty." };
  if (items.length > 50) throw { code: "TOO_MANY", message: "Too many items in one order." };
  items.forEach(function (it) {
    if (!it || typeof it.product_id !== "string" || typeof it.variant_id !== "string") {
      throw { code: "BAD_ITEM", message: "Invalid item in cart." };
    }
    if (it.product_id.length > 40 || it.variant_id.length > 40) throw { code: "BAD_ITEM", message: "Invalid item id." };
    const q = parseInt(it.qty, 10);
    if (!(q >= 1 && q <= 10)) throw { code: "BAD_QTY", message: "Quantity must be between 1 and 10." };
  });
  const c = (body && body.customer) || {};
  if (!isEmail(c.email)) throw { code: "BAD_EMAIL", message: "Enter a valid email address." };
  if (c.phone && !isPhone(c.phone)) throw { code: "BAD_PHONE", message: "Enter a valid 10-digit mobile number." };
}

/** Sanitize an address object written to the Sheet. */
function sanitizeAddress(a) {
  a = a || {};
  return {
    name: sanitizeCell(a.name, 80), line1: sanitizeCell(a.line1, 120), line2: sanitizeCell(a.line2, 120),
    city: sanitizeCell(a.city, 60), state: sanitizeCell(a.state, 60), pincode: sanitizeCell(a.pincode, 10),
  };
}

/**
 * Crude global rate limit using CacheService (Apps Script can't see client IPs).
 * Caps total writes per rolling minute to protect the sensitive endpoints from
 * runaway loops / abuse. For per-client limiting in production, front the web
 * app with Cloudflare / an API gateway (documented in the M8 guide).
 */
function checkRateLimit(maxPerMinute) {
  const cache = CacheService.getScriptCache();
  const key = "rl:" + Math.floor(Date.now() / 60000);
  const n = parseInt(cache.get(key) || "0", 10) + 1;
  cache.put(key, String(n), 120);
  if (n > (maxPerMinute || 600)) throw { code: "RATE_LIMITED", message: "Too many requests. Please try again shortly." };
}
