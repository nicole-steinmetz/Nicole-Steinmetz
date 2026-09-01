# nicolesteinmetz.com — project conventions

Read this before changing anything. It exists so Cursor doesn't reinvent decisions that were already made deliberately.

## What this is

The marketing site for Nicole Steinmetz, a web design studio (formally Knee Coal). Home is Figma `zbpByfLeFxuP1uHNkh0ykX` node `1:2`. Pricing overview is node `370:1574` (`/pricing/`). Squarespace pricing is node `1:68` (`/pricing/squarespace/`). Shopify pricing is node `1:117` (`/pricing/shopify/`). Cloudflare pricing is node `288:4` (`/pricing/cloudflare/`). Netlify pricing is node `153:203` (`/pricing/netlify/`).

## Stack

Plain HTML, CSS and (if ever needed) vanilla JS. **No framework, no build step, no `node_modules`, no Tailwind.** Deploys to Cloudflare Pages by pointing it at this directory.

This is a deliberate choice, not an oversight. It's a static marketing page. Adding a framework would add a build pipeline, a dependency tree and a class of bugs, in exchange for nothing. If a genuine need appears — a CMS, shared layouts across five-plus pages, real server logic — revisit it then and say why in the commit.

## Files

```
index.html                     home
pricing/index.html             pricing overview + animated platform profiles
pricing/squarespace/index.html Squarespace pricing (hero, intro, working quote builder)
pricing/shopify/index.html     Shopify pricing (hero, intro, working quote builder)
pricing/cloudflare/index.html  Cloudflare pricing (hero, intro, working quote builder)
pricing/netlify/index.html     Netlify pricing (hero, intro, working quote builder)
css/tokens.css                 design tokens — the only place colours, type and spacing are defined
css/styles.css                 shared + home
css/pricing.css                pricing page only
js/                            vanilla JS — Tools, Quote and Project cards, hero title, Trusted By marquee, platform profiles, Squarespace + Shopify + Cloudflare + Netlify quoters
assets/img/                    raster (hero, footer, UI panels)
assets/svg/                    logo, icons, arrows
assets/logos/                  Trusted By client marks
tools/                         image optimisation script
_headers                       Cloudflare security + cache headers
_redirects                     Cloudflare redirects
```

## Rules

**Tokens or nothing.** No raw hex, no magic font sizes, no ad-hoc spacing in `styles.css`. If a value isn't in `tokens.css`, either add it there or you're about to make the system inconsistent. Every token traces back to a measured Figma value.

**Flow layout, not absolute positioning.** Figma positions everything absolutely; this rebuild does not. Section spacing carries the original Figma y-coordinates in comments — `/* pillar body bottom 1358 → 1481 */` — so any drift can be traced to source. Keep that habit when you add sections.

**Assets keep their designed geometry.** Every `<img>` has explicit `width` and `height` to stop layout shift. The Trusted By row deliberately does *not* normalise logo heights — they're unlike marks and one global height distorts them. Don't "tidy" that.

**Australian English.** Optimise, colour, organisation, licence (noun) / license (verb).

**Semantic HTML.** Real `<nav>`, `<main>`, `<footer>`, heading order that doesn't skip levels, `alt` on every meaningful image and `alt=""` plus `aria-hidden` on decorative ones. The skip link and `:focus-visible` styles are load-bearing — don't strip them.

**Mobile below 1040px is invented.** No mobile frame exists in Figma. Everything in the two media queries is an interpretation and is explicitly flagged as needing review. Don't treat it as signed off.

## Things marked TODO

Search for `TODO(link)` — those are hrefs pointing at routes that don't exist yet. The three cards (Tools, Quote, Start a Project) are live HTML; they are display-only loops, not working tools. Tracked in `README.md`.

## Before you commit

- Every `<img>` has `width`, `height` and meaningful `alt`
- No hardcoded colours outside `tokens.css`
- Checked at 1440, 1024, 768 and 390
- Keyboard-only pass: tab through, everything reachable, focus always visible
