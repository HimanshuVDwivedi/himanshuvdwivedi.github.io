/* =============================================================================
   AS COLLECTIONS — NEWSLETTER (behaviour)
   Client-side validation + feedback. No <form> submit (SPA-style handler).
   Capture endpoint (Apps Script → a "Subscribers" tab) wires in later; for now
   it validates and confirms so the UX is complete.
   ============================================================================= */

import { qs, on } from "../utilities/dom.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initNewsletter() {
  const input = qs("#newsletter-email");
  const button = qs("#newsletter-submit");
  const msg = qs("#newsletter-msg");
  if (!input || !button || !msg) return;

  const setMsg = (text, kind) => {
    msg.textContent = text;
    msg.className = "newsletter__msg " + (kind ? "is-" + kind : "");
  };

  const submit = () => {
    const value = input.value.trim();
    if (!EMAIL_RE.test(value)) {
      input.classList.add("is-invalid");
      setMsg("Please enter a valid email address.", "error");
      input.focus();
      return;
    }
    input.classList.remove("is-invalid");
    /* TODO(M-later): POST to subscribe endpoint. For now confirm locally. */
    setMsg("You’re on the list — your 10% code is on its way.", "success");
    input.value = "";
  };

  on(button, "click", submit);
  on(input, "keydown", (e) => { if (e.key === "Enter") submit(); });
  on(input, "input", () => input.classList.remove("is-invalid"));
}
