[![make.fun bounty: gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01) [![rank](https://make.fun/badge/gta6-cover-art-01/Andia86/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01) [![reward](https://make.fun/badge/gta6-cover-art-01/Andia86/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice Panels — GTA-Style Cover Studio

Vice Panels is an offline cover-art studio that turns your own photos into
a bold, multi-panel GTA-style game cover. Arrange photos across collage
panels, grade the whole composition with a film-style colour treatment,
add poster lettering, a heat meter and a corner badge, then export a
print-ready PNG. Everything runs locally in the browser: no build step,
no network, and your photos never leave your machine.

## Run it

```
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. (Any static file
server pointed at `app/` works just as well.)

## What you can do

- **Six layouts** — Grid Collage (the classic asymmetric GTA arrangement),
  Hero Stack, Nine Grid with the title over the centre, Full Bleed with a
  bottom title band, Tilted Snaps (white-framed snapshots over a dimmed
  backdrop), and Duo.
- **Your photos, your framing** — upload any images, or start from the two
  bundled samples (boulevard and pier). Click a panel to select it, drag
  to reposition its photo, scroll to zoom. Clicking a thumbnail assigns
  that photo to the selected panel.
- **Five grades** — Vice Sunset, Neon Night, Teal & Gold, Golden Hour and
  Ink Poster (posterized, with a halftone dot overlay). Grades are applied
  as a 256-entry colour lookup table over the composed photo area before
  any lettering is drawn, so type always stays crisp.
- **Lettering** — an auto-fitting Anton title in Block, Sunset or Neon
  style, a Pacifico subtitle, and a letter-spaced Bebas Neue tagline.
  Title placement follows the layout.
- **Extras** — a 0–5 gold-star heat meter, an editable rotated badge
  ribbon, film grain and a vignette, each toggleable.
- **Export** — one click downloads a PNG at 1080×1080, 1080×1350 or
  1920×1080, or all three at once. Layouts are computed from fractions of
  the canvas, so every size keeps the same composition.

The editor opens with a finished cover already on the canvas: the grid
layout, the Vice Sunset grade, the bundled samples in place, the title
"NEON COAST" and a full set of extras switched on.

## Shot mode

Append `?shot=<name>` to the page URL to render a single fixed cover
full-viewport (used for the screenshots in `screenshots/`):

- `?shot=cover-land` — 1920×1080, grid layout, Vice Sunset
- `?shot=cover-port` — 1080×1350, nine grid, Vice Sunset
- `?shot=cover-square` — 1080×1080, hero stack, Neon Night

## Layout of the code

- `app/index.html` — the editor page
- `app/style.css` — dark chrome, neon accents, bundled display fonts
- `app/src/cover.js` — the render engine (layouts, grades, lettering)
- `app/src/photos.js` — the photo store (samples and uploads)
- `app/src/main.js` — editor boot and control wiring
- `app/src/shots.js` — the fixed `?shot=` scenes
- `app/fonts/` — Anton, Pacifico and Bebas Neue (SIL Open Font License,
  see the OFL files alongside them)
- `app/samples/` — two bundled sample photos
- `main.ts` — the make.fun entry point that packages the app
- `tests/smoke.mjs` — a dependency-free smoke test for the engine

## Test

```
node tests/smoke.mjs
```
