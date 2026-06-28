/* =============================================================================
   AS COLLECTIONS — PRODUCT CARD (component)
   Pure render function: product object → DOM node. No side effects beyond
   the node it returns. Reused everywhere a product appears.
   ============================================================================= */

import { el } from "../utilities/dom.js";
import { formatINR, discountPercent } from "../utilities/money.js";
import { imageUrl } from "../api/client.js";
import { productUrl } from "../utilities/links.js";

/* Designed placeholder shown until real photography exists in the image repo.
   A porcelain square with a thin champagne ring + the product's name, tinted
   per index so a rail of placeholders still reads as a varied collection. */
function placeholderSVG(title, i = 0) {
  const tints = ["#F0EBE4", "#EFE7E6", "#ECEAE3", "#F1E9E2"];
  const bg = tints[i % tints.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${bg}"/>
      <circle cx="200" cy="180" r="62" fill="none" stroke="#C9A86A" stroke-width="2"/>
      <circle cx="200" cy="118" r="6" fill="#C9A86A"/>
      <text x="200" y="300" text-anchor="middle"
            font-family="Georgia, serif" font-size="22" fill="#1C1A19">${title}</text>
      <text x="200" y="328" text-anchor="middle"
            font-family="sans-serif" font-size="11" letter-spacing="2" fill="#6B6460">AS COLLECTIONS</text>
    </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

/**
 * Build a product card.
 * @param {object} product  one record from the catalogue (mock or live)
 * @param {number} index    position in its list (for placeholder variety)
 * @returns {HTMLElement}
 */
export function ProductCard(product, index = 0) {
  const off = discountPercent(product.old_price, product.price);
  const soldOut = Array.isArray(product.variants)
    ? product.variants.every((v) => v.stock <= 0)
    : false;

  const realSrc = product.images?.[0] ? imageUrl(product.images[0]) : "";
  const fallback = placeholderSVG(product.title, index);

  const img = el("img", {
    class: "card__img",
    src: realSrc || fallback,
    alt: product.title,
    loading: "lazy",
    decoding: "async",
    width: "400",
    height: "400",
  });
  /* If real photography 404s (it doesn't exist yet), drop to the placeholder. */
  img.addEventListener("error", () => { img.src = fallback; }, { once: true });

  return el(
    "article",
    { class: "card" },
    el(
      "div",
      { class: "card__media" },
      el(
        "a",
        { class: "card__media-link", href: productUrl(product.slug), "aria-label": product.title },
        img
      ),
      soldOut
        ? el("span", { class: "card__badge card__badge--soldout" }, "Sold out")
        : off
        ? el("span", { class: "card__badge" }, `-${off}%`)
        : null,
      soldOut ? null : el("button", { class: "card__quickview", "data-quickview": product.slug, type: "button", "aria-label": `Quick view ${product.title}` }, "Quick view")
    ),
    el("button", { class: "card__wish", "aria-label": `Add ${product.title} to wishlist`, html: heart() }),
    el(
      "div",
      { class: "card__body" },
      el("h3", { class: "card__title" }, product.title),
      el(
        "div",
        { class: "card__rating" },
        el("span", { class: "card__star" }, "★"),
        `${product.rating_avg} (${product.rating_count})`
      ),
      el(
        "div",
        { class: "card__price" },
        el("span", { class: "card__price-now" }, formatINR(product.price)),
        product.old_price ? el("span", { class: "card__price-old" }, formatINR(product.old_price)) : null,
        off ? el("span", { class: "card__price-off" }, `${off}% off`) : null
      )
    )
  );
}

/* Inline heart icon (kept here so the card is self-contained for M0). */
function heart() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" aria-hidden="true">
    <path d="M12 21s-7.5-4.6-10-9.2A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 10 5.8C19.5 16.4 12 21 12 21z"/></svg>`;
}
