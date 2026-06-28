/* =============================================================================
   AS COLLECTIONS — DOM UTILITIES
   Minimal vanilla helpers so components stay terse and consistent.
   No framework — these are the whole "toolkit".
   ============================================================================= */

/** querySelector shorthand, scoped to an optional root. */
export const qs = (sel, root = document) => root.querySelector(sel);

/** querySelectorAll → real array. */
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Add an event listener; returns an unsubscribe fn. */
export const on = (el, type, handler, opts) => {
  el.addEventListener(type, handler, opts);
  return () => el.removeEventListener(type, handler, opts);
};

/**
 * Create an element with attributes/props and children in one call.
 * el("button", { class: "btn", "aria-label": "Cart" }, "Add")
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined && v !== false) {
      node.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}
