/* Tools card — entrance, drift, spotlight.
   Source: Nicole___Tool_Stack_Card_v5.html. Vanilla only. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var card = document.getElementById("tools-card");
  if (!card) return;

  var units = Array.prototype.slice.call(
    document.querySelectorAll("#tools-field .how__tools-unit")
  );

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            card.classList.add("in-view");
            io.unobserve(card);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(card);
  } else {
    card.classList.add("in-view");
  }

  if (reduce || units.length === 0) return;

  var i = 0;
  setInterval(function () {
    units.forEach(function (u) {
      u.classList.remove("is-lit");
    });
    units[i % units.length].classList.add("is-lit");
    i++;
  }, 1300);
})();
