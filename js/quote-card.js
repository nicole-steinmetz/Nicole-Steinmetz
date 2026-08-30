/* Quote card — entrance, drift, cycling total.
   Source: Nicole___Quote_Card_v2.html. Display-only: the loop
   runs on its own from in-view and never stops. Vanilla only. */
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var card = document.getElementById("quote-card");
  if (!card) return;

  var items = Array.prototype.slice.call(
    document.querySelectorAll("#quote-list .quote-item")
  );
  var totalEl = document.getElementById("quote-total");

  function money(n) {
    return "$" + Math.round(n).toLocaleString("en-AU");
  }

  function sumChecked() {
    return items.reduce(function (t, li) {
      return t + (li.classList.contains("is-on") ? Number(li.dataset.amount) : 0);
    }, 0);
  }

  var raf = null;
  var shown = 0;
  function setTotal(target, animated) {
    if (!totalEl) return;
    if (raf) cancelAnimationFrame(raf);
    if (!animated) {
      shown = target;
      totalEl.textContent = money(target);
      return;
    }
    var from = shown;
    var start = null;
    var dur = 420;

    totalEl.classList.add("is-bumped");
    setTimeout(function () {
      totalEl.classList.remove("is-bumped");
    }, 220);

    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      shown = from + (target - from) * eased;
      totalEl.textContent = money(shown);
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        shown = target;
        totalEl.textContent = money(target);
        raf = null;
      }
    }
    raf = requestAnimationFrame(step);
  }

  function refreshTotal(animated) {
    setTotal(sumChecked(), animated !== false);
  }

  function setItem(li, on) {
    li.classList.toggle("is-on", on);
  }

  var started = false;
  function begin() {
    if (started) return;
    started = true;
    card.classList.add("in-view");
    if (!reduce) startCycle();
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
    items.forEach(function (li) {
      setItem(li, true);
    });
    setTotal(sumChecked(), false);
    return;
  }

  var timer = null;
  var stepI = 0;

  function tick() {
    if (stepI < items.length) {
      setItem(items[stepI], true);
      refreshTotal();
    } else if (stepI > items.length + 1) {
      items.forEach(function (li) {
        setItem(li, false);
      });
      refreshTotal();
      stepI = -1;
    }
    stepI++;
  }

  function startCycle() {
    if (timer) return;
    timer = setInterval(tick, 1300);
  }
})();
