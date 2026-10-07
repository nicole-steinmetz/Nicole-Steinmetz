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

/* Hero title — type the first line, then hand emphasis to the
   second. The full strings stay in the HTML so crawlers and
   no-JS still see them. Reduced motion skips to the end. */
(function () {
  var title = document.getElementById("hero-title");
  if (!title) return;
  var lead = title.querySelector(".hero__line--lead");
  var focus = title.querySelector(".hero__line--focus");
  if (!lead || !focus) return;

  var leadFull = lead.textContent;
  var focusFull = focus.textContent;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CHAR_MS = 110; /* matches --hero-type */

  function finish() {
    if (!lead.querySelector(".hero__char")) {
      lead.textContent = leadFull;
      focus.textContent = focusFull;
    }
    lead.classList.remove("is-current");
    focus.classList.add("is-current");
    title.classList.remove("is-typing");
    title.classList.add("is-focus", "is-typed");
  }

  function typeLine(el, full, then) {
    el.textContent = "";
    var i = 0;
    (function next() {
      var ch = document.createElement("span");
      ch.className = "hero__char is-in";
      ch.textContent = full.charAt(i);
      el.appendChild(ch);
      i += 1;
      if (i < full.length) window.setTimeout(next, CHAR_MS);
      else if (then) then();
    })();
  }

  /* Previous line sweeps through the same colours and lands grey. */
  function muteLine(el) {
    var step = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--hero-sweep-step")
    ) || 25;
    var chars = el.querySelectorAll(".hero__char");
    chars.forEach(function (ch, n) {
      ch.classList.remove("is-in");
      ch.style.animation = "none";
      void ch.offsetWidth;
      ch.style.animation = "hero-char-mute var(--hero-sweep) ease-out " + (n * step) + "ms forwards";
    });
  }

  if (reduce || !leadFull || !focusFull) {
    finish();
    return;
  }

  var started = false;
  function begin() {
    if (started) return;
    started = true;
    title.classList.add("is-typing");
    lead.textContent = "";
    focus.textContent = "";
    lead.classList.add("is-current");

    typeLine(lead, leadFull, function () {
      lead.classList.remove("is-current");
      muteLine(lead);
      focus.classList.add("is-current");
      title.classList.add("is-focus");
      typeLine(focus, focusFull, finish);
    });
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
