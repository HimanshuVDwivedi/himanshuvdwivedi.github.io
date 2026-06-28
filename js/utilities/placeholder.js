/* =============================================================================
   AS COLLECTIONS — PLACEHOLDER ART
   Designed fallback shown until real photography is committed to the image repo.
   Shared so gallery, quick-view, etc. don't each reinvent it.
   ============================================================================= */

export function productPlaceholder(title, i = 0) {
  const tints = ["#F0EBE4", "#EFE7E6", "#ECEAE3", "#F1E9E2"];
  const bg = tints[i % tints.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="${bg}"/>
      <circle cx="200" cy="180" r="62" fill="none" stroke="#C9A86A" stroke-width="2"/>
      <circle cx="200" cy="118" r="6" fill="#C9A86A"/>
      <text x="200" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#1C1A19">${title}</text>
      <text x="200" y="328" text-anchor="middle" font-family="sans-serif" font-size="11" letter-spacing="2" fill="#6B6460">AS COLLECTIONS</text>
    </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}
