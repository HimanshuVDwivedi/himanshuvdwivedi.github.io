/* =============================================================================
   AS COLLECTIONS — CART STORE
   localStorage-backed cart: line items + applied coupon + gift note, with a
   single getTotals() that computes subtotal / discount / shipping / total.
   (localStorage is the intended persistence layer for this static site —
   SDLC Part 1, §4: "Local Storage Cart".) Money shown here is for DISPLAY;
   the server re-prices authoritatively at checkout (M6).
   ============================================================================= */

import { CONFIG } from "../config/config.js";

const KEY = "as_cart_v1";
const subscribers = [];

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { items: [], coupon: null, giftNote: "" }; }
  catch { return { items: [], coupon: null, giftNote: "" }; }
}
let store = load();
// migrate older shape (array of items only)
if (Array.isArray(store)) store = { items: store, coupon: null, giftNote: "" };

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
  subscribers.forEach((fn) => fn(store));
}

/* ---- Reads ---------------------------------------------------------------- */
export function getItems() { return store.items; }
export function getCount() { return store.items.reduce((n, i) => n + i.qty, 0); }
export function getSubtotal() { return store.items.reduce((s, i) => s + i.price * i.qty, 0); }
export function getCoupon() { return store.coupon; }
export function getGiftNote() { return store.giftNote || ""; }

/**
 * Compute display totals. Recomputes the coupon discount against the CURRENT
 * subtotal, so a coupon silently deactivates if the basket drops below its
 * min_order (couponActive=false) without being removed.
 */
export function getTotals() {
  const subtotal = getSubtotal();
  const c = store.coupon;
  let discount = 0, couponActive = false;
  if (c) {
    if (subtotal >= (c.min_order || 0)) {
      couponActive = true;
      discount = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
    }
  }
  const afterDiscount = Math.max(0, subtotal - discount);
  const freeShip = afterDiscount >= CONFIG.FREE_SHIPPING_THRESHOLD || subtotal === 0;
  const shipping = freeShip ? 0 : CONFIG.SHIPPING_FEE;
  const total = afterDiscount + shipping;
  const toFreeShip = Math.max(0, CONFIG.FREE_SHIPPING_THRESHOLD - afterDiscount);
  return { subtotal, discount, couponActive, shipping, total, freeShip, toFreeShip };
}

/* ---- Writes --------------------------------------------------------------- */
/** @param {object} line {product_id, variant_id, title, price, image, slug, option, stock, qty} */
export function addItem(line) {
  const found = store.items.find((i) => i.product_id === line.product_id && i.variant_id === line.variant_id);
  if (found) found.qty += line.qty;
  else store.items.push({ ...line });
  persist();
  window.dispatchEvent(new CustomEvent("cart:added")); // drawer auto-opens
}

export function setQty(product_id, variant_id, qty) {
  const i = store.items.findIndex((x) => x.product_id === product_id && x.variant_id === variant_id);
  if (i === -1) return;
  if (qty <= 0) store.items.splice(i, 1);
  else store.items[i].qty = qty;
  persist();
}

export function removeItem(product_id, variant_id) {
  store.items = store.items.filter((i) => !(i.product_id === product_id && i.variant_id === variant_id));
  persist();
}

export function applyCoupon(coupon) { store.coupon = coupon; persist(); }
export function clearCoupon() { store.coupon = null; persist(); }
export function setGiftNote(text) { store.giftNote = text; persist(); }
export function clearCart() { store = { items: [], coupon: null, giftNote: "" }; persist(); }

/** Subscribe to any cart change; fires immediately. */
export function subscribe(fn) {
  subscribers.push(fn);
  fn(store);
  return () => { const i = subscribers.indexOf(fn); if (i > -1) subscribers.splice(i, 1); };
}
