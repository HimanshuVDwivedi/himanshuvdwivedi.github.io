/* =============================================================================
   AS COLLECTIONS — ADDRESS FORM
   Reusable address fieldset (checkout now, account later). Indian pincode
   autofills city + state via the public India Post API (graceful: if it fails,
   the user just types them). Returns { element, getValues, validate }.
   ============================================================================= */

import { el, qs } from "../utilities/dom.js";

function field(ns, name, label, attrs = {}) {
  const input = el("input", { class: "input", id: `${ns}-${name}`, name, ...attrs });
  const err = el("p", { class: "field__err", id: `${ns}-${name}-err` });
  const wrap = el("div", { class: "field" + (attrs.half ? " field--half" : "") },
    el("label", { class: "field__label", for: `${ns}-${name}` }, label), input, err);
  return { wrap, input, err };
}

export function AddressForm(ns = "ship") {
  const name = field(ns, "name", "Full name", { autocomplete: "name" });
  const pincode = field(ns, "pincode", "PIN code", { inputmode: "numeric", maxlength: "6", autocomplete: "postal-code", half: true });
  const phoneless = true; // phone lives in the contact section
  const line1 = field(ns, "line1", "Address line 1", { autocomplete: "address-line1" });
  const line2 = field(ns, "line2", "Address line 2 (optional)", { autocomplete: "address-line2" });
  const city = field(ns, "city", "City", { autocomplete: "address-level2", half: true });
  const state = field(ns, "state", "State", { autocomplete: "address-level1", half: true });

  // Pincode → city/state autofill
  pincode.input.addEventListener("input", async () => {
    const pin = pincode.input.value.replace(/\D/g, "").slice(0, 6);
    pincode.input.value = pin;
    if (pin.length !== 6) return;
    try {
      const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await r.json();
      const po = data?.[0]?.PostOffice?.[0];
      if (po) {
        if (!city.input.value) city.input.value = po.District || po.Block || "";
        if (!state.input.value) state.input.value = po.State || "";
      }
    } catch { /* offline / blocked → user fills manually */ }
  });

  const element = el("div", { class: "address-form" },
    name.wrap,
    el("div", { class: "field-row" }, pincode.wrap, city.wrap),
    line1.wrap, line2.wrap,
    el("div", { class: "field-row" }, state.wrap, el("div", { class: "field field--half" }))
  );

  const fields = { name, pincode, line1, city, state };

  function setError(f, msg) { f.err.textContent = msg || ""; f.input.classList.toggle("is-invalid", !!msg); }

  function validate() {
    let valid = true;
    const checks = [
      [name, (v) => v.trim().length >= 2, "Enter your full name"],
      [pincode, (v) => /^\d{6}$/.test(v), "Enter a valid 6-digit PIN"],
      [line1, (v) => v.trim().length >= 4, "Enter your address"],
      [city, (v) => v.trim().length >= 2, "Enter your city"],
      [state, (v) => v.trim().length >= 2, "Enter your state"],
    ];
    for (const [f, test, msg] of checks) {
      const okk = test(f.input.value);
      setError(f, okk ? "" : msg);
      if (!okk) valid = false;
    }
    return valid;
  }

  function getValues() {
    return {
      name: name.input.value.trim(), pincode: pincode.input.value.trim(),
      line1: line1.input.value.trim(), line2: line2.input.value.trim(),
      city: city.input.value.trim(), state: state.input.value.trim(),
    };
  }

  return { element, getValues, validate };
}
