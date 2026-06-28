/* =============================================================================
   AS COLLECTIONS — HOME CONTENT (curated, static)
   Reviews + Instagram tiles for the homepage. Kept as data so they're easy to
   edit. Reviews can later be sourced from the Reviews tab via the API; the IG
   feed can later come from an Instagram integration (both optional, post-launch).
   ============================================================================= */

export const FEATURED_REVIEWS = [
  {
    stars: 5,
    body: "Wore the Aria band every single day for a year — still looks brand new.",
    author: "Ananya R.",
    verified: true,
  },
  {
    stars: 5,
    body: "Bought the Luna pendant as a gift and ended up buying one for myself too.",
    author: "Priya M.",
    verified: true,
  },
  {
    stars: 5,
    body: "Packaging felt genuinely premium and the hallmark gave me confidence.",
    author: "Sneha K.",
    verified: true,
  },
];

/* Instagram tiles — image paths resolve via the image CDN; placeholders show
   until real UGC is committed. `href` points to the post/profile. */
export const INSTAGRAM_TILES = [
  { image: "instagram/ig-1.webp", href: "https://instagram.com/" },
  { image: "instagram/ig-2.webp", href: "https://instagram.com/" },
  { image: "instagram/ig-3.webp", href: "https://instagram.com/" },
  { image: "instagram/ig-4.webp", href: "https://instagram.com/" },
  { image: "instagram/ig-5.webp", href: "https://instagram.com/" },
];
