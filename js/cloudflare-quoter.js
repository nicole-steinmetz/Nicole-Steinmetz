/* Cloudflare quote builder.
   Source: Nicole — Pricing Page (Cloudflare) v1.html.
   Prices from Cloudflare_Build_Rate_Card_2026.pdf. Vanilla only.
   Infrastructure setup tracks the chosen baseline
   ($250 Starter / $350 Standard), not a flat add-on. */
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

  var BASELINES = {
    starter: { label: "Starter Build", price: 950, infra: 250 },
    standard: { label: "Standard Build", price: 3450, infra: 350 }
  };
  var HOURLY_RATE = 70;
  var state = { baseline: "starter", checks: {}, steppers: {}, hourlyHrs: 0, tbc: {} };

  var fmt = function (n) {
    return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  var baselineOptions = document.querySelectorAll(".baseline-option");
  baselineOptions.forEach(function (opt) {
    var radio = opt.querySelector("input[type=radio]");
    opt.addEventListener("click", function () { radio.checked = true; update(); });
    radio.addEventListener("change", update);
  });

  function currentBaseline() {
    var checked = document.querySelector("input[name=baseline]:checked");
    return checked ? checked.closest(".baseline-option").dataset.baseline : "starter";
  }

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
        if (st.closest(".qb-row").classList.contains("is-disabled")) return;
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

  function syncPagesLock() {
    var isStandard = currentBaseline() === "standard";
    document.querySelectorAll("[data-page-row]").forEach(function (row) {
      row.classList.toggle("is-disabled", !isStandard);
      row.querySelectorAll("button").forEach(function (btn) { btn.disabled = !isStandard; });
    });
    document.getElementById("pagesLockedNote").hidden = isStandard;
    if (!isStandard) {
      document.querySelectorAll("[data-page-row] .stepper output").forEach(function (out) {
        out.textContent = 0;
      });
      ["page-low", "page-standard", "page-complex", "page-legal"].forEach(function (t) {
        state.steppers[t] = 0;
        var priceEl = document.getElementById("price-" + t);
        if (priceEl) { priceEl.textContent = "—"; priceEl.classList.add("is-muted"); }
      });
    }
  }

  function update() {
    baselineOptions.forEach(function (opt) {
      opt.classList.toggle("is-selected", opt.dataset.baseline === currentBaseline());
    });
    syncPagesLock();

    var baseline = BASELINES[currentBaseline()];
    document.getElementById("price-infra").textContent = fmt(baseline.infra);

    var lines = [
      { label: baseline.label, amount: baseline.price },
      { label: "Cloudflare Infrastructure Setup", amount: baseline.infra },
      { label: "Cursor Pro", amount: 96 },
      { label: "Figma", amount: 45 },
      { label: "Formspark", amount: 40 }
    ];

    var addOnLabels = {
      adobe: "Adobe Creative Suite", midjourney: "Midjourney",
      "page-low": "Low Content / System Page", "page-standard": "Standard Page",
      "page-complex": "Complex Page", "page-legal": "Legal Page",
      "ai-copy": "AI-Generated Copywriting & SEO", "blog-post": "Blog Post Upload",
      "react-component": "Custom React Component", integration: "Integration with Common Software",
      "external-link": "Simple External Link"
    };
    var stepperPrices = {
      "page-low": 170, "page-standard": 300, "page-complex": 600, "page-legal": 100,
      "ai-copy": 45, "blog-post": 30, "react-component": 140, integration: 105, "external-link": 20
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
