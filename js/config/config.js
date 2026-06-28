/* =============================================================================
   AS COLLECTIONS — RUNTIME CONFIG
   Central place for environment values. Nothing else hard-codes URLs or flags.
   When the backend changes, this + api/client.js are the only files to touch.
   ============================================================================= */

export const CONFIG = {
  /* Google Apps Script Web App URL (set after backend deploy in M1/M6).
     Leave as-is while USE_MOCK is true. */
  API_BASE: "https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec",

  /* Product images are committed to a GitHub image repo and served through
     jsDelivr's CDN (cached + fast) instead of raw.githubusercontent.com.
     Final URL = IMAGE_CDN + "<path-in-repo>".
     e.g. ".../gh/USER/as-collections-images@main/rings/aria-1.webp"            */
  IMAGE_CDN: "https://cdn.jsdelivr.net/gh/USER/as-collections-images@main/",

  /* Feature flags ---------------------------------------------------------- */
  USE_MOCK: true,        /* M0: serve local mock data. Flip to false in M1. */
  INFINITE_SCROLL: true, /* PLP scroll behaviour (pagination URLs still exist) */

  /* Commerce defaults ------------------------------------------------------ */
  CURRENCY: "INR",
  FREE_SHIPPING_THRESHOLD: 1499,  /* ₹ — drives the cart progress nudge */
  SHIPPING_FEE: 49,               /* ₹ flat shipping below the threshold */

  /* Razorpay public key id (publishable — safe on client; SECRET stays
     server-side in Apps Script Script Properties). Set in M6.               */
  RAZORPAY_KEY_ID: "rzp_test_REPLACE",

  /* Auto-sliding announcement bar messages. */
  ANNOUNCEMENTS: [
    "Free shipping over ₹1,499",
    "30-day easy returns",
    "925 silver · Hallmarked",
    "Festive offer — use WELCOME10 for 10% off",
  ],

  /* Primary nav — capped (Hick's Law). Everything else lives in the footer. */
  NAV: [
    { label: "New In",    href: "/pages/shop.html?sort=newest" },
    { label: "Rings",     href: "/pages/shop.html?category=cat-rings" },
    { label: "Necklaces", href: "/pages/shop.html?category=cat-necklaces" },
    { label: "Earrings",  href: "/pages/shop.html?category=cat-earrings" },
    { label: "Bracelets", href: "/pages/shop.html?category=cat-bracelets" },
  ],

  /* PLP page size (per fetch for pagination / infinite scroll). */
  PAGE_SIZE: 8,

  /* Price filter brackets (single-select → exact server-side min/max). */
  PRICE_BRACKETS: [
    { label: "All prices",       min: "",     max: "" },
    { label: "Under ₹1,500",     min: "",     max: 1499 },
    { label: "₹1,500 – ₹3,000",  min: 1500,   max: 3000 },
    { label: "₹3,000 – ₹5,000",  min: 3000,   max: 5000 },
    { label: "Over ₹5,000",      min: 5001,   max: "" },
  ],

  /* Sort options for the PLP dropdown. */
  SORT_OPTIONS: [
    { value: "",           label: "Best Selling" },
    { value: "newest",     label: "Newest" },
    { value: "price-asc",  label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "az",         label: "Alphabetical" },
  ],
};
