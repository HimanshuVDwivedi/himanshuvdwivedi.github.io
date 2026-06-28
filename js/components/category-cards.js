/* =============================================================================
   AS COLLECTIONS — CATEGORY CARDS
   Renders the "Shop by category" tiles from the live taxonomy (getCategories).
   Designed placeholder shows until real category imagery is committed.
   ============================================================================= */

import { qs, el } from "../utilities/dom.js";
import { getCategories, imageUrl } from "../api/client.js";

function placeholder(name, i) {
  const tints = ["#EDE6DF", "#EFE7E6", "#EAE8E1", "#F0E8E1"];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
      <rect width="300" height="400" fill="${tints[i % tints.length]}"/>
      <circle cx="150" cy="150" r="44" fill="none" stroke="#C9A86A" stroke-width="2"/>
    </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

export async function renderCategoryCards(selector) {
  const mount = qs(selector);
  if (!mount) return;

  const res = await getCategories();
  if (!res.ok) return;

  res.data.forEach((cat, i) => {
    const fallback = placeholder(cat.name, i);
    const img = el("img", {
      class: "cat-card__img",
      src: cat.image ? imageUrl(cat.image) : fallback,
      alt: cat.name,
      loading: "lazy",
      width: "300", height: "400",
    });
    img.addEventListener("error", () => { img.src = fallback; }, { once: true });

    mount.append(
      el("a", { class: "cat-card", href: `/pages/shop.html?category=${cat.category_id}`, "aria-label": cat.name },
        img,
        el("span", { class: "cat-card__scrim" }),
        el("span", { class: "cat-card__label" }, cat.name)
      )
    );
  });
}
