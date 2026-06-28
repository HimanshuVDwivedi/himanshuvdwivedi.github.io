/* =============================================================================
   AS COLLECTIONS — QUANTITY STEPPER
   −  value  +  with clamping to [1, max]. Returns { element, getValue, setMax }.
   ============================================================================= */

import { el } from "../utilities/dom.js";

export function QuantityStepper(max = 99, onChange) {
  let value = 1;
  let limit = max;

  const out = el("output", { class: "qty__value", "aria-live": "polite" }, "1");
  const dec = el("button", { class: "qty__btn", type: "button", "aria-label": "Decrease quantity" }, "–");
  const inc = el("button", { class: "qty__btn", type: "button", "aria-label": "Increase quantity" }, "+");

  const render = () => {
    out.textContent = String(value);
    dec.disabled = value <= 1;
    inc.disabled = value >= limit;
    onChange && onChange(value);
  };
  dec.addEventListener("click", () => { if (value > 1) { value--; render(); } });
  inc.addEventListener("click", () => { if (value < limit) { value++; render(); } });

  const element = el("div", { class: "qty" }, dec, out, inc);
  render();

  return {
    element,
    getValue: () => value,
    setMax: (m) => { limit = Math.max(1, m); if (value > limit) value = limit; render(); },
  };
}
