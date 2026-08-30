/* Trusted By — infinite logo marquee.
   Duplicates the logo row so CSS can loop at translateX(-50%).
   No-JS and reduced motion keep the static Figma row. */
(function () {
  var viewport = document.querySelector(".trusted__viewport");
  var track = viewport && viewport.querySelector(".trusted__track");
  var row = track && track.querySelector(".trusted__row");
  if (!row) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var clone = row.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.querySelectorAll("img").forEach(function (img) {
    img.setAttribute("alt", "");
    img.setAttribute("loading", "eager");
  });
  track.appendChild(clone);
  viewport.classList.add("is-marquee");
})();
