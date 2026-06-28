/* =============================================================================
   AS COLLECTIONS — CART DRAWER
   Off-canvas cart. Built ONCE with persistent inputs (coupon field, gift-note
   textarea) so a re-render never clobbers what the user is typing; only the
   dynamic parts (line items, totals, progress, coupon state) update on change.
   Opens from the header cart icon and auto-opens on add-to-cart.
   ============================================================================= */

import { CONFIG } from "../config/config.js";
import { qs, qsa, el, on } from "../utilities/dom.js";
import { imageUrl, validateCoupon } from "../api/client.js";
import { formatINR } from "../utilities/money.js";
import { productPlaceholder } from "../utilities/placeholder.js";
import { productUrl } from "../utilities/links.js";
import { trapFocus, setOverlayOpen } from "../utilities/focus.js";
import {
  getItems, getCount, getSubtotal, getTotals,
  setQty, removeItem, applyCoupon, clearCoupon, getCoupon, setGiftNote, getGiftNote, subscribe,
} from "../state/cart.js";

let drawer, backdrop, refs = {};

function buildShell() {
  if (drawer) return;

  /* Persistent inputs (created once). */
  const couponInput = el("input", { class: "input cart-coupon__input", type: "text", placeholder: "Coupon code", "aria-label": "Coupon code", autocomplete: "off" });
  const couponBtn = el("button", { class: "btn btn--secondary cart-coupon__btn" }, "Apply");
  const couponMsg = el("p", { class: "cart-coupon__msg" });
  const couponInputRow = el("div", { class: "cart-coupon__row" }, couponInput, couponBtn);
  const couponApplied = el("div", { class: "cart-coupon__applied", hidden: true });

  const giftToggle = el("button", { class: "cart-gift__toggle", "aria-expanded": "false" }, "+ Add a gift note");
  const giftArea = el("textarea", { class: "input cart-gift__area", rows: "3", placeholder: "Add a note (optional)", "aria-label": "Gift note", hidden: true });
  giftArea.value = getGiftNote();

  const lines = el("div", { class: "cart-lines", id: "cart-lines" });
  const empty = el("div", { class: "cart-empty", hidden: true },
    el("p", {}, "Your cart is empty."),
    el("button", { class: "btn btn--primary cart-empty__cta" }, "Continue shopping"));

  const progressFill = el("span", { class: "cart-progress__fill" });
  const progressMsg = el("p", { class: "cart-progress__msg" });
  const progress = el("div", { class: "cart-progress" }, progressMsg, el("div", { class: "cart-progress__track" }, progressFill));

  const sumSubtotal = el("span", {});
  const sumDiscountRow = el("div", { class: "cart-sum__row cart-sum__row--discount", hidden: true }, el("span", {}, "Discount"), (refs.sumDiscount = el("span", {})));
  const sumShipping = el("span", {});
  const sumTotal = el("span", { class: "cart-sum__total-val" });

  const checkoutBtn = el("a", { class: "btn btn--primary btn--block", href: "/pages/checkout.html" }, "Checkout");
  const continueBtn = el("button", { class: "btn btn--ghost btn--block cart-continue" }, "Continue shopping");

  const foot = el("div", { class: "cart-drawer__foot", id: "cart-foot" },
    progress,
    el("div", { class: "cart-coupon" }, couponInputRow, couponMsg, couponApplied),
    el("div", { class: "cart-gift" }, giftToggle, giftArea),
    el("div", { class: "cart-sum" },
      el("div", { class: "cart-sum__row" }, el("span", {}, "Subtotal"), sumSubtotal),
      sumDiscountRow,
      el("div", { class: "cart-sum__row" }, el("span", {}, "Shipping"), sumShipping),
      el("div", { class: "cart-sum__row cart-sum__total" }, el("span", {}, "Total"), sumTotal)),
    checkoutBtn, continueBtn);

  const head = el("div", { class: "cart-drawer__head" },
    el("h2", { class: "cart-drawer__title" }, "Your Cart (", (refs.count = el("span", {}, "0")), ")"),
    el("button", { class: "icon-btn", id: "cart-close", "aria-label": "Close cart", html: "✕" }));

  const body = el("div", { class: "cart-drawer__body" }, lines, empty);

  drawer = el("aside", { class: "cart-drawer", id: "cart-drawer", "aria-hidden": "true", "aria-label": "Shopping cart", inert: "" }, head, body, foot);
  backdrop = el("div", { class: "cart-backdrop", id: "cart-backdrop" });
  document.body.append(backdrop, drawer);

  Object.assign(refs, { lines, empty, foot, couponInput, couponBtn, couponMsg, couponInputRow, couponApplied, giftToggle, giftArea, progressFill, progressMsg, sumSubtotal, sumDiscountRow, sumShipping, sumTotal, checkoutBtn });

  /* Wiring */
  on(qs("#cart-close", drawer), "click", close);
  on(backdrop, "click", close);
  on(continueBtn, "click", close);
  on(qs(".cart-empty__cta", empty), "click", close);
  on(document, "keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("is-open")) close(); });

  on(couponBtn, "click", applyCouponFlow);
  on(couponInput, "keydown", (e) => { if (e.key === "Enter") applyCouponFlow(); });

  on(giftToggle, "click", () => {
    const openNow = giftArea.hidden;
    giftArea.hidden = !openNow;
    giftToggle.setAttribute("aria-expanded", String(openNow));
    if (openNow) giftArea.focus();
  });
  let giftTimer;
  on(giftArea, "input", () => { clearTimeout(giftTimer); giftTimer = setTimeout(() => setGiftNote(giftArea.value), 250); });

  subscribe(renderDynamic);
}

async function applyCouponFlow() {
  const code = refs.couponInput.value.trim();
  if (!code) return;
  refs.couponMsg.textContent = "Checking…";
  refs.couponMsg.className = "cart-coupon__msg";
  const res = await validateCoupon(code, getSubtotal());
  if (res.ok) {
    applyCoupon(res.data);              // store change → renderDynamic
    refs.couponInput.value = "";
    refs.couponMsg.textContent = "";
  } else {
    refs.couponMsg.textContent = res.error.message;
    refs.couponMsg.className = "cart-coupon__msg is-error";
  }
}

function lineItem(item) {
  const fb = productPlaceholder(item.title, 0);
  const img = el("img", { class: "cart-line__img", src: item.image ? imageUrl(item.image) : fb, alt: "", width: "72", height: "72" });
  img.addEventListener("error", () => { img.src = fb; }, { once: true });

  const max = item.stock || 10;
  const dec = el("button", { class: "qty__btn", "aria-label": "Decrease quantity" }, "–");
  const inc = el("button", { class: "qty__btn", "aria-label": "Increase quantity" }, "+");
  dec.disabled = item.qty <= 1;
  inc.disabled = item.qty >= max;
  on(dec, "click", () => setQty(item.product_id, item.variant_id, item.qty - 1));
  on(inc, "click", () => setQty(item.product_id, item.variant_id, item.qty + 1));

  const remove = el("button", { class: "cart-line__remove", "aria-label": `Remove ${item.title}` }, "Remove");
  on(remove, "click", () => removeItem(item.product_id, item.variant_id));

  return el("div", { class: "cart-line" },
    el("a", { href: productUrl(item.slug), class: "cart-line__media" }, img),
    el("div", { class: "cart-line__info" },
      el("a", { class: "cart-line__title", href: productUrl(item.slug) }, item.title),
      item.option ? el("div", { class: "cart-line__option" }, item.option) : null,
      el("div", { class: "cart-line__price" }, formatINR(item.price * item.qty)),
      el("div", { class: "cart-line__controls" },
        el("div", { class: "qty qty--sm" }, dec, el("output", { class: "qty__value" }, String(item.qty)), inc),
        remove)));
}

function renderDynamic() {
  if (!drawer) return;
  const items = getItems();
  const t = getTotals();

  refs.count.textContent = String(getCount());

  // Lines / empty
  refs.lines.innerHTML = "";
  const isEmpty = items.length === 0;
  refs.empty.hidden = !isEmpty;
  refs.lines.hidden = isEmpty;
  refs.foot.hidden = isEmpty;
  items.forEach((i) => refs.lines.append(lineItem(i)));

  if (isEmpty) return;

  // Free-shipping progress
  if (t.freeShip) {
    refs.progressMsg.textContent = "You’ve unlocked free shipping 🎉";
    refs.progressFill.style.width = "100%";
  } else {
    refs.progressMsg.textContent = `Add ${formatINR(t.toFreeShip)} for free shipping`;
    const pct = Math.min(100, ((CONFIG.FREE_SHIPPING_THRESHOLD - t.toFreeShip) / CONFIG.FREE_SHIPPING_THRESHOLD) * 100);
    refs.progressFill.style.width = `${pct}%`;
  }

  // Coupon state
  const c = getCoupon();
  if (c) {
    refs.couponInputRow.hidden = true;
    refs.couponMsg.textContent = "";
    refs.couponApplied.hidden = false;
    refs.couponApplied.innerHTML = "";
    const note = !t.couponActive ? ` (add ${formatINR((c.min_order || 0) - t.subtotal)} to apply)` : "";
    const removeBtn = el("button", { class: "cart-coupon__remove", "aria-label": "Remove coupon" }, "✕");
    on(removeBtn, "click", clearCoupon);
    refs.couponApplied.append(el("span", { class: "cart-coupon__code" }, `${c.code}${note}`), removeBtn);
  } else {
    refs.couponInputRow.hidden = false;
    refs.couponApplied.hidden = true;
  }

  // Summary
  refs.sumSubtotal.textContent = formatINR(t.subtotal);
  refs.sumDiscountRow.hidden = t.discount <= 0;
  if (t.discount > 0) refs.sumDiscount.textContent = `– ${formatINR(t.discount)}`;
  refs.sumShipping.textContent = t.shipping === 0 ? "Free" : formatINR(t.shipping);
  refs.sumTotal.textContent = formatINR(t.total);
}

let cartLastFocused = null, cartTrap = null;
export function openCart() {
  buildShell();
  cartLastFocused = document.activeElement;
  drawer.classList.add("is-open"); backdrop.classList.add("is-open");
  setOverlayOpen(drawer, true); document.body.style.overflow = "hidden";
  (qs("#cart-close", drawer) || drawer).focus();
  cartTrap = trapFocus(drawer);
}
function close() {
  drawer.classList.remove("is-open"); backdrop.classList.remove("is-open");
  setOverlayOpen(drawer, false); document.body.style.overflow = "";
  cartTrap && cartTrap(); cartLastFocused && cartLastFocused.focus();
}

/** Wire the header cart button(s) + auto-open on add. */
export function initCart() {
  buildShell();
  qsa('[aria-label="Cart"]').forEach((btn) => on(btn, "click", openCart));
  on(window, "cart:added", openCart);
}
