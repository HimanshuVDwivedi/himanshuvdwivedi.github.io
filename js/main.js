/* =============================================================================
   AS COLLECTIONS — APP BOOTSTRAP (M2: Homepage)
   Orchestrates the homepage: header, announcement bar, category cards, product
   rails (live data), reviews, instagram, newsletter, and scroll-reveal.
   Each concern lives in its own component module; main.js only wires them.
   ============================================================================= */

import { qs, el } from "./utilities/dom.js";
import { initScrollReveal } from "./utilities/observer.js";
import { getNewArrivals, getBestSellers, getTrending } from "./api/client.js";
import { ProductCard } from "./components/product-card.js";
import { initHeader } from "./components/header.js";
import { initAnnouncementBar } from "./components/announcement-bar.js";
import { renderCategoryCards } from "./components/category-cards.js";
import { renderReviews, renderInstagram } from "./components/social.js";
import { initNewsletter } from "./components/newsletter.js";
import { initQuickView } from "./components/quick-view.js";
import { initSearch } from "./components/search.js";
import { initCart } from "./components/cart-drawer.js";

/* Mark JS as available so .reveal hidden-state only applies when we can reveal. */
document.documentElement.classList.add("js");

/* Render a horizontal rail of product cards from a loader fn. */
async function renderRail(selector, loader) {
  const mount = qs(selector);
  if (!mount) return;
  mount.setAttribute("aria-busy", "true");
  const res = await loader();
  mount.removeAttribute("aria-busy");
  if (!res.ok) {
    mount.append(el("p", { class: "rail-error" }, "Couldn’t load products. Please refresh."));
    return;
  }
  res.data.items.forEach((p, i) => mount.append(ProductCard(p, i)));
}

document.addEventListener("DOMContentLoaded", async () => {
  /* Shell + chrome first (synchronous, instant). */
  initHeader();
  initAnnouncementBar();
  initNewsletter();
  initQuickView();
  initSearch();
  initCart();
  renderReviews("#reviews");
  renderInstagram("#instagram");

  /* Async content (live catalogue). */
  await Promise.all([
    renderCategoryCards("#categories"),
    renderRail("#new-arrivals-rail", getNewArrivals),
    renderRail("#best-sellers", getBestSellers),
    renderRail("#trending", getTrending),
  ]);

  /* Reveal-on-scroll AFTER content exists so observers attach to real nodes. */
  initScrollReveal();
});
