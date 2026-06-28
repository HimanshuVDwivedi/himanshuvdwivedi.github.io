/* =============================================================================
   AS COLLECTIONS — MOCK CATALOGUE (M0 / dev only)
   Shapes mirror the Google Sheets schema (SDLC Part 1, §5) EXACTLY, so when
   the live API replaces this in M1, no component has to change.
   Prices in ₹. image paths are repo-relative (resolved via jsDelivr by
   imageUrl()); they intentionally don't exist yet → the ProductCard shows a
   designed placeholder until real photography is committed to the image repo.
   ============================================================================= */

export const MOCK_CATEGORIES = [
  { category_id: "cat-rings",     name: "Rings",     slug: "rings",     image: "categories/rings.webp",     sort_order: 1 },
  { category_id: "cat-necklaces", name: "Necklaces", slug: "necklaces", image: "categories/necklaces.webp", sort_order: 2 },
  { category_id: "cat-earrings",  name: "Earrings",  slug: "earrings",  image: "categories/earrings.webp",  sort_order: 3 },
  { category_id: "cat-bracelets", name: "Bracelets", slug: "bracelets", image: "categories/bracelets.webp", sort_order: 4 },
];

export const MOCK_COLLECTIONS = [
  { collection_id: "col-everyday", name: "Everyday Gold", slug: "everyday-gold", image: "collections/everyday.webp", description: "Quiet pieces you never take off." },
  { collection_id: "col-bridal",   name: "Bridal",        slug: "bridal",        image: "collections/bridal.webp",   description: "For the moments that matter most." },
];

/* Mirrors the Coupons tab (SDLC Part 1, §5). */
export const MOCK_COUPONS = [
  { code: "WELCOME10", type: "percent", value: 10, min_order: 999,  expires_at: "2026-12-31", usage_limit: 1000, used_count: 0, is_active: true },
  { code: "FLAT200",   type: "flat",    value: 200, min_order: 1999, expires_at: "2026-09-30", usage_limit: 500,  used_count: 0, is_active: true },
];

/* Each product matches Products + an inlined `variants` array (Variants tab). */
export const MOCK_PRODUCTS = [
  {
    product_id: "AS-RING-001", title: "Aria Gold Band", slug: "aria-gold-band",
    category_id: "cat-rings", collection_ids: "col-everyday",
    description: "A slim, hand-finished band for everyday wear.",
    material: "925 silver, 18k gold plating", care_guide: "Keep dry. Store in pouch.",
    price: 2499, old_price: 3499, currency: "INR",
    images: ["rings/aria-1.webp", "rings/aria-2.webp"],
    rating_avg: 4.8, rating_count: 128,
    is_featured: true, is_trending: true, is_bestseller: true, is_active: true,
    created_at: "2026-06-10",
    variants: [
      { variant_id: "v1", option_name: "Size", option_value: "S", sku: "AS-RING-001-S", price_delta: 0, stock: 4 },
      { variant_id: "v2", option_name: "Size", option_value: "M", sku: "AS-RING-001-M", price_delta: 0, stock: 9 },
      { variant_id: "v3", option_name: "Size", option_value: "L", sku: "AS-RING-001-L", price_delta: 0, stock: 0 },
    ],
  },
  {
    product_id: "AS-NECK-002", title: "Luna Pendant", slug: "luna-pendant",
    category_id: "cat-necklaces", collection_ids: "col-everyday",
    description: "A crescent pendant on a fine 16-inch chain.",
    material: "925 silver, rhodium finish", care_guide: "Avoid perfume contact.",
    price: 3299, old_price: 0, currency: "INR",
    images: ["necklaces/luna-1.webp"],
    rating_avg: 4.9, rating_count: 86,
    is_featured: true, is_trending: false, is_bestseller: true, is_active: true,
    created_at: "2026-06-18",
    variants: [{ variant_id: "v1", option_name: "Length", option_value: '16"', sku: "AS-NECK-002-16", price_delta: 0, stock: 12 }],
  },
  {
    product_id: "AS-EAR-003", title: "Soleil Studs", slug: "soleil-studs",
    category_id: "cat-earrings", collection_ids: "col-everyday,col-bridal",
    description: "Round-cut solitaire studs that catch the light.",
    material: "925 silver, cubic zirconia", care_guide: "Wipe with soft cloth.",
    price: 1899, old_price: 2599, currency: "INR",
    images: ["earrings/soleil-1.webp"],
    rating_avg: 4.7, rating_count: 203,
    is_featured: false, is_trending: true, is_bestseller: true, is_active: true,
    created_at: "2026-05-30",
    variants: [{ variant_id: "v1", option_name: "Finish", option_value: "Gold", sku: "AS-EAR-003-G", price_delta: 0, stock: 21 }],
  },
  {
    product_id: "AS-BRAC-004", title: "Vera Chain Bracelet", slug: "vera-chain-bracelet",
    category_id: "cat-bracelets", collection_ids: "col-everyday",
    description: "A flat curb-chain bracelet with a secure clasp.",
    material: "925 silver, 18k gold plating", care_guide: "Remove before swimming.",
    price: 2799, old_price: 3599, currency: "INR",
    images: ["bracelets/vera-1.webp"],
    rating_avg: 4.6, rating_count: 54,
    is_featured: false, is_trending: true, is_bestseller: false, is_active: true,
    created_at: "2026-06-22",
    variants: [{ variant_id: "v1", option_name: "Size", option_value: "One size", sku: "AS-BRAC-004", price_delta: 0, stock: 7 }],
  },
  {
    product_id: "AS-RING-005", title: "Mira Stacking Ring", slug: "mira-stacking-ring",
    category_id: "cat-rings", collection_ids: "col-everyday",
    description: "A delicate beaded ring made for stacking.",
    material: "925 silver", care_guide: "Store flat to keep shape.",
    price: 1299, old_price: 0, currency: "INR",
    images: ["rings/mira-1.webp"],
    rating_avg: 4.8, rating_count: 167,
    is_featured: true, is_trending: false, is_bestseller: true, is_active: true,
    created_at: "2026-06-02",
    variants: [
      { variant_id: "v1", option_name: "Size", option_value: "S", sku: "AS-RING-005-S", price_delta: 0, stock: 15 },
      { variant_id: "v2", option_name: "Size", option_value: "M", sku: "AS-RING-005-M", price_delta: 0, stock: 11 },
    ],
  },
  {
    product_id: "AS-NECK-006", title: "Élan Tennis Necklace", slug: "elan-tennis-necklace",
    category_id: "cat-necklaces", collection_ids: "col-bridal",
    description: "A statement line of brilliant-cut stones.",
    material: "925 silver, cubic zirconia", care_guide: "Professional clean yearly.",
    price: 6499, old_price: 8999, currency: "INR",
    images: ["necklaces/elan-1.webp"],
    rating_avg: 5.0, rating_count: 41,
    is_featured: true, is_trending: true, is_bestseller: false, is_active: true,
    created_at: "2026-06-25",
    variants: [{ variant_id: "v1", option_name: "Length", option_value: '17"', sku: "AS-NECK-006-17", price_delta: 0, stock: 3 }],
  },
];
