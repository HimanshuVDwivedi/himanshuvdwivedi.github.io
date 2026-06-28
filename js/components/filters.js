/* =============================================================================
   AS COLLECTIONS — FILTERS
   Builds the filter groups (category, collection, price, availability) into a
   given mount. The SAME builder powers the desktop sidebar and the mobile
   bottom-sheet — so each call takes a namespace (`ns`) to keep radio groups and
   element ids unique across the two panels (radio `name`s are document-global).
   Single-select groups map cleanly to the API's single-value params.
   ============================================================================= */

import { CONFIG } from "../config/config.js";
import { el } from "../utilities/dom.js";
import { getCategories, getCollections } from "../api/client.js";

/* A single-select radio group, namespaced so two panels don't collide. */
function radioGroup(ns, name, title, options, current, onChange) {
  const groupName = ns + "-" + name;
  const list = el("div", { class: "filter__options" });
  options.forEach((opt) => {
    const id = groupName + "-" + (opt.value || "all");
    const input = el("input", { type: "radio", name: groupName, id, value: opt.value, class: "filter__radio" });
    if (String(opt.value) === String(current || "")) input.checked = true;
    input.addEventListener("change", () => onChange(name, opt));
    list.append(el("label", { class: "filter__option", for: id }, input, el("span", {}, opt.label)));
  });
  return el("div", { class: "filter" }, el("h3", { class: "filter__title" }, title), list);
}

/**
 * Render all filter groups into `mount`.
 * @param {Element} mount
 * @param {object} state current filter values
 * @param {function} onChange (patch) => void — partial filter object
 * @param {string} ns namespace for this panel ("side" | "sheet")
 */
export async function renderFilters(mount, state, onChange, ns) {
  ns = ns || "side";
  mount.innerHTML = "";

  const [cats, cols] = await Promise.all([getCategories(), getCollections()]);

  // Category (single-select)
  if (cats.ok) {
    const opts = [{ value: "", label: "All categories" }]
      .concat(cats.data.map((c) => ({ value: c.category_id, label: c.name })));
    mount.append(radioGroup(ns, "category", "Category", opts, state.category, (_, opt) => onChange({ category: opt.value })));
  }

  // Collection (single-select)
  if (cols.ok) {
    const opts = [{ value: "", label: "All collections" }]
      .concat(cols.data.map((c) => ({ value: c.collection_id, label: c.name })));
    mount.append(radioGroup(ns, "collection", "Collection", opts, state.collection, (_, opt) => onChange({ collection: opt.value })));
  }

  // Price (single-select brackets → exact min/max)
  const priceOpts = CONFIG.PRICE_BRACKETS.map((b, i) => ({ value: String(i), label: b.label }));
  let currentPrice = CONFIG.PRICE_BRACKETS.findIndex(
    (b) => String(b.min) === String(state.priceMin || "") && String(b.max) === String(state.priceMax || "")
  );
  if (currentPrice < 0) currentPrice = 0;
  mount.append(radioGroup(ns, "price", "Price", priceOpts, String(currentPrice), (_, opt) => {
    const b = CONFIG.PRICE_BRACKETS[+opt.value];
    onChange({ priceMin: b.min, priceMax: b.max });
  }));

  // Availability (toggle)
  const availId = ns + "-avail-in";
  const avail = el("input", { type: "checkbox", id: availId, class: "filter__check" });
  if (state.availability === "in") avail.checked = true;
  avail.addEventListener("change", () => onChange({ availability: avail.checked ? "in" : "" }));
  mount.append(el("div", { class: "filter" },
    el("label", { class: "filter__option", for: availId }, avail, el("span", {}, "In stock only"))
  ));
}
