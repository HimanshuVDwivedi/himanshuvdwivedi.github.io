/* =============================================================================
   AS COLLECTIONS — SCROLL REVEAL
   Adds .is-visible to .reveal elements as they enter the viewport.
   Safety: if reduced-motion is preferred, or IntersectionObserver is missing,
   everything reveals immediately (content is NEVER stuck hidden).
   The opacity:0 start state only applies under html.js (set in main.js), so
   no-JS users always see content.
   ============================================================================= */

export function initScrollReveal(root = document) {
  const items = [...root.querySelectorAll(".reveal")];
  if (!items.length) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target); // reveal once
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
  );

  items.forEach((el) => io.observe(el));
}
