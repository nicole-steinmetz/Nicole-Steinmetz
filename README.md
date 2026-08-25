# nicolesteinmetz.com

Home page, built from Figma `zbpByfLeFxuP1uHNkh0ykX` → node `1:2`.

## Getting it running

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Any static server works. There's no build step.

**It will look broken until you export the assets.** See `ASSETS.md` — that's the first job.

```bash
# after the exports are in place
bash tools/optimise-images.sh
```

## Deploying

Cloudflare Pages → Create project → Connect to Git, or drag this folder into Direct Upload.

- Build command: *(leave empty)*
- Build output directory: `/`

`_headers` and `_redirects` are picked up automatically.

---

## Blocking before launch

**1. Ten routes don't exist yet — parked on home.** Home is the only signed-off page (Figma `1:2`). Pricing, FAQs and Contact frames are still being finalised; there is no platform-decider, get-a-quote or start-a-project frame. Search `TODO(link)`.

| Route | Linked from |
|---|---|
| `/pricing/` + five sub-routes | Nav, footer column 1 |
| `/faqs/` | Nav, footer column 2 |
| `/platform-decider/` | Learn more, Compare platforms |
| `/get-a-quote/`, `/start-a-project/` | The two panels |

That's **10 unique hrefs, 12 `<a>` tags** (the old "eight dead links" count dropped the two panels). They 302 to `/` via `_redirects` until those Figma frames are signed off. Do not build stub pages. `python3 -m http.server` ignores `_redirects`, so local preview still 404s — Cloudflare Pages will not.

**2. Two panels are pictures of a UI, not a UI.** `get a quote` and `Start a Project` are flat @3x PNG exports in Figma. They look interactive, they aren't. On mobile the text inside them will be unreadable, and none of it is selectable, searchable or accessible to a screen reader.

You said you wanted these as real working tools. That's a genuine build, not a styling pass — the quote calculator needs its pricing logic defined before a line of it is written, and `Knee Coal - Website Pricing 2026.md` and `Cloudflare_Build_Rate_Card_2026.pdf` in the parent folder are the obvious source. They're currently marked `data-static-panel` so they're easy to find. Treat as phase two.

**3. The Figma footer is mid-redesign.** Group `381:726` has the three link columns but is missing the column-1 heading, the logo, the divider, the Squarespace badges and the copyright line — all of which exist in the Coming Soon frame (`364:1278`). I carried them across. Confirm that's what you intended.

**4. Fonts.** Helvetica Neue Bold isn't web-licensable and is mapped to Inter. Inter and IBM Plex Mono load from Google's CDN and should be self-hosted. Detail in `ASSETS.md` → Fonts.

**5. Check the client logo `alt` text.** I read seven brand names off a 900px screenshot. Slots 2 and 6 are guesses.

## Worth doing, not blocking

- `favicon.svg`, `apple-touch-icon.png`, `og-image.jpg` are referenced but absent
- Add `sitemap.xml` and `robots.txt` once there's more than one page
- Mobile layout below 1040px is an interpretation — no mobile frame exists in Figma
- Two typos were fixed against the Figma source: **NETIFY** → Netlify, and the footer heading order. The "All rights and so many wrongs reserved" line is intentional and was left alone.

## Conventions

`CLAUDE.md`. Read it before editing.
