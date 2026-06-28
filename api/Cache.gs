/** =============================================================================
 *  AS COLLECTIONS — CACHE
 *  Wraps CacheService so catalogue reads don't hit the sheet on every request
 *  (mitigates Apps Script quota + Sheet latency — see SDLC Part 1, §4.3).
 *  ========================================================================== */

/**
 * Return a cached JSON value if present, else compute it with `producer`,
 * cache it for CONFIG.CACHE_TTL seconds, and return it.
 * @param {string} key
 * @param {function():*} producer  computes the value on a cache miss
 */
function cached(key, producer) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(key);
  if (hit) {
    try { return JSON.parse(hit); } catch (e) { /* fall through on bad cache */ }
  }
  const value = producer();
  try {
    cache.put(key, JSON.stringify(value), CONFIG.CACHE_TTL);
  } catch (e) {
    /* value too large for cache (>100KB) — fine, just skip caching it */
  }
  return value;
}

/** Manually clear catalogue cache (run after editing the sheet for instant refresh). */
function clearCatalogueCache() {
  CacheService.getScriptCache().removeAll(["catalogue:products", "catalogue:categories", "catalogue:collections"]);
}
