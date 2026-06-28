/* =============================================================================
   AS COLLECTIONS — VARIANT SELECTOR
   Renders option pills grouped by option_name (Size / Length / Finish / …).
   Sold-out values are disabled. Single-dimension to match the catalogue schema
   (each variant = one option_value with its own stock).
   Returns { element, getSelected } and calls onChange(variant) on selection.
   ============================================================================= */

import { el } from "../utilities/dom.js";

export function VariantSelector(product, onChange) {
  const variants = product.variants || [];
  const wrap = el("div", { class: "variant" });

  // First in-stock variant is the default selection.
  let selected = variants.find((v) => v.stock > 0) || variants[0] || null;

  if (variants.length) {
    const optionName = variants[0].option_name || "Option";
    const group = el("div", { class: "variant__group" },
      el("span", { class: "variant__label" }, optionName)
    );
    const pills = el("div", { class: "variant__pills" });

    variants.forEach((v) => {
      const soldOut = v.stock <= 0;
      const pill = el("button", {
        class: "variant__pill" + (v === selected ? " is-selected" : "") + (soldOut ? " is-soldout" : ""),
        type: "button",
        disabled: soldOut ? true : null,
        "aria-pressed": v === selected ? "true" : "false",
      }, v.option_value);

      if (!soldOut) {
        pill.addEventListener("click", () => {
          selected = v;
          pills.querySelectorAll(".variant__pill").forEach((b) => { b.classList.remove("is-selected"); b.setAttribute("aria-pressed", "false"); });
          pill.classList.add("is-selected");
          pill.setAttribute("aria-pressed", "true");
          onChange && onChange(v);
        });
      }
      pills.append(pill);
    });

    group.append(pills);
    wrap.append(group);
  }

  return { element: wrap, getSelected: () => selected };
}
