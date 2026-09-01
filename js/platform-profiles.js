/* Platform profiles — tabbed panel on /pricing/.
   Source: nicole-platform-profiles_1.html. Crossfade instead of
   display:none so the switch reads as motion, not a snap. */
(function () {
  var root = document.getElementById("platform-profiles");
  if (!root) return;

  var tabs = Array.prototype.slice.call(
    root.querySelectorAll('[role="tab"]')
  );
  var panels = Array.prototype.slice.call(
    root.querySelectorAll('[role="tabpanel"]')
  );
  if (!tabs.length || !panels.length) return;

  function show(id, opts) {
    var focusTab = opts && opts.focus;
    tabs.forEach(function (tab) {
      var on = tab.getAttribute("aria-controls") === id;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (on && focusTab) tab.focus();
    });
    panels.forEach(function (panel) {
      var on = panel.id === id;
      panel.classList.toggle("is-active", on);
      panel.setAttribute("aria-hidden", on ? "false" : "true");
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      show(tab.getAttribute("aria-controls"));
    });
    tab.addEventListener("keydown", function (event) {
      var i = tabs.indexOf(tab);
      var next = i;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = (i + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = (i - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      show(tabs[next].getAttribute("aria-controls"), { focus: true });
    });
  });
})();
