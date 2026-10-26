/* Nicole Steinmetz FAQ chat widget.
   Embed: <script src="/js/faq-widget.js" defer></script>
   Book-a-call uses the same URL as js/site-config.js.
   Colours stay inside this shadow tree so the widget neither inherits nor overrides the page. */
(function () {
  if (window.__nsFaqWidget) return;
  window.__nsFaqWidget = true;

  var script = document.currentScript;
  var ENDPOINT = (script && script.getAttribute("data-endpoint")) ||
    (script ? new URL(script.src).origin + "/api/chat" : "/api/chat");

  var GREETING = "Hi, I'm Nicole's FAQ assistant. Ask me anything about working together.";
  var CHIPS = ["How do I get a quote?", "How long does a build take?", "Which platform is right for my project?"];

  var CSS = [
    ":host{all:initial}",
    "*{box-sizing:border-box;margin:0;padding:0}",
    ".ns{--text:#505050;--head:#2b2b2b;--bubble:#F4F2F0;--line:#DAD6D2;--orange:#FFAD00;--blue:#6A96C7;--brown:#894332;--brown-press:#713628;",
    "font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:var(--text);-webkit-font-smoothing:antialiased}",
    ".launch{position:fixed;right:24px;bottom:24px;z-index:2147483000;display:inline-flex;align-items:center;gap:10px;padding:14px 22px;border:0;border-radius:999px;background:var(--brown);color:#fff;font:inherit;font-weight:500;font-size:15px;cursor:pointer;box-shadow:0 6px 24px rgba(43,43,43,.16);transition:background-color .2s ease,transform .2s ease,opacity .2s ease}",
    ".launch:hover{background:var(--brown-press);transform:translateY(-1px)}",
    ".launch:active{background:var(--brown-press);transform:translateY(0)}",
    ".launch svg{width:18px;height:18px}",
    ".launch[hidden]{display:none}",
    "button:focus-visible,a:focus-visible,textarea:focus-visible{outline:2px solid var(--orange);outline-offset:2px}",
    ".panel{position:fixed;right:24px;bottom:24px;z-index:2147483001;width:380px;max-width:calc(100vw - 32px);height:min(620px,calc(100vh - 48px));display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:20px;box-shadow:0 18px 50px rgba(43,43,43,.14),0 2px 8px rgba(43,43,43,.06);overflow:hidden;opacity:0;transform:translateY(12px) scale(.98);transform-origin:bottom right;pointer-events:none;visibility:hidden;transition:opacity .22s ease,transform .22s ease,visibility 0s linear .22s}",
    ".panel[hidden]{display:none !important}",
    ".panel.open{opacity:1;transform:none;pointer-events:auto;visibility:visible;transition:opacity .22s ease,transform .22s ease,visibility 0s}",
    ".head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 20px 16px 24px;border-bottom:1px solid var(--line)}",
    ".head h2{font-size:16px;font-weight:600;color:var(--head);letter-spacing:-.005em}",
    ".head p{font-size:12.5px;color:#8a8580;margin-top:2px}",
    ".close{flex:none;width:36px;height:36px;border:0;border-radius:999px;background:transparent;color:var(--head);cursor:pointer;display:grid;place-items:center;transition:background-color .2s ease}",
    ".close:hover{background:var(--bubble)}",
    ".close svg{width:18px;height:18px}",
    ".log{flex:1;overflow-y:auto;padding:22px 20px 12px 24px;display:flex;flex-direction:column;gap:14px;scroll-behavior:smooth}",
    ".msg{max-width:88%;padding:12px 16px;border-radius:18px;animation:in .25s ease both;white-space:pre-wrap;word-wrap:break-word}",
    ".bot{align-self:flex-start;background:var(--bubble);color:var(--text);border-bottom-left-radius:6px}",
    ".me{align-self:flex-end;background:#fff;border:1px solid var(--line);color:var(--head);border-bottom-right-radius:6px}",
    ".links{display:flex;flex-direction:column;gap:6px;margin-top:10px}",
    ".links a{color:#4a77aa;text-decoration:none;font-size:13.5px;font-weight:500;border-bottom:1px solid rgba(106,150,199,.35);align-self:flex-start;transition:color .2s ease,border-color .2s ease}",
    ".links a:hover{color:var(--blue);border-color:var(--blue)}",
    ".links a span{display:block;font-weight:400;color:#8a8580;font-size:12.5px}",
    ".actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}",
    ".btn{display:inline-block;padding:9px 16px;border-radius:999px;background:var(--brown);color:#fff;text-decoration:none;font-size:13.5px;font-weight:500;transition:background-color .2s ease}",
    ".btn:hover,.btn:active{background:var(--brown-press)}",
    ".btn.ghost{background:#fff;color:var(--brown);border:1px solid var(--line)}",
    ".btn.ghost:hover{background:var(--bubble);color:var(--brown-press)}",
    ".chips{display:flex;flex-direction:column;align-items:flex-start;gap:8px;animation:in .3s ease .08s both}",
    ".chip{font:inherit;font-size:13.5px;padding:8px 14px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--head);cursor:pointer;text-align:left;transition:background-color .2s ease,border-color .2s ease}",
    ".chip:hover{background:var(--bubble);border-color:#c9c4bf}",
    ".typing{display:inline-flex;gap:5px;padding:4px 0}",
    ".typing i{width:7px;height:7px;border-radius:50%;background:var(--orange);animation:dot 1.1s infinite ease-in-out}",
    ".typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}",
    ".form{display:flex;align-items:flex-end;gap:10px;padding:14px 16px 16px 20px;border-top:1px solid var(--line)}",
    ".form textarea{flex:1;resize:none;font:inherit;font-size:15px;color:var(--head);border:1px solid var(--line);border-radius:14px;padding:11px 14px;max-height:110px;min-height:44px;line-height:1.4;background:#fff;transition:border-color .2s ease}",
    ".form textarea::placeholder{color:#9b9590}",
    ".form textarea:focus{border-color:#bdb7b1}",
    ".send{flex:none;width:44px;height:44px;border:0;border-radius:999px;background:var(--brown);color:#fff;cursor:pointer;display:grid;place-items:center;transition:background-color .2s ease,opacity .2s ease}",
    ".send:hover,.send:active{background:var(--brown-press)}",
    ".send:disabled{opacity:.45;cursor:not-allowed}",
    ".send svg{width:18px;height:18px}",
    ".foot{padding:0 20px 12px;font-size:11.5px;color:#9b9590;text-align:center}",
    ".sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
    "@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
    "@keyframes dot{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}",
    "@media (max-width:1040px){.launch{right:16px;bottom:16px;width:56px;height:56px;padding:0;justify-content:center;gap:0}.launch span{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}}",
    "@media (max-width:600px){.form textarea{font-size:16px}.panel{inset:0;width:100%;max-width:none;height:100%;height:100dvh;border-radius:0;border:0}.launch{right:16px;bottom:16px}.log{padding:20px 18px 12px}}",
    "@media (prefers-reduced-motion:reduce){*,.panel,.panel.open{animation:none!important;transition:none!important;scroll-behavior:auto!important}}"
  ].join("");

  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  var host = document.createElement("div");
  host.id = "ns-faq-widget";
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    "<style>" + CSS + "</style>" +
    '<div class="ns">' +
    '<button class="launch" type="button" data-testid="faq-widget-launcher" aria-label="Ask a question" aria-haspopup="dialog" aria-expanded="false" aria-controls="ns-panel">' + ICON_CHAT + "<span>Ask a question</span></button>" +
    '<div class="panel" id="ns-panel" role="dialog" hidden aria-hidden="true" aria-labelledby="ns-title" data-testid="faq-widget-panel">' +
    '<div class="head"><div><h2 id="ns-title">Ask Nicole</h2><p>Answers from my FAQs</p></div>' +
    '<button class="close" type="button" aria-label="Close chat" data-testid="faq-widget-close">' + ICON_X + "</button></div>" +
    '<div class="log" data-testid="faq-widget-log"></div>' +
    '<form class="form" data-testid="faq-widget-form"><label class="sr" for="ns-input">Your question</label>' +
    '<textarea id="ns-input" rows="1" maxlength="500" placeholder="Type your question" data-testid="faq-widget-input"></textarea>' +
    '<button class="send" type="submit" aria-label="Send question" data-testid="faq-widget-send">' + ICON_SEND + "</button></form>" +
    '<p class="foot" data-testid="faq-widget-privacy-note">A copy of this chat is emailed to Nicole.</p>' +
    '<div class="sr" aria-live="polite" data-testid="faq-widget-live"></div>' +
    "</div></div>";

  var $ = function (s) { return root.querySelector(s); };
  var launch = $(".launch"), panel = $(".panel"), closeBtn = $(".close"), log = $(".log"),
    form = $(".form"), input = $("textarea"), send = $(".send"), live = $("[aria-live]");
  var history = [], busy = false, started = false, chipsEl = null;
  var TRANSCRIPT_URL = ENDPOINT.replace(/chat$/, "transcript");
  var chatId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  var transcript = [], sentUpto = 0;

  function sendTranscript() {
    var asked = transcript.filter(function (t) { return t.role === "user"; }).length;
    if (busy || asked <= sentUpto) return;
    var prev = sentUpto;
    sentUpto = asked;
    function undo() { if (sentUpto === asked) sentUpto = prev; }
    try {
      fetch(TRANSCRIPT_URL, {
        method: "POST", keepalive: true, headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ chat_id: chatId, page: location.href.slice(0, 500), turns: transcript.slice(-60) })
      }).then(function (r) { return r.json(); }).then(function (j) { if (!j.sent) undo(); }).catch(undo);
    } catch (e) { undo(); }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function announce(t) { live.textContent = ""; setTimeout(function () { live.textContent = t; }, 50); }

  function addExtras(bubble, links, actions) {
    if (links && links.length) {
      var box = el("div", "links");
      links.forEach(function (l, i) {
        var a = el("a");
        a.href = l.url; a.target = "_blank"; a.rel = "noopener";
        a.setAttribute("data-testid", "faq-widget-source-link-" + i);
        a.textContent = l.label + " \u2192";
        if (links.length > 1 && l.title) a.appendChild(el("span", null, l.title));
        box.appendChild(a);
      });
      bubble.appendChild(box);
    }
    if (actions && actions.length) {
      var row = el("div", "actions");
      actions.forEach(function (x, i) {
        var a = el("a", "btn" + (i ? " ghost" : ""), x.label);
        a.href = x.url; a.target = "_blank"; a.rel = "noopener";
        a.setAttribute("data-testid", "faq-widget-action-" + x.label.toLowerCase().replace(/\s+/g, "-"));
        row.appendChild(a);
      });
      bubble.appendChild(row);
    }
  }

  function start() {
    if (started) return;
    started = true;
    log.appendChild(el("div", "msg bot", GREETING)).setAttribute("data-testid", "faq-widget-greeting");
    chipsEl = el("div", "chips");
    CHIPS.forEach(function (q, i) {
      var c = el("button", "chip", q);
      c.type = "button";
      c.setAttribute("data-testid", "faq-widget-chip-" + i);
      c.addEventListener("click", function () { ask(q); input.focus(); });
      chipsEl.appendChild(c);
    });
    log.appendChild(chipsEl);
  }

  function resetClosed() {
    panel.classList.remove("open");
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    panel.removeAttribute("aria-modal");
    launch.hidden = false;
    launch.setAttribute("aria-expanded", "false");
  }

  function open() {
    start();
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    panel.setAttribute("aria-modal", "true");
    requestAnimationFrame(function () { panel.classList.add("open"); });
    launch.setAttribute("aria-expanded", "true");
    launch.hidden = true;
    setTimeout(function () { input.focus(); }, 30);
  }
  function close() {
    sendTranscript();
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    panel.removeAttribute("aria-modal");
    launch.setAttribute("aria-expanded", "false");
    launch.hidden = false;
    launch.focus();
    setTimeout(function () {
      if (!panel.classList.contains("open")) panel.hidden = true;
    }, 220);
  }

  function setBusy(b) { busy = b; send.disabled = b; }

  function ask(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    if (chipsEl) { chipsEl.remove(); chipsEl = null; }
    log.appendChild(el("div", "msg me", text));
    input.value = ""; autosize();
    var bubble = el("div", "msg bot");
    bubble.setAttribute("data-testid", "faq-widget-answer");
    var typing = el("span", "typing");
    typing.setAttribute("aria-label", "Typing");
    typing.innerHTML = "<i></i><i></i><i></i>";
    bubble.appendChild(typing);
    log.appendChild(bubble);
    scroll();
    setBusy(true);

    var textNode = document.createTextNode(""), meta = null, full = "";
    function finish(err) {
      if (typing.parentNode) typing.remove();
      if (!textNode.parentNode) bubble.insertBefore(textNode, bubble.firstChild);
      if (err) { textNode.nodeValue = err.text; addExtras(bubble, [], err.actions); full = err.text; }
      else if (meta) addExtras(bubble, meta.links, meta.actions);
      else if (!full) { textNode.nodeValue = "Sorry, I couldn't answer that just now. Please try again."; }
      if (!err && full) {
        history.push({ role: "user", content: text }, { role: "assistant", content: full });
        transcript.push({ role: "user", content: text.slice(0, 1500) },
          { role: "assistant", content: full.slice(0, 1500), links: ((meta && meta.links) || []).map(function (l) { return l.url; }).slice(0, 3) });
        history = history.slice(-8);
      }
      announce(textNode.nodeValue);
      setBusy(false);
      if (!panel.classList.contains("open")) sendTranscript();
      scroll();
    }

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text.slice(0, 500), history: history, chat_id: chatId })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          finish({ text: j.text || "Sorry, something went wrong. Please try again, or get in touch directly.", actions: j.actions || [] });
        });
      }
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return finish();
          buf += dec.decode(r.value, { stream: true });
          var parts = buf.split("\n\n");
          buf = parts.pop();
          for (var i = 0; i < parts.length; i++) {
            var line = parts[i].replace(/^data: /, "");
            var ev; try { ev = JSON.parse(line); } catch (e) { continue; }
            if (ev.type === "meta") meta = ev;
            else if (ev.type === "delta") {
              if (typing.parentNode) { typing.remove(); bubble.appendChild(textNode); }
              full += ev.text; textNode.nodeValue = full; scroll();
            } else if (ev.type === "error") { reader.cancel(); return finish(ev); }
            else if (ev.type === "done") { reader.cancel(); return finish(); }
          }
          return pump();
        });
      }
      return pump();
    }).catch(function () {
      finish({ text: "Sorry, I couldn't connect just now. Please try again, or get in touch directly.", actions: [
        { label: "Book a call", url: "https://calendar.app.google/VhKn1WLoZNS8Aq899" },
        { label: "Contact me", url: "https://www.nicolesteinmetz.com/contact/" }] });
    });
  }

  function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 110) + "px"; }

  launch.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  form.addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input.value); }
  });
  panel.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    var f = Array.prototype.filter.call(panel.querySelectorAll("button:not([disabled]),a[href],textarea"), function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], active = root.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open") && !host.contains(document.activeElement)) close();
  });
  window.addEventListener("pagehide", sendTranscript);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") sendTranscript(); });

  function mount() {
    resetClosed();
    document.documentElement.classList.add("has-faq-widget");
    document.body.appendChild(host);
  }
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) resetClosed();
  });
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
