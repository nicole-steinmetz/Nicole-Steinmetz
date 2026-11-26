/* Pages Function handlers for the project brief.
   The resume credential arrives as Authorization: Bearer.
   Only its SHA-256 hash is stored or looked up. */

import { allowScoped } from "./rate-limit.js";
import { canSendMail, sendSiteMail } from "./send-mail.js";
import { businessBriefMessage, clientAckMessage, resumeLinkMessage } from "./brief-mail.js";
import {
  claimAndStore,
  createDraft,
  getDraftByHash,
  parseDraft,
  setEmailStatus,
  updateDraft
} from "./brief-store.js";
import {
  SCHEMA_VERSION,
  draftTtlDays,
  normaliseUrls,
  relevantAnswers,
  sanitizeAnswers,
  summaryText,
  validateSubmission
} from "../../js/brief-schema.js";

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY = 80000;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function allowedOrigin(origin) {
  if (origin === "https://www.nicolesteinmetz.com" || origin === "https://nicolesteinmetz.com") return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)+pages\.dev$/.test(origin)) return true;
  return false;
}

function originOk(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return allowedOrigin(origin);
}

function clientIp(request) {
  return request.headers.get("cf-connecting-ip")
    || String(request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || "unknown";
}

function bearer(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+([A-Za-z0-9_-]+)\s*$/);
  if (!match || !TOKEN_RE.test(match[1])) return "";
  return match[1];
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function readBody(request) {
  const claimed = Number(request.headers.get("content-length") || 0);
  if (claimed > MAX_BODY) return { error: "too_large" };
  const text = await request.text();
  if (text.length > MAX_BODY) return { error: "too_large" };
  try {
    const jsonBody = text ? JSON.parse(text) : {};
    if (!jsonBody || typeof jsonBody !== "object" || Array.isArray(jsonBody)) return { error: "bad_json" };
    return { json: jsonBody };
  } catch (error) {
    return { error: "bad_json" };
  }
}

function limit(env, name, fallback) {
  const raw = Number(env && env[name]);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 1000) return Math.floor(raw);
  return fallback;
}

function storageMissing() {
  return json({
    ok: false,
    error: "storage_unconfigured",
    message: "Online saving isn’t available right now. Your answers are still on this device."
  }, 503);
}

function honeypot(body) {
  return Boolean(body && String(body.brief_hp || "").trim());
}

function expiresAt(env, now) {
  const days = draftTtlDays(env);
  return { days: days, at: new Date(now.getTime() + days * 86400000).toISOString() };
}

function draftPayload(body) {
  if (body.schemaVersion !== SCHEMA_VERSION) return { error: "This form has been updated. Refresh the page and try again." };
  const step = Number(body.step);
  if (!Number.isInteger(step) || step < 1 || step > 8) return { error: "That brief couldn’t be read. Refresh and try again." };
  if (!UUID_RE.test(String(body.idempotencyKey || ""))) return { error: "That brief couldn’t be read. Refresh and try again." };
  const answers = sanitizeAnswers(body.answers);
  const answersJson = JSON.stringify(answers);
  if (answersJson.length > 60000) return { error: "That brief is too long to save. Shorten a written answer and try again." };
  return { step: step, idempotencyKey: String(body.idempotencyKey).toLowerCase(), answers: answers, answersJson: answersJson };
}

function resumeLink(request, token) {
  const origin = new URL(request.url).origin;
  return `${origin}/start-a-project/#d=${token}`;
}

async function gate(request, env, scope, cap) {
  if (!originOk(request)) return json({ ok: false, error: "forbidden", message: "That didn’t go through. Try again in a moment." }, 403);
  const allowed = await allowScoped(env, scope, clientIp(request), cap);
  if (!allowed) {
    return json({
      ok: false,
      error: "rate_limited",
      message: "Too many attempts from this network. Wait a while and try again. Your answers are still on this device."
    }, 429);
  }
  return null;
}

export async function handleDraft(request, env) {
  const method = request.method.toUpperCase();
  if (method === "GET") return readDraft(request, env);
  if (method === "POST") return postDraft(request, env);
  if (method === "PUT") return putDraft(request, env);
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, POST, PUT" } });
}

async function readDraft(request, env) {
  const denied = await gate(request, env, "brief-read", limit(env, "BRIEF_READ_RATE_PER_HOUR", 60));
  if (denied) return denied;
  if (!env.BRIEFS_DB) return storageMissing();
  const token = bearer(request);
  if (!token) return json({ ok: false, error: "not_found", message: "That resume link doesn’t match a saved brief." }, 404);
  const row = await getDraftByHash(env.BRIEFS_DB, await hashToken(token));
  if (!row) return json({ ok: false, error: "not_found", message: "That resume link doesn’t match a saved brief." }, 404);
  const now = new Date().toISOString();
  if (row.status !== "open") {
    return json({ ok: false, error: "submitted", message: "This brief has already been submitted and can’t be edited from the link." }, 410);
  }
  if (row.expires_at <= now) {
    return json({ ok: false, error: "expired", message: "This saved brief has expired. You can start a new one." }, 410);
  }
  if (row.schema_version !== SCHEMA_VERSION) {
    return json({ ok: false, error: "version", message: "This draft was saved with a different version of the form." }, 409);
  }
  const draft = parseDraft(row);
  return json({
    ok: true,
    schemaVersion: draft.schemaVersion,
    step: draft.step,
    answers: draft.answers,
    revision: draft.revision,
    expiresAt: draft.expiresAt,
    idempotencyKey: draft.idempotencyKey,
    ttlDays: draftTtlDays(env),
    canEmail: canSendMail(env)
  });
}

async function postDraft(request, env) {
  const denied = await gate(request, env, "brief-write", limit(env, "BRIEF_WRITE_RATE_PER_HOUR", 40));
  if (denied) return denied;
  const body = await readBody(request);
  if (body.error === "too_large") return json({ ok: false, error: "too_large", message: "That brief is too long to save. Shorten a written answer and try again." }, 413);
  if (body.error) return json({ ok: false, error: "bad_json", message: "That brief couldn’t be read. Refresh and try again." }, 400);
  if (honeypot(body.json)) return json({ ok: true });
  if (body.json.action === "email-link") return emailLink(request, env);
  if (!env.BRIEFS_DB) return storageMissing();
  const parsed = draftPayload(body.json);
  if (parsed.error) return json({ ok: false, error: "invalid", message: parsed.error }, 400);
  const now = new Date();
  const expiry = expiresAt(env, now);
  const token = newToken();
  try {
    await createDraft(env.BRIEFS_DB, {
      id: crypto.randomUUID(),
      tokenHash: await hashToken(token),
      schemaVersion: SCHEMA_VERSION,
      step: parsed.step,
      answersJson: parsed.answersJson,
      idempotencyKey: parsed.idempotencyKey,
      now: now.toISOString(),
      expiresAt: expiry.at
    });
  } catch (error) {
    console.error("brief draft create failed");
    return json({ ok: false, error: "store_failed", message: "Online saving didn’t go through. Your answers are still on this device." }, 502);
  }
  return json({
    ok: true,
    token: token,
    revision: 1,
    expiresAt: expiry.at,
    ttlDays: expiry.days,
    canEmail: canSendMail(env)
  });
}

async function putDraft(request, env) {
  const denied = await gate(request, env, "brief-write", limit(env, "BRIEF_WRITE_RATE_PER_HOUR", 40));
  if (denied) return denied;
  if (!env.BRIEFS_DB) return storageMissing();
  const token = bearer(request);
  if (!token) return json({ ok: false, error: "not_found", message: "That resume link doesn’t match a saved brief." }, 404);
  const body = await readBody(request);
  if (body.error === "too_large") return json({ ok: false, error: "too_large", message: "That brief is too long to save. Shorten a written answer and try again." }, 413);
  if (body.error) return json({ ok: false, error: "bad_json", message: "That brief couldn’t be read. Refresh and try again." }, 400);
  if (honeypot(body.json)) return json({ ok: true });
  const parsed = draftPayload(body.json);
  if (parsed.error) return json({ ok: false, error: "invalid", message: parsed.error }, 400);
  const revision = Number(body.json.revision);
  if (!Number.isInteger(revision) || revision < 1) {
    return json({ ok: false, error: "invalid", message: "That brief couldn’t be read. Refresh and try again." }, 400);
  }
  const now = new Date();
  const expiry = expiresAt(env, now);
  let result;
  try {
    result = await updateDraft(env.BRIEFS_DB, {
      tokenHash: await hashToken(token),
      revision: revision,
      step: parsed.step,
      answersJson: parsed.answersJson,
      idempotencyKey: parsed.idempotencyKey,
      now: now.toISOString(),
      expiresAt: expiry.at
    });
  } catch (error) {
    console.error("brief draft update failed");
    return json({ ok: false, error: "store_failed", message: "Online saving didn’t go through. Your answers are still on this device." }, 502);
  }
  if (!result.ok && result.error === "conflict") {
    let answers = {};
    try { answers = JSON.parse(result.answersJson); } catch (error) { answers = {}; }
    return json({
      ok: false,
      error: "conflict",
      message: "This brief was saved in another tab or on another device.",
      revision: result.revision,
      step: result.step,
      answers: answers,
      expiresAt: result.expiresAt
    }, 409);
  }
  if (!result.ok && result.error === "expired") {
    return json({ ok: false, error: "expired", message: "This saved brief has expired. You can start a new one." }, 410);
  }
  if (!result.ok && result.error === "submitted") {
    return json({ ok: false, error: "submitted", message: "This brief has already been submitted and can’t be edited from the link." }, 410);
  }
  if (!result.ok) return json({ ok: false, error: "not_found", message: "That resume link doesn’t match a saved brief." }, 404);
  return json({
    ok: true,
    revision: result.revision,
    expiresAt: result.expiresAt,
    ttlDays: expiry.days,
    canEmail: canSendMail(env)
  });
}

async function emailLink(request, env) {
  const limited = await allowScoped(env, "brief-email", clientIp(request), limit(env, "BRIEF_EMAIL_RATE_PER_HOUR", 5));
  if (!limited) {
    return json({ ok: false, error: "rate_limited", message: "Too many email attempts. Copy the link instead." }, 429);
  }
  if (!canSendMail(env)) {
    return json({ ok: false, error: "email_unconfigured", message: "Email isn’t set up on the site yet. Copy the link instead." }, 503);
  }
  if (!env.BRIEFS_DB) return storageMissing();
  const token = bearer(request);
  if (!token) return json({ ok: false, error: "not_found", message: "Save the draft online before emailing the link." }, 404);
  const row = await getDraftByHash(env.BRIEFS_DB, await hashToken(token));
  if (!row || row.status !== "open" || row.expires_at <= new Date().toISOString()) {
    return json({ ok: false, error: "not_found", message: "That resume link doesn’t match a saved brief." }, 404);
  }
  const draft = parseDraft(row);
  const email = String(draft.answers.email || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "invalid", message: "Add your email in Your business first." }, 400);
  }
  try {
    await sendSiteMail(env, resumeLinkMessage(draft.answers, resumeLink(request, token), draft.expiresAt));
  } catch (error) {
    console.error("brief resume email failed");
    return json({ ok: false, error: "email_failed", message: "The email didn’t send. Copy the link instead." }, 502);
  }
  return json({ ok: true, emailed: true });
}

export async function handleSubmit(request, env) {
  if (request.method.toUpperCase() !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }
  const denied = await gate(request, env, "brief-submit", limit(env, "BRIEF_SUBMIT_RATE_PER_HOUR", 8));
  if (denied) return denied;
  const body = await readBody(request);
  if (body.error === "too_large") return json({ ok: false, error: "too_large", message: "That brief is too long to send. Shorten a written answer and try again." }, 413);
  if (body.error) return json({ ok: false, error: "bad_json", message: "That brief couldn’t be read. Refresh and try again." }, 400);
  if (honeypot(body.json)) return json({ ok: true });
  if (!env.BRIEFS_DB) return storageMissing();
  if (body.json.schemaVersion !== SCHEMA_VERSION) {
    return json({ ok: false, error: "invalid", message: "This form has been updated. Refresh the page and try again." }, 400);
  }
  if (!UUID_RE.test(String(body.json.idempotencyKey || ""))) {
    return json({ ok: false, error: "invalid", message: "That brief couldn’t be read. Refresh and try again." }, 400);
  }
  const validation = validateSubmission(body.json.answers);
  if (!validation.ok) {
    return json({ ok: false, error: "invalid", message: "A few answers need another look.", fields: validation.errors }, 400);
  }
  const answers = normaliseUrls(relevantAnswers(body.json.answers));
  const summary = summaryText(answers);
  const token = bearer(request);
  let tokenHash = "";
  let draftId = null;
  if (token && env.BRIEFS_DB) {
    const hash = await hashToken(token);
    const draft = await getDraftByHash(env.BRIEFS_DB, hash);
    if (draft) {
      tokenHash = hash;
      draftId = draft.id;
    }
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  let stored;
  try {
    stored = await claimAndStore(env.BRIEFS_DB, {
      id: id,
      idempotencyKey: String(body.json.idempotencyKey).toLowerCase(),
      draftId: draftId,
      tokenHash: tokenHash,
      schemaVersion: SCHEMA_VERSION,
      answersJson: JSON.stringify(answers),
      summaryText: summary,
      emailStatus: JSON.stringify({ business: "pending", client: "pending" }),
      now: now
    });
  } catch (error) {
    console.error("brief submit failed");
    return json({ ok: false, error: "store_failed", message: "That didn’t go through. Your answers are still here — try again." }, 502);
  }
  if (!stored.ok && stored.error === "not_found") {
    return json({ ok: false, error: "not_found", message: "That resume link doesn’t match a saved brief. You can still submit without it." }, 404);
  }
  if (!stored.ok) {
    return json({ ok: false, error: "store_failed", message: "That didn’t go through. Your answers are still here — try again." }, 502);
  }
  if (stored.duplicate || stored.alreadySubmitted) {
    return json({
      ok: true,
      stored: true,
      alreadySubmitted: Boolean(stored.alreadySubmitted || stored.duplicate),
      clientEmail: emailState(stored.emailStatus, "client")
    });
  }
  const status = await deliver(env, answers, summary);
  try {
    await setEmailStatus(env.BRIEFS_DB, stored.id, JSON.stringify(status));
  } catch (error) {
    console.error("brief email status failed");
  }
  return json({ ok: true, stored: true, clientEmail: status.client });
}

async function deliver(env, answers, summary) {
  if (!canSendMail(env)) return { business: "not_configured", client: "not_configured" };
  const status = { business: "pending", client: "pending" };
  try {
    await sendSiteMail(env, businessBriefMessage(answers, summary));
    status.business = "sent";
  } catch (error) {
    console.error("brief business email failed");
    status.business = "failed";
  }
  try {
    await sendSiteMail(env, clientAckMessage(answers));
    status.client = "sent";
  } catch (error) {
    console.error("brief client email failed");
    status.client = "failed";
  }
  return status;
}

function emailState(raw, key) {
  try {
    const parsed = JSON.parse(raw || "");
    return parsed[key] || "not_configured";
  } catch (error) {
    return "not_configured";
  }
}
