/* How a build runs — timeline follows the step at the
   viewport centre. One observer does both jobs: which step
   is current, and whether the cube should be playing.
   No-JS leaves every step readable. Reduced motion keeps the
   poster and skips the fades. Below 900px nothing sticks. */
(function () {
  var section = document.querySelector(".process");
  var video = section && section.querySelector(".process__video");
  var steps = section ? Array.prototype.slice.call(section.querySelectorAll(".process__step")) : [];
  var labels = section ? Array.prototype.slice.call(section.querySelectorAll(".process__label")) : [];
  var marker = section && section.querySelector(".process__marker");
  if (!section || !video || !steps.length || !marker) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow = window.matchMedia("(max-width: 899px)");
  var current = 0;

  if (reduce) {
    video.pause();
    video.removeAttribute("autoplay");
    while (video.firstChild) video.removeChild(video.firstChild);
    video.removeAttribute("src");
    video.load();
  } else {
    video.muted = true;
    video.setAttribute("playsinline", "");
    video.pause();
  }

  function stateText(i, state) {
    var name = "Step " + (i + 1);
    if (state === "active") return name + ", current";
    if (state === "complete") return name + ", done";
    return name;
  }

  function glyphFor(step, i, state) {
    if (state === "active" && step.hasAttribute("data-heart")) return "♥";
    if (state === "complete") return "✓";
    return String(i + 1);
  }

  function placeMarker(index) {
    var label = labels[index];
    if (!label || narrow.matches) return;
    marker.style.top = label.offsetTop + "px";
    marker.style.left = label.offsetLeft + "px";
    marker.style.width = label.offsetWidth + "px";
    marker.style.height = label.offsetHeight + "px";
  }

  function apply(index) {
    current = index;
    steps.forEach(function (step, i) {
      var state = i === index ? "active" : (i < index ? "complete" : "upcoming");
      var on = !narrow.matches;
      step.classList.toggle("is-active", on && state === "active");
      step.classList.toggle("is-complete", on && state === "complete");
      if (on && state === "active") step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
      var glyph = step.querySelector(".process__glyph");
      var status = step.querySelector(".process__status");
      if (glyph) glyph.textContent = on ? glyphFor(step, i, state) : String(i + 1);
      if (status) status.textContent = on ? stateText(i, state) : stateText(i, "upcoming");
    });
    labels.forEach(function (label, i) {
      label.classList.toggle("is-active", !narrow.matches && i === index);
    });
    placeMarker(index);
  }

  function stepAtCentre() {
    var mid = window.innerHeight / 2;
    var containing = -1;
    var nearest = 0;
    var nearestDist = Infinity;
    steps.forEach(function (step, i) {
      var rect = step.getBoundingClientRect();
      var dist = Math.abs(rect.top + rect.height / 2 - mid);
      if (rect.top <= mid && rect.bottom >= mid) containing = i;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    return containing >= 0 ? containing : nearest;
  }

  function play() {
    var pending = video.play();
    if (pending && pending.catch) pending.catch(function () {});
  }

  function syncVideo(entry) {
    if (reduce) return;
    var on = entry ? entry.isIntersecting : false;
    if (on) play();
    else video.pause();
  }

  /* Centre band: a step counts as current while it crosses
     the middle of the viewport. The section uses that same
     band, so the loop runs while the band is inside it. */
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.target === section) syncVideo(entry);
    });
    if (!narrow.matches) apply(stepAtCentre());
  }, {
    root: null,
    rootMargin: "-45% 0px -45% 0px",
    threshold: 0
  });

  observer.observe(section);
  steps.forEach(function (step) { observer.observe(step); });

  marker.style.transition = "none";
  apply(narrow.matches ? 0 : stepAtCentre());
  requestAnimationFrame(function () {
    marker.style.transition = "";
    placeMarker(current);
  });

  narrow.addEventListener("change", function () {
    apply(narrow.matches ? 0 : stepAtCentre());
  });

  window.addEventListener("resize", function () {
    placeMarker(current);
  });

  document.addEventListener("visibilitychange", function () {
    if (reduce) return;
    if (document.hidden) video.pause();
    else syncVideo({ isIntersecting: section.getBoundingClientRect().top < window.innerHeight * 0.55 && section.getBoundingClientRect().bottom > window.innerHeight * 0.45 });
  });
})();
