/* =============================================================================
   AS COLLECTIONS — PRODUCT DETAIL PAGE (PDP) CONTROLLER
   Loads a product by ?slug=, renders the gallery + sticky buy panel (the
   highest-leverage conversion surface), stock-aware variants, quantity,
   accordions, reviews, related + recently-viewed rails, and the mobile sticky
   add-to-cart bar. All commerce flows through the cart store + API seam.
   ============================================================================= */

import { qs, el, on } from "../utilities/dom.js";
import { getProduct, getProducts } from "../api/client.js";
import { formatINR, discountPercent } from "../utilities/money.js";
import { initHeader } from "../components/header.js";
import { initAnnouncementBar } from "../components/announcement-bar.js";
import { initSearch } from "../components/search.js";
import { initQuickView } from "../components/quick-view.js";
import { initCart } from "../components/cart-drawer.js";
import { Gallery } from "../components/gallery.js";
import { VariantSelector } from "../components/variant-selector.js";
import { QuantityStepper } from "../components/quantity-stepper.js";
import { Accordion } from "../components/accordion.js";
import { ProductCard } from "../components/product-card.js";
import { addItem } from "../state/cart.js";
import { toast } from "../components/toast.js";
import { recordView, getRecent } from "../state/recently-viewed.js";
import { FEATURED_REVIEWS } from "../data/home-content.js";

document.documentElement.classList.add("js");

const slug = window.__SLUG__ || new URLSearchParams(location.search).get("slug");

/* Stock label for the currently selected variant. */
function stockLabel(v) {
  if (!v || v.stock <= 0) return { text: "Sold out", cls: "is-out" };
  if (v.stock <= 5) return { text: `In stock — only ${v.stock} left`, cls: "is-low" };
  return { text: "In stock", cls: "is-in" };
}

function renderBuyPanel(p) {
  const off = discountPercent(p.old_price, p.price);
  const stock = el("p", { class: "buy__stock" });

  const variant = VariantSelector(p, (v) => { stepper.setMax(v ? v.stock : 1); refreshStock(); });
  let current = variant.getSelected();
  const stepper = QuantityStepper(current ? current.stock : 1);

  function refreshStock() {
    current = variant.getSelected();
    const s = stockLabel(current);
    stock.textContent = s.text;
    stock.className = `buy__stock ${s.cls}`;
    const disabled = !current || current.stock <= 0;
    addBtn.disabled = disabled; buyBtn.disabled = disabled;
    if (mobileAdd) mobileAdd.disabled = disabled;
  }

  function doAdd() {
    const v = variant.getSelected();
    if (!v || v.stock <= 0) { toast("Please select an available option"); return; }
    addItem({ product_id: p.product_id, variant_id: v.variant_id, title: p.title, price: p.price,
      image: p.images && p.images[0] ? p.images[0] : "", slug: p.slug,
      option: `${v.option_name}: ${v.option_value}`, stock: v.stock, qty: stepper.getValue() });
    toast("Added to cart");
  }

  const addBtn = el("button", { class: "btn btn--primary btn--block" }, "Add to cart");
  const buyBtn = el("button", { class: "btn btn--secondary btn--block" }, "Buy now");
  on(addBtn, "click", doAdd);
  on(buyBtn, "click", () => { doAdd(); location.href = "/pages/checkout.html"; }); // checkout lands in M6

  // Mobile sticky bar mirrors the panel actions
  const mobileAdd = qs("#sticky-add");
  if (mobileAdd) {
    qs("#sticky-price").textContent = formatINR(p.price);
    on(mobileAdd, "click", doAdd);
  }

  const panel = qs("#buy");
  qs("#breadcrumb").append(
    el("nav", { class: "breadcrumb", "aria-label": "Breadcrumb" },
      el("a", { href: "/" }, "Home"), " › ",
      el("a", { href: "/pages/shop.html" }, "Shop"), " › ",
      el("span", {}, p.title))
  );
  panel.append(
    el("h1", { class: "buy__title" }, p.title),
    el("div", { class: "buy__rating" }, el("span", { class: "card__star" }, "★"), `${p.rating_avg} (${p.rating_count} reviews)`),
    el("div", { class: "buy__price card__price" },
      el("span", { class: "card__price-now" }, formatINR(p.price)),
      p.old_price ? el("span", { class: "card__price-old" }, formatINR(p.old_price)) : null,
      off ? el("span", { class: "card__price-off" }, `${off}% off`) : null),
    variant.element,
    stock,
    el("div", { class: "buy__actions" }, el("div", { class: "buy__qtyrow" }, el("span", { class: "buy__qtylabel" }, "Qty"), stepper.element), addBtn, buyBtn),
    el("div", { class: "buy__trust" },
      el("span", {}, "● Free shipping over ₹1,499"),
      el("span", {}, "● 30-day returns"),
      el("span", {}, "● 925 silver, hallmarked"))
  );

  refreshStock();
}

function renderAccordions(p) {
  qs("#accordions").append(Accordion([
    { title: "Shipping & Returns", content: "Free shipping on orders over ₹1,499. Dispatched in 1–2 business days. Easy 30-day returns on unworn items in original packaging." },
    { title: "Material", content: p.material || "925 sterling silver." },
    { title: "Care Guide", content: p.care_guide || "Store in a dry pouch. Avoid contact with perfume and water. Wipe gently with a soft cloth." },
  ]));
}

function renderReviews(p) {
  const mount = qs("#reviews");
  mount.append(
    el("div", { class: "rev-summary" },
      el("div", { class: "rev-summary__score" }, String(p.rating_avg)),
      el("div", {},
        el("div", { class: "rev-summary__stars" }, "★".repeat(Math.round(p.rating_avg))),
        el("div", { class: "rev-summary__count" }, `Based on ${p.rating_count} reviews`))
    )
  );
  const list = el("div", { class: "reviews-grid" });
  FEATURED_REVIEWS.forEach((r) => {
    list.append(el("figure", { class: "review" },
      el("div", { class: "review__stars" }, "★".repeat(r.stars)),
      el("blockquote", { class: "review__body" }, `“${r.body}”`),
      el("figcaption", { class: "review__meta" }, el("span", {}, r.author), r.verified ? el("span", { class: "review__verified" }, "· Verified buyer") : null)));
  });
  mount.append(list);
  // Review submission (tied to an order) is phase 2.
}

async function renderRelated(p) {
  const res = await getProducts({ category: p.category_id, pageSize: 8 });
  if (!res.ok) return;
  const items = res.data.items.filter((x) => x.slug !== p.slug).slice(0, 6);
  if (!items.length) { qs("#related-section").hidden = true; return; }
  items.forEach((x, i) => qs("#related").append(ProductCard(x, i)));
}

async function renderRecentlyViewed(p) {
  const slugs = getRecent(p.slug).slice(0, 6);
  if (!slugs.length) { qs("#recent-section").hidden = true; return; }
  const results = await Promise.all(slugs.map((s) => getProduct(s)));
  const items = results.filter((r) => r.ok).map((r) => r.data);
  if (!items.length) { qs("#recent-section").hidden = true; return; }
  items.forEach((x, i) => qs("#recent").append(ProductCard(x, i)));
}

document.addEventListener("DOMContentLoaded", async () => {
  initHeader();
  initAnnouncementBar();
  initSearch();
  initQuickView();
  initCart();

  if (!slug) { qs("#pdp-notfound").hidden = false; qs("#pdp").hidden = true; return; }

  const res = await getProduct(slug);
  if (!res.ok) { qs("#pdp-notfound").hidden = false; qs("#pdp").hidden = true; return; }
  const p = res.data;

  document.title = `${p.title} — AS Collections`;
  recordView(p.slug);

  // Clear any pre-rendered above-the-fold (static SEO page) before hydrating.
  qs("#gallery").innerHTML = ""; qs("#buy").innerHTML = ""; qs("#breadcrumb").innerHTML = "";

  qs("#gallery").append(Gallery(p));
  renderBuyPanel(p);
  renderAccordions(p);
  renderReviews(p);
  await renderRelated(p);
  await renderRecentlyViewed(p);
});
