/* Sends the FAQ chat checks to the live endpoint and compares each reply
   with functions/_lib/faqs.json. Usage:
     node scripts/check-faq-chat.mjs
     FAQ_CHAT_URL=https://www.nicolesteinmetz.com/api/chat node scripts/check-faq-chat.mjs
*/

import faqs from "../functions/_lib/faqs.json" with { type: "json" };

const ENDPOINT = process.env.FAQ_CHAT_URL || "https://www.nicolesteinmetz.com/api/chat";
const ORIGIN = process.env.FAQ_CHAT_ORIGIN || "https://www.nicolesteinmetz.com";
const ERROR_REPLY = "Sorry, I couldn't answer that just now. Please try again, or get in touch directly.";
const NO_MATCH_REPLY = "I don't have that in my FAQs.";
const bySlug = Object.fromEntries(faqs.map((faq) => [faq.slug, faq]));

const KNOWN = [
  {
    q: "How long does a build take?",
    slug: "how-long-does-a-build-take",
    phrase: "Anywhere from one to six months"
  },
  {
    q: "What's the process start to finish?",
    slug: "whats-the-process-start-to-finish",
    phrase: "Let's chat"
  },
  {
    q: "What platforms do you work on?",
    slug: "which-platform-is-right-for-my-project",
    phrase: "Squarespace for simple"
  },
  {
    q: "How much does a website cost?",
    slug: "what-does-a-project-cost",
    pricing: true
  },
  {
    q: "Do I own my site when it's finished?",
    slug: "who-owns-the-site-once-its-finished",
    phrase: "final payment clears"
  }
];

const UNKNOWN = "Can you recommend a good sourdough starter recipe?";

function chatId(label) {
  return ("check" + label + "00000000").replace(/[^A-Za-z0-9-]/g, "").slice(0, 32);
}

async function post(message, history, label) {
  const payload = { message, history, chat_id: chatId(label) };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify(payload)
  });
  const raw = await res.text();
  const events = [];
  for (const block of raw.split("\n\n")) {
    const line = block.split("\n").find((item) => item.startsWith("data:"));
    if (!line) continue;
    try { events.push(JSON.parse(line.slice(5).trim())); } catch { /* keep going */ }
  }
  const text = events.filter((event) => event.type === "delta" || event.type === "error").map((event) => event.text || "").join("");
  return { payload, status: res.status, events, text };
}

function source(slug) {
  return bySlug[slug];
}

let failed = 0;
function report(ok, title) {
  console.log(ok ? "PASS" : "FAIL", title);
  if (!ok) failed += 1;
}

console.log("endpoint", ENDPOINT);

for (const item of KNOWN) {
  const faq = source(item.slug);
  const reply = await post(item.q, [], item.slug);
  console.log("\nQ:", item.q);
  console.log("HTTP", reply.status);
  console.log("Answer:", reply.text);
  console.log("FAQ source (" + faq.slug + "):", faq.answer);
  const technical = reply.text.includes(ERROR_REPLY);
  const consistent = item.pricing
    ? /platform/i.test(reply.text) && /pricing page/i.test(reply.text) && !/\$\s?\d/.test(reply.text) && !/\$\s?\d/.test(faq.answer)
    : reply.text.includes(item.phrase) && faq.answer.includes(item.phrase);
  report(reply.status === 200 && !technical && consistent, item.q);
}

const unknown = await post(UNKNOWN, [], "unknown");
console.log("\nQ:", UNKNOWN);
console.log("HTTP", unknown.status);
console.log("Answer:", unknown.text);
report(unknown.status === 200 && unknown.text === NO_MATCH_REPLY && !unknown.text.includes(ERROR_REPLY), "unknown question");

const first = await post("How much does a website cost?", [], "turn1");
const history = [
  { role: "user", content: "How much does a website cost?" },
  { role: "assistant", content: first.text }
];
const secondPayload = {
  message: "Charged in what currency?",
  history,
  chat_id: chatId("turn2")
};
console.log("\nSecond request payload:");
console.log(JSON.stringify(secondPayload, null, 2));
const second = await post(secondPayload.message, secondPayload.history, "turn2");
const currencyFaq = bySlug["do-you-work-with-clients-outside-australia"];
console.log("HTTP", second.status);
console.log("Answer:", second.text);
console.log("FAQ sentence:", currencyFaq.answer.includes("Pricing is in AUD") ? "Pricing is in AUD." : "(missing from source)");
const historyOk = secondPayload.history[0].content === "How much does a website cost?"
  && secondPayload.history[1].content === first.text
  && first.text.length > 0;
const statesAud = second.text.includes("AUD") && currencyFaq.answer.includes("Pricing is in AUD");
const invents = /\b(USD|EUR|GBP|pounds)\b/.test(second.text);
report(historyOk, "second request includes the first question and its answer");
report(second.status === 200 && statesAud && !invents && !second.text.includes(ERROR_REPLY), "currency is the FAQ's AUD, not a guess");

if (failed) {
  console.log("\n" + failed + " check(s) failed");
  process.exit(1);
}
console.log("\nAll checks passed");
