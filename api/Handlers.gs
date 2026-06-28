/** =============================================================================
 *  AS COLLECTIONS — HANDLERS
 *  Each handler returns a plain payload (NOT the envelope); Code.gs wraps it.
 *  Output shapes match js/api/mock-data.js EXACTLY so flipping USE_MOCK=false
 *  changes nothing the frontend can see.
 *  ========================================================================== */

/** Build the full product list once (cached): products joined with variants,
 *  images split to arrays, inactive products dropped. */
function _loadProducts() {
  return cached("catalogue:products", function () {
    const variants = readTable(CONFIG.TABS.VARIANTS);
    const byProduct = {};
    variants.forEach((v) => {
      (byProduct[v.product_id] = byProduct[v.product_id] || []).push(v);
    });

    return readTable(CONFIG.TABS.PRODUCTS)
      .filter((p) => p.is_active !== false)
      .map((p) => {
        p.images = splitList(p.images);        // "a.webp,b.webp" → ["a.webp","b.webp"]
        p.variants = byProduct[p.product_id] || [];
        // collection_ids kept as a comma string (matches mock + client filters)
        return p;
      });
  });
}

/** GET products — filter / sort / paginate. Mirrors client getProducts(). */
function handleProducts(params) {
  let items = _loadProducts().slice();

  if (params.category)   items = items.filter((p) => p.category_id === params.category);
  if (params.collection) items = items.filter((p) => String(p.collection_ids).indexOf(params.collection) !== -1);
  if (params.priceMin !== undefined && params.priceMin !== "") items = items.filter((p) => p.price >= parseFloat(params.priceMin));
  if (params.priceMax !== undefined && params.priceMax !== "") items = items.filter((p) => p.price <= parseFloat(params.priceMax));
  if (params.availability === "in") {
    items = items.filter(function (p) {
      var vs = p.variants || [];
      return !(vs.length && vs.every(function (v) { return v.stock <= 0; }));
    });
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    items = items.filter((p) => String(p.title).toLowerCase().indexOf(q) !== -1);
  }

  switch (params.sort) {
    case "price-asc":  items.sort((a, b) => a.price - b.price); break;
    case "price-desc": items.sort((a, b) => b.price - a.price); break;
    case "newest":     items.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); break;
    case "az":         items.sort((a, b) => String(a.title).localeCompare(String(b.title))); break;
    default: break; // best-selling = sheet order
  }

  const page = parseInt(params.page, 10) || 1;
  const pageSize = parseInt(params.pageSize, 10) || items.length;
  const total = items.length;
  const paged = items.slice((page - 1) * pageSize, page * pageSize);
  return { items: paged, total: total, page: page, pageSize: pageSize };
}

/** GET product — one product (+ variants) by slug. */
function handleProduct(params) {
  const product = _loadProducts().filter((p) => p.slug === params.slug)[0];
  if (!product) throw { code: "NOT_FOUND", message: "Product not found" };
  return product;
}

/** GET categories. */
function handleCategories() {
  return cached("catalogue:categories", function () {
    return readTable(CONFIG.TABS.CATEGORIES).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  });
}

/** GET collections. */
function handleCollections() {
  return cached("catalogue:collections", function () {
    return readTable(CONFIG.TABS.COLLECTIONS);
  });
}

/* ---- Coupon validation (M5) ----------------------------------------------- */
function handleCouponValidate(body) {
  const code = sanitizeCouponCode(body.code);
  const subtotal = Math.max(0, parseFloat(body.subtotal) || 0);
  if (!code) throw { code: "INVALID_COUPON", message: "Enter a code." };

  const rows = readTable(CONFIG.TABS.COUPONS);
  const c = rows.filter(function (r) { return String(r.code).trim().toUpperCase() === code; })[0];

  if (!c || c.is_active === false) throw { code: "INVALID_COUPON", message: "That code isn’t valid." };
  if (c.expires_at && new Date(c.expires_at) < new Date()) throw { code: "EXPIRED", message: "This code has expired." };
  if (c.usage_limit && Number(c.used_count) >= Number(c.usage_limit)) throw { code: "USED_UP", message: "This code is no longer available." };
  if (subtotal < (Number(c.min_order) || 0)) {
    var need = Number(c.min_order) - subtotal;
    throw { code: "MIN_ORDER", message: "Add ₹" + need.toLocaleString("en-IN") + " more to use this code." };
  }
  return { code: c.code, type: c.type, value: Number(c.value), min_order: Number(c.min_order) || 0 };
}

/* ---- Orders + payments (M6) ------------------------------------------------
   SECURITY MODEL:
   - The client sends ONLY items+qty, a coupon code, and customer/address data.
   - The server re-prices EVERYTHING from the catalogue here. Client totals are
     never trusted.
   - The Razorpay key SECRET lives in Script Properties, never in the repo/client.
   - Payment is finalised only after server-side signature verification, and
     stock is decremented under a LockService lock with a re-read (closes the
     common oversell window on Sheets — see SDLC Part 1, §4.3).
*/

function _rzpProps() {
  const props = PropertiesService.getScriptProperties();
  return { keyId: props.getProperty("RAZORPAY_KEY_ID"), keySecret: props.getProperty("RAZORPAY_KEY_SECRET") };
}

function _hmacHex(message, secret) {
  const raw = Utilities.computeHmacSha256Signature(message, secret);
  return raw.map(function (b) { const v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? "0" + v : v; }).join("");
}

function _newOrderId() {
  return "AS-" + Utilities.formatDate(new Date(), "Asia/Kolkata", "yyMMddHHmmss") + "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

/** Re-price an order from the catalogue. Returns { lines, subtotal, discount, shipping, total }. */
function _priceOrder(items, couponCode) {
  const products = _loadProducts();
  let subtotal = 0;
  const lines = [];
  items.forEach(function (it) {
    const p = products.filter(function (x) { return x.product_id === it.product_id && x.is_active !== false; })[0];
    if (!p) throw { code: "BAD_ITEM", message: "A product in your cart is unavailable." };
    const v = (p.variants || []).filter(function (x) { return x.variant_id === it.variant_id; })[0];
    if (!v) throw { code: "BAD_VARIANT", message: "A selected option is unavailable." };
    const qty = parseInt(it.qty, 10);
    if (!(qty > 0)) throw { code: "BAD_QTY", message: "Invalid quantity." };
    const unit = Number(p.price) + (Number(v.price_delta) || 0);
    const line_total = unit * qty;
    subtotal += line_total;
    lines.push({ product_id: p.product_id, variant_id: v.variant_id, qty: qty, unit_price: unit, line_total: line_total });
  });

  let discount = 0, code = "";
  if (couponCode) {
    try {
      const c = handleCouponValidate({ code: couponCode, subtotal: subtotal });
      code = c.code;
      discount = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
    } catch (e) { discount = 0; } // invalid coupon → simply no discount
  }
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping = afterDiscount >= 1499 ? 0 : 49; // mirror CONFIG.FREE_SHIPPING_THRESHOLD / SHIPPING_FEE
  const total = afterDiscount + shipping;
  return { lines: lines, subtotal: subtotal, discount: discount, shipping: shipping, total: total, coupon_code: code };
}

function handleOrderCreate(body) {
  validateOrderInput(body);                       // structure + bounds + email/phone
  const items = body.items;
  const customer = body.customer || {};
  const shipping = sanitizeAddress(body.shipping);
  const billing = sanitizeAddress(body.billing || body.shipping);
  const giftNote = sanitizeCell(body.giftNote, 280);
  const couponCode = sanitizeCouponCode(body.coupon);

  const priced = _priceOrder(items, couponCode);
  const amountPaise = Math.round(priced.total * 100);
  const orderId = _newOrderId();

  // Create the Razorpay order (server-side, with the secret).
  const rzp = _rzpProps();
  const auth = Utilities.base64Encode(rzp.keyId + ":" + rzp.keySecret);
  const resp = UrlFetchApp.fetch("https://api.razorpay.com/v1/orders", {
    method: "post", contentType: "application/json",
    headers: { Authorization: "Basic " + auth },
    payload: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: orderId }),
    muteHttpExceptions: true,
  });
  const rzpOrder = JSON.parse(resp.getContentText() || "{}");
  if (resp.getResponseCode() >= 300 || !rzpOrder.id) {
    throw { code: "RZP_CREATE", message: "Could not start payment. Please retry." };
  }

  // Persist our order (status: created) + line items.
  appendRow(CONFIG.TABS.ORDERS, {
    order_id: orderId, razorpay_order_id: rzpOrder.id, razorpay_payment_id: "",
    customer_email: sanitizeCell(customer.email, 120), customer_phone: sanitizeCell(customer.phone, 15), status: "created",
    subtotal: priced.subtotal, discount: priced.discount, shipping: priced.shipping, total: priced.total,
    coupon_code: priced.coupon_code, shipping_address_json: JSON.stringify(shipping),
    gift_note: giftNote, created_at: new Date(),
  });
  appendRows(CONFIG.TABS.ORDER_ITEMS, priced.lines.map(function (l, i) {
    return { order_item_id: orderId + "-" + (i + 1), order_id: orderId, product_id: l.product_id,
      variant_id: l.variant_id, qty: l.qty, unit_price: l.unit_price, line_total: l.line_total };
  }));

  return { order_id: orderId, razorpay_order_id: rzpOrder.id, amount: amountPaise, currency: "INR", key_id: rzp.keyId };
}

function handleOrderVerify(body) {
  const oid = String(body.razorpay_order_id || ""), pid = String(body.razorpay_payment_id || ""), sig = String(body.razorpay_signature || "");
  if (!oid || !pid || !sig || !body.order_id) throw { code: "BAD_REQUEST", message: "Missing payment details." };
  const { keySecret } = _rzpProps();
  const expected = _hmacHex(oid + "|" + pid, keySecret);
  if (expected !== sig) throw { code: "BAD_SIGNATURE", message: "Payment verification failed." };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // Re-read stock INSIDE the lock, then decrement (oversell guard).
    const items = readTable(CONFIG.TABS.ORDER_ITEMS).filter(function (r) { return r.order_id === body.order_id; });
    for (var i = 0; i < items.length; i++) {
      const have = getVariantStock(items[i].variant_id);
      if (have === null || have < Number(items[i].qty)) {
        updateField(CONFIG.TABS.ORDERS, "order_id", body.order_id, "status", "failed_stock");
        throw { code: "OUT_OF_STOCK", message: "An item sold out during payment. You won’t be charged / will be refunded." };
      }
    }
    items.forEach(function (it) { decrementStock(it.variant_id, Number(it.qty)); });

    updateField(CONFIG.TABS.ORDERS, "order_id", body.order_id, "status", "paid");
    updateField(CONFIG.TABS.ORDERS, "order_id", body.order_id, "razorpay_payment_id", pid);
    clearCatalogueCache(); // stock changed
  } finally {
    lock.releaseLock();
  }

  // Best-effort confirmation email.
  try {
    const order = readTable(CONFIG.TABS.ORDERS).filter(function (r) { return r.order_id === body.order_id; })[0];
    if (order && order.customer_email) {
      MailApp.sendEmail(order.customer_email, "Your AS Collections order " + body.order_id,
        "Thank you! Your order " + body.order_id + " is confirmed.\nTotal paid: ₹" + order.total + ".");
    }
  } catch (e) { /* email is non-critical */ }

  return { order_id: body.order_id, status: "paid" };
}
