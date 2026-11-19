# Vice Panels — a GTA-style cover studio

An offline cover maker in the spirit of the classic multi-panel game
covers: your photos go into a white-bordered collage, a colour grade
gives the whole sheet one sunset (or neon night), and big display
lettering finishes it. Vanilla JavaScript and Canvas 2D, ES modules,
no build step, no network — everything runs from the files in `app/`.

## What it does

- **Six layouts** (`LAYOUTS` in `app/src/cover.js`): Grid Collage (the
  asymmetric five-panel arrangement), Hero Stack, Nine Grid, Full
  Bleed, Tilted Snaps (framed snapshots over a dimmed backdrop) and
  Duo Tall. Layouts are computed from fractions of the canvas, so one
  design renders at 1080×1080, 1080×1350 and 1920×1080 alike.
- **Five grades** (`GRADES`): Vice Sunset, Neon Night, Teal Gold,
  Golden Hour and Ink Poster. Each grade is a 256-entry RGB lookup
  table built from gradient stops (`buildGradientLUT`), applied to the
  photography before lettering (`applyGradeLUT`); Ink Poster also
  posterizes and lays a halftone dot pattern.
- **Lettering**: the title is set in Anton, auto-fitted to the cover
  width (`fitTitleFont`), in three styles — Block, Sunset gradient and
  Neon glow. The subtitle is Pacifico script, the tagline is letter-
  spaced Bebas Neue. Extras: a 1–5 star heat meter, a rotated badge
  ribbon, film grain and a vignette, all toggleable.
- **Editing**: click a panel to select it, drag on the preview to
  reframe its photo, scroll or use the slider to zoom. Photos come
  from your own files or the two bundled samples; clicking a thumbnail
  assigns it to the selected panel.
- **Export**: PNG download at any of the three sizes, or all three at
  once. Fonts are loaded and awaited before any render or export, so
  the lettering in a file is the lettering on screen.

## Run it

```sh
node serve.ts        # serves app/ locally on port 8080
```

Then open the local address it prints. To hand the entry in the way
the grader runs it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node tests/smoke.mjs # double-run determinism + dossier checks
```

## Screenshots

| File | Shows |
| --- | --- |
| `screenshots/1-cover-land.jpg` | Landscape grid-collage cover, vice-sunset grade |
| `screenshots/2-cover-port.jpg` | Portrait nine-grid cover, vice-sunset grade |
| `screenshots/3-editor.jpg` | The editor on load, default cover in the stage |
| `screenshots/4-cover-square.jpg` | Square hero-stack cover, neon-night grade |

Shot scenes are deterministic: `app/src/shots.js` maps `?shot=` names
to fixed presets, and the page sets its title to `shot:<name> ready`
once fonts and samples are drawn.

## Licenses

- The app code is under the repository `LICENSE`.
- Fonts in `app/fonts/` are under the SIL Open Font License 1.1; the
  license text ships beside each font (`OFL-*.txt`). Anton by Vernon
  Adams / the Anton Project Authors, Pacifico by Vernon Adams / the
  Pacifico Project Authors, Bebas Neue by the Bebas Neue Project
  Authors — all via Google Fonts.
- The two sample photos in `app/samples/` were made for make.fun and
  are free to use with this entry.
