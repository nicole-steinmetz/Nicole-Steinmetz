# Asset export manifest

Exported from Figma into `assets/`. Raster sources live in gitignored `assets/img/_source/`; the optimiser writes the variants `index.html` references. Re-run `bash tools/optimise-images.sh` after any re-export.

Figma file: `zbpByfLeFxuP1uHNkh0ykX` → Home (`1:2`)

---

## Raster → `assets/img/`

| Figma layer | Node | Save as | Export |
|---|---|---|---|
| `nicole-steinmetz-01 1` | `54:4` | `hero.png` | PNG @2x (2880×1406) |
| `nicole-steinmetz-web-design-perth-australia 1` | `370:1556` | `footer-bg.png` | PNG @2x |
| `The Tools@3x 1` | `380:47` | `panel-the-tools.png` | PNG @2x (772×754) — exported; the live card does not reference it |
| `get a quote@3x 1` | `380:45` | `panel-get-a-quote.png` | PNG @2x (1266×912) — exported; the live card does not reference it |
| `Start a Project@3x 1` | `380:46` | `panel-start-a-project.png` | PNG @2x (1270×914) — exported; the live card does not reference it |
| `arrow-02@3x 1` | `381:227` | `arrow-02.png` | PNG @3x |
| Squarespace badge strip | `331:924` (Home footer; Coming Soon `364:1422` is gone) | `squarespace-badges.png` | PNG @3x |

`footer-bg` source is already in the repo — `assets/img/_source/footer-bg.jpg` is the same 1.7 MB file as `Temp I Nicole Steinmetz/nicole-steinmetz-web-design-perth-australia.jpeg` in Drive (3146×1312). Figma's placed crop (`370:1556`, 1553×647) is that image; the optimiser uses the Drive original.

**The Tools card is live HTML** (`id="tools-card"`). `panel-the-tools.png` was still exported from `380:47` as requested, but the page does not reference it.

**The Get a Quote card is live HTML** (`id="quote-card"`). `panel-get-a-quote.png` was still exported from `380:45`, but the page does not reference it.

**The Start a Project card is live HTML** (`id="proj-card"`). `panel-start-a-project.png` was still exported from `380:46`, but the page does not reference it.

Coming Soon node `364:1422` is gone from the file. The Squarespace badge strip on Home is `331:924` (`squarespace+kneecoal+white+logo 1` in the footer group). That is what was exported.

## Vector → `assets/svg/`

| Figma layer | Node | Save as | Notes |
|---|---|---|---|
| Logo lettering | `1:10`–`1:30` (21 paths; `1:21` is already in that range) | `logo-white.svg` | **Select all of them together, group, export as one SVG.** They are loose paths in Figma — exporting individually gives you files that will not assemble correctly. |
| `Group 12` (arrow in circle) | `28:288` | `arrow-circle-white.svg` | Used on both CTA pills |
| `Layer_1` | `16:180` | `icon-design-build.svg` | 45×45 |
| `Layer_1` | `21:206` | `icon-platform.svg` | 43×47 — note the odd ratio, don't square it |
| `Layer_1` | `21:211` | `icon-no-templates.svg` | 45×45 |

## Client logos → `assets/logos/`

Left to right as they appear in the Trusted By row. **Each keeps its own dimensions** — the CSS deliberately does not normalise heights, because these are unlike marks and forcing one height distorts them.

| Slot | Node | Save as | Size |
|---|---|---|---|
| 1 | `126:79` | `logo-1.png` | 154×49 |
| 2 | `153:93` | `logo-2.png` | 160×78 |
| 3 | `153:92` | `logo-3.png` | 109×61 |
| 4 | `34:536` | `logo-4.svg` | 93×51 (already vector) |
| 5 | `34:553` | `logo-5.png` | 167×64 |
| 6 | `153:91` | `logo-6.png` | 59×62 |
| 7 | `153:90` | `logo-7.png` | 173×59 |

Export the PNGs @3x. Slot 1 alt is **Hoodburger Family Restaurants** (read off the mark). Slot 2 is **Rose & Crown** (verified in Figma). Slot 6 is a "7" mark with no brand lettering — `TODO(alt)` in `index.html` until Nic confirms the client name.

`hero-2880.webp` is ~571 KB at quality 75 — over the optimiser’s ~300 KB sanity check. A 2880 landscape illustration will not compress under that without looking crushed; leave it unless you want a smaller `srcset` top end.

## Still needed, not in Figma

- `favicon.svg`, `apple-touch-icon.png` (180×180)
- `assets/img/og-image.jpg` — 1200×630 social card

---

## Fonts

The design uses three families. Two are free, one is a problem.

**Inter** and **IBM Plex Mono** — both free, both on Google Fonts, currently loaded from the Google CDN. Before launch, self-host them: it removes a third-party connection, kills the render-blocking request, and is one less thing that can break. Grab them from [fontsource](https://fontsource.org), drop the woff2 files in `assets/fonts/`, and swap the `<link>` in `index.html` for an `@font-face` block with `font-display: swap`.

**Helvetica Neue Bold** is used on the nav pills, both CTA buttons, and the CONTACT footer heading. It is not web-licensable without paying for it, and at 16–20px bold it is visually near-indistinguishable from Inter Bold. `tokens.css` maps it to Inter on purpose. If you want it kept, that's a licence purchase — worth knowing it's a real cost for a difference almost nobody will see.

Practical note: the design is already using Inter Bold and Helvetica Neue Bold at the same size and weight in different places. Collapsing to one is a simplification, not a compromise.
