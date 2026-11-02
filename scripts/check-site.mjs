import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const TITLE = "Website Tools Compared: Squarespace, Shopify & Hosting | Nicole Steinmetz";
const DESCRIPTION = "Compare Squarespace, Shopify and custom website hosting, plus the AI and design tools I use. A practical guide for Australian small businesses.";

const fail = (message) => failures.push(message);

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");

const decode = (value) => value
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&nbsp;/g, " ")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const read = (rel) => readFileSync(join(root, rel), "utf8");

function walk(node, visit) {
  if (Array.isArray(node)) {
    node.forEach((item) => walk(item, visit));
    return;
  }
  if (node && typeof node === "object") {
    visit(node);
    Object.values(node).forEach((value) => walk(value, visit));
  }
}

function resolveInternal(href, fromFile) {
  if (/^(mailto:|tel:|https?:)/i.test(href)) return;
  const [pathPart, hash] = href.split("#");
  const path = pathPart || "";
  let file = fromFile;
  if (path && path !== "") {
    if (!path.startsWith("/")) {
      fail(`${fromFile} has a relative link that is not root-absolute: ${href}`);
      return;
    }
    const clean = path.replace(/^\//, "").replace(/\/$/, "");
    const candidates = clean
      ? [join(root, clean, "index.html"), join(root, `${clean}.html`), join(root, clean)]
      : [join(root, "index.html")];
    file = candidates.find((candidate) => existsSync(candidate));
    if (!file) {
      fail(`${fromFile} links to ${href}, which is not a file in the repo`);
      return;
    }
  } else {
    file = join(root, fromFile);
  }
  if (!hash) return;
  const doc = stripComments(readFileSync(file, "utf8"));
  const id = new RegExp(`\\bid=["']${escapeRe(hash)}["']`);
  if (!id.test(doc)) {
    fail(`${href} does not match an id in ${file.replace(root + "/", "")}`);
  }
}

const toolsPath = "tools/index.html";
if (!existsSync(join(root, toolsPath))) fail("tools/index.html does not exist");

const raw = existsSync(join(root, toolsPath)) ? read(toolsPath) : "";
const html = stripComments(raw);

if (raw) {
  const h1s = html.match(/<h1\b/gi) || [];
  if (h1s.length !== 1) fail(`/tools/ has ${h1s.length} h1 elements; expected 1`);

  const titleMatch = raw.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decode(titleMatch[1].trim()) : "";
  if (title !== TITLE) fail(`title tag is not the v3 title.\n  got: ${title}`);
  // v3's title is 73 characters. The brief also asks for under 70.
  // Shortening it would break "exactly as in v3", so the check locks
  // that string and rejects anything longer than it.
  if (title.length > TITLE.length) fail(`title is ${title.length} characters`);
  if (title.length >= 70) {
    console.log(`note: v3 title is ${title.length} characters; the brief's cap is 70. Left verbatim.`);
  }

  const descMatch = raw.match(/<meta name="description" content="([^"]*)"/i);
  const description = descMatch ? decode(descMatch[1]) : "";
  if (description !== DESCRIPTION) fail("meta description is not the v3 description");
  if (description.length >= 160) fail(`meta description is ${description.length} characters`);

  if (!/rel="canonical" href="https:\/\/www\.nicolesteinmetz\.com\/tools\/"/.test(raw)) {
    fail("canonical is not https://www.nicolesteinmetz.com/tools/");
  }

  const blocks = [...raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (blocks.length !== 1) fail(`expected one JSON-LD block, found ${blocks.length}`);
  blocks.forEach((block, index) => {
    try {
      const data = JSON.parse(block[1]);
      walk(data, (node) => {
        const type = node["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.includes("FAQPage")) fail(`JSON-LD block ${index + 1} contains FAQPage`);
      });
    } catch (error) {
      fail(`JSON-LD block ${index + 1} did not parse: ${error.message}`);
    }
  });
  if (html.includes("FAQPage")) fail("/tools/ mentions FAQPage outside a comment");

  if (/\$\d/.test(html)) fail("/tools/ contains a dollar amount");
  ["Framer", "Care Plan", "Markup.io"].forEach((term) => {
    if (html.includes(term)) fail(`/tools/ contains ${term}`);
  });
  if (html.includes("[CONFIRM") || html.includes("[NIC")) {
    fail("/tools/ has [CONFIRM] or [NIC] outside an HTML comment");
  }

  const links = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((match) => match[1]);
  links.forEach((href) => resolveInternal(href, toolsPath));

  if (!/<table\b/i.test(html)) fail("/tools/ has no table");
  if (!/<caption\b/i.test(html)) fail("/tools/ table has no caption");
  const headings = [...html.matchAll(/<th\b[^>]*>/gi)];
  if (!headings.length) fail("/tools/ table has no th");
  headings.forEach((heading) => {
    if (!/\bscope\s*=\s*["'](?:col|row|colgroup|rowgroup)["']/i.test(heading[0])) {
      fail(`th is missing scope: ${heading[0]}`);
    }
  });

  const nav = html.match(/<nav class="nav"[\s\S]*?<\/nav>/);
  if (nav && nav[0].includes('href="/tools/"')) fail("/tools/ nav still links to /tools/");
  const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/);
  if (footer && footer[0].includes('href="/tools/"')) fail("/tools/ footer still links to /tools/");
}

const sitemap = existsSync(join(root, "sitemap.xml")) ? read("sitemap.xml") : "";
if (!sitemap.includes("https://www.nicolesteinmetz.com/tools/")) {
  fail("sitemap.xml does not contain /tools/");
}
if (!sitemap.includes("<loc>https://www.nicolesteinmetz.com/tools/</loc><lastmod>2026-10-26</lastmod>")) {
  fail("sitemap.xml /tools/ entry is missing lastmod 2026-10-26");
}

const home = existsSync(join(root, "index.html")) ? read("index.html") : "";
if (!home.includes('class="how__tools-arrow" href="/tools/"')) {
  fail("home tools card arrow does not link to /tools/");
}
const homeNav = home.match(/<nav class="nav"[\s\S]*?<\/nav>/);
if (homeNav && homeNav[0].includes('href="/tools/"')) {
  fail("home nav still links to /tools/");
}

const oldQuoteWording = [
  "Send this quote",
  "Nicole gets this as a table and replies to the email address below",
  "look over this and reply to the email address below",
];

function sourceFiles(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".wrangler" || entry.name === ".cursor") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, found);
    else if (/\.(html|js|mjs|css)$/.test(entry.name)) found.push(full);
  }
  return found;
}

sourceFiles(root).forEach((file) => {
  if (file.endsWith(`${join("scripts", "check-site.mjs")}`)) return;
  const text = readFileSync(file, "utf8");
  oldQuoteWording.forEach((phrase) => {
    if (text.includes(phrase)) {
      fail(`${file.slice(root.length + 1)} still has old quote wording: ${phrase}`);
    }
  });
});

if (failures.length) {
  console.error(`npm run check failed (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("npm run check passed");
