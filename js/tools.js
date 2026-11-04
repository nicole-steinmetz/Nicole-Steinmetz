(function () {
  var root = document.querySelector(".page-tools");
  if (!root) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rises = root.querySelectorAll(".tools-rise");
  if (!reduce && "IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        seen.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    rises.forEach(function (el) { seen.observe(el); });
  } else {
    rises.forEach(function (el) { el.classList.add("is-in"); });
  }

  var links = root.querySelectorAll(".tools-steps a");
  if (!links.length || !("IntersectionObserver" in window)) return;
  var sections = [];
  links.forEach(function (link) {
    var id = (link.getAttribute("href") || "").slice(1);
    var section = id && document.getElementById(id);
    if (section) sections.push(section);
  });
  if (!sections.length) return;

  function mark(id) {
    links.forEach(function (link) {
      var on = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-current", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  mark(sections[0].id);
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) mark(entry.target.id);
    });
  }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
  sections.forEach(function (section) { spy.observe(section); });
})();
