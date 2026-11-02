/* Pages Function — FAQ chat. Answers from functions/_lib/faqs.json via Claude.
   Pages → Settings → Variables and Secrets → Secret:
     name ANTHROPIC_API_KEY
   Optional plain-text variables: ANTHROPIC_MODEL, RATE_LIMIT_PER_HOUR.
   Optional KV binding RATE_LIMIT_KV makes the hourly cap exact across locations.
   The key stays on Cloudflare. It is never sent to the browser. */

import faqs from "../_lib/faqs.json";
import {
  FaqIndex, isPricing, buildPrompt, metaFor, clean, faqLink, validate, allowedOrigin,
  TAG_RE, SYSTEM_PROMPT, PRICING_URL, PRICING_REPLY, LIMIT_REPLY, ERROR_REPLY,
  NO_MATCH_REPLY, CONTACT_ACTIONS, BOOK_ACTION, COST_SLUG, bestFaq
} from "../_lib/faq-core.js";
import { noteAsked } from "../_lib/faq-sessions.js";
import { allow } from "../_lib/rate-limit.js";

const index = new FaqIndex(faqs);
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const sse = (obj) => `data: ${JSON.stringify(obj)}\n\n`;

function logFaqError(error) {
  const status = error && Number.isInteger(error.status) ? error.status : null;
  const message = String((error && error.message) || "unknown")
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "[redacted]")
    .slice(0, 300);
  console.error(JSON.stringify({ msg: "faq chat failed", status, message }));
}

function fail(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function* anthropicText(env, prompt) {
  if (!env.ANTHROPIC_API_KEY) throw fail("ANTHROPIC_API_KEY is not set", null);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 260,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok || !res.body) {
    let detail = "";
    try { detail = await res.text(); } catch { detail = ""; }
    detail = detail.replace(/sk-ant-[A-Za-z0-9_-]+/g, "[redacted]").replace(/\s+/g, " ").trim().slice(0, 180);
    throw fail(detail ? `Anthropic ${res.status}: ${detail}` : `Anthropic ${res.status}`, res.status);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        let ev;
        try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") yield ev.delta.text;
        else if (ev.type === "message_stop") return;
        else if (ev.type === "error") throw fail((ev.error && ev.error.message) || "Anthropic error", null);
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

function coverFaqs(message, found) {
  const n = normCover(message);
  const slugs = [];
  if (n.includes("process") || n.includes("start to finish") || n.includes("steps")) {
    slugs.push("whats-the-process-start-to-finish");
  }
  if (n.includes("how long") || n.includes("timeline") || n.includes("month") || n.includes("week")) {
    slugs.push("how-long-does-a-build-take");
  }
  const out = found.slice();
  for (const slug of slugs) {
    const faq = index.bySlug[slug];
    if (faq && !out.some((item) => item.slug === slug)) out.push(faq);
  }
  return out;
}

function normCover(text) {
  return (text || "").toLowerCase().replace(/[\u2019']/g, "").replace(/[^a-z0-9]+/g, " ");
}

async function* answer(env, input) {
  const { message, history } = input;
  const prevUser = history.slice(-4).filter((t) => t.role === "user").map((t) => t.content).join(" ");
  const top = index.search(message, prevUser, 3);

  if (isPricing(message, top)) {
    yield sse({
      type: "meta",
      kind: "pricing",
      links: [
        { label: "See my pricing", title: null, url: PRICING_URL },
        faqLink(index.bySlug[COST_SLUG])
      ],
      actions: []
    });
    yield sse({ type: "delta", text: PRICING_REPLY });
    yield sse({ type: "done" });
    return;
  }

  let found = top.map((x) => x[0]);
  const covered = coverFaqs(message, found);
  found = covered;

  if (!env.ANTHROPIC_API_KEY) {
    logFaqError(fail("ANTHROPIC_API_KEY is not set", null));
    const faq = bestFaq(index, message, prevUser);
    if (faq) {
      yield sse({ type: "meta", kind: "answer", links: [faqLink(faq)], actions: [] });
      yield sse({ type: "delta", text: faq.answer });
      yield sse({ type: "done" });
      return;
    }
    yield sse({ type: "meta", kind: "fallback", links: [], actions: [BOOK_ACTION] });
    yield sse({ type: "delta", text: NO_MATCH_REPLY });
    yield sse({ type: "done" });
    return;
  }

  if (!found.length) {
    yield sse({ type: "meta", kind: "fallback", links: [], actions: [BOOK_ACTION] });
    yield sse({ type: "delta", text: NO_MATCH_REPLY });
    yield sse({ type: "done" });
    return;
  }

  let buf = "";
  let tagged = false;
  let noMatch = false;
  try {
    for await (const text of anthropicText(env, buildPrompt(message, history, found))) {
      if (tagged) {
        if (!noMatch) yield sse({ type: "delta", text: clean(text) });
        continue;
      }
      buf += text;
      if (buf.includes("\n") || buf.length > 60) {
        const nl = buf.indexOf("\n");
        const first = nl >= 0 ? buf.slice(0, nl) : buf;
        let rest = nl >= 0 ? buf.slice(nl + 1) : "";
        let meta;
        if (TAG_RE.test(first)) {
          meta = metaFor(first, found);
          if (meta.kind === "chat" && top.length && top[0][1] >= 4) meta = metaFor("USED: 1", found);
        } else {
          meta = metaFor("USED: 1", found);
          rest = buf;
        }
        noMatch = meta.kind === "fallback";
        yield sse(meta);
        tagged = true;
        if (noMatch) yield sse({ type: "delta", text: NO_MATCH_REPLY });
        else if (rest.trim()) yield sse({ type: "delta", text: clean(rest.trimStart()) });
      }
    }
    if (!tagged) {
      const nl = buf.indexOf("\n");
      let first = nl >= 0 ? buf.slice(0, nl) : buf;
      let rest = nl >= 0 ? buf.slice(nl + 1) : "";
      if (!TAG_RE.test(first)) { first = "USED: 1"; rest = buf; }
      const meta = metaFor(first, found);
      noMatch = meta.kind === "fallback";
      yield sse(meta);
      if (noMatch) yield sse({ type: "delta", text: NO_MATCH_REPLY });
      else if (rest.trim()) yield sse({ type: "delta", text: clean(rest.trim()) });
    }
    yield sse({ type: "done" });
  } catch (e) {
    logFaqError(e);
    yield sse({ type: "error", text: ERROR_REPLY, actions: CONTACT_ACTIONS });
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  if (!allowedOrigin(request.headers.get("Origin"))) {
    return json({ detail: "Invalid request" }, 403);
  }

  const raw = await request.text();
  if (raw.length > 20000) return json({ detail: "Invalid request" }, 413);

  let body;
  try { body = JSON.parse(raw); } catch { body = null; }
  const input = validate(body);
  if (!input) return json({ detail: "Invalid request" }, 422);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!(await allow(env, ip))) {
    return json({ kind: "limit", text: LIMIT_REPLY, actions: CONTACT_ACTIONS }, 429);
  }

  if (input.chatId) {
    try { await noteAsked(env, input.chatId); }
    catch (e) { console.error("faq chat session", e && e.message); }
  }

  const enc = new TextEncoder();
  const gen = answer(env, input);
  const stream = new ReadableStream({
    async pull(controller) {
      const { value, done } = await gen.next();
      if (done) controller.close();
      else controller.enqueue(enc.encode(value));
    },
    cancel() { gen.return(); }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no"
    }
  });
}

export function onRequestOptions() {
  return new Response(null, { status: 204 });
}
