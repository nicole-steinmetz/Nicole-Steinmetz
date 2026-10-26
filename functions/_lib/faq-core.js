// Answering rules shared by the Pages Function. Mirrors backend/server.py + faq_search.py.

export const PRICING_URL = "https://www.nicolesteinmetz.com/pricing/";
// Booking URL matches js/site-config.js BOOKING_URL.
export const CONTACT_ACTIONS = [
  { label: "Book a call", url: "https://calendar.app.google/VhKn1WLoZNS8Aq899" },
  { label: "Contact me", url: "https://www.nicolesteinmetz.com/contact/" },
];
export const COST_SLUG = "what-does-a-project-cost";
const PRICING_POLICY_SLUGS = new Set([
  "how-do-i-get-a-quote", "do-you-charge-hourly-or-a-fixed-price", "what-are-your-payment-terms",
  "whats-not-included-in-the-build-price", "do-i-need-to-pay-for-hosting-domains-or-software-separately",
  "are-small-tweaks-after-launch-billable", "how-do-third-party-subscriptions-get-paid-apps-email-hosting",
  "what-if-i-need-more-pages-or-features-partway-through", "what-if-i-need-to-pause-or-cancel-after-weve-started",
]);
const PRICING_STRONG_RE = /\b(costs?|costing|how much|rates?|budget|fees?|expensive|cheap\w*|afford\w*|ballpark|dollars?|aud|usd|price list|price range|starting price|prices)\b|\$/i;
const PRICING_SOFT_RE = /\b(priced?|pricing|charges?)\b/i;

export const PRICING_REPLY = "My pricing depends on the platform and the size of the build, so I don't quote figures here. " +
  "You'll find the full breakdown by platform on my Pricing page, and anything beyond the core build is quoted per item before work starts.";
export const LIMIT_REPLY = "You've asked a lot of questions in a short time, so I've paused the assistant for a little while. " +
  "If you'd like to keep talking, book a call or get in touch directly.";
export const ERROR_REPLY = "Sorry, I couldn't answer that just now. Please try again, or get in touch directly.";

export const SYSTEM_PROMPT = `You are the FAQ assistant on the website of Nicole Steinmetz, a web design studio. You reply in first person as Nicole ("I", "my").

Rules:
- Answer ONLY from the numbered FAQs provided. Never invent services, timelines, policies, prices or details that are not in them.
- Never state a price, rate or dollar figure.
- Reply in 1 to 3 short sentences (never 4 or more), never more than 120 words.
- Never say whether I do or don't offer something unless the FAQs state it.
- Voice: warm, direct, plain. Australian English spelling (e.g. organise, colour, optimise). No exclamation marks. No emoji. No markdown, no lists, no headings.
- Do not mention "the FAQs" or the numbers; just answer naturally as Nicole.

Output format. The FIRST line must be exactly one of these tags, then a newline, then your reply:
USED: <FAQ numbers your reply is based on, comma separated, at most 2, most relevant first>
NONE  (the question relates to my business, websites, digital work or working with me, but the FAQs provided don't answer it, e.g. a service not mentioned in them; say plainly that I don't have that covered here and suggest booking a call or getting in touch so we can talk it through. Do not guess whether I offer it)
OFFTOPIC  (the question has nothing to do with my studio, websites or working with me, e.g. trivia, homework, coding help, other companies; politely decline in one or two sentences and say I can help with questions about working together on a website)
CHAT  (ONLY a bare greeting or thanks with no question in it; reply briefly and invite a question about working together. If the message asks anything and your reply uses an FAQ, use USED instead)`;

const STOP = new Set(`a an and are as at be but by can could do does did for from had has have how i i'm if in into is it
it's its me my of on or our so than that the their them then there these they this to us was we were what when
where which who why will with would you your you're yours about any also just get got want need like should
please tell know am been being much many really very more some`.split(/\s+/));

const SYNONYMS = {
  timeline: "long take", timeframe: "long take", weeks: "long take", quick: "long take", fast: "long take",
  quote: "quote", estimate: "quote", website: "site", web: "site", webpage: "page",
  ecommerce: "shopify selling", shop: "shopify selling", store: "shopify selling", sell: "selling",
  wix: "platform", webflow: "platform", wordpress: "wordpress platform", squarespace: "squarespace platform",
  revisions: "rounds changes", revision: "rounds changes", edits: "changes", maintain: "maintenance support",
  logo: "branding logo", brand: "branding", photos: "photography images", copywriting: "copy",
  google: "seo", ranking: "seo ranking", deposit: "payment terms", pay: "payment", invoice: "payment",
  redesign: "redesign existing", migrate: "move", migration: "move", transfer: "transferring move",
  overseas: "outside australia", international: "outside australia", ai: "ai",
};

const norm = (text) => ((text || "").toLowerCase().replace(/[\u2019']/g, "").match(/[a-z0-9]+/g) || []).join(" ");

function stem(w) {
  for (const suf of ["ing", "ies", "ed", "es", "s"]) {
    if (w.length > 4 && w.endsWith(suf)) return w.slice(0, -suf.length) + (suf === "ies" ? "y" : "");
  }
  return w;
}

export function tokens(text) {
  const words = (text || "").toLowerCase().replace(/\u2019/g, "'").match(/[a-z0-9']+/g) || [];
  const out = [];
  for (let w of words) {
    w = w.replace(/^'+|'+$/g, "");
    if (!w || STOP.has(w)) continue;
    out.push(stem(w));
    if (Object.prototype.hasOwnProperty.call(SYNONYMS, w)) out.push(...SYNONYMS[w].split(" ").map(stem));
  }
  return out;
}

function counter(list) {
  const m = new Map();
  for (const t of list) m.set(t, (m.get(t) || 0) + 1);
  return m;
}
const times = (arr, n) => [].concat(...Array(n).fill(arr));

export class FaqIndex {
  constructor(faqs) {
    this.faqs = faqs;
    this.bySlug = Object.fromEntries(faqs.map((f) => [f.slug, f]));
    this.aliases = faqs.map((f) => [f.question, ...(f.aliases || [])].map(norm));
    this.docs = faqs.map((f) => {
      const m = counter([
        ...times(tokens(f.question), 3),
        ...times(tokens((f.aliases || []).join(" ")), 2),
        ...tokens(f.category.replace(/-/g, " ")),
        ...tokens(f.answer),
      ]);
      m.len = [...m.values()].reduce((a, b) => a + b, 0);
      return m;
    });
    this.avg = this.docs.reduce((a, d) => a + d.len, 0) / this.docs.length;
    const df = new Map();
    for (const d of this.docs) for (const t of d.keys()) df.set(t, (df.get(t) || 0) + 1);
    const n = faqs.length;
    this.idf = new Map([...df].map(([t, c]) => [t, Math.log(1 + (n - c + 0.5) / (c + 0.5))]));
  }

  score(q, d) {
    let s = 0;
    for (const t of new Set(q)) {
      const tf = d.get(t) || 0;
      if (tf) s += this.idf.get(t) * tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * d.len / this.avg));
    }
    return s;
  }

  search(query, context = "", k = 3) {
    const q = tokens(query), c = tokens(context), nq = ` ${norm(query)} `;
    const exact = (i) => this.aliases[i].some((a) => a && (nq.trim() === a || (a.includes(" ") && nq.includes(` ${a} `))));
    return this.faqs
      .map((f, i) => [f, this.score(q, this.docs[i]) + 0.35 * this.score(c, this.docs[i]) + (exact(i) ? 6 : 0)])
      .filter((x) => x[1] > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .filter((x) => x[1] >= 1.5);
  }
}

export function isPricing(message, top) {
  if (PRICING_STRONG_RE.test(message)) return true;
  if (!PRICING_SOFT_RE.test(message)) return false;
  return !(top.length && PRICING_POLICY_SLUGS.has(top[0][0].slug) && top[0][1] >= 4);
}

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D\u2B50\u2B06\u2194-\u21AA]/gu;
export const clean = (t) => t.replace(/!/g, ".").replace(EMOJI_RE, "");

export const faqLink = (f) => ({ label: "Read the full answer", title: f.question, url: f.url });

export function buildPrompt(message, history, faqs) {
  const recent = history.slice(-6).map((t) => `${t.role[0].toUpperCase()}${t.role.slice(1)}: ${t.content.slice(0, 600)}`).join("\n");
  const blocks = faqs.map((f, i) => `[${i + 1}] Q: ${f.question}\nA: ${f.answer}`).join("\n\n") || "(no matching FAQs)";
  return `Recent conversation:\n${recent || "(none)"}\n\nFAQs:\n${blocks}\n\nVisitor question: ${message}`;
}

export const TAG_RE = /^\s*(USED:\s*[\d,\s]*|NONE|OFFTOPIC|CHAT)\s*$/i;

export function metaFor(tag, faqs) {
  const t = tag.trim().toUpperCase();
  if (t.startsWith("USED")) {
    const picked = (t.match(/\d+/g) || []).map(Number).filter((n) => n > 0 && n <= faqs.length).map((n) => faqs[n - 1]).slice(0, 2);
    if (picked.length) return { type: "meta", kind: "answer", links: picked.map(faqLink), actions: [] };
    return { type: "meta", kind: "fallback", links: [], actions: CONTACT_ACTIONS };
  }
  if (t === "NONE") return { type: "meta", kind: "fallback", links: [], actions: CONTACT_ACTIONS };
  return { type: "meta", kind: t === "OFFTOPIC" ? "offtopic" : "chat", links: [], actions: [] };
}

const CHAT_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export function validate(body) {
  if (!body || typeof body.message !== "string") return null;
  const message = body.message.trim();
  if (!message || message.length > 500) return null;
  const history = Array.isArray(body.history) ? body.history : [];
  if (history.length > 12) return null;
  const clean = history.filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
    .map((t) => ({ role: t.role, content: t.content.slice(0, 1500) }));
  const chatId = typeof body.chat_id === "string" && CHAT_ID_RE.test(body.chat_id) ? body.chat_id : "";
  return { message, history: clean, chatId };
}

export function allowedOrigin(origin) {
  if (!origin) return false;
  if (origin === "https://www.nicolesteinmetz.com" || origin === "https://nicolesteinmetz.com") return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)+pages\.dev$/.test(origin)) return true;
  return false;
}
