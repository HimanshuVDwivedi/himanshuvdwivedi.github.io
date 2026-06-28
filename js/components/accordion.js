/* =============================================================================
   AS COLLECTIONS — ACCORDION
   Accessible disclosure list. items: [{ title, content }] where content is an
   HTML string or a DOM node. First item open by default.
   ============================================================================= */

import { el } from "../utilities/dom.js";

export function Accordion(items) {
  const root = el("div", { class: "accordion" });

  items.forEach((item, i) => {
    const panelId = `acc-panel-${i}-${Math.random().toString(36).slice(2, 7)}`;
    const open = i === 0;

    const panel = el("div", { class: "accordion__panel", id: panelId, hidden: open ? null : true },
      typeof item.content === "string" ? el("div", { class: "accordion__content", html: item.content }) : item.content
    );

    const btn = el("button", {
      class: "accordion__trigger", type: "button",
      "aria-expanded": open ? "true" : "false", "aria-controls": panelId,
    }, el("span", {}, item.title), el("span", { class: "accordion__icon", "aria-hidden": "true" }, "+"));

    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
      panel.hidden = isOpen;
    });

    root.append(el("div", { class: "accordion__item" }, btn, panel));
  });

  return root;
}
