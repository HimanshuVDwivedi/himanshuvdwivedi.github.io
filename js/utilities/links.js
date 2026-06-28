/* =============================================================================
   AS COLLECTIONS — LINK HELPERS
   Single source of truth for internal URLs. Product pages are pre-generated as
   static SEO pages at /product/<slug>.html (see build/build.mjs), so every
   internal link points there — not at the query-string template.
   ============================================================================= */

export const productUrl = (slug) => `/product/${slug}.html`;
