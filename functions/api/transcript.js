/* Pages Function — emails a copy of an FAQ chat to nicole@kneecoal.com.
   Uses the same Send Email binding as functions/api/quote.js:
     variable name EMAIL
     destination address nicole@kneecoal.com
   A transcript is only accepted for a chat_id that /api/chat has already seen,
   and only for questions that have not already been emailed. */

import faqs from "../_lib/faqs.json";
import { PRICING_URL, allowedOrigin } from "../_lib/faq-core.js";
import { beginTranscript, finishTranscript } from "../_lib/faq-sessions.js";

const TO = "nicole@kneecoal.com";
const FROM = "quotes@nicolesteinmetz.com";
const CHAT_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const CRED_RE = /reply with your password|reply with the code|send your password|send us your password|enter your password below|confirm your card number|your full card number|seed phrase|recovery phrase|verify your card|social security number|confirm your bank details|\bcvv\b/i;

const URL_TITLES = Object.fromEntries(faqs.map((f) => [f.url, f.question]));
URL_TITLES[PRICING_URL] = "Pricing";

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function redact(value) {
  return String(value || "").replace(CRED_RE, "[removed]");
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
    return (url.origin + url.pathname).slice(0, 300);
  } catch (e) {
    return "";
  }
}

function parseTranscript(raw) {
  let body;
  try { body = JSON.parse(raw); } catch { return null; }
  if (!body || !CHAT_ID_RE.test(body.chat_id)) return null;
  if (!Array.isArray(body.turns) || body.turns.length < 2 || body.turns.length > 60) return null;
  const turns = [];
  for (const turn of body.turns) {
    if (!turn || (turn.role !== "user" && turn.role !== "assistant")) return null;
    if (typeof turn.content !== "string" || !turn.content.trim() || turn.content.length > 1500) return null;
    const links = Array.isArray(turn.links) ? turn.links.filter((u) => typeof u === "string" && URL_TITLES[u]).slice(0, 3) : [];
    turns.push({ role: turn.role, content: redact(turn.content).trim(), links: links });
  }
  const asked = turns.filter((t) => t.role === "user").length;
  if (asked < 1) return null;
  return { chatId: body.chat_id, page: cleanPage(redact(body.page)), turns: turns, asked: asked };
}

function buildEmail(turns, page) {
  const questions = turns.filter((t) => t.role === "user").length;
  const when = new Date().toLocaleString("en-AU", {
    timeZone: "Australia/Perth",
    dateStyle: "full",
    timeStyle: "short"
  });
  const subject = "FAQ chat on your site (" + questions + (questions === 1 ? " question)" : " questions)");
  const rows = turns.map((turn) => {
    const who = turn.role === "user" ? "Visitor" : "Assistant";
    const bg = turn.role === "user" ? "#ffffff;border:1px solid #DAD6D2" : "#F4F2F0";
    const links = turn.links.map((url) => {
      const safe = escapeHtml(url);
      return "<br><a href=\"" + safe + "\" style=\"color:#4a77aa;font-size:13px\">" + escapeHtml(URL_TITLES[url]) + " &rarr;</a>";
    }).join("");
    const text = escapeHtml(turn.content).replace(/\n/g, "<br>");
    return "<tr><td style=\"padding:6px 0\"><div style=\"font-size:12px;color:#8a8580;font-family:Arial,Helvetica,sans-serif\">"
      + who + "</div><div style=\"background:" + bg + ";border-radius:14px;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#505050\">"
      + text + links + "</div></td></tr>";
  }).join("");
  const pageLine = page ? "<br>Page: " + escapeHtml(page) : "";
  const html = "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr><td style=\"padding:24px\">"
    + "<table role=\"presentation\" width=\"100%\" style=\"max-width:560px\" cellpadding=\"0\" cellspacing=\"0\">"
    + "<tr><td style=\"padding-bottom:12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#505050\">"
    + "<strong style=\"color:#2b2b2b;font-size:17px\">New FAQ chat</strong>"
    + "<br><span style=\"font-size:13px;color:#8a8580\">" + escapeHtml(when) + " (Perth time)" + pageLine + "</span></td></tr>"
    + rows
    + "<tr><td style=\"padding-top:16px;font-size:12px;color:#9b9590;font-family:Arial,Helvetica,sans-serif\">"
    + "Sent from the website. Visitor text is shown as typed.</td></tr></table></td></tr></table>";
  const text = ["New FAQ chat", when + " (Perth time)", page ? "Page: " + page : "", ""]
    .concat(turns.map((turn) => (turn.role === "user" ? "Visitor" : "Assistant") + ": " + turn.content
      + (turn.links.length ? "\n" + turn.links.map((url) => URL_TITLES[url] + " " + url).join("\n") : "")))
    .filter((line) => line !== "")
    .join("\n\n");
  return { subject: subject, html: html, text: text };
}

export async function onRequestPost({ request, env }) {
  if (!allowedOrigin(request.headers.get("Origin"))) return json({ sent: false }, 403);

  const raw = await request.text();
  if (raw.length > 80000) return json({ sent: false }, 413);
  const transcript = parseTranscript(raw);
  if (!transcript) return json({ detail: "Invalid transcript" }, 422);

  const open = await beginTranscript(env, transcript.chatId, transcript.asked);
  if (!open) return json({ sent: false }, 202);
  if (!env.EMAIL || typeof env.EMAIL.send !== "function") return json({ sent: false }, 503);

  const message = buildEmail(transcript.turns, transcript.page);
  try {
    await env.EMAIL.send({
      to: TO,
      from: { email: FROM, name: "Nicole Steinmetz website" },
      subject: message.subject,
      html: message.html,
      text: message.text
    });
  } catch (e) {
    console.error("faq transcript email failed", e && e.message);
    return json({ sent: false }, 502);
  }

  await finishTranscript(env, transcript.chatId, transcript.asked);
  return json({ sent: true }, 202);
}
