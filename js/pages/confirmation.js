/* =============================================================================
   AS COLLECTIONS — ORDER CONFIRMATION
   Reads the order snapshot saved at successful payment and renders a thank-you
   with the order id, items, totals, and shipping address. (Live deployments can
   also fetch the order from the API; the snapshot covers both mock + live.)
   ============================================================================= */

import { qs, el } from "../utilities/dom.js";
import { formatINR } from "../utilities/money.js";

document.documentElement.classList.add("js");

const orderId = new URLSearchParams(location.search).get("order");

function load() {
  try { return JSON.parse(localStorage.getItem("as_last_order")); } catch { return null; }
}

document.addEventListener("DOMContentLoaded", () => {
  const snap = load();
  qs("#confirm-id").textContent = orderId || (snap && snap.order_id) || "—";

  if (!snap) { qs("#confirm-detail").hidden = true; return; }

  const items = qs("#confirm-items");
  snap.items.forEach((i) => {
    items.append(el("div", { class: "confirm__row" },
      el("span", {}, `${i.title}${i.option ? " · " + i.option : ""} × ${i.qty}`),
      el("span", {}, formatINR(i.price * i.qty))));
  });

  const t = snap.totals;
  const rows = qs("#confirm-totals");
  rows.append(el("div", { class: "confirm__row" }, el("span", {}, "Subtotal"), el("span", {}, formatINR(t.subtotal))));
  if (t.discount > 0) rows.append(el("div", { class: "confirm__row" }, el("span", {}, "Discount"), el("span", {}, `– ${formatINR(t.discount)}`)));
  rows.append(el("div", { class: "confirm__row" }, el("span", {}, "Shipping"), el("span", {}, t.shipping === 0 ? "Free" : formatINR(t.shipping))));
  rows.append(el("div", { class: "confirm__row confirm__row--total" }, el("span", {}, "Total paid"), el("span", {}, formatINR(t.total))));

  const a = snap.shipping;
  qs("#confirm-address").textContent = `${a.name}, ${a.line1}${a.line2 ? ", " + a.line2 : ""}, ${a.city}, ${a.state} ${a.pincode}`;
  qs("#confirm-email").textContent = snap.customer.email;
});
