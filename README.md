# nicolesteinmetz.com

Home page, built from Figma `zbpByfLeFxuP1uHNkh0ykX` → node `1:2`.

## Getting it running

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Any static server works. There's no build step.

Assets are exported (see `ASSETS.md`). After a re-export from Figma:

```bash
# after the exports are in place
bash tools/optimise-images.sh
```

## Deploying

Cloudflare Pages → Create project → Connect to Git, or drag this folder into Direct Upload.

- Build command: *(leave empty)*
- Build output directory: `/`

`_headers` and `_redirects` are picked up automatically. `functions/` is picked up as Pages Functions.

## Quote emails

Each quote builder (`/pricing/squarespace/`, `/pricing/shopify/`, `/pricing/cloudflare/`, `/pricing/netlify/`, `/pricing/vercel/`) can send its summary to nicole@kneecoal.com. The visitor adds a name and email; `functions/api/quote.js` builds one HTML table (who they are, then every line, the total, and anything quoted separately) and sets reply-to to their address.

A static page cannot send mail, so this is a Pages Function rather than more front-end code. It does nothing until Cloudflare can send from this domain:

1. Onboard `kneecoal.com` for [Email Sending](https://developers.cloudflare.com/email-service/), so `quotes@kneecoal.com` is a valid from-address. That address is the sender name only. It is not a mailbox.
2. Create an API token with **Account → Email Sending → Edit**. On the Pages project, add it under **Settings → Variables and secrets** as a secret named `EMAIL_API_TOKEN`. Pages does not list a Send Email binding. Redeploy after saving the secret.

Until both are in place, the form tells the visitor to email directly.

## Project brief

`/start-a-project/` is the guided brief. Answers are saved in the browser as the client goes (`localStorage`, this browser only). **Save and exit** stores an online draft, and **Submit project brief** stores the finished brief.

Online drafts and submissions need a D1 database. Until that binding exists, the page still works and keeps the device copy. It will say plainly if an online save didn’t go through. Email is the same `EMAIL_API_TOKEN` path as quotes. If that secret isn’t set, the brief is still stored and the page does not claim an email was sent.

### D1

1. Cloudflare dashboard → **Storage & databases → D1 → Create**. Name it `briefs`.
2. Open the database console and run `migrations/0001_briefs.sql`.
3. Pages project → **Settings → Bindings → Add → D1 database**. Variable name `BRIEFS_DB`. Production, then redeploy.

The resume link is a bearer credential. The database stores only its SHA-256 hash. Drafts expire **30 days** after the last save (`DRAFT_TTL_DAYS` in `js/brief-schema.js`). Set the Pages variable `BRIEF_DRAFT_TTL_DAYS` only if that window should change, and keep the on-page copy in step with it.

Optional rate-limit overrides: `BRIEF_WRITE_RATE_PER_HOUR` (40), `BRIEF_READ_RATE_PER_HOUR` (60), `BRIEF_SUBMIT_RATE_PER_HOUR` (8), `BRIEF_EMAIL_RATE_PER_HOUR` (5). With `RATE_LIMIT_KV` bound, those caps are shared across locations. Without it, each isolate keeps its own count.

### Reading a finished brief

There is no admin site. The studio copy is the email to nicole@kneecoal.com when email is configured. The database is the source of truth either way.

In the D1 console (you’re already authenticated to the Cloudflare account):

```sql
SELECT id, created_at, email_status,
       json_extract(answers_json, '$.businessName') AS business
FROM submissions
ORDER BY created_at DESC
LIMIT 20;
```

```sql
SELECT summary_text FROM submissions WHERE id = 'paste-the-id';
```

That query returns personal information. Run it from the dashboard, not in a shared log. Don’t build a public URL for it.

### Before launch

Budget ranges are intentionally empty. Published prices on the site are line items, not client budget bands, so the form only offers “I haven’t set a budget and need guidance.” Add approved AUD ranges in `BUDGET_RANGES` inside `js/brief-schema.js` before you want clients to pick a figure. There is no privacy policy page yet (`/privacy/` still redirects home), so the brief explains how the answers are used and does not link to one.

---

## FAQ most-read counts

`/faqs/` shows three seeded questions until a KV namespace is bound. The page still works without it.

1. Cloudflare dashboard → Workers & Pages → KV → Create a namespace (for example `faq-views`).
2. Pages project → Settings → Bindings → Add → KV namespace. Variable name `FAQ_VIEWS`. Add it for Production, then redeploy.

`POST /api/faq-view` increments an allowlisted question. `GET /api/faq-top` returns the top three. If a question is added or renamed, update `functions/_lib/faq-slugs.js` to match its `id`.

---

## Blocking before launch

**1. One inner route is still parked on home.** Home (`1:2`), Pricing (`370:1574`, `/pricing/`), Squarespace pricing (`1:68`, `/pricing/squarespace/`), Shopify pricing (`1:117`, `/pricing/shopify/`), Cloudflare pricing (`288:4`, `/pricing/cloudflare/`), Netlify pricing (`153:203`, `/pricing/netlify/`), Vercel pricing (`153:154`, `/pricing/vercel/`), Contact (`318:476`, `/contact/`), How a build runs (`/process/`), FAQs (`/faqs/`) and Tools (`/tools/`) are live. The Privacy Policy is not. Search `TODO(link)`.

| Route | Status |
|---|---|
| `/` | Live — home |
| `/pricing/` | Live — overview + animated platform profiles |
| `/pricing/squarespace/` | Live — hero, intro, working quote builder (`Nicole — Pricing Page (Squarespace) v1_1.html`) |
| `/pricing/shopify/` | Live — hero, intro, working quote builder (`Nicole — Pricing Page (Shopify) v1.html`) |
| `/pricing/cloudflare/` | Live — hero, intro, working quote builder (`Nicole — Pricing Page (Cloudflare) v1.html`) |
| `/pricing/netlify/` | Live — hero, intro, working quote builder (`Nicole — Pricing Page (Netlify) v1.html`) |
| `/pricing/vercel/` | Live — hero, intro, working quote builder (`Nicole — Pricing Page (Vercel) v1.html`) |
| `/contact/` | Live — hero, intro, email / WhatsApp / booking cards |
| `/start-a-project/` | Live — guided project brief |
| `/process/` | Live — How a build runs |
| `/faqs/` | Live — search, most-read cards, FAQPage schema (`Nicole — FAQ Page v3.html`) |
| `/tools/` | Live — what each platform, host and build tool is, and how they fit |
| `/privacy/` | Parked — redirects home |

`python3 -m http.server` ignores `_redirects`, so parked routes 404 locally — Cloudflare Pages will not.

**2. The three home cards are live, but they are still display-only.** They look like tools; they are not working tools yet. The Squarespace, Shopify, Cloudflare, Netlify and Vercel quote builders are the exception — they are real running calculators, transcribed from the `Nicole — Pricing Page` prototypes and Knee Coal Website Pricing 2026. Squarespace: One-Page Website, Markup.io and Adobe Creative Suite are still “quoted separately”. Shopify: Custom Liquid / CSS Section, Complex Products / Bundles / Variants / Metafields, and the SEO Report (Perplexity) are quoted separately (no fixed price in the source docs). Cursor Pro and Figma are optional cost-recovery on Shopify — they are already in the Core Build, unlike Cloudflare. Cloudflare: Blog/News Setup, Popup/Modal, CMS Setup, SEO Report and Advanced Content Modelling are quoted separately; infrastructure setup tracks the chosen baseline ($250 Starter / $350 Standard). Netlify: Blog/News Setup, CMS Setup, Popup/Modal, SEO Report and Advanced Content Modelling are quoted separately (no fixed per-unit price in the rate-card PDF); Cursor Pro and Figma are included on every build.

**The Tools card is live.** Rebuilt from `Nicole___Tool_Stack_Card_v5.html`. Search `id="tools-card"`.

**The Get a Quote card is live.** Rebuilt from `Nicole___Quote_Card_v2.html` — display-only: the loop ticks line items and counts the total, rows are not clickable. Search `id="quote-card"`.

**The Start a Project card is live.** Rebuilt from `Nicole___Start_Project_Card_v2.html` — display-only: the loop types a client name and ticks the brief; fields are not clickable. Search `id="proj-card"`.

**3. The Figma footer is mid-redesign.** Group `381:726` has the three link columns but is missing the column-1 heading, the logo, the divider, the Squarespace badges and the copyright line — all of which exist in the Coming Soon frame (`364:1278`). I carried them across. Confirm that's what you intended.

**4. Fonts.** Helvetica Neue Bold isn't web-licensable and is mapped to Inter. Inter and IBM Plex Mono load from Google's CDN and should be self-hosted. Detail in `ASSETS.md` → Fonts.

**5. Slot 6 logo `alt` still needs Nic.** Slot 1 is **Hoodburger Family Restaurants** (read off the mark). Slot 2 is **Rose & Crown**. Slot 6 is a "7" mark with no brand lettering — `TODO(alt)` in `index.html`.

## Worth doing, not blocking

- `og-image.jpg` is referenced but absent
- `robots.txt` and `sitemap.xml` list the live routes only
- Mobile layout below 1040px is an interpretation — no mobile frame exists in Figma
- Two typos were fixed against the Figma source: **NETIFY** → Netlify, and the footer heading order. The "All rights and so many wrongs reserved" line is intentional and was left alone.

## Conventions

`CLAUDE.md`. Read it before editing.
