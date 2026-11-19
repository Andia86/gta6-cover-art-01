// Smoke test: the hand-in program must be deterministic and its
// dossier well-formed. Runs main.ts twice into two temp directories,
// diffs the trees, parses dossier.json and checks the screenshots
// against the gate's size constraints.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const fail = (msg) => { console.error(`SMOKE FAIL: ${msg}`); process.exit(1); };

function runOnce() {
  const dir = mkdtempSync(join(tmpdir(), 'vice-panels-'));
  execFileSync('node', ['main.ts'], {
    cwd: repo,
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: dir },
    stdio: 'pipe',
  });
  return dir;
}

const a = runOnce();
const b = runOnce();

execFileSync('diff', ['-r', a, b]); // throws (and fails the test) on any difference
console.log('double-run diff: identical');

const dossierBytes = readFileSync(join(a, 'dossier.json'));
if (dossierBytes.length > 1.5 * 1024 * 1024) fail(`dossier.json is ${dossierBytes.length} bytes, over 1.5 MiB`);
const dossier = JSON.parse(dossierBytes.toString('utf8'));
if (!dossier || typeof dossier !== 'object') fail('dossier.json did not parse to an object');
console.log(`dossier.json: parses, ${dossierBytes.length} bytes`);

const shots = readdirSync(join(a, 'screenshots')).filter((n) => /\.(png|jpe?g)$/i.test(n)).sort();
if (shots.length < 3 || shots.length > 4) fail(`expected 3-4 screenshots, found ${shots.length}`);
for (const name of shots) {
  const size = statSync(join(a, 'screenshots', name)).size;
  if (size > 262144) fail(`${name} is ${size} bytes, over 256 KiB`);
}
console.log(`screenshots: ${shots.join(', ')} all within 256 KiB`);

let appFiles = 0;
(function count(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    appFiles++;
    if (e.isDirectory()) count(join(dir, e.name));
  }
})(join(a, 'app'));
if (appFiles > 60) fail(`app/ holds ${appFiles} entries, expected a small tree`);
console.log(`app/ entries: ${appFiles}`);
console.log('SMOKE OK');
