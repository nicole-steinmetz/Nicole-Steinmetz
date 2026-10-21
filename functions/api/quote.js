/* Pages Function — emails a quote summary to nicole@kneecoal.com.
   A static page cannot send mail, so this is the one piece of server logic.
   The from-address must be on a domain onboarded to Cloudflare Email Sending.
   Pages → Settings → Bindings → Send Email:
     variable name EMAIL
     destination address nicole@kneecoal.com
   That destination matches js/site-config.js and cannot be overridden here. */

const TO = "nicole@kneecoal.com";
const FROM = "quotes@nicolesteinmetz.com";

const PLATFORMS = new Set([
  "Squarespace",
  "Shopify",
  "Cloudflare",
  "Netlify",
  "Custom Build · Vercel"
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AMOUNT_RE = /^\$[\d,]+\.\d{2}$/;

const LIMITS = {
  name: 80,
  email: 120,
  note: 2000,
  label: 120,
  lines: 30,
  tbc: 20
};

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!allowedOrigin(request.headers.get("Origin"))) {
    return json({ ok: false, error: "That didn’t go through. Try again in a moment." }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ ok: false, error: "That quote couldn’t be read. Refresh and try again." }, 400);
  }

  if (payload && String(payload.hp || "").trim()) {
    return json({ ok: true });
  }

  const quote = parseQuote(payload);
  if (quote.error) return json({ ok: false, error: quote.error }, 400);

  if (!env.EMAIL || typeof env.EMAIL.send !== "function") {
    return json({ ok: false, error: "Quote email isn’t set up yet. Email nicole@kneecoal.com directly." }, 503);
  }

  const message = buildQuoteEmail(quote);

  try {
    await env.EMAIL.send({
      to: TO,
      from: { email: FROM, name: "Nicole Steinmetz website" },
      replyTo: { email: quote.email, name: quote.name },
      subject: message.subject,
      html: message.html,
      text: message.text
    });
  } catch (error) {
    console.error("quote email failed", error && error.code, error && error.message);
    return json({ ok: false, error: "That didn’t go through. Try again in a moment." }, 502);
  }

  return json({ ok: true });
}

export function buildQuoteEmail(quote) {
  const sent = new Date().toLocaleString("en-AU", {
    timeZone: "Australia/Perth",
    dateStyle: "full",
    timeStyle: "short"
  });

  const details = [
    ["Name", quote.name],
    ["Email", quote.email],
    ["Platform", quote.platform]
  ];
  if (quote.note) details.push(["Note", quote.note]);

  const items = quote.lines.map(function (line) {
    return [line.label, line.amount];
  });
  items.push(["Total", quote.total]);

  const after = [];
  if (quote.tbc.length) after.push(["Quoted separately", quote.tbc.join("\n")]);
  if (quote.prices) after.push(["Prices", quote.prices]);
  if (quote.page) after.push(["Page", quote.page]);
  after.push(["Sent", sent]);

  const detailHtml = details.map(detailRow).join("");
  const afterHtml = after.map(detailRow).join("");

  const htmlItems = items.map(function (row, index) {
    const isTotal = index === items.length - 1;
    const labelStyle = isTotal
      ? "text-align:left;padding:8px 12px;border:1px solid #DAD6D2;background:#894332;color:#FFFFFF;font-weight:700;"
      : "text-align:left;padding:8px 12px;border:1px solid #DAD6D2;font-weight:600;vertical-align:top;";
    const valueStyle = isTotal
      ? "padding:8px 12px;border:1px solid #DAD6D2;background:#894332;color:#FFFFFF;font-weight:700;text-align:right;"
      : "padding:8px 12px;border:1px solid #DAD6D2;text-align:right;font-variant-numeric:tabular-nums;";
    return "<tr><th style=\"" + labelStyle + "\">" + escapeHtml(row[0])
      + "</th><td style=\"" + valueStyle + "\">" + escapeHtml(row[1]) + "</td></tr>";
  }).join("");

  const html = "<!DOCTYPE html><html><body style=\"margin:0;padding:24px;background:#FFFFFF;color:#505050;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;\">"
    + "<p style=\"margin:0 0 16px;\">A quote came in from the website.</p>"
    + "<table style=\"border-collapse:collapse;width:100%;max-width:560px;\">"
    + detailHtml
    + "<tr><th colspan=\"2\" style=\"text-align:left;padding:12px;border:1px solid #DAD6D2;background:#894332;color:#FFFFFF;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;\">Quote</th></tr>"
    + htmlItems
    + afterHtml
    + "</table></body></html>";

  const textLines = [textTable(details), "", "Quote", textTable(items), "", textTable(after)];

  return {
    subject: oneLine(quote.platform + " quote from " + quote.name + " — " + quote.total, 150),
    html: html,
    text: textLines.join("\n")
  };
}

function parseQuote(payload) {
  if (!payload || typeof payload !== "object") {
    return { error: "That quote couldn’t be read. Refresh and try again." };
  }

  const name = oneLine(payload.name, LIMITS.name);
  const email = oneLine(payload.email, LIMITS.email).toLowerCase();
  const note = oneLineKeepBreaks(payload.note, LIMITS.note);
  const platform = oneLine(payload.platform, 40);
  const total = oneLine(payload.total, 20);
  const prices = oneLine(payload.prices, 120);
  const page = cleanPage(payload.page);

  if (!name || !email || !EMAIL_RE.test(email)) {
    return { error: "Add your name and a valid email so Nicole can reply." };
  }
  if (!PLATFORMS.has(platform)) {
    return { error: "That quote couldn’t be read. Refresh and try again." };
  }
  if (!AMOUNT_RE.test(total)) {
    return { error: "That quote couldn’t be read. Refresh and try again." };
  }
  if (!Array.isArray(payload.lines) || !Array.isArray(payload.tbc)) {
    return { error: "That quote couldn’t be read. Refresh and try again." };
  }
  if (payload.lines.length > LIMITS.lines || payload.tbc.length > LIMITS.tbc) {
    return { error: "That quote couldn’t be read. Refresh and try again." };
  }

  const lines = [];
  for (let i = 0; i < payload.lines.length; i++) {
    const line = payload.lines[i] || {};
    const label = cleanLabel(line.label);
    const amount = oneLine(line.amount, 20);
    if (!label || !AMOUNT_RE.test(amount)) {
      return { error: "That quote couldn’t be read. Refresh and try again." };
    }
    lines.push({ label: label, amount: amount });
  }

  const tbc = [];
  for (let i = 0; i < payload.tbc.length; i++) {
    const label = cleanLabel(payload.tbc[i]);
    if (!label) return { error: "That quote couldn’t be read. Refresh and try again." };
    tbc.push(label);
  }

  if (!lines.length && !tbc.length) {
    return { error: "Tick at least one item before sending." };
  }

  return {
    name: name,
    email: email,
    note: note,
    platform: platform,
    total: total,
    prices: prices,
    page: page,
    lines: lines,
    tbc: tbc
  };
}

function allowedOrigin(origin) {
  if (!origin) return false;
  if (origin === "https://www.nicolesteinmetz.com" || origin === "https://nicolesteinmetz.com") return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)+pages\.dev$/.test(origin)) return true;
  return false;
}

function cleanPage(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname;
    const ok = host === "www.nicolesteinmetz.com"
      || host === "nicolesteinmetz.com"
      || host === "localhost"
      || host === "127.0.0.1"
      || host.endsWith(".pages.dev");
    if (!ok || (url.protocol !== "https:" && url.protocol !== "http:")) return "";
    return url.origin + url.pathname;
  } catch (error) {
    return "";
  }
}

function cleanLabel(value) {
  const label = oneLine(value, LIMITS.label);
  if (!label || /[<>]/.test(label)) return "";
  return label;
}

function oneLine(value, max) {
  return String(value == null ? "" : value).replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function oneLineKeepBreaks(value, max) {
  return String(value == null ? "" : value).replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim().slice(0, max);
}

function formatCell(label, value) {
  const safe = escapeHtml(value).replace(/\n/g, "<br>");
  if (label === "Email") return "<a href=\"mailto:" + safe + "\" style=\"color:#894332;\">" + safe + "</a>";
  if (label === "Page") return "<a href=\"" + safe + "\" style=\"color:#894332;\">" + safe + "</a>";
  return safe;
}

function detailRow(row) {
  return "<tr><th style=\"text-align:left;padding:8px 12px;border:1px solid #DAD6D2;background:#F7F6F5;font-weight:600;vertical-align:top;\">"
    + escapeHtml(row[0])
    + "</th><td style=\"padding:8px 12px;border:1px solid #DAD6D2;vertical-align:top;\">"
    + formatCell(row[0], row[1])
    + "</td></tr>";
}

function textTable(pairs) {
  const width = pairs.reduce(function (max, row) {
    return Math.max(max, row[0].length);
  }, 0);
  return pairs.map(function (row) {
    return row[0].padEnd(width) + "  " + String(row[1]).replace(/\n/g, ", ");
  }).join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
