/* =============================================================================
   AS COLLECTIONS — QUICK VIEW
   A modal that loads a product by slug and offers mini gallery + variant + qty +
   add-to-cart, without leaving the listing. Reuses the PDP primitives.
   initQuickView() delegates clicks on any [data-quickview="slug"] element.
   ============================================================================= */

import { qs, el, on } from "../utilities/dom.js";
import { getProduct } from "../api/client.js";
import { Gallery } from "./gallery.js";
import { VariantSelector } from "./variant-selector.js";
import { QuantityStepper } from "./quantity-stepper.js";
import { addItem } from "../state/cart.js";
import { toast } from "./toast.js";
import { formatINR, discountPercent } from "../utilities/money.js";
import { productUrl } from "../utilities/links.js";
import { trapFocus, setOverlayOpen } from "../utilities/focus.js";

let modal, body;

function ensure() {
  if (modal) return;
  body = el("div", { class: "qv__body" });
  const panel = el("div", { class: "qv__panel", role: "dialog", "aria-modal": "true", "aria-label": "Quick view" },
    el("button", { class: "qv__close", "aria-label": "Close quick view", html: "✕" }), body);
  modal = el("div", { class: "qv", id: "quickview", "aria-hidden": "true", inert: "" }, panel);
  document.body.append(modal);
  on(qs(".qv__close", modal), "click", close);
  on(modal, "click", (e) => { if (e.target === modal) close(); });
  on(document, "keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) close(); });
}
let qvLastFocused = null, qvTrap = null;
function open() {
  qvLastFocused = document.activeElement;
  modal.classList.add("is-open"); setOverlayOpen(modal, true); document.body.style.overflow = "hidden";
  qvTrap = trapFocus(modal);
}
function close() {
  modal.classList.remove("is-open"); setOverlayOpen(modal, false); document.body.style.overflow = "";
  qvTrap && qvTrap(); qvLastFocused && qvLastFocused.focus();
}

export async function openQuickView(slug) {
  ensure();
  body.innerHTML = "";
  open();

  const res = await getProduct(slug);
  if (!res.ok) { body.append(el("p", { class: "qv__error" }, "Couldn’t load this product.")); return; }
  const p = res.data;
  const off = discountPercent(p.old_price, p.price);

  const variant = VariantSelector(p, (v) => stepper.setMax(v ? v.stock : 1));
  const sel0 = variant.getSelected();
  const stepper = QuantityStepper(sel0 ? sel0.stock : 1);

  const add = el("button", { class: "btn btn--primary btn--block" }, "Add to cart");
  add.addEventListener("click", () => {
    const v = variant.getSelected();
    if (!v || v.stock <= 0) { toast("Please select an available option"); return; }
    addItem({ product_id: p.product_id, variant_id: v.variant_id, title: p.title, price: p.price,
      image: p.images && p.images[0] ? p.images[0] : "", slug: p.slug,
      option: `${v.option_name}: ${v.option_value}`, stock: v.stock, qty: stepper.getValue() });
    toast("Added to cart");
    close();
  });

  const info = el("div", { class: "qv__info" },
    el("h2", { class: "qv__title" }, p.title),
    el("div", { class: "qv__price card__price" },
      el("span", { class: "card__price-now" }, formatINR(p.price)),
      p.old_price ? el("span", { class: "card__price-old" }, formatINR(p.old_price)) : null,
      off ? el("span", { class: "card__price-off" }, `${off}% off`) : null),
    variant.element,
    el("div", { class: "qv__qty" }, stepper.element),
    add,
    el("a", { class: "qv__link", href: productUrl(p.slug) }, "View full details →")
  );

  body.append(Gallery(p), info);
}

/** Delegate clicks on [data-quickview] anywhere on the page. */
export function initQuickView() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-quickview]");
    if (t) { e.preventDefault(); openQuickView(t.getAttribute("data-quickview")); }
  });
}
