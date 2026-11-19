// Smoke test for the Vice Panels render engine.
// Runs in plain Node: cover.js only touches `document` inside render-time
// helpers, so the pure layout/LUT/font functions are exercised directly,
// plus static checks that the app stays offline and self-contained.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engine = await import(join(root, 'app', 'src', 'cover.js'));

const { LAYOUTS, GRADES, layoutPanels, buildGradientLUT, applyGradeLUT, fitTitleFont } = engine;

// Named exports the brief requires.
for (const name of ['LAYOUTS', 'GRADES', 'renderCover', 'layoutPanels', 'applyGradeLUT',
  'buildGradientLUT', 'drawPanelPhoto', 'drawTitleBlock', 'drawHeatMeter',
  'drawBadgeRibbon', 'fitTitleFont']) {
  assert.ok(engine[name] !== undefined, `missing export ${name}`);
}

assert.equal(LAYOUTS.length, 6, 'six layouts');
assert.equal(GRADES.length, 5, 'five grades');

// Every layout fills its canvas sensibly at all three export sizes.
for (const [W, H] of [[1080, 1080], [1080, 1350], [1920, 1080]]) {
  for (const layout of LAYOUTS) {
    const rects = layoutPanels(layout.id, W, H);
    assert.equal(rects.length, layout.panels, `${layout.id} panel count at ${W}x${H}`);
    for (const r of rects) {
      assert.ok(r.w > 0 && r.h > 0, `${layout.id} rect has area`);
      assert.ok(r.x >= -W * 0.1 && r.y >= -H * 0.1, `${layout.id} rect near canvas`);
      assert.ok(r.x + r.w <= W + W * 0.1 && r.y + r.h <= H + H * 0.1, `${layout.id} rect inside canvas`);
    }
  }
}

// LUTs are full-size, endpoints track the gradient stops, posterize quantizes.
for (const grade of GRADES) {
  const lut = buildGradientLUT(grade);
  assert.equal(lut.length, 256 * 3, `${grade.id} LUT size`);
  const data = { data: new Uint8ClampedArray([10, 20, 30, 255, 200, 210, 220, 255]) };
  applyGradeLUT(data, lut);
  assert.equal(data.data[3], 255, 'alpha untouched');
  assert.equal(data.data[7], 255, 'alpha untouched');
}
const poster = GRADES.find((g) => g.id === 'ink-poster');
const pLut = buildGradientLUT(poster);
const levels = new Set(Array.from(pLut));
assert.ok(levels.size <= 5 * 3 + 6, 'posterized LUT uses few levels');

// fitTitleFont shrinks until the text fits.
const fakeCtx = {
  font: '',
  measureText(text) {
    const size = parseInt(this.font, 10) || 16;
    return { width: text.length * size * 0.6 };
  },
};
const fitted = fitTitleFont(fakeCtx, 'NEON COAST', 300, 120);
assert.ok(fitted <= 120 && 'NEON COAST'.length * fitted * 0.6 <= 300 + 24, 'title fits');

// The app must stay offline: no external URLs in any app source.
for (const rel of ['app/index.html', 'app/style.css', 'app/src/cover.js',
  'app/src/main.js', 'app/src/photos.js', 'app/src/shots.js']) {
  const text = readFileSync(join(root, rel), 'utf8');
  assert.ok(!/https?:\/\//.test(text), `${rel} contains an external URL`);
}

// Fonts and samples the page depends on are bundled.
for (const rel of ['app/fonts/Anton-Regular.ttf', 'app/fonts/Pacifico-Regular.ttf',
  'app/fonts/BebasNeue-Regular.ttf', 'app/samples/boulevard.jpg', 'app/samples/pier.jpg']) {
  assert.ok(existsSync(join(root, rel)), `missing ${rel}`);
}

console.log('smoke: all checks passed');
