// GET /api/faq-top  ->  {"top":["slug","slug","slug"]}
import { SLUGS, SEEDS } from '../_lib/faq-slugs.js';

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
};
const reply = (top) => new Response(JSON.stringify({ top }), { headers: HEADERS });

export async function onRequestGet({ env }) {
  try {
    if (!env.FAQ_VIEWS) return reply(SEEDS);
    const slugs = [...SLUGS];
    const counts = await Promise.all(
      slugs.map(async (s) => [s, parseInt((await env.FAQ_VIEWS.get('view:' + s)) || '0', 10) || 0])
    );
    const top = counts.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);
    for (const s of SEEDS) if (top.length < 3 && !top.includes(s)) top.push(s);
    return reply(top);
  } catch (e) {
    return reply(SEEDS);
  }
}
