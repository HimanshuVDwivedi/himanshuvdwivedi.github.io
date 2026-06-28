/** =============================================================================
 *  AS COLLECTIONS — BACKEND CONFIG  (Google Apps Script / .gs)
 *  Central names + tuning. Paste this whole `api/` folder's .gs files into the
 *  Apps Script project bound to your seed Google Sheet (Extensions → Apps Script).
 *  ========================================================================== */

const CONFIG = {
  /** When the script is BOUND to the sheet (recommended), getActive() is used
   *  and SHEET_ID is ignored. For a STANDALONE script, paste the sheet id here. */
  SHEET_ID: "",

  TABS: {
    PRODUCTS:    "Products",
    VARIANTS:    "Variants",
    CATEGORIES:  "Categories",
    COLLECTIONS: "Collections",
    COUPONS:     "Coupons",
    ORDERS:      "Orders",
    ORDER_ITEMS: "OrderItems",
  },

  /** Catalogue cache TTL (seconds). Reads serve from cache; the sheet is only
   *  hit on a cold cache. Keep modest so merchandiser edits show up quickly. */
  CACHE_TTL: 300,

  /** Boolean-typed columns to coerce (sheet cells may be TRUE/true/1). */
  BOOL_FIELDS: ["is_featured", "is_trending", "is_bestseller", "is_active", "is_default", "is_approved", "is_active"],
};
