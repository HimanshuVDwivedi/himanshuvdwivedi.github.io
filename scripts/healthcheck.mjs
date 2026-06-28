/* =============================================================================
   AS COLLECTIONS — LIVE API HEALTH CHECK
   Smoke-tests the deployed Apps Script API end-to-end (read paths + coupon).
   Usage:
     API_BASE="https://script.google.com/macros/s/XXXX/exec" node scripts/healthcheck.mjs
   Exit code 0 = all good, 1 = something's wrong (handy in CI / cron).
   ============================================================================= */

const API = process.env.API_BASE;
if (!API) { console.error("Set API_BASE to your Apps Script /exec URL."); process.exit(1); }

const get = async (path) => (await fetch(`${API}?path=${path}`)).json();
const post = async (path, body) =>
  (await fetch(`${API}?path=${path}`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) })).json();

const results = [];
const check = (name, ok, note = "") => results.push({ name, ok: !!ok, note });

try {
  try { const r = await get("ping"); check("ping (web app reachable)", r.ok && r.data?.pong); }
  catch (e) { check("ping (web app reachable)", false, e.message); }

  try { const r = await get("products&pageSize=3"); check("products read", r.ok && Array.isArray(r.data?.items), r.ok ? `${r.data.total} products` : r.error?.message); }
  catch (e) { check("products read", false, e.message); }

  try { const r = await get("categories"); check("categories read", r.ok && Array.isArray(r.data)); }
  catch (e) { check("categories read", false, e.message); }

  try {
    const r = await post("coupon/validate", { code: "WELCOME10", subtotal: 9999 });
    // Either it validates, or returns a known business error — both mean the path works.
    check("coupon/validate path", r.ok || ["MIN_ORDER", "INVALID_COUPON", "EXPIRED", "USED_UP"].includes(r.error?.code), r.ok ? "valid" : r.error?.code);
  } catch (e) { check("coupon/validate path", false, e.message); }

  console.log(`\nHealth check against ${API}\n`);
  let allOk = true;
  for (const r of results) { console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.note ? "  — " + r.note : ""}`); if (!r.ok) allOk = false; }
  console.log(allOk ? "\nAll systems go.\n" : "\nOne or more checks failed — see above.\n");
  process.exit(allOk ? 0 : 1);
} catch (e) {
  console.error("Health check crashed:", e.message);
  process.exit(1);
}
