/* Shopify quote builder.
   Source: Nicole — Pricing Page (Shopify) v1.html.
   Prices from Knee Coal Website Pricing 2026, Tier 02, and
   knee-coal-shopify-builder.pdf. Vanilla only. */
(function () {
  var card = document.getElementById("qbCard");
  if (!card) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var revealTargets = document.querySelectorAll("#qbCard, #summaryCard");
  if (reduceMotion) {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          window.setTimeout(function () { entry.target.classList.add("is-visible"); }, i * 100);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  var BASELINE_PRICE = 2975;
  var HOURLY_RATE = 70;
  var state = { checks: {}, steppers: {}, hourlyHrs: 0, tbc: {} };

  var fmt = function (n) {
    return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  var priceChecks = document.querySelectorAll(".qb-check[data-price]");
  priceChecks.forEach(function (chk) {
    chk.addEventListener("change", function () {
      state.checks[chk.dataset.target] = chk.checked ? Number(chk.dataset.price) : 0;
      var out = document.getElementById("price-" + chk.dataset.target);
      if (out) out.textContent = chk.checked ? fmt(Number(chk.dataset.price)) : "—";
      if (out) out.classList.toggle("is-muted", !chk.checked);
      update();
    });
  });

  var tbcChecks = document.querySelectorAll(".qb-check[data-tbc]");
  tbcChecks.forEach(function (chk) {
    chk.addEventListener("change", function () {
      state.tbc[chk.dataset.tbc] = chk.checked;
      update();
    });
  });

  var steppers = document.querySelectorAll(".stepper[data-target]");
  steppers.forEach(function (st) {
    var out = st.querySelector("output");
    var price = Number(st.dataset.price);
    var target = st.dataset.target;
    state.steppers[target] = 0;
    st.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var val = Number(out.textContent) + Number(btn.dataset.step);
        if (val < 0) val = 0;
        out.textContent = val;
        state.steppers[target] = val;
        var priceEl = document.getElementById("price-" + target);
        if (priceEl) {
          if (val > 0) { priceEl.textContent = fmt(val * price); priceEl.classList.remove("is-muted"); }
          else { priceEl.textContent = "—"; priceEl.classList.add("is-muted"); }
        }
        update();
      });
    });
  });

  var hourlyInput = document.getElementById("hourly-hrs");
  hourlyInput.addEventListener("input", function () {
    var hrs = Math.max(0, Number(hourlyInput.value) || 0);
    state.hourlyHrs = hrs;
    var priceEl = document.getElementById("price-hourly");
    if (hrs > 0) { priceEl.textContent = fmt(hrs * HOURLY_RATE); priceEl.classList.remove("is-muted"); }
    else { priceEl.textContent = "—"; priceEl.classList.add("is-muted"); }
    update();
  });

  function update() {
    var lines = [{ label: "Shopify Core Build", amount: BASELINE_PRICE }];

    var addOnLabels = {
      adobe: "Adobe Creative Suite", claude: "Claude Pro", cursor: "Cursor Pro", figma: "Figma",
      "page-low": "Low Content / System Page", "page-standard": "Standard Page",
      "page-complex": "Complex Page", "page-legal": "Legal Page",
      "ai-copy": "AI-Generated Copywriting & SEO", "blog-setup": "Blog / News Setup",
      "blog-post": "Blog Post Upload", "product-upload": "Product Upload",
      integration: "Integration with Common Software", "external-link": "Simple External Link",
      popup: "Popup Plugin Setup", logo: "Logo Redesign Package"
    };
    var stepperPrices = {
      "page-low": 85, "page-standard": 120, "page-complex": 220, "page-legal": 60,
      "ai-copy": 40, "blog-post": 25, "product-upload": 18, integration: 125, "external-link": 20
    };

    Object.keys(state.checks).forEach(function (key) {
      if (state.checks[key] > 0) lines.push({ label: addOnLabels[key], amount: state.checks[key] });
    });
    Object.keys(state.steppers).forEach(function (key) {
      var qty = state.steppers[key];
      if (qty > 0) lines.push({ label: addOnLabels[key] + " ×" + qty, amount: qty * stepperPrices[key] });
    });
    if (state.hourlyHrs > 0) {
      lines.push({ label: "Hourly Rate Work ×" + state.hourlyHrs + "hrs", amount: state.hourlyHrs * HOURLY_RATE });
    }

    var total = lines.reduce(function (sum, l) { return sum + l.amount; }, 0);

    document.getElementById("summaryLines").innerHTML = lines.map(function (l) {
      return '<div class="summary-line"><span>' + l.label + '</span><span>' + fmt(l.amount) + '</span></div>';
    }).join("");
    document.getElementById("summaryTotal").textContent = fmt(total);

    var tbcItems = Object.keys(state.tbc).filter(function (k) { return state.tbc[k]; });
    var tbcBlock = document.getElementById("summaryTbc");
    if (tbcItems.length) {
      document.getElementById("summaryTbcList").innerHTML = tbcItems.map(function (i) {
        return "<li>" + i + "</li>";
      }).join("");
      tbcBlock.hidden = false;
    } else {
      tbcBlock.hidden = true;
    }
  }

  update();
})();
