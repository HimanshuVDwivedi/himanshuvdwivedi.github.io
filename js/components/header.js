/* =============================================================================
   AS COLLECTIONS — HEADER (behaviour)
   - Builds the desktop nav + mobile drawer links from CONFIG.NAV.
   - Toggles .is-solid when scrolled past the threshold (transparent over hero).
   - Opens/closes a focus-trapped mobile drawer (Esc + backdrop + link click).
   ============================================================================= */

import { CONFIG } from "../config/config.js";
import { qs, qsa, el, on } from "../utilities/dom.js";
import { subscribe, getCount } from "../state/cart.js";

const SOLID_AFTER = 40; // px scrolled before header turns solid

export function initHeader() {
  const header = qs(".header");
  if (!header) return;

  /* Build nav links (desktop + drawer) from one source. */
  const navMount = qs("#nav");
  const drawerNav = qs("#drawer-nav");
  CONFIG.NAV.forEach((item) => {
    navMount?.append(el("a", { class: "nav__link", href: item.href }, item.label));
    drawerNav?.append(el("a", { class: "drawer__link", href: item.href }, item.label));
  });

  /* Live cart count badge. */
  const cartCount = qs('[aria-label="Cart"] .icon-btn__count');
  if (cartCount) {
    subscribe(() => {
      const n = getCount();
      cartCount.textContent = String(n);
      cartCount.setAttribute("data-count", String(n));
    });
  }

  /* Transparent → solid on scroll. */
  const onScroll = () => header.classList.toggle("is-solid", window.scrollY > SOLID_AFTER);
  onScroll();
  on(window, "scroll", onScroll, { passive: true });

  /* Mobile drawer ---------------------------------------------------------- */
  const drawer = qs("#drawer");
  const backdrop = qs("#drawer-backdrop");
  const openBtn = qs("#hamburger");
  const closeBtn = qs("#drawer-close");
  let lastFocused = null;

  const open = () => {
    lastFocused = document.activeElement;
    drawer.classList.add("is-open");
    backdrop.classList.add("is-open");
    drawer.removeAttribute("inert");
    drawer.setAttribute("aria-hidden", "false");
    openBtn?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    qs(".drawer__link", drawer)?.focus();
  };
  const close = () => {
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    drawer.setAttribute("inert", "");
    drawer.setAttribute("aria-hidden", "true");
    openBtn?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    lastFocused?.focus();
  };

  on(openBtn, "click", open);
  on(closeBtn, "click", close);
  on(backdrop, "click", close);
  qsa(".drawer__link", drawer).forEach((link) => on(link, "click", close));

  /* Esc to close + simple focus trap within the drawer. */
  on(document, "keydown", (e) => {
    if (!drawer.classList.contains("is-open")) return;
    if (e.key === "Escape") return close();
    if (e.key === "Tab") {
      const focusables = qsa("a, button", drawer);
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}
