(function () {
  var nav = document.querySelector(".nav");
  if (!nav) return;
  var list = nav.querySelector(".nav__list");
  if (!list || nav.querySelector(".nav__toggle")) return;

  if (!list.id) list.id = "nav-menu";

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav__toggle";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", list.id);
  btn.innerHTML =
    '<svg class="nav__icon nav__icon--open" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">' +
      '<path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>" +
    '<svg class="nav__icon nav__icon--close" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">' +
      '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>" +
    '<span class="visually-hidden">Menu</span>';
  nav.insertBefore(btn, list);

  var label = btn.querySelector(".visually-hidden");

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    label.textContent = open ? "Close menu" : "Menu";
  }

  btn.addEventListener("click", function () {
    setOpen(!nav.classList.contains("is-open"));
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      btn.focus();
    }
  });

  document.addEventListener("click", function (event) {
    if (!nav.contains(event.target)) setOpen(false);
  });

  list.addEventListener("click", function (event) {
    if (event.target.closest("a")) setOpen(false);
  });

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 641px)").matches) setOpen(false);
  });
})();
