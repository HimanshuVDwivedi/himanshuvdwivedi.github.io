/* =============================================================================
   AS COLLECTIONS — GALLERY
   Main image + thumbnail strip + desktop hover-zoom. Shared by PDP and QuickView.
   On mobile, thumbnails switch images (and the well is swipe-friendly).
   ============================================================================= */

import { el } from "../utilities/dom.js";
import { imageUrl } from "../api/client.js";
import { productPlaceholder } from "../utilities/placeholder.js";

export function Gallery(product) {
  const imgs = product.images && product.images.length ? product.images : [null];

  const main = el("img", { class: "gallery__img", alt: product.title, decoding: "async", width: "800", height: "800" });
  const setMain = (path, i) => {
    const fb = productPlaceholder(product.title, i);
    main.onerror = () => { main.onerror = null; main.src = fb; };
    main.src = path ? imageUrl(path) : fb;
  };
  setMain(imgs[0], 0);

  const stage = el("div", { class: "gallery__stage" }, main);

  /* Desktop hover-zoom: scale the image and track the cursor as origin.
     Skipped under reduced-motion. */
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stage.addEventListener("mousemove", (e) => {
      const r = stage.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      main.style.transformOrigin = `${x}% ${y}%`;
      main.style.transform = "scale(1.9)";
    });
    stage.addEventListener("mouseleave", () => { main.style.transform = ""; });
  }

  const thumbs = el("div", { class: "gallery__thumbs" });
  imgs.forEach((path, i) => {
    const timg = el("img", { src: path ? imageUrl(path) : productPlaceholder(product.title, i), alt: "" });
    timg.onerror = () => { timg.src = productPlaceholder(product.title, i); };
    const btn = el("button", { class: "gallery__thumb" + (i === 0 ? " is-active" : ""), "aria-label": `View image ${i + 1}` }, timg);
    btn.addEventListener("click", () => {
      setMain(path, i);
      thumbs.querySelectorAll(".gallery__thumb").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
    thumbs.append(btn);
  });

  return el("div", { class: "gallery" + (imgs.length < 2 ? " gallery--single" : "") },
    stage,
    imgs.length > 1 ? thumbs : null
  );
}
