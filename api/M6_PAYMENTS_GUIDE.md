# AS Collections — M6 Payments & Deploy Guide
## Going live with real Razorpay (checkout, orders, signature verification)

In **mock mode** (`USE_MOCK: true`) checkout already works end-to-end with a
*simulated* payment — useful for building and demos. This guide wires the **real**
flow. The whole design assumes one rule:

> **The client never sends prices.** It sends only items + quantities, a coupon
> code, and the customer/address. The server (Apps Script) re-prices everything
> from the catalogue, creates the Razorpay order, and finalises the order only
> after verifying the payment signature server-side.

---

## 1. Get Razorpay keys
1. Create a Razorpay account → **Settings → API Keys**.
2. Generate **Test Mode** keys first: a **Key ID** (`rzp_test_…`, publishable)
   and a **Key Secret** (private — treat like a password).

## 2. Put the SECRET in Script Properties (never in the repo)
In the Apps Script editor: **Project Settings (⚙) → Script Properties → Add**:

| Property | Value |
|---|---|
| `RAZORPAY_KEY_ID` | your `rzp_test_…` key id |
| `RAZORPAY_KEY_SECRET` | your key **secret** |

The secret stays here, server-side. It is never sent to the browser and never
committed to GitHub. The handlers read it via `PropertiesService`.

## 3. Put the PUBLISHABLE key id in the frontend
In `js/config/config.js`:
```js
RAZORPAY_KEY_ID: "rzp_test_xxxxxxxx",   // publishable key id (safe on client)
USE_MOCK: false,                         // turn on the live flow
```
Only the **Key ID** goes here. The Key ID is designed to be public; the **Secret never is**.

## 4. Re-deploy the Apps Script
The order handlers are new code, so cut a new version:
**Deploy → Manage deployments → edit (✏️) → Version: New version → Deploy.**
The `/exec` URL stays the same.

## 5. Test a real order (Test Mode)
1. Add to cart → checkout → fill the form → **Pay securely**.
2. Razorpay's modal opens. Use a **test card**: `4111 1111 1111 1111`, any future
   expiry, any CVV, any OTP.
3. On success you land on the confirmation page. In your Sheet, the **Orders** row
   flips to `paid` with a `razorpay_payment_id`, and the **Variants** stock for the
   purchased items decrements.

## 6. Go live
Swap the test keys for **Live Mode** keys (Key ID in `config.js`, Secret in Script
Properties), complete Razorpay KYC, and re-deploy.

---

## What the server does (and why it's safe)

`order/create`
- Re-prices the cart from the catalogue (ignores any client-supplied amounts).
- Re-validates the coupon server-side (active / not expired / min-order / usage).
- Creates the Razorpay order with the **server-computed** amount, using the secret.
- Writes the `Orders` row as `created` + the `OrderItems`. Returns the
  `razorpay_order_id` + amount + **publishable** key id only.

`order/verify`
- Recomputes the HMAC-SHA256 signature of `razorpay_order_id|razorpay_payment_id`
  with the secret and compares it to Razorpay's signature. Mismatch → rejected.
- Under a `LockService` lock, **re-reads stock** for each item and decrements it
  (closes the common oversell window on Sheets — SDLC Part 1, §4.3). If an item
  sold out mid-payment, the order is flagged `failed_stock` for refund.
- Marks the order `paid`, records the `razorpay_payment_id`, clears the catalogue
  cache, and sends a best-effort confirmation email.

**CORS:** order POSTs are sent as `text/plain` from the client (a "simple request")
so they don't trigger a preflight Apps Script can't answer — already wired in
`api/client.js`. You don't need to do anything.

---

## Go-live checklist
- [ ] `RAZORPAY_KEY_SECRET` is in **Script Properties only** (not in the repo, not in `config.js`).
- [ ] `RAZORPAY_KEY_ID` (publishable) set in `config.js`; `USE_MOCK: false`.
- [ ] Apps Script re-deployed as a **new version**.
- [ ] A test order shows `paid` in `Orders` and decremented `Variants` stock.
- [ ] Confirmation email received.
- [ ] (Recommended) Add a Razorpay **webhook** to `order/verify`-style handling as a
      backstop, so payment capture is recorded even if the browser closes before the
      handler returns. (Webhook signature uses your webhook secret — a future hardening step.)
