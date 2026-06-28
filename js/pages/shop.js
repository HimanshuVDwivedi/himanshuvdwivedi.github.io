/* =============================================================================
   AS COLLECTIONS — SHOP / PLP CONTROLLER
   Owns the listing page: reads filters from the URL, fetches via the API seam,
   renders the grid, handles sort + price + availability + category/collection,
   pagination via "Load more" with infinite-scroll auto-advance, the mobile
   filter/sort bottom-sheet, URL sync, and the empty state.
   ============================================================================= */

import { CONFIG } from "../config/config.js";
import { qs, el, on } from "../utilities/dom.js";
import { getProducts, getCategories } from "../api/client.js";
import { ProductCard } from "../components/product-card.js";
import { initHeader } from "../components/header.js";
import { initAnnouncementBar } from "../components/announcement-bar.js";
import { initSearch } from "../components/search.js";
import { renderFilters } from "../components/filters.js";
import { initQuickView } from "../components/quick-view.js";
import { initCart } from "../components/cart-drawer.js";

document.documentElement.classList.add("js");

const FILTER_KEYS = ["category", "collection", "priceMin", "priceMax", "availability", "sort", "search"];

const state = readURL();
let page = 1, total = 0, loaded = 0, loading = false, categoryMap = {};

/* ---- URL <-> state -------------------------------------------------------- */
function readURL() {
  const p = new URLSearchParams(location.search);
  const s = {};
  FILTER_KEYS.forEach((k) => { if (p.get(k)) s[k] = p.get(k); });
  return s;
}
function writeURL() {
  const p = new URLSearchParams();
  FILTER_KEYS.forEach((k) => { if (state[k]) p.set(k, state[k]); });
  const qsStr = p.toString();
  history.replaceState(null, "", qsStr ? `?${qsStr}` : location.pathname);
}

/* ---- Header / count ------------------------------------------------------- */
function pageTitle() {
  if (state.search) return `Results for “${state.search}”`;
  if (state.category && categoryMap[state.category]) return categoryMap[state.category];
  return "All jewellery";
}
function updateHeader() {
  qs("#plp-title").textContent = pageTitle();
  qs("#plp-crumb").textContent = pageTitle();
  qs("#plp-count").textContent = total === 1 ? "1 piece" : `${total} pieces`;
}

/* ---- Fetch + render ------------------------------------------------------- */
async function load(reset) {
  if (loading) return;
  loading = true;
  if (reset) { page = 1; loaded = 0; qs("#grid").innerHTML = ""; }

  const grid = qs("#grid");
  grid.setAttribute("aria-busy", "true");
  const res = await getProducts({ ...state, page, pageSize: CONFIG.PAGE_SIZE });
  grid.removeAttribute("aria-busy");
  loading = false;

  if (!res.ok) {
    grid.innerHTML = "";
    grid.append(el("p", { class: "plp-error" }, "Couldn’t load products. Please refresh."));
    return;
  }

  total = res.data.total;
  res.data.items.forEach((p, i) => grid.append(ProductCard(p, loaded + i)));
  loaded += res.data.items.length;

  updateHeader();
  toggleEmpty(total === 0);
  updateMore();
  syncSheetCount();
}

function toggleEmpty(isEmpty) {
  qs("#plp-empty").hidden = !isEmpty;
  qs("#grid").hidden = isEmpty;
}

function updateMore() {
  const more = qs("#load-more");
  more.hidden = loaded >= total;
}

/* ---- Filter change --------------------------------------------------------
   Controls hold their own state, so we DON'T re-render the panel the user is
   touching (that would detach the control + drop focus). The mobile sheet is
   rebuilt when it opens; both panels are rebuilt on Clear. */
function applyPatch(patch) {
  Object.assign(state, patch);
  FILTER_KEYS.forEach((k) => { if (state[k] === "" || state[k] == null) delete state[k]; });
  writeURL();
  load(true);
}

function clearAll() {
  for (const k of FILTER_KEYS) if (k !== "search") delete state[k];
  writeURL();
  renderFilters(qs("#filters"), state, applyPatch, "side");
  renderFilters(qs("#filters-sheet"), state, applyPatch, "sheet");
  load(true);
}

/* ---- Sort ----------------------------------------------------------------- */
function buildSort() {
  const sel = qs("#sort");
  CONFIG.SORT_OPTIONS.forEach((o) => sel.append(el("option", { value: o.value }, o.label)));
  sel.value = state.sort || "";
  on(sel, "change", () => applyPatch({ sort: sel.value }));
}

/* ---- Infinite scroll (auto-advances the Load more button) ----------------- */
function initInfiniteScroll() {
  const sentinel = qs("#sentinel");
  if (!CONFIG.INFINITE_SCROLL || !("IntersectionObserver" in window)) return;
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && loaded < total && !loading) {
      page += 1; load(false);
    }
  }, { rootMargin: "600px 0px" }).observe(sentinel);
}

/* ---- Mobile filter / sort bottom-sheet ------------------------------------ */
function initSheet() {
  const sheet = qs("#filter-sheet");
  const backdrop = qs("#sheet-backdrop");
  let sheetLast = null;
  const open = () => { sheetLast = document.activeElement; renderFilters(qs("#filters-sheet"), state, applyPatch, "sheet"); sheet.classList.add("is-open"); backdrop.classList.add("is-open"); sheet.removeAttribute("inert"); sheet.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; syncSheetCount(); qs("#sheet-done")?.focus(); };
  const close = () => { sheet.classList.remove("is-open"); backdrop.classList.remove("is-open"); sheet.setAttribute("inert", ""); sheet.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; sheetLast && sheetLast.focus(); };
  on(qs("#open-filters"), "click", open);
  on(qs("#sheet-done"), "click", close);
  on(qs("#sheet-clear"), "click", clearAll);
  on(backdrop, "click", close);
}
function syncSheetCount() {
  const c = qs("#sheet-count");
  if (c) c.textContent = total === 1 ? "1 piece" : `${total} pieces`;
}

/* ---- Boot ----------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  initHeader();
  initAnnouncementBar();
  initSearch();
  initQuickView();
  initCart();

  const cats = await getCategories();
  if (cats.ok) cats.data.forEach((c) => { categoryMap[c.category_id] = c.name; });

  buildSort();
  await Promise.all([
    renderFilters(qs("#filters"), state, applyPatch, "side"),
    renderFilters(qs("#filters-sheet"), state, applyPatch, "sheet"),
  ]);
  initSheet();
  on(qs("#load-more"), "click", () => { page += 1; load(false); });
  on(qs("#clear-all"), "click", clearAll);

  await load(true);
  initInfiniteScroll();
});
