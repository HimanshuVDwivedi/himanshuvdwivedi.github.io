/* =============================================================================
   AS COLLECTIONS — MONEY UTILITIES
   Display-only formatting. All authoritative money math happens server-side
   (Apps Script) — the client never computes the price the customer pays.
   ============================================================================= */

/**
 * Format a number as Indian Rupees with Indian digit grouping (₹2,49,999).
 * @param {number} amount
 * @returns {string}
 */
export function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Whole-number discount percentage from an old → new price.
 * @returns {number|null} e.g. 29, or null when there is no valid old price.
 */
export function discountPercent(oldPrice, price) {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
