# nicolesteinmetz.com

Built from Figma `zbpByfLeFxuP1uHNkh0ykX`. Home is node `1:2`. Inner pages: Contact `318:476`, FAQs `381:178`, pricing frames listed in `ASSETS.md`.

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

`_headers` and `_redirects` are picked up automatically.

---

## Blocking before launch

**1. Three routes still have no Figma frame — parked on home.** Contact, FAQs and the six pricing pages are live. Search `TODO(link)` for what is still 302ing.

| Route | Linked from |
|---|---|
| `/platform-decider/` | Learn more, Compare platforms |
| `/get-a-quote/`, `/start-a-project/` | The two Home panels |

They 302 to `/` via `_redirects` until those frames exist. Do not invent them. `python3 -m http.server` ignores `_redirects`, so local preview still 404s — Cloudflare Pages will not.

Pricing pages ship the Figma empty estimate band. FAQs ship the search UI and three empty tiles — no questions until Figma has them.

**2. The three cards are live, but they are still display-only.** They look like tools; they are not working tools yet. You said you wanted these as real working tools. That's a genuine build, not a styling pass — the quote calculator needs its pricing logic defined before a line of it is written, and `Knee Coal - Website Pricing 2026.md` and `Cloudflare_Build_Rate_Card_2026.pdf` in the parent folder are the obvious source. Treat the real tools as phase two.

**The Tools card is live.** Rebuilt from `Nicole___Tool_Stack_Card_v5.html`. Search `id="tools-card"`.

**The Get a Quote card is live.** Rebuilt from `Nicole___Quote_Card_v2.html` — display-only: the loop ticks line items and counts the total, rows are not clickable. Search `id="quote-card"`.

**The Start a Project card is live.** Rebuilt from `Nicole___Start_Project_Card_v2.html` — display-only: the loop types a client name and ticks the brief; fields are not clickable. Search `id="proj-card"`.

**3. The Figma footer is mid-redesign.** Group `381:726` has the three link columns but is missing the column-1 heading, the logo, the divider, the Squarespace badges and the copyright line — all of which exist in the Coming Soon frame (`364:1278`). I carried them across. Confirm that's what you intended.

**4. Fonts.** Helvetica Neue Bold isn't web-licensable and is mapped to Inter. Inter and IBM Plex Mono load from Google's CDN and should be self-hosted. Detail in `ASSETS.md` → Fonts.

**5. Slot 6 logo `alt` still needs Nic.** Slot 1 is **Hoodburger Family Restaurants** (read off the mark). Slot 2 is **Rose & Crown**. Slot 6 is a "7" mark with no brand lettering — `TODO(alt)` in `index.html`.

## Worth doing, not blocking

- `favicon.svg`, `apple-touch-icon.png`, `og-image.jpg` are referenced but absent
- Mobile layout below 1040px is an interpretation — no mobile frame exists in Figma
- Two typos were fixed against the Figma source: **NETIFY** → Netlify, and the footer heading order. The "All rights and so many wrongs reserved" line is intentional and was left alone.

## Conventions

`CLAUDE.md`. Read it before editing.
