/* Project card — entrance, drift, cycling brief.
   Source: Nicole___Start_Project_Card_v2.html. Display-only:
   the loop types a client name and ticks the brief; fields
   are not clickable. Vanilla only. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var card = document.getElementById("proj-card");
  if (!card) return;

  var input = document.getElementById("proj-input");
  var typed = document.getElementById("proj-typed");
  var pills = Array.prototype.slice.call(
    document.querySelectorAll("#proj-pills .proj-pill")
  );
  var platform = Array.prototype.slice.call(
    document.querySelectorAll("#proj-platform .proj-check")
  );
  var features = Array.prototype.slice.call(
    document.querySelectorAll("#proj-features .proj-check")
  );

  var CLIENT = card.getAttribute("data-client") || "Studio Marlowe";
  var CHAR_MS = 68; /* matches --proj-type */

  function on(el) {
    el.classList.add("is-on");
  }

  function clearAll() {
    typed.textContent = "";
    input.classList.remove("is-active");
    pills.concat(platform, features).forEach(function (el) {
      el.classList.remove("is-on");
    });
  }

  var typeTimer = null;
  function typeClient() {
    clearTimeout(typeTimer);
    typed.textContent = "";
    input.classList.add("is-active");
    var i = 0;
    (function next() {
      typed.textContent = CLIENT.slice(0, ++i);
      if (i < CLIENT.length) typeTimer = setTimeout(next, CHAR_MS);
      else
        typeTimer = setTimeout(function () {
          input.classList.remove("is-active");
        }, 520);
    })();
  }

  var steps = [
    { run: function () { typeClient(); }, wait: CLIENT.length * CHAR_MS + 900 },
    { run: function () { on(pills[0]); }, wait: 850 },
    { run: function () { on(platform[0]); }, wait: 800 },
    { run: function () { on(features[0]); }, wait: 700 },
    { run: function () { on(features[2]); }, wait: 700 },
    { run: function () { on(features[1]); }, wait: 2600 },
    { run: clearAll, wait: 800 }
  ];

  var stepTimer = null;
  var stepI = 0;
  function runStep() {
    steps[stepI % steps.length].run();
    var wait = steps[stepI % steps.length].wait;
    stepI++;
    stepTimer = setTimeout(runStep, wait);
  }

  var started = false;
  function begin() {
    if (started) return;
    started = true;
    card.classList.add("in-view");
    if (!reduce) stepTimer = setTimeout(runStep, 700);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            io.unobserve(card);
            begin();
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(card);
    setTimeout(begin, 1500);
  } else {
    begin();
  }

  if (reduce) {
    typed.textContent = CLIENT;
    on(pills[0]);
    on(platform[0]);
    on(features[0]);
    on(features[1]);
    on(features[2]);
  }
})();
