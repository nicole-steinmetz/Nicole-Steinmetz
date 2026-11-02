// Hourly cap shared by the FAQ chat and the “send my question” form.
// RATE_LIMIT_PER_HOUR overrides the default. RATE_LIMIT_KV makes it exact
// across locations; without that binding each isolate keeps its own count.

const memoryHits = new Map();

export async function allow(env, ip) {
  const limit = Number(env.RATE_LIMIT_PER_HOUR || 20);
  const now = Date.now();
  if (env.RATE_LIMIT_KV) {
    const key = `rl:${ip}`;
    const rec = (await env.RATE_LIMIT_KV.get(key, "json")) || { n: 0, start: now };
    if (now - rec.start > 3600_000) { rec.n = 0; rec.start = now; }
    if (rec.n >= limit) return false;
    rec.n += 1;
    const ttl = Math.max(60, Math.ceil((rec.start + 3600_000 - now) / 1000));
    await env.RATE_LIMIT_KV.put(key, JSON.stringify(rec), { expirationTtl: ttl });
    return true;
  }
  const list = (memoryHits.get(ip) || []).filter((t) => now - t < 3600_000);
  if (list.length >= limit) { memoryHits.set(ip, list); return false; }
  list.push(now);
  memoryHits.set(ip, list);
  if (memoryHits.size > 5000) {
    for (const [key, times] of memoryHits) {
      if (!times.length || now - times[times.length - 1] > 3600_000) memoryHits.delete(key);
    }
  }
  return true;
}
