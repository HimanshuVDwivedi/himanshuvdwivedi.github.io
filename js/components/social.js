/* =============================================================================
   AS COLLECTIONS — REVIEWS + INSTAGRAM renderers
   Both read from data/home-content.js (curated). Kept tiny and dependency-free.
   ============================================================================= */

import { qs, el } from "../utilities/dom.js";
import { imageUrl } from "../api/client.js";
import { FEATURED_REVIEWS, INSTAGRAM_TILES } from "../data/home-content.js";

export function renderReviews(selector) {
  const mount = qs(selector);
  if (!mount) return;
  FEATURED_REVIEWS.forEach((r) => {
    mount.append(
      el("figure", { class: "review reveal" },
        el("div", { class: "review__stars", "aria-label": `${r.stars} out of 5 stars` }, "★".repeat(r.stars)),
        el("blockquote", { class: "review__body" }, `“${r.body}”`),
        el("figcaption", { class: "review__meta" },
          el("span", {}, r.author),
          r.verified ? el("span", { class: "review__verified" }, "· Verified buyer") : null
        )
      )
    );
  });
}

const igIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
  <rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`;

export function renderInstagram(selector) {
  const mount = qs(selector);
  if (!mount) return;
  INSTAGRAM_TILES.forEach((tile) => {
    const link = el("a", {
      class: "ig-tile", href: tile.href, target: "_blank", rel: "noopener",
      "aria-label": "View on Instagram", html: igIcon,
    });
    /* If real UGC exists, lay it over the icon tile. */
    if (tile.image) {
      const img = el("img", { src: imageUrl(tile.image), alt: "", loading: "lazy",
        style: "position:absolute;inset:0;width:100%;height:100%;object-fit:cover" });
      img.addEventListener("error", () => img.remove(), { once: true });
      link.append(img);
    }
    mount.append(link);
  });
}
