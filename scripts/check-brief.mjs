import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BUDGET_RANGES,
  COPY,
  FORM,
  applyCheckToggle,
  fieldByName,
  hasMeaningfulAnswers,
  relevantAnswers,
  sanitizeAnswers,
  validateStep,
  validateSubmission
} from "../js/brief-schema.js";
import { clearLocal, loadLocal, saveLocal } from "../js/brief-local.js";
import { handleDraft, handleSubmit } from "../functions/_lib/brief-http.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function test(name, fn) {
  return Promise.resolve().then(fn).then(function () {
    console.log("ok  " + name);
  }).catch(function (error) {
    failures.push(name);
    console.error("FAIL " + name);
    console.error(error);
  });
}

function memoryDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(join(root, "migrations/0001_briefs.sql"), "utf8"));
  return {
    sqlite: db,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            run() {
              const info = db.prepare(sql).run(...params);
              return Promise.resolve({ success: true, meta: { changes: Number(info.changes) } });
            },
            first() {
              const row = db.prepare(sql).get(...params);
              return Promise.resolve(row || null);
            },
            all() {
              return Promise.resolve({ results: db.prepare(sql).all(...params) });
            }
          };
        }
      };
    }
  };
}

function memoryStorage(initial) {
  const map = new Map(initial || []);
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); }
  };
}

function request(method, path, options) {
  const opts = options || {};
  const headers = new Headers();
  if (opts.origin !== null) headers.set("Origin", opts.origin || "http://localhost:8000");
  if (opts.ip) headers.set("cf-connecting-ip", opts.ip);
  if (opts.token) headers.set("Authorization", "Bearer " + opts.token);
  const body = opts.raw != null ? opts.raw : (opts.body ? JSON.stringify(opts.body) : undefined);
  return new Request("http://localhost:8000" + path, { method: method, headers: headers, body: body });
}

function validAnswers(extra) {
  return Object.assign({
    name: "Ada Stone",
    email: "ada@example.com",
    businessName: "Stone Cafe",
    businessKind: "hospitality",
    mainContact: "yes",
    helpWith: "first-site",
    goals: ["enquiries"],
    budget: "guidance",
    launch: "flexible"
  }, extra || {});
}

async function json(response) {
  return { status: response.status, body: await response.json() };
}

const future = new Date();
future.setUTCDate(future.getUTCDate() + 40);
const futureDay = future.toISOString().slice(0, 10);

await test("eight steps and opening copy", function () {
  assert.equal(FORM.length, 8);
  assert.deepEqual(FORM.map(function (step) { return step.title; }), [
    "Your business",
    "Your project",
    "Website goals",
    "Your customers",
    "Design direction",
    "Content and features",
    "Budget and timing",
    "Ongoing support and review"
  ]);
  const html = readFileSync(join(root, "start-a-project/index.html"), "utf8");
  assert.ok(html.includes(COPY.title));
  assert.ok(html.includes(COPY.lede));
  assert.equal(html.includes("minutes"), false);
  assert.equal(BUDGET_RANGES.length, 0);
  BUDGET_RANGES.forEach(function (range) {
    assert.equal(/todo|placeholder|xxx/i.test(range.label), false);
  });
});

await test("step validation ignores later steps and enforces conditionals", function () {
  const empty = validateStep(2, {});
  assert.equal(empty.some(function (error) { return error.field === "name"; }), false);
  assert.equal(empty.some(function (error) { return error.field === "helpWith"; }), true);

  const other = validateStep(1, validAnswers({ businessKind: "other", businessKindOther: "" }));
  assert.equal(other.some(function (error) { return error.field === "businessKindOther"; }), true);

  const together = validateStep(1, validAnswers({ mainContact: "together", otherContactName: "Sam" }));
  assert.equal(together.some(function (error) { return error.field === "otherContactEmail"; }), false);

  const someoneElse = validateStep(1, validAnswers({ mainContact: "no", otherContactName: "Sam" }));
  assert.equal(someoneElse.some(function (error) { return error.field === "otherContactEmail"; }), true);

  const goals = fieldByName("goals");
  let values = [];
  ["enquiries", "bookings", "sell", "explain"].forEach(function (value) {
    const next = applyCheckToggle(values, value, true, goals);
    if (!next.blocked) values = next.values;
    else assert.equal(values.length, 3);
  });
  assert.equal(values.length, 3);
  assert.deepEqual(applyCheckToggle(["enquiries", "bookings"], "need-help", true, goals).values, ["need-help"]);
  assert.deepEqual(sanitizeAnswers({ contentHave: ["logo", "nothing-ready"] }).contentHave, ["nothing-ready"]);
});

await test("stale conditional answers stay in the draft and leave the submission", function () {
  const draft = sanitizeAnswers(validAnswers({
    helpWith: "first-site",
    website: "",
    keep: "The menu page",
    businessKind: "hospitality",
    businessKindOther: "A bakery"
  }));
  assert.equal(draft.keep, "The menu page");
  assert.equal(draft.businessKindOther, "A bakery");
  const submitted = relevantAnswers(draft);
  assert.equal(submitted.keep, "");
  assert.equal(submitted.businessKindOther, "");
  const selling = relevantAnswers(validAnswers({ helpWith: "sell-online", productCount: "1-10", productType: "physical" }));
  assert.equal(selling.productCount, "1-10");
  const notSelling = relevantAnswers(validAnswers({ productCount: "1-10" }));
  assert.equal(notSelling.productCount, "");
});

await test("specific dates and bad links", function () {
  const missing = validateStep(7, validAnswers({ launch: "specific-date" }), new Date());
  assert.equal(missing.some(function (error) { return error.field === "launchDate"; }), true);
  const ok = validateStep(7, validAnswers({
    launch: "specific-date",
    launchDate: futureDay,
    launchEvent: "Opening weekend",
    launchDateFlexibility: "flexible"
  }), new Date());
  assert.equal(ok.length, 0);
  const badLink = validateStep(1, validAnswers({ website: "not a link" }));
  assert.equal(badLink.some(function (error) { return error.field === "website"; }), true);
});

await test("local draft round trip, version ignore and storage failure", function () {
  const storage = memoryStorage();
  const saved = saveLocal(storage, { schemaVersion: 1, step: 3, answers: { name: "Ada" } });
  assert.equal(saved.ok, true);
  const loaded = loadLocal(storage);
  assert.equal(loaded.draft.step, 3);
  assert.equal(clearLocal(storage).ok, true);
  assert.equal(loadLocal(storage).draft, null);
  const old = memoryStorage([["ns.project-brief.v1", JSON.stringify({ schemaVersion: 99 })]]);
  assert.equal(loadLocal(old).ignored, "version");
  const broken = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("quota"); },
    removeItem() { throw new Error("blocked"); }
  };
  assert.equal(loadLocal(broken).ok, false);
  assert.equal(saveLocal(broken, { schemaVersion: 1 }).ok, false);
  assert.equal(hasMeaningfulAnswers({ name: "Ada" }), true);
  assert.equal(hasMeaningfulAnswers({}), false);
});

await test("online draft create, resume, conflict, expiry and unknown token", async function () {
  const db = memoryDb();
  const env = { BRIEFS_DB: db };
  const created = await json(await handleDraft(request("POST", "/api/brief-draft", {
    ip: "10.0.0.1",
    body: { schemaVersion: 1, step: 2, answers: validAnswers({ keep: "The photos" }), idempotencyKey: crypto.randomUUID(), brief_hp: "" }
  }), env));
  assert.equal(created.status, 200);
  assert.match(created.body.token, /^[A-Za-z0-9_-]{43}$/);
  const stored = db.sqlite.prepare("SELECT token_hash, answers_json FROM drafts").all();
  assert.equal(JSON.stringify(stored).includes(created.body.token), false);
  assert.equal(stored[0].token_hash.length, 64);

  const read = await json(await handleDraft(request("GET", "/api/brief-draft", {
    ip: "10.0.0.1",
    token: created.body.token
  }), env));
  assert.equal(read.body.answers.keep, "The photos");
  assert.equal(read.body.revision, 1);

  const missing = await json(await handleDraft(request("GET", "/api/brief-draft", { ip: "10.0.0.2" }), env));
  assert.equal(missing.status, 404);
  const wrong = await json(await handleDraft(request("GET", "/api/brief-draft", {
    ip: "10.0.0.3",
    token: "a".repeat(43)
  }), env));
  assert.equal(wrong.status, 404);

  const key = crypto.randomUUID();
  const first = await json(await handleDraft(request("PUT", "/api/brief-draft", {
    ip: "10.0.0.4",
    token: created.body.token,
    body: { schemaVersion: 1, step: 3, revision: 1, answers: validAnswers({ name: "Ada Stone" }), idempotencyKey: key }
  }), env));
  assert.equal(first.body.revision, 2);
  const clash = await json(await handleDraft(request("PUT", "/api/brief-draft", {
    ip: "10.0.0.5",
    token: created.body.token,
    body: { schemaVersion: 1, step: 4, revision: 1, answers: validAnswers({ name: "Other Tab" }), idempotencyKey: key }
  }), env));
  assert.equal(clash.status, 409);
  assert.equal(clash.body.answers.name, "Ada Stone");

  db.sqlite.prepare("UPDATE drafts SET expires_at = ?").run("2000-01-01T00:00:00.000Z");
  const expired = await json(await handleDraft(request("GET", "/api/brief-draft", {
    ip: "10.0.0.6",
    token: created.body.token
  }), env));
  assert.equal(expired.status, 410);
  assert.equal(expired.body.error, "expired");
});

await test("submission persists without email, blocks duplicates, and locks the draft", async function () {
  const db = memoryDb();
  const env = { BRIEFS_DB: db };
  const logs = [];
  const original = console.error;
  console.error = function () { logs.push(Array.from(arguments).join(" ")); };
  try {
    const key = crypto.randomUUID();
    const draft = await json(await handleDraft(request("POST", "/api/brief-draft", {
      ip: "10.1.0.1",
      body: { schemaVersion: 1, step: 8, answers: validAnswers(), idempotencyKey: key }
    }), env));
    const sent = await json(await handleSubmit(request("POST", "/api/brief", {
      ip: "10.1.0.1",
      token: draft.body.token,
      body: { schemaVersion: 1, answers: validAnswers({ keep: "Should not be stored" }), idempotencyKey: key }
    }), env));
    assert.equal(sent.body.stored, true);
    assert.equal(sent.body.clientEmail, "not_configured");
    const rows = db.sqlite.prepare("SELECT answers_json, summary_text, email_status FROM submissions").all();
    assert.equal(rows.length, 1);
    assert.equal(JSON.parse(rows[0].answers_json).keep, "");
    assert.equal(JSON.parse(rows[0].email_status).business, "not_configured");
    assert.equal(logs.join(" ").includes("ada@example.com"), false);

    const again = await json(await handleSubmit(request("POST", "/api/brief", {
      ip: "10.1.0.2",
      token: draft.body.token,
      body: { schemaVersion: 1, answers: validAnswers({ name: "Second" }), idempotencyKey: crypto.randomUUID() }
    }), env));
    assert.equal(again.body.alreadySubmitted, true);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM submissions").get().n, 1);

    const locked = await json(await handleDraft(request("GET", "/api/brief-draft", {
      ip: "10.1.0.3",
      token: draft.body.token
    }), env));
    assert.equal(locked.status, 410);
    assert.equal(locked.body.error, "submitted");

    const put = await json(await handleDraft(request("PUT", "/api/brief-draft", {
      ip: "10.1.0.4",
      token: draft.body.token,
      body: { schemaVersion: 1, step: 2, revision: 1, answers: validAnswers(), idempotencyKey: key }
    }), env));
    assert.equal(put.status, 410);
  } finally {
    console.error = original;
  }
});

await test("email sends without blocking the stored brief, and resume mail carries the link", async function () {
  const db = memoryDb();
  const sent = [];
  const env = {
    BRIEFS_DB: db,
    EMAIL: { send(message) { sent.push(message); return Promise.resolve(); } }
  };
  const key = crypto.randomUUID();
  const draft = await json(await handleDraft(request("POST", "/api/brief-draft", {
    ip: "10.2.0.1",
    body: { schemaVersion: 1, step: 1, answers: validAnswers(), idempotencyKey: key }
  }), env));
  const mailed = await json(await handleDraft(request("POST", "/api/brief-draft", {
    ip: "10.2.0.1",
    token: draft.body.token,
    body: { action: "email-link" }
  }), env));
  assert.equal(mailed.body.emailed, true);
  assert.ok(sent[0].text.includes(draft.body.token));
  assert.equal(JSON.stringify(db.sqlite.prepare("SELECT answers_json, token_hash FROM drafts").all()).includes(draft.body.token), false);

  sent.length = 0;
  env.EMAIL.send = function (message) {
    sent.push(message);
    if (sent.length === 1) return Promise.reject(new Error("mailbox " + message.replyTo.email));
    return Promise.resolve();
  };
  const logs = [];
  const original = console.error;
  console.error = function () { logs.push(Array.from(arguments).join(" ")); };
  try {
    const result = await json(await handleSubmit(request("POST", "/api/brief", {
      ip: "10.2.0.2",
      body: { schemaVersion: 1, answers: validAnswers(), idempotencyKey: crypto.randomUUID() }
    }), env));
    assert.equal(result.body.stored, true);
    assert.equal(result.body.clientEmail, "sent");
    const status = JSON.parse(db.sqlite.prepare("SELECT email_status FROM submissions ORDER BY created_at DESC LIMIT 1").get().email_status);
    assert.equal(status.business, "failed");
    assert.equal(status.client, "sent");
    assert.equal(logs.join(" ").includes("ada@example.com"), false);
    assert.equal(sent.some(function (message) { return message.to === "nicole@kneecoal.com" && message.text.includes(draft.body.token); }), false);
  } finally {
    console.error = original;
  }
});

await test("honeypot, oversized body, bad origin, missing database and rate limit", async function () {
  const db = memoryDb();
  const env = { BRIEFS_DB: db, BRIEF_SUBMIT_RATE_PER_HOUR: 2 };
  const honey = await json(await handleSubmit(request("POST", "/api/brief", {
    ip: "10.3.0.1",
    body: { schemaVersion: 1, answers: validAnswers(), idempotencyKey: crypto.randomUUID(), brief_hp: "https://spam.example" }
  }), env));
  assert.equal(honey.body.ok, true);
  assert.equal(honey.body.stored, undefined);
  assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM submissions").get().n, 0);

  const huge = await json(await handleDraft(request("POST", "/api/brief-draft", {
    ip: "10.3.0.2",
    raw: "x".repeat(80001)
  }), { BRIEFS_DB: db }));
  assert.equal(huge.status, 413);

  const evil = await json(await handleSubmit(request("POST", "/api/brief", {
    ip: "10.3.0.3",
    origin: "https://evil.example",
    body: { schemaVersion: 1, answers: validAnswers(), idempotencyKey: crypto.randomUUID() }
  }), env));
  assert.equal(evil.status, 403);

  const offline = await json(await handleDraft(request("POST", "/api/brief-draft", {
    ip: "10.3.0.4",
    body: { schemaVersion: 1, step: 1, answers: validAnswers(), idempotencyKey: crypto.randomUUID() }
  }), {}));
  assert.equal(offline.status, 503);
  assert.equal(offline.body.error, "storage_unconfigured");

  const limited = { BRIEFS_DB: memoryDb().sqlite ? null : null };
  const limitedDb = memoryDb();
  const limitedEnv = { BRIEFS_DB: limitedDb, BRIEF_SUBMIT_RATE_PER_HOUR: 1 };
  const first = await handleSubmit(request("POST", "/api/brief", {
    ip: "10.4.0.9",
    body: { schemaVersion: 1, answers: validAnswers(), idempotencyKey: crypto.randomUUID() }
  }), limitedEnv);
  assert.equal(first.status, 200);
  const second = await json(await handleSubmit(request("POST", "/api/brief", {
    ip: "10.4.0.9",
    body: { schemaVersion: 1, answers: validAnswers(), idempotencyKey: crypto.randomUUID() }
  }), limitedEnv));
  assert.equal(second.status, 429);
  assert.equal(limited, limited);
});

await test("a full brief validates", function () {
  const result = validateSubmission(validAnswers());
  assert.equal(result.ok, true);
  const page = readFileSync(join(root, "js/brief-form.js"), "utf8");
  assert.equal(page.includes("minutes"), false);
  assert.equal(page.includes("COPY.successTitle"), true);
});

if (failures.length) {
  console.error("brief checks failed (" + failures.length + ")");
  process.exit(1);
}
console.log("brief checks passed");
