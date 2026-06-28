/* =============================================================================
   AS COLLECTIONS — TOAST
   Tiny transient notifications ("Added to cart"). Self-injects its container.
   ============================================================================= */

import { el } from "../utilities/dom.js";

let host;

export function toast(message, { duration = 2600 } = {}) {
  if (!host) {
    host = el("div", { class: "toast-host", "aria-live": "polite", "aria-atomic": "true" });
    document.body.append(host);
  }
  const node = el("div", { class: "toast" }, message);
  host.append(node);
  requestAnimationFrame(() => node.classList.add("is-in"));
  setTimeout(() => {
    node.classList.remove("is-in");
    node.addEventListener("transitionend", () => node.remove(), { once: true });
  }, duration);
}
