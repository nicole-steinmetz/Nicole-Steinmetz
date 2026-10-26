// Counts for one open chat, so a transcript can only cover questions this
// visitor actually asked. Message text is not stored.
// FAQ_VIEWS holds the durable copy (key faqchat:<id>, two-hour expiry).
// The map is a same-isolate fallback when that binding is absent.

const memory = new Map();
const TTL_MS = 2 * 60 * 60 * 1000;
const TTL_S = 2 * 60 * 60;
const KEY = (id) => "faqchat:" + id;

function blank(now) {
  return { asked: 0, sent: 0, t: now };
}

function usable(rec, now) {
  if (!rec || typeof rec.asked !== "number" || typeof rec.sent !== "number") return blank(now);
  if (now - rec.t > TTL_MS) return blank(now);
  return { asked: rec.asked, sent: rec.sent, t: rec.t };
}

function merge(a, b) {
  return {
    asked: Math.max(a.asked, b.asked),
    sent: Math.max(a.sent, b.sent),
    t: Math.max(a.t, b.t)
  };
}

async function read(env, id, now) {
  let rec = usable(memory.get(id), now);
  if (env.FAQ_VIEWS) {
    try {
      rec = merge(rec, usable(await env.FAQ_VIEWS.get(KEY(id), "json"), now));
    } catch (e) { /* keep the in-memory count */ }
  }
  return rec;
}

async function write(env, id, rec) {
  memory.set(id, rec);
  if (memory.size > 5000) {
    const now = Date.now();
    for (const [key, value] of memory) {
      if (now - value.t > TTL_MS) memory.delete(key);
    }
  }
  if (env.FAQ_VIEWS) {
    try {
      await env.FAQ_VIEWS.put(KEY(id), JSON.stringify(rec), { expirationTtl: TTL_S });
    } catch (e) { /* the in-memory count still covers this isolate */ }
  }
}

export async function noteAsked(env, chatId) {
  const now = Date.now();
  const rec = await read(env, chatId, now);
  if (rec.asked >= 40) return;
  rec.asked += 1;
  rec.t = now;
  await write(env, chatId, rec);
}

// Returns the record when this transcript covers new, already-asked questions.
export async function beginTranscript(env, chatId, asked) {
  if (!Number.isInteger(asked) || asked < 1) return null;
  const now = Date.now();
  const rec = await read(env, chatId, now);
  if (asked > rec.asked || asked <= rec.sent) return null;
  return rec;
}

export async function finishTranscript(env, chatId, asked) {
  const now = Date.now();
  const rec = await read(env, chatId, now);
  rec.sent = Math.max(rec.sent, asked);
  rec.t = now;
  await write(env, chatId, rec);
}
