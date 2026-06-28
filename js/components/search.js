/* =============================================================================
   AS COLLECTIONS — SEARCH MODAL
   Self-contained: injects its own modal DOM on init, so any page can enable
   search just by calling initSearch(). Debounced live search over the catalogue
   via the API seam. Esc / backdrop / result-click close it. Focus is trapped.
   ============================================================================= */

import { qsa, qs, el, on } from "../utilities/dom.js";
import { getProducts, imageUrl } from "../api/client.js";
import { formatINR } from "../utilities/money.js";
import { productUrl } from "../utilities/links.js";
import { trapFocus, setOverlayOpen } from "../utilities/focus.js";

const DEBOUNCE = 220;

export function initSearch() {
  if (qs("#search-modal")) return; // already injected

  /* Build modal DOM once and append to body. */
  const input = el("input", {
    class: "search__input", type: "search", id: "search-input",
    placeholder: "Search rings, necklaces…", "aria-label": "Search products", autocomplete: "off",
  });
  const results = el("div", { class: "search__results", id: "search-results" });
  const panel = el("div", { class: "search__panel", role: "dialog", "aria-modal": "true", "aria-label": "Search" },
    el("div", { class: "search__bar" },
      el("svg", { class: "search__icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", html: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>' }),
      input,
      el("button", { class: "search__close", "aria-label": "Close search", html: "✕" })
    ),
    results
  );
  const modal = el("div", { class: "search", id: "search-modal", "aria-hidden": "true", inert: "" }, panel);
  document.body.append(modal);

  let lastFocused = null, releaseTrap = null;
  const open = () => {
    lastFocused = document.activeElement;
    modal.classList.add("is-open");
    setOverlayOpen(modal, true);
    document.body.style.overflow = "hidden";
    input.focus();
    releaseTrap = trapFocus(modal);
  };
  const close = () => {
    modal.classList.remove("is-open");
    setOverlayOpen(modal, false);
    document.body.style.overflow = "";
    input.value = "";
    results.innerHTML = "";
    releaseTrap && releaseTrap();
    lastFocused && lastFocused.focus();
  };

  /* Wire every header search button (present on every page). */
  qsa("[data-search-open]").forEach((btn) => on(btn, "click", open));
  on(qs(".search__close", modal), "click", close);
  on(modal, "click", (e) => { if (e.target === modal) close(); });
  on(document, "keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
    if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !modal.classList.contains("is-open")) {
      e.preventDefault(); open();
    }
  });

  /* Debounced live search. */
  let timer;
  const renderResults = (items, q) => {
    results.innerHTML = "";
    if (!q) return;
    if (!items.length) {
      results.append(el("p", { class: "search__empty" }, `No results for “${q}”.`));
      return;
    }
    items.slice(0, 6).forEach((p) => {
      const thumb = el("img", { class: "search__thumb", src: p.images?.[0] ? imageUrl(p.images[0]) : "", alt: "", width: "48", height: "48" });
      thumb.addEventListener("error", () => thumb.remove(), { once: true });
      results.append(
        el("a", { class: "search__result", href: productUrl(p.slug) },
          thumb,
          el("span", { class: "search__result-title" }, p.title),
          el("span", { class: "search__result-price" }, formatINR(p.price))
        )
      );
    });
  };

  on(input, "input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    timer = setTimeout(async () => {
      if (!q) { results.innerHTML = ""; return; }
      const res = await getProducts({ search: q, pageSize: 6 });
      renderResults(res.ok ? res.data.items : [], q);
    }, DEBOUNCE);
  });
}
