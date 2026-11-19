// Vice Panels — editor boot and wiring.
// Boots the cover engine into either the full editor (no query string)
// or a deterministic shot scene (?shot=<name>), keeps the preview live
// as controls change, and exports PNGs at the three cover sizes.

import { LAYOUTS, GRADES, renderCover, layoutPanels } from './cover.js';
import { loadSamples, loadUserFiles, defaultPanels, ensurePanels } from './photos.js';
import { SHOT_SCENES, shotNameFromUrl } from './shots.js';

const EXPORT_SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'landscape', label: '1920 × 1080', w: 1920, h: 1080 },
];

function baseState() {
  return {
    layout: 'grid', grade: 'vice-sunset',
    title: 'NEON COAST', subtitle: 'vice city nights',
    tagline: 'ONE LAST RIDE · 2026', titleStyle: 'sunset',
    heat: 5, badge: 'LAUNCH WEEK', badgeOn: true,
    grain: true, vignette: true,
    photos: {}, panels: defaultPanels(9),
  };
}

async function fontsReady() {
  const loads = [
    document.fonts.load('100px "Anton"'),
    document.fonts.load('40px "Pacifico"'),
    document.fonts.load('40px "Bebas Neue"'),
  ];
  await Promise.all(loads.map((p) => p.catch(() => {})));
  await document.fonts.ready;
}

function renderTo(state, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  ensurePanels(state, layoutPanels(state.layout, w, h).length);
  renderCover(c, state);
  return c;
}

function download(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// ---- shot mode: one canvas, fixed preset, title flags readiness ----
async function bootShot(name) {
  const scene = SHOT_SCENES[name];
  document.body.classList.add('shot-mode');
  const canvas = document.getElementById('shot-canvas');
  canvas.width = scene.w; canvas.height = scene.h;
  const state = Object.assign(baseState(), scene.state, { grain: true, vignette: true });
  state.photos = await loadSamples();
  await fontsReady();
  renderCover(canvas, state);
  document.title = `shot:${name} ready`;
}

// ---- editor mode ----
async function bootEditor() {
  const state = baseState();
  state.photos = await loadSamples();
  await fontsReady();

  const preview = document.getElementById('preview');
  const pctx = preview.getContext('2d');
  let selected = 0;
  let panelRects = [];

  function drawPreview() {
    const size = EXPORT_SIZES.find((s) => s.id === state.exportSize) || EXPORT_SIZES[0];
    preview.width = size.w; preview.height = size.h;
    ensurePanels(state, layoutPanels(state.layout, size.w, size.h).length);
    panelRects = renderCover(preview, state) || [];
    if (selected >= panelRects.length) selected = 0;
    // Selection outline over the chosen panel.
    const r = panelRects[selected];
    if (r) {
      pctx.save();
      pctx.strokeStyle = '#b4f224'; pctx.lineWidth = Math.max(3, size.w * 0.006);
      pctx.setLineDash([size.w * 0.02, size.w * 0.012]);
      pctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      pctx.restore();
    }
    const zoom = document.getElementById('zoom');
    const slot = state.panels[selected];
    if (zoom && slot) zoom.value = String(slot.zoom);
    const label = document.getElementById('selected-label');
    if (label) label.textContent = `Panel ${selected + 1} selected — drag to reframe, scroll to zoom`;
  }
  state.exportSize = 'square';

  // Layout buttons
  const layoutBox = document.getElementById('layouts');
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.textContent = l.label; b.dataset.layout = l.id;
    if (l.id === state.layout) b.classList.add('active');
    b.addEventListener('click', () => {
      state.layout = l.id; selected = 0;
      layoutBox.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      drawPreview();
    });
    layoutBox.appendChild(b);
  }

  // Grade swatches
  const gradeBox = document.getElementById('grades');
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.textContent = g.label; b.dataset.grade = g.id;
    if (g.id === state.grade) b.classList.add('active');
    b.addEventListener('click', () => {
      state.grade = g.id;
      gradeBox.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      drawPreview();
    });
    gradeBox.appendChild(b);
  }

  // Photo thumbnails: clicking one assigns it to the selected panel.
  const strip = document.getElementById('thumbs');
  function refreshThumbs() {
    strip.innerHTML = '';
    for (const photo of Object.values(state.photos)) {
      const t = document.createElement('button');
      t.className = 'thumb';
      const im = document.createElement('img');
      im.src = photo.img.src; im.alt = photo.label;
      const cap = document.createElement('span');
      cap.textContent = photo.label;
      t.append(im, cap);
      t.addEventListener('click', () => {
        state.panels[selected].photoId = photo.id;
        drawPreview();
      });
      strip.appendChild(t);
    }
  }
  refreshThumbs();

  document.getElementById('file-input').addEventListener('change', async (ev) => {
    const files = [...ev.target.files];
    if (!files.length) return;
    const added = await loadUserFiles(files, state.photos);
    if (added.length) state.panels[selected].photoId = added[0];
    refreshThumbs();
    drawPreview();
  });

  // Sample quick buttons
  document.querySelectorAll('[data-sample]').forEach((b) => {
    b.addEventListener('click', () => {
      state.panels[selected].photoId = b.dataset.sample;
      drawPreview();
    });
  });

  // Lettering inputs
  const bind = (id, key) => {
    document.getElementById(id).addEventListener('input', (ev) => { state[key] = ev.target.value; drawPreview(); });
  };
  bind('title-input', 'title');
  bind('subtitle-input', 'subtitle');
  bind('tagline-input', 'tagline');
  bind('badge-input', 'badge');
  document.getElementById('style-select').addEventListener('change', (ev) => { state.titleStyle = ev.target.value; drawPreview(); });
  document.getElementById('badge-toggle').addEventListener('change', (ev) => { state.badgeOn = ev.target.checked; drawPreview(); });
  document.getElementById('grain-toggle').addEventListener('change', (ev) => { state.grain = ev.target.checked; drawPreview(); });
  document.getElementById('vignette-toggle').addEventListener('change', (ev) => { state.vignette = ev.target.checked; drawPreview(); });
  document.getElementById('heat-minus').addEventListener('click', () => { state.heat = Math.max(0, state.heat - 1); syncHeat(); drawPreview(); });
  document.getElementById('heat-plus').addEventListener('click', () => { state.heat = Math.min(5, state.heat + 1); syncHeat(); drawPreview(); });
  function syncHeat() { document.getElementById('heat-value').textContent = '★'.repeat(state.heat) || '—'; }
  syncHeat();

  document.getElementById('zoom').addEventListener('input', (ev) => {
    state.panels[selected].zoom = Number(ev.target.value);
    drawPreview();
  });

  // Preview interaction: click selects, drag reframes, wheel zooms.
  function toCanvas(ev) {
    const r = preview.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * preview.width / r.width, y: (ev.clientY - r.top) * preview.height / r.height };
  }
  let drag = null;
  preview.addEventListener('pointerdown', (ev) => {
    const p = toCanvas(ev);
    const idx = panelRects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (idx >= 0) selected = idx;
    drag = { x: p.x, y: p.y };
    preview.setPointerCapture(ev.pointerId);
    drawPreview();
  });
  preview.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = toCanvas(ev);
    const slot = state.panels[selected];
    const r = panelRects[selected];
    if (slot && r) {
      slot.dx = Math.max(-1, Math.min(1, slot.dx - (p.x - drag.x) / Math.max(1, r.w) * 2));
      slot.dy = Math.max(-1, Math.min(1, slot.dy - (p.y - drag.y) / Math.max(1, r.h) * 2));
    }
    drag = p;
    drawPreview();
  });
  preview.addEventListener('pointerup', () => { drag = null; });
  // Keyboard fine-tuning: arrows nudge the selected photo, +/- zoom it.
  window.addEventListener('keydown', (ev) => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const slot = state.panels[selected];
    if (!slot) return;
    const step = 0.04;
    if (ev.key === 'ArrowLeft') slot.dx = Math.max(-1, slot.dx + step);
    else if (ev.key === 'ArrowRight') slot.dx = Math.min(1, slot.dx - step);
    else if (ev.key === 'ArrowUp') slot.dy = Math.max(-1, slot.dy + step);
    else if (ev.key === 'ArrowDown') slot.dy = Math.min(1, slot.dy - step);
    else if (ev.key === '+' || ev.key === '=') slot.zoom = Math.min(3, slot.zoom + 0.05);
    else if (ev.key === '-') slot.zoom = Math.max(1, slot.zoom - 0.05);
    else return;
    ev.preventDefault();
    drawPreview();
  });

  preview.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const slot = state.panels[selected];
    if (!slot) return;
    slot.zoom = Math.max(1, Math.min(3, slot.zoom + (ev.deltaY < 0 ? 0.08 : -0.08)));
    drawPreview();
  }, { passive: false });

  // Export
  document.getElementById('size-select').addEventListener('change', (ev) => { state.exportSize = ev.target.value; drawPreview(); });
  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', () => {
      const s = EXPORT_SIZES.find((x) => x.id === b.dataset.export);
      download(renderTo(state, s.w, s.h), `vice-panels-${s.id}.png`);
    });
  });
  document.getElementById('export-all').addEventListener('click', () => {
    for (const s of EXPORT_SIZES) download(renderTo(state, s.w, s.h), `vice-panels-${s.id}.png`);
  });

  drawPreview();
}

const shot = shotNameFromUrl();
if (shot) bootShot(shot); else bootEditor();
