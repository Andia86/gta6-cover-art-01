// Shot mode: ?shot=<name> renders one fixed cover full-viewport so the
// page can be screenshotted deterministically. Sets document.title to
// "shot:<name> ready" once fonts and sample photos are on the canvas.

import { renderCover } from './cover.js';
import { loadImage } from './photos.js';

export const SHOTS = {
  'cover-land': {
    width: 1920, height: 1080,
    state: { layout: 'grid', grade: 'vice-sunset' },
  },
  'cover-port': {
    width: 1080, height: 1350,
    state: { layout: 'nine', grade: 'vice-sunset', title: 'NEON COAST' },
  },
  'cover-square': {
    width: 1080, height: 1080,
    state: {
      layout: 'hero-stack', grade: 'neon-night',
      title: 'MIDNIGHT PALMS', subtitle: 'after dark', heat: 4,
    },
  },
};

export function baseShotState() {
  return {
    layout: 'grid', grade: 'vice-sunset',
    title: 'NEON COAST', subtitle: 'vice city nights',
    tagline: 'ONE LAST RIDE · 2026', titleStyle: 'block',
    heat: 5, badge: 'LAUNCH WEEK', badgeOn: true,
    grain: true, vignette: true,
    panels: [], selectedPanel: null, showSelection: false,
  };
}

export async function runShot(name) {
  const shot = SHOTS[name];
  if (!shot) return false;
  document.body.classList.add('shot-mode');

  const canvas = document.createElement('canvas');
  canvas.width = shot.width;
  canvas.height = shot.height;
  canvas.id = 'shot-canvas';
  document.body.appendChild(canvas);

  const [boulevard, pier] = await Promise.all([
    loadImage('samples/boulevard.jpg'),
    loadImage('samples/pier.jpg'),
  ]);
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('30px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch { /* fall back to system fonts */ }

  const state = { ...baseShotState(), ...shot.state };
  const count = { grid: 5, 'hero-stack': 4, nine: 9, fullbleed: 1, tilted: 3, duo: 2 }[state.layout] || 5;
  state.panels = Array.from({ length: count }, (_, i) => ({
    img: i === 0 ? boulevard : pier, offsetX: 0, offsetY: 0, zoom: 1,
  }));

  renderCover(canvas, state);
  document.title = `shot:${name} ready`;
  return true;
}
