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

/* Hero title — fast type-on. The full string stays in the HTML
   so crawlers and no-JS still see it. Deferred: does not block
   parse or the hero image. Reduced motion skips to the end. */
(function () {
  var title = document.getElementById("hero-title");
  if (!title) return;
  var textEl = title.querySelector(".hero__title-text");
  if (!textEl) return;

  var full = textEl.textContent;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function done() {
    textEl.textContent = full;
    title.classList.remove("is-typing");
    title.classList.add("is-typed");
  }

  if (reduce || !full) {
    done();
    return;
  }

  title.classList.add("is-typing");
  textEl.textContent = "";

  var i = 0;
  var perFrame = 3;
  var safety = window.setTimeout(done, 2000);

  function step() {
    i = Math.min(i + perFrame, full.length);
    textEl.textContent = full.slice(0, i);
    if (i < full.length) {
      window.requestAnimationFrame(step);
    } else {
      window.clearTimeout(safety);
      done();
    }
  }
  window.requestAnimationFrame(step);
})();
