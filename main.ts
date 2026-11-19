// Vice Panels — hand-in program for the gta6-cover-art-01 bounty.
//
// The entry itself is the static web app under app/: plain HTML, CSS and
// ES modules that a desktop browser runs fully offline, with no build
// step and no network access. This program's only job is delivery — it
// copies app/ and screenshots/ into the output directory and writes the
// dossier.json summary there with the vendored make.fun library, so the
// judged bytes are exactly the bytes this repository holds.
//
// Run it the way the grader does, or locally with an override:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Preview the app first with: node serve.ts  (then open the local URL)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Stage the app exactly as authored — no transforms, no minifying — so
// what the judge reads is what a visitor's browser would run.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });

// Screenshots ride along beside the app; the first by name is the cover.
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the bounty gate: the text budget shapes the dossier, the
// rest make this program refuse anything the scorer would refuse.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
