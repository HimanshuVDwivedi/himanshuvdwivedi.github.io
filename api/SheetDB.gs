/** =============================================================================
 *  AS COLLECTIONS — SHEET DB
 *  Reads a tab as an array of plain objects keyed by the header row.
 *  This is the thin "ORM" over Sheets — handlers never touch ranges directly.
 *  ========================================================================== */

/** Get the active spreadsheet (bound) or open by id (standalone). */
function _ss() {
  return CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID)
                         : SpreadsheetApp.getActiveSpreadsheet();
}

/** Coerce common spreadsheet booleans to real booleans. */
function _toBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

/**
 * Read an entire tab as objects: [{header: value, ...}, ...].
 * Empty trailing rows are skipped. Boolean fields are coerced.
 * @param {string} tabName
 * @returns {object[]}
 */
function readTable(tabName) {
  const sheet = _ss().getSheetByName(tabName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map((h) => String(h).trim());
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    // skip fully blank rows
    if (row.every((c) => c === "" || c === null)) continue;
    const obj = {};
    headers.forEach((h, c) => {
      let v = row[c];
      if (CONFIG.BOOL_FIELDS.indexOf(h) !== -1) v = _toBool(v);
      // normalise dates to YYYY-MM-DD strings for stable JSON
      if (v instanceof Date) v = Utilities.formatDate(v, "Asia/Kolkata", "yyyy-MM-dd");
      obj[h] = v;
    });
    rows.push(obj);
  }
  return rows;
}

/** Split a comma-separated cell into a trimmed array (for images, etc.). */
function splitList(value) {
  if (!value) return [];
  return String(value).split(",").map((s) => s.trim()).filter(Boolean);
}

/* ---- Writes (orders + inventory) ------------------------------------------ */

/** Append one object as a row, mapping keys to the tab's header order. */
function appendRow(tabName, obj) {
  const sheet = _ss().getSheetByName(tabName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const row = headers.map((h) => (obj[h] !== undefined ? obj[h] : ""));
  sheet.appendRow(row);
}

/** Append many objects efficiently. */
function appendRows(tabName, objs) {
  if (!objs.length) return;
  const sheet = _ss().getSheetByName(tabName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const rows = objs.map((o) => headers.map((h) => (o[h] !== undefined ? o[h] : "")));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}

/** Find the 1-based sheet row for a key match, or -1. Returns {row, headers, values}. */
function _locate(tabName, keyField, keyValue) {
  const sheet = _ss().getSheetByName(tabName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const col = headers.indexOf(keyField);
  if (col === -1) return { sheet, row: -1, headers };
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][col]) === String(keyValue)) return { sheet, row: r + 1, headers };
  }
  return { sheet, row: -1, headers };
}

/** Set a single field on the row matching keyField=keyValue. */
function updateField(tabName, keyField, keyValue, field, value) {
  const loc = _locate(tabName, keyField, keyValue);
  if (loc.row === -1) return false;
  const col = loc.headers.indexOf(field);
  if (col === -1) return false;
  loc.sheet.getRange(loc.row, col + 1).setValue(value);
  return true;
}

/** Read current stock for a variant. */
function getVariantStock(variant_id) {
  const loc = _locate(CONFIG.TABS.VARIANTS, "variant_id", variant_id);
  if (loc.row === -1) return null;
  const col = loc.headers.indexOf("stock");
  return Number(loc.sheet.getRange(loc.row, col + 1).getValue());
}

/** Decrement variant stock by qty (no clamp — caller checks availability first). */
function decrementStock(variant_id, qty) {
  const current = getVariantStock(variant_id);
  if (current === null) return false;
  return updateField(CONFIG.TABS.VARIANTS, "variant_id", variant_id, "stock", current - qty);
}
