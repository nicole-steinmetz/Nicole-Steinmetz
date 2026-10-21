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

1. Onboard `nicolesteinmetz.com` for [Email Sending](https://developers.cloudflare.com/email-service/), so `quotes@nicolesteinmetz.com` is a valid from-address.
2. On the Pages project, add a **Send Email** binding named `EMAIL` with destination address `nicole@kneecoal.com`.

Until both are in place, the form tells the visitor to email directly.

## FAQ most-read counts

`/faqs/` shows three seeded questions until a KV namespace is bound. The page still works without it.

1. Cloudflare dashboard → Workers & Pages → KV → Create a namespace (for example `faq-views`).
2. Pages project → Settings → Bindings → Add → KV namespace. Variable name `FAQ_VIEWS`. Add it for Production, then redeploy.

`POST /api/faq-view` increments an allowlisted question. `GET /api/faq-top` returns the top three. If a question is added or renamed, update `functions/_lib/faq-slugs.js` to match its `id`.

---

## Blocking before launch

**1. One inner route is still parked on home.** Home (`1:2`), Pricing (`370:1574`, `/pricing/`), Squarespace pricing (`1:68`, `/pricing/squarespace/`), Shopify pricing (`1:117`, `/pricing/shopify/`), Cloudflare pricing (`288:4`, `/pricing/cloudflare/`), Netlify pricing (`153:203`, `/pricing/netlify/`), Vercel pricing (`153:154`, `/pricing/vercel/`), Contact (`318:476`, `/contact/`), How a build runs (`/process/`) and FAQs (`/faqs/`) are live. The Privacy Policy is not. Search `TODO(link)`.

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
| `/process/` | Live — How a build runs |
| `/faqs/` | Live — search, most-read cards, FAQPage schema (`Nicole — FAQ Page v3.html`) |
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
