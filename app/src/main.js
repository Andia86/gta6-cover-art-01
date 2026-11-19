// Vice Panels editor: boots the photo store, wires every control to the
// render state, and keeps the preview canvas live. Pointer input on the
// canvas selects panels, drags their photo, and zooms with the wheel.

import { LAYOUTS, GRADES, renderCover, layoutPanels } from './cover.js';
import { PhotoStore, defaultPanelAssignments } from './photos.js';
import { runShot } from './shots.js';

const $ = (sel) => document.querySelector(sel);

const store = new PhotoStore();

const state = {
  layout: 'grid', grade: 'vice-sunset',
  title: 'NEON COAST', subtitle: 'vice city nights',
  tagline: 'ONE LAST RIDE · 2026', titleStyle: 'block',
  heat: 5, badge: 'LAUNCH WEEK', badgeOn: true,
  grain: true, vignette: true,
  panels: [], selectedPanel: 0, showSelection: true,
};

let previewSize = { w: 1080, h: 1080 };
let canvas, ctx2d;

function panelCount() {
  return (LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0]).panels;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) {
    state.panels.push({ img: null, photoId: null, offsetX: 0, offsetY: 0, zoom: 1 });
  }
  state.panels.length = n;
  if (state.selectedPanel >= n) state.selectedPanel = 0;
}

function assignDefaults() {
  ensurePanels();
  const picks = defaultPanelAssignments(store, panelCount());
  state.panels.forEach((p, i) => {
    const entry = picks[i];
    if (entry) { p.img = entry.img; p.photoId = entry.id; }
  });
}

function render() {
  if (!canvas) return;
  canvas.width = previewSize.w;
  canvas.height = previewSize.h;
  renderCover(canvas, state);
}

function buildLayoutButtons() {
  const wrap = $('#layout-buttons');
  wrap.innerHTML = '';
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = layout.name;
    b.dataset.layout = layout.id;
    b.classList.toggle('active', layout.id === state.layout);
    b.addEventListener('click', () => {
      const keep = state.panels.map((p) => ({ ...p }));
      state.layout = layout.id;
      ensurePanels();
      state.panels.forEach((p, i) => { if (keep[i]) Object.assign(p, keep[i]); });
      if (state.panels.some((p) => !p.img)) assignDefaults();
      buildLayoutButtons();
      render();
    });
    wrap.appendChild(b);
  }
}

function buildGradeButtons() {
  const wrap = $('#grade-buttons');
  wrap.innerHTML = '';
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.grade = grade.id;
    b.classList.toggle('active', grade.id === state.grade);
    const stops = grade.stops.map(([, c]) => c).join(', ');
    b.innerHTML = `<span class="sw" style="background:linear-gradient(90deg, ${stops})"></span>${grade.name}`;
    b.addEventListener('click', () => {
      state.grade = grade.id;
      buildGradeButtons();
      render();
    });
    wrap.appendChild(b);
  }
}

function buildThumbs() {
  const wrap = $('#thumbs');
  wrap.innerHTML = '';
  for (const photo of store.photos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `${photo.name} — assign to the selected panel`;
    const img = document.createElement('img');
    img.src = photo.url || '';
    img.alt = photo.name;
    b.appendChild(img);
    const label = document.createElement('span');
    label.textContent = photo.name;
    b.appendChild(label);
    b.addEventListener('click', () => {
      const panel = state.panels[state.selectedPanel];
      if (!panel) return;
      panel.img = photo.img;
      panel.photoId = photo.id;
      render();
    });
    wrap.appendChild(b);
  }
}

function canvasPoint(evt) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - r.left) * (canvas.width / r.width),
    y: (evt.clientY - r.top) * (canvas.height / r.height),
  };
}

function panelAt(x, y) {
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function wireCanvas() {
  let drag = null;
  canvas.addEventListener('pointerdown', (evt) => {
    const p = canvasPoint(evt);
    const idx = panelAt(p.x, p.y);
    if (idx === -1) return;
    state.selectedPanel = idx;
    drag = { x: p.x, y: p.y, panel: state.panels[idx] };
    canvas.setPointerCapture(evt.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (evt) => {
    if (!drag) return;
    const p = canvasPoint(evt);
    const rects = layoutPanels(state.layout, canvas.width, canvas.height);
    const r = rects[state.selectedPanel];
    if (r) {
      drag.panel.offsetX = clamp(drag.panel.offsetX + (p.x - drag.x) / Math.max(1, r.w) * 2, -1, 1);
      drag.panel.offsetY = clamp(drag.panel.offsetY + (p.y - drag.y) / Math.max(1, r.h) * 2, -1, 1);
    }
    drag.x = p.x; drag.y = p.y;
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    const panel = state.panels[state.selectedPanel];
    if (!panel) return;
    panel.zoom = clamp(panel.zoom * (evt.deltaY < 0 ? 1.08 : 0.93), 1, 4);
    render();
  }, { passive: false });
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function exportPNG(w, h) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const snapshot = { ...state, showSelection: false };
  renderCover(off, snapshot);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

function wireControls() {
  $('#title-input').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('#subtitle-input').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('#tagline-input').addEventListener('input', (e) => { state.tagline = e.target.value; render(); });
  $('#style-select').addEventListener('change', (e) => { state.titleStyle = e.target.value; render(); });
  $('#badge-input').addEventListener('input', (e) => { state.badge = e.target.value; render(); });
  $('#badge-toggle').addEventListener('change', (e) => { state.badgeOn = e.target.checked; render(); });
  $('#grain-toggle').addEventListener('change', (e) => { state.grain = e.target.checked; render(); });
  $('#vignette-toggle').addEventListener('change', (e) => { state.vignette = e.target.checked; render(); });
  $('#heat-minus').addEventListener('click', () => { state.heat = clamp(state.heat - 1, 0, 5); $('#heat-value').textContent = state.heat; render(); });
  $('#heat-plus').addEventListener('click', () => { state.heat = clamp(state.heat + 1, 0, 5); $('#heat-value').textContent = state.heat; render(); });

  $('#file-input').addEventListener('change', async (e) => {
    await store.addFiles(e.target.files);
    e.target.value = '';
  });
  $('#sample-boulevard').addEventListener('click', () => assignSample('boulevard'));
  $('#sample-pier').addEventListener('click', () => assignSample('pier'));

  $('#export-square').addEventListener('click', () => { previewSize = { w: 1080, h: 1080 }; exportPNG(1080, 1080); render(); });
  $('#export-port').addEventListener('click', () => { previewSize = { w: 1080, h: 1350 }; exportPNG(1080, 1350); render(); });
  $('#export-land').addEventListener('click', () => { previewSize = { w: 1920, h: 1080 }; exportPNG(1920, 1080); render(); });
  $('#export-all').addEventListener('click', () => {
    exportPNG(1080, 1080);
    setTimeout(() => exportPNG(1080, 1350), 250);
    setTimeout(() => exportPNG(1920, 1080), 500);
  });
}

function assignSample(kind) {
  const photo = store.photos.find((p) => p.name.toLowerCase().includes(kind));
  const panel = state.panels[state.selectedPanel];
  if (photo && panel) {
    panel.img = photo.img;
    panel.photoId = photo.id;
    render();
  }
}

async function boot() {
  const shotName = new URLSearchParams(location.search).get('shot');
  if (shotName) {
    await runShot(shotName);
    return;
  }
  canvas = $('#preview');
  ctx2d = canvas.getContext('2d');
  await Promise.all([
    store.addSample('samples/boulevard.jpg', 'boulevard.jpg'),
    store.addSample('samples/pier.jpg', 'pier.jpg'),
  ]);
  try { await document.fonts.ready; } catch { /* non-fatal */ }
  ensurePanels();
  assignDefaults();
  buildLayoutButtons();
  buildGradeButtons();
  buildThumbs();
  store.onChange(buildThumbs);
  wireControls();
  wireCanvas();
  render();
}

boot();
