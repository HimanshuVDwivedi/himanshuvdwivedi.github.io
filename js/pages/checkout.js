/* =============================================================================
   AS COLLECTIONS — CHECKOUT CONTROLLER
   Guest-first checkout. Builds contact + shipping (+ optional billing) forms and
   a server-priced order summary, then runs the payment flow:
     createOrder (server re-prices)  →  Razorpay (or mock)  →  verifyOrder
     (signature + stock decrement server-side)  →  confirmation.
   The client sends ONLY items+qty+coupon+addresses. Never prices.
   ============================================================================= */

import { qs, el, on } from "../utilities/dom.js";
import { CONFIG } from "../config/config.js";
import { formatINR } from "../utilities/money.js";
import { imageUrl, createOrder, verifyOrder } from "../api/client.js";
import { productPlaceholder } from "../utilities/placeholder.js";
import { getItems, getTotals, getCoupon, getGiftNote, clearCart } from "../state/cart.js";
import { AddressForm } from "../components/address-form.js";
import { toast } from "../components/toast.js";

document.documentElement.classList.add("js");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/; // Indian mobile

let shipForm, billForm, emailInput, phoneInput, payBtn;

/* ---- Contact + form scaffolding ------------------------------------------- */
function field(id, label, attrs = {}) {
  const input = el("input", { class: "input", id, name: id, ...attrs });
  const err = el("p", { class: "field__err", id: id + "-err" });
  const wrap = el("div", { class: "field" }, el("label", { class: "field__label", for: id }, label), input, err);
  return { wrap, input, err };
}
function setErr(f, msg) { f.err.textContent = msg || ""; f.input.classList.toggle("is-invalid", !!msg); }

function buildForm() {
  const form = qs("#checkout-form");

  const email = field("email", "Email", { type: "email", autocomplete: "email", placeholder: "you@email.com" });
  const phone = field("phone", "Phone", { inputmode: "numeric", maxlength: "10", autocomplete: "tel", placeholder: "10-digit mobile" });
  emailInput = email.input; phoneInput = phone.input;

  form.append(
    el("section", { class: "checkout__section" },
      el("div", { class: "checkout__section-head" },
        el("h2", {}, "Contact"),
        el("span", { class: "checkout__login" }, "Returning? Log in (coming soon)")),
      el("div", { class: "field-row" }, email.wrap, phone.wrap))
  );

  shipForm = AddressForm("ship");
  form.append(el("section", { class: "checkout__section" }, el("h2", {}, "Shipping address"), shipForm.element));

  // Billing toggle
  const sameWrap = el("label", { class: "checkout__same" });
  const sameCb = el("input", { type: "checkbox", checked: true });
  sameWrap.append(sameCb, el("span", {}, "Billing address same as shipping"));
  const billMount = el("div", { hidden: true });
  billForm = AddressForm("bill");
  billMount.append(el("h2", {}, "Billing address"), billForm.element);
  sameCb.addEventListener("change", () => { billMount.hidden = sameCb.checked; });
  form.append(el("section", { class: "checkout__section" }, sameWrap, billMount));
  form._sameCb = sameCb;
}

/* ---- Order summary (display only — server re-prices) ---------------------- */
function renderSummary() {
  const items = getItems();
  const t = getTotals();
  const c = getCoupon();
  const mount = qs("#summary-lines");
  mount.innerHTML = "";
  items.forEach((i) => {
    const fb = productPlaceholder(i.title, 0);
    const img = el("img", { class: "sum-line__img", src: i.image ? imageUrl(i.image) : fb, alt: "", width: "48", height: "48" });
    img.addEventListener("error", () => { img.src = fb; }, { once: true });
    mount.append(el("div", { class: "sum-line" },
      el("div", { class: "sum-line__media" }, img, el("span", { class: "sum-line__qty" }, String(i.qty))),
      el("div", { class: "sum-line__info" }, el("span", { class: "sum-line__title" }, i.title), i.option ? el("span", { class: "sum-line__opt" }, i.option) : null),
      el("span", { class: "sum-line__price" }, formatINR(i.price * i.qty))));
  });

  qs("#sum-subtotal").textContent = formatINR(t.subtotal);
  const discRow = qs("#sum-discount-row");
  discRow.hidden = t.discount <= 0;
  if (t.discount > 0) qs("#sum-discount").textContent = `– ${formatINR(t.discount)}`;
  qs("#sum-coupon").textContent = c ? c.code : "";
  qs("#sum-shipping").textContent = t.shipping === 0 ? "Free" : formatINR(t.shipping);
  qs("#sum-total").textContent = formatINR(t.total);
  if (qs("#pay-amount")) qs("#pay-amount").textContent = formatINR(t.total);
}

/* ---- Validation ----------------------------------------------------------- */
function validate() {
  let valid = true;
  const emailOk = EMAIL_RE.test(emailInput.value.trim());
  setErr({ input: emailInput, err: qs("#email-err") }, emailOk ? "" : "Enter a valid email");
  if (!emailOk) valid = false;
  const phoneOk = PHONE_RE.test(phoneInput.value.trim());
  setErr({ input: phoneInput, err: qs("#phone-err") }, phoneOk ? "" : "Enter a valid 10-digit mobile");
  if (!phoneOk) valid = false;
  if (!shipForm.validate()) valid = false;
  if (!qs("#checkout-form")._sameCb.checked && !billForm.validate()) valid = false;
  return valid;
}

/* ---- Razorpay (live) ------------------------------------------------------ */
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.append(s);
  });
}

/* ---- Pay flow ------------------------------------------------------------- */
async function pay() {
  if (!validate()) { toast("Please complete the highlighted fields"); return; }
  payBtn.disabled = true; payBtn.textContent = "Processing…";

  const shipping = shipForm.getValues();
  const customer = { email: emailInput.value.trim(), phone: phoneInput.value.trim(), name: shipping.name };
  const billing = qs("#checkout-form")._sameCb.checked ? shipping : billForm.getValues();

  const payload = {
    items: getItems().map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty })),
    coupon: getCoupon() ? getCoupon().code : "",
    customer, shipping, billing, giftNote: getGiftNote(),
  };

  const created = await createOrder(payload);
  if (!created.ok) { toast(created.error.message); resetPay(); return; }
  const order = created.data;

  const finalise = async (verifyBody) => {
    const verified = await verifyOrder(verifyBody);
    if (!verified.ok) { toast(verified.error.message || "Payment could not be verified."); resetPay(); return; }
    // Snapshot for the confirmation page, then clear the cart.
    const snap = { order_id: order.order_id, items: getItems(), totals: getTotals(), customer, shipping, date: new Date().toISOString() };
    try { localStorage.setItem("as_last_order", JSON.stringify(snap)); } catch {}
    clearCart();
    location.href = `/pages/order-confirmation.html?order=${encodeURIComponent(order.order_id)}`;
  };

  if (order.mock) {
    // Simulated payment (no real Razorpay in mock mode).
    await finalise({ order_id: order.order_id, razorpay_order_id: order.razorpay_order_id, razorpay_payment_id: "pay_mock", razorpay_signature: "sig_mock" });
    return;
  }

  const ok = await loadRazorpay();
  if (!ok) { toast("Couldn’t load the payment gateway. Please retry."); resetPay(); return; }
  const rzp = new window.Razorpay({
    key: order.key_id, order_id: order.razorpay_order_id, amount: order.amount, currency: order.currency,
    name: "AS Collections", description: "Order " + order.order_id,
    prefill: { email: customer.email, contact: customer.phone, name: customer.name },
    theme: { color: "#7A2E2A" },
    handler: (resp) => finalise({ order_id: order.order_id, razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature }),
    modal: { ondismiss: resetPay },
  });
  rzp.open();
}
function resetPay() { payBtn.disabled = false; payBtn.textContent = "Pay securely"; }

/* ---- Boot ----------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (!getItems().length) { qs("#checkout-empty").hidden = false; qs("#checkout-main").hidden = true; return; }
  buildForm();
  renderSummary();
  payBtn = qs("#pay-btn");
  on(payBtn, "click", pay);
});
