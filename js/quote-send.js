/* Sends the quote summary to nicole@kneecoal.com.
   The table is built on the server (functions/api/quote.js).
   Line items are read from the summary the quoter already rendered. */
(function () {
  var form = document.getElementById("quoteSend");
  if (!form) return;

  var status = document.getElementById("quoteSendStatus");
  var button = form.querySelector("button[type=submit]");
  var nameInput = form.querySelector("input[name=name]");
  var emailInput = form.querySelector("input[name=email]");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var data = new FormData(form);
    var name = String(data.get("name") || "").trim();
    var email = String(data.get("email") || "").trim();
    var note = String(data.get("note") || "").trim();
    var company = String(data.get("hp") || "").trim();

    nameInput.removeAttribute("aria-invalid");
    emailInput.removeAttribute("aria-invalid");

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!name) nameInput.setAttribute("aria-invalid", "true");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailInput.setAttribute("aria-invalid", "true");
      }
      setStatus("Add your name and a valid email so Nicole can reply.", true);
      (name ? emailInput : nameInput).focus();
      return;
    }

    var lines = Array.prototype.map.call(
      document.querySelectorAll("#summaryLines .summary-line"),
      function (row) {
        var spans = row.querySelectorAll("span");
        return {
          label: spans[0] ? spans[0].textContent.trim() : "",
          amount: spans[1] ? spans[1].textContent.trim() : ""
        };
      }
    ).filter(function (line) { return line.label; });

    var tbcBlock = document.getElementById("summaryTbc");
    var tbc = [];
    if (tbcBlock && !tbcBlock.hidden) {
      tbc = Array.prototype.map.call(
        document.querySelectorAll("#summaryTbcList li"),
        function (item) { return item.textContent.trim(); }
      ).filter(Boolean);
    }

    if (!lines.length && !tbc.length) {
      setStatus("Tick at least one item before sending.", true);
      return;
    }

    var tag = document.querySelector(".summary-head .tag");
    var total = document.getElementById("summaryTotal");
    var foot = document.querySelector(".summary-foot");

    button.disabled = true;
    setStatus("Sending…", false);

    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        note: note,
        hp: company,
        platform: tag ? tag.textContent.trim() : "",
        total: total ? total.textContent.trim() : "",
        prices: foot ? foot.textContent.trim() : "",
        lines: lines,
        tbc: tbc,
        page: location.href
      })
    }).then(function (res) {
      return res.json().then(function (body) {
        return { ok: res.ok, body: body };
      }, function () {
        return { ok: false, body: {} };
      });
    }).then(function (result) {
      if (result.ok && result.body && result.body.ok) {
        form.reset();
        setStatus("Sent. Nicole has the summary and will reply to you.", false);
        return;
      }
      setStatus(
        (result.body && result.body.error) || "That didn’t go through. Try again in a moment.",
        true
      );
    }).catch(function () {
      setStatus("That didn’t go through. Try again in a moment.", true);
    }).then(function () {
      button.disabled = false;
    });
  });

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", !!isError);
  }
})();
