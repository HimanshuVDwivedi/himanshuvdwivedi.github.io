/** =============================================================================
 *  AS COLLECTIONS — WEB APP ENTRY (router)
 *  Apps Script gives you ONE doGet + ONE doPost; we route internally on `path`.
 *  Every response is the standard envelope, so the frontend never special-cases.
 *
 *  Deploy: Deploy → New deployment → Web app →
 *          Execute as: Me · Who has access: Anyone → copy the /exec URL.
 *  ========================================================================== */

/** Envelope helpers — identical shape to the mock client. */
function _ok(data)         { return { ok: true,  data: data, error: null }; }
function _fail(code, msg)  { return { ok: false, data: null, error: { code: code, message: msg } }; }

/** Serialise to JSON. NOTE: Apps Script web apps already emit
 *  `Access-Control-Allow-Origin: *`, so cross-origin GET from GitHub Pages works. */
function _respond(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Read GETs. `e.parameter.path` selects the handler. */
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    switch (p.path) {
      case "products":    return _respond(_ok(handleProducts(p)));
      case "product":     return _respond(_ok(handleProduct(p)));
      case "categories":  return _respond(_ok(handleCategories()));
      case "collections": return _respond(_ok(handleCollections()));
      case "ping":        return _respond(_ok({ pong: true }));   // health check
      default:            return _respond(_fail("BAD_PATH", "Unknown path: " + p.path));
    }
  } catch (err) {
    return _respond(_fail(err.code || "SERVER", err.message || String(err)));
  }
}

/** Write POSTs. Body is sent as text/plain (avoids CORS preflight) → JSON.parse here. */
function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (x) {}
  const path = (e && e.parameter && e.parameter.path) || body.path;
  try {
    checkRateLimit();   // protect write endpoints from abuse / runaway loops
    switch (path) {
      case "coupon/validate": return _respond(_ok(handleCouponValidate(body)));
      case "order/create":    return _respond(_ok(handleOrderCreate(body)));
      case "order/verify":    return _respond(_ok(handleOrderVerify(body)));
      default:                return _respond(_fail("BAD_PATH", "Unknown path: " + path));
    }
  } catch (err) {
    return _respond(_fail(err.code || "SERVER", err.message || String(err)));
  }
}
