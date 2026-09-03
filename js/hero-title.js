/* Hero video — muted loop over the still. Reduced motion keeps
   the still and unloads the file. Autoplay can fail silently;
   the still stays visible underneath. */
(function () {
  var video = document.querySelector(".hero__video");
  if (!video) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    video.pause();
    video.removeAttribute("autoplay");
    while (video.firstChild) video.removeChild(video.firstChild);
    video.removeAttribute("src");
    video.load();
    return;
  }

  video.muted = true;
  video.setAttribute("playsinline", "");

  function ready() {
    video.classList.add("is-ready");
  }
  video.addEventListener("playing", ready, { once: true });
  if (video.readyState >= 3) ready();

  var play = function () {
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  };
  play();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) video.pause();
    else play();
  });
})();

/* Footer video — same pattern as the hero video. */
(function () {
  var video = document.querySelector(".site-footer__video");
  if (!video) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    video.pause();
    video.removeAttribute("autoplay");
    while (video.firstChild) video.removeChild(video.firstChild);
    video.removeAttribute("src");
    video.load();
    return;
  }

  video.muted = true;
  video.setAttribute("playsinline", "");

  function ready() {
    video.classList.add("is-ready");
  }
  video.addEventListener("playing", ready, { once: true });
  if (video.readyState >= 3) ready();

  var play = function () {
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  };
  play();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) video.pause();
    else play();
  });
})();

/* Hero title — type-on when the heading scrolls into view.
   The full string stays in the HTML so crawlers and no-JS
   still see it. Reduced motion skips to the end. */
(function () {
  var title = document.getElementById("hero-title");
  if (!title) return;
  var textEl = title.querySelector(".hero__title-text");
  if (!textEl) return;

  var full = textEl.textContent;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CHAR_MS = 110; /* matches --hero-type */

  function done() {
    textEl.textContent = full;
    title.classList.remove("is-typing");
    title.classList.add("is-typed");
  }

  if (reduce || !full) {
    done();
    return;
  }

  var started = false;
  function begin() {
    if (started) return;
    started = true;
    title.classList.add("is-typing");
    textEl.textContent = "";

    var i = 0;
    (function next() {
      textEl.textContent = full.slice(0, ++i);
      if (i < full.length) window.setTimeout(next, CHAR_MS);
      else done();
    })();
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            io.unobserve(title);
            begin();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(title);
  } else {
    begin();
  }
})();
