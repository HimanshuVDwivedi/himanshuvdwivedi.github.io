/* =============================================================================
   AS COLLECTIONS — RECENTLY VIEWED
   Tracks the last N product slugs in localStorage to power the PDP rail.
   ============================================================================= */

const KEY = "as_recent_v1";
const MAX = 12;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

/** Record a slug as just-viewed (moves it to the front, de-duplicated). */
export function recordView(slug) {
  if (!slug) return;
  let list = load().filter((s) => s !== slug);
  list.unshift(slug);
  list = list.slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

/** Slugs viewed, excluding `exclude`, newest first. */
export function getRecent(exclude) {
  return load().filter((s) => s !== exclude);
}
