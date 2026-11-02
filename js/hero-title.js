/* Hero video — plays once over the still. Reduced motion keeps
   the still and unloads the file. Autoplay can fail silently;
   the still stays visible underneath. The handoff below brings
   the main heading up when the clip ends. */
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
  video.loop = false;
  video.removeAttribute("loop");

  function ready() {
    video.classList.add("is-ready");
  }
  video.addEventListener("playing", ready, { once: true });
  if (video.readyState >= 3) ready();

  var play = function () {
    if (video.ended) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  };
  play();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) video.pause();
    else play();
  });
})();

/* Banner clips don't loop cleanly. Play each one once, and if
   the reader is still on it when it finishes, glide the main
   heading to the top of the viewport. A scroll, wheel or
   keypress before then leaves the page where they put it. */
(function () {
  var videos = document.querySelectorAll(
    ".hero__video, .pricing-hero__video, .faq-hero__video"
  );
  if (!videos.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var handedOff = false;
  var origin = window.scrollY;
  /* A restored scroll position means they already left the banner. */
  if (origin > 32) handedOff = true;

  function takeOver() { handedOff = true; }

  window.addEventListener("wheel", function (e) {
    if (e.deltaY || e.deltaX) takeOver();
  }, { passive: true });
  window.addEventListener("touchmove", takeOver, { passive: true });
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" ||
        e.key === "PageDown" || e.key === "PageUp" ||
        e.key === "Home" || e.key === "End" || e.key === " ") takeOver();
  });
  window.addEventListener("scroll", function () {
    if (Math.abs(window.scrollY - origin) > 32) takeOver();
  }, { passive: true });

  function headingAfter(video) {
    var nodes = document.querySelectorAll(
      ".hero__title, .pricing-intro__title, .faq-hero__title"
    );
    for (var i = 0; i < nodes.length; i++) {
      if (video.compareDocumentPosition(nodes[i]) & Node.DOCUMENT_POSITION_FOLLOWING) {
        return nodes[i];
      }
    }
    return null;
  }

  function handoff(video) {
    if (handedOff || video.dataset.handed === "1") return;
    video.dataset.handed = "1";
    if (!video.duration || video.currentTime < 0.5) return;
    var heading = headingAfter(video);
    if (!heading) return;
    var gap = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--s-5")
    ) || 24;
    var top = heading.getBoundingClientRect().top;
    /* The clip fades to white and overlaps the heading. Scroll
       far enough that the video itself has left the screen. */
    var media = video.closest(".hero__media, .pricing-hero__media, .faq-hero__media") || video;
    var videoClear = media.getBoundingClientRect().bottom;
    var delta = Math.max(top - gap, videoClear);
    if (delta <= 1) return;
    window.scrollTo({
      top: Math.max(0, window.scrollY + delta),
      behavior: "smooth"
    });
  }

  Array.prototype.forEach.call(videos, function (video) {
    video.loop = false;
    video.removeAttribute("loop");
    video.addEventListener("ended", function () {
      if (!document.hidden) {
        handoff(video);
        return;
      }
      document.addEventListener("visibilitychange", function onVis() {
        if (document.hidden) return;
        document.removeEventListener("visibilitychange", onVis);
        handoff(video);
      });
    });
    if (video.ended) handoff(video);
  });
})();

/* Footer video — muted loop over the still. */
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
