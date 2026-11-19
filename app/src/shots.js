// Shot mode: ?shot=<name> renders one fixed cover full-viewport so the
// page can be screenshotted deterministically. Sets document.title to
// "shot:<name> ready" once fonts and sample photos are on the canvas.

import { renderCover } from './cover.js';
import { loadImage } from './photos.js';

// Per-panel crops for each scene: every panel shows its own region of its
// photo (offsetX/offsetY in -1..1, zoom >= 1), so no crop ever repeats.
// 'B' is the boulevard photo, 'P' the pier photo.
const SCENE_CROPS = {
  'cover-land': [
    ['B', 0, 0.8, 1],        // hero: focal point raised so her face is in frame
    ['P', 0.75, 0.65, 1.35], // fisherman's face and shoulder, close
    ['P', -0.85, -0.55, 1.5],// rod and open water, right side
    ['P', -0.25, -0.75, 1.1],// railing and lower water, wide bottom panel
    ['P', 0.55, -0.35, 1.45],// torso, hands and reel
  ],
  'cover-port': [
    ['B', 0, 0.85, 1.05],    // her face, top of the boulevard photo
    ['P', 0.8, 0.7, 1.5],    // fisherman's face, close
    ['B', -0.5, -0.4, 1.35], // car door and jeans, lower boulevard
    ['P', -0.8, 0.3, 1.3],   // rod against the sky
    ['B', 0.45, 0.1, 1.2],   // her torso, centre (behind the title plate)
    ['P', 0.15, -0.8, 1.15], // pier railing and waterline
    ['P', 0.9, -0.5, 1.6],   // hands and reel, tight
    ['B', -0.85, 0.75, 1.5], // palms and sky, top corner of the boulevard
    ['P', 0, 0, 1.05],       // the full pier scene, near-centre
  ],
  'cover-square': [
    ['B', 0.3, 0, 1],        // hero: her face already sits in this tall crop
    ['P', 0.8, 0.7, 1.5],    // fisherman's face, close
    ['P', -0.75, -0.2, 1.35],// rod and water, right side
    ['P', 0.3, -0.85, 1.2],  // railing and hands, low
  ],
};

export const SHOTS = {
  'cover-land': {
    width: 1920, height: 1080,
    // Top-right panel is a face close-up, so the meter sits bottom-right.
    state: { layout: 'grid', grade: 'vice-sunset', heatAnchor: 'bottom-right' },
  },
  'cover-port': {
    width: 1080, height: 1350,
    // The top-right panel holds a face, so the heat meter moves to the
    // bottom-right, above the tagline strip.
    state: { layout: 'nine', grade: 'vice-sunset', title: 'NEON COAST', heatAnchor: 'bottom-right' },
  },
  'cover-square': {
    width: 1080, height: 1080,
    state: {
      layout: 'hero-stack', grade: 'neon-night',
      title: 'MIDNIGHT PALMS', subtitle: 'after dark', heat: 4,
      heatAnchor: 'bottom-right',
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
  const crops = SCENE_CROPS[name] || [];
  state.panels = crops.map(([which, offsetX, offsetY, zoom]) => ({
    img: which === 'B' ? boulevard : pier, offsetX, offsetY, zoom,
  }));

  renderCover(canvas, state);
  document.title = `shot:${name} ready`;
  return true;
}
