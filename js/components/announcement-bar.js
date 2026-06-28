/* =============================================================================
   AS COLLECTIONS — ANNOUNCEMENT BAR (behaviour)
   Renders CONFIG.ANNOUNCEMENTS and crossfades through them. Pauses on hover.
   Reduced-motion: shows the first message statically (no rotation).
   ============================================================================= */

import { CONFIG } from "../config/config.js";
import { qs, el, on } from "../utilities/dom.js";

const INTERVAL = 4000;

export function initAnnouncementBar() {
  const track = qs("#announce-track");
  if (!track || !CONFIG.ANNOUNCEMENTS.length) return;

  const items = CONFIG.ANNOUNCEMENTS.map((msg, i) =>
    track.appendChild(el("div", { class: "announce__item" + (i === 0 ? " is-active" : "") }, msg))
  );

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || items.length < 2) return; // static single message

  let i = 0, timer;
  const tick = () => {
    items[i].classList.remove("is-active");
    i = (i + 1) % items.length;
    items[i].classList.add("is-active");
  };
  const start = () => { timer = setInterval(tick, INTERVAL); };
  const stop = () => clearInterval(timer);

  start();
  on(track, "mouseenter", stop);   // pause on hover for readability
  on(track, "mouseleave", start);
}
