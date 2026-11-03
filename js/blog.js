/* Highlights the section currently in view. The post page only. */
(function () {
  var links = document.querySelectorAll(".blog-toc a");
  if (!links.length || !("IntersectionObserver" in window)) return;

  var heads = document.querySelectorAll(".blog-article h2");

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var id = "#" + entry.target.id;
      links.forEach(function (link) {
        var on = link.getAttribute("href") === id;
        link.classList.toggle("is-current", on);
        if (on) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-20% 0px -70% 0px" });

  heads.forEach(function (head) { io.observe(head); });
})();

/* Index card grows into the article. Same move as the
   expandable card: shared shell, plus rotates into a close
   control, article fades in. Escape, the backdrop, or the
   control collapses it. Reduced motion follows the link. */
(function () {
  var cards = document.querySelectorAll("a.blog-card");
  if (!cards.length) return;

  var cache = {};
  var panel = null;
  var backdrop = null;
  var source = null;
  var closing = false;
  var pushed = false;
  var PLUS = '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function reduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function load(href) {
    if (cache[href]) return Promise.resolve(cache[href]);
    return fetch(href).then(function (res) {
      if (!res.ok) throw new Error("status");
      return res.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var article = doc.querySelector(".blog-article");
      cache[href] = article ? article.innerHTML : "";
      return cache[href];
    });
  }

  function targetBox() {
    var inset = 16;
    var width = Math.min(850, window.innerWidth - inset * 2);
    return {
      top: inset,
      left: (window.innerWidth - width) / 2,
      width: width,
      height: window.innerHeight - inset * 2
    };
  }

  function place(el, box) {
    el.style.top = box.top + "px";
    el.style.left = box.left + "px";
    el.style.width = box.width + "px";
    el.style.height = box.height + "px";
  }

  function onKey(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key !== "Tab" || !panel) return;
    var items = panel.querySelectorAll("a[href], button, input, textarea, select");
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setPageInert(on) {
    Array.prototype.forEach.call(document.body.children, function (node) {
      if (node === panel || node === backdrop) return;
      if (on) node.setAttribute("inert", "");
      else node.removeAttribute("inert");
    });
  }

  function finish() {
    if (backdrop) backdrop.remove();
    if (panel) panel.remove();
    backdrop = null;
    panel = null;
    closing = false;
    document.body.classList.remove("blog-expand-lock");
    setPageInert(false);
    document.removeEventListener("keydown", onKey);
    if (source) {
      source.classList.remove("is-hidden");
      source.focus();
      source = null;
    }
  }

  function animateClose() {
    if (!panel || closing) return;
    closing = true;
    panel.classList.remove("is-open", "is-settled");
    backdrop.classList.remove("is-open");
    if (source) place(panel, source.getBoundingClientRect());
    window.setTimeout(finish, 520);
  }

  function requestClose() {
    if (pushed) {
      pushed = false;
      history.back();
      return;
    }
    animateClose();
  }

  function open(card) {
    if (panel) return;
    var href = card.getAttribute("href");
    var origin = card.getBoundingClientRect();
    source = card;
    card.classList.add("is-hidden");
    document.body.classList.add("blog-expand-lock");

    backdrop = document.createElement("div");
    backdrop.className = "blog-expand-backdrop";
    backdrop.addEventListener("click", requestClose);

    panel = document.createElement("div");
    panel.className = "blog-expand blog-card";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "blog-expand-title");
    place(panel, origin);

    Array.prototype.forEach.call(card.children, function (node) {
      panel.appendChild(node.cloneNode(true));
    });

    var title = panel.querySelector("h2");
    if (title) title.id = "blog-expand-title";

    var plus = panel.querySelector(".blog-card__plus");
    var button = document.createElement("button");
    button.type = "button";
    button.className = "blog-card__plus";
    button.setAttribute("aria-label", "Close article");
    button.innerHTML = PLUS;
    button.addEventListener("click", requestClose);
    if (plus) plus.replaceWith(button);

    var article = document.createElement("div");
    article.className = "blog-expand__article blog-article";
    panel.appendChild(article);

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    setPageInert(true);
    panel.getBoundingClientRect();
    document.addEventListener("keydown", onKey);

    load(href).then(function (html) {
      if (!panel || article.parentNode !== panel) return;
      article.innerHTML = html;
      document.dispatchEvent(new Event("blog-article-ready"));
    }).catch(function () {
      window.location.href = href;
    });

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (!panel) return;
        place(panel, targetBox());
        panel.classList.add("is-open");
        backdrop.classList.add("is-open");
        button.focus();
        window.setTimeout(function () {
          if (panel && !closing) panel.classList.add("is-settled");
        }, 520);
      });
    });

    history.pushState({ blogExpand: href }, "", href);
    pushed = true;
  }

  window.addEventListener("popstate", function () {
    pushed = false;
    if (panel) animateClose();
  });

  window.addEventListener("resize", function () {
    if (panel && !closing) place(panel, targetBox());
  });

  cards.forEach(function (card) {
    card.addEventListener("pointerenter", function () {
      load(card.getAttribute("href")).catch(function () {});
    });
    card.addEventListener("click", function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;
      if (reduced()) return;
      event.preventDefault();
      open(card);
    });
  });
})();

/* The orbiting light follows the button's own edge, so the
   path is measured after layout and again if it resizes.
   The case study can arrive later, inside the expanded card. */
(function () {
  function wire(root) {
    var nodes = (root || document).querySelectorAll(".blog-star");
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.getAttribute("data-star") === "on") return;
      el.setAttribute("data-star", "on");
      function setPath() {
        var w = el.offsetWidth;
        var h = el.offsetHeight;
        if (!w || !h) return;
        el.style.setProperty("--path", "path('M 0 0 H " + w + " V " + h + " H 0 V 0')");
      }
      setPath();
      if (window.ResizeObserver) new ResizeObserver(setPath).observe(el);
    });
  }

  wire(document);
  document.addEventListener("blog-article-ready", function () { wire(document); });
})();
