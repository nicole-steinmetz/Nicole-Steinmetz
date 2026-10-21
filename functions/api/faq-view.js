// POST /api/faq-view  body: {"id":"<slug>"}  (sent with navigator.sendBeacon)
import { SLUGS } from '../_lib/faq-slugs.js';

export async function onRequestPost({ request, env }) {
  try {
    if (!env.FAQ_VIEWS) return new Response(null, { status: 204 });
    const raw = await request.text();
    if (raw.length > 512) return new Response(null, { status: 413 });
    let id;
    try { id = JSON.parse(raw).id; } catch (e) { return new Response(null, { status: 400 }); }
    if (typeof id !== 'string' || !SLUGS.has(id)) return new Response(null, { status: 400 });
    const key = 'view:' + id;
    const n = parseInt((await env.FAQ_VIEWS.get(key)) || '0', 10) || 0;
    // KV is eventually consistent, so counts are approximate. That is fine for ranking.
    await env.FAQ_VIEWS.put(key, String(n + 1));
    return new Response(null, { status: 204 });
  } catch (e) {
    return new Response(null, { status: 204 });
  }
}

export function onRequest() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
}
