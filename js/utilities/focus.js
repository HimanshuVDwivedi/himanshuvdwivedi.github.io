/* =============================================================================
   AS COLLECTIONS — FOCUS MANAGEMENT
   Shared keyboard-accessibility helpers for overlays (search, cart, quick view,
   mobile drawer, filter sheet): trap Tab focus inside the open overlay, restore
   focus to the trigger on close, and keep closed overlays out of the tab order
   + a11y tree via `inert` + aria-hidden.
   ============================================================================= */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/** Trap Tab focus within `container`. Returns a release() function. */
export function trapFocus(container) {
  function onKey(e) {
    if (e.key !== "Tab") return;
    const items = getFocusable(container);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  container.addEventListener("keydown", onKey);
  return () => container.removeEventListener("keydown", onKey);
}

/**
 * Mark an overlay open/closed for assistive tech + keyboard:
 * open  → remove inert + aria-hidden
 * close → add inert + aria-hidden  (so its focusable children leave the tab order)
 */
export function setOverlayOpen(el, open) {
  if (open) { el.removeAttribute("inert"); el.setAttribute("aria-hidden", "false"); }
  else { el.setAttribute("inert", ""); el.setAttribute("aria-hidden", "true"); }
}
