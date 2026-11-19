// Vice Panels — cover render engine.
// Pure Canvas 2D. Every layout is computed from fractions of the canvas
// size, so one state renders cleanly at square, portrait and landscape
// export sizes. Grading runs through a 256-entry RGB lookup table built
// from gradient stops, then lettering and extras are drawn on top.

export const LAYOUTS = [
  { id: 'grid', label: 'Grid Collage' },
  { id: 'hero-stack', label: 'Hero Stack' },
  { id: 'nine', label: 'Nine Grid' },
  { id: 'fullbleed', label: 'Full Bleed' },
  { id: 'tilted', label: 'Tilted Snaps' },
  { id: 'duo', label: 'Duo Tall' },
];

export const GRADES = [
  { id: 'vice-sunset', label: 'Vice Sunset' },
  { id: 'neon-night', label: 'Neon Night' },
  { id: 'teal-gold', label: 'Teal Gold' },
  { id: 'golden-hour', label: 'Golden Hour' },
  { id: 'ink-poster', label: 'Ink Poster' },
];

const GRADE_DEFS = {
  'vice-sunset': {
    stops: [[0, 18, 58, 74], [0.28, 32, 92, 96], [0.52, 168, 118, 92], [0.76, 255, 150, 92], [1, 255, 90, 150]],
    saturation: 1.18, contrast: 1.06,
  },
  'neon-night': {
    stops: [[0, 8, 10, 48], [0.3, 24, 28, 110], [0.55, 96, 60, 160], [0.8, 210, 60, 170], [1, 80, 230, 255]],
    saturation: 1.25, contrast: 1.18,
  },
  'teal-gold': {
    stops: [[0, 6, 44, 52], [0.35, 14, 96, 104], [0.62, 120, 150, 130], [0.85, 232, 190, 92], [1, 255, 226, 140]],
    saturation: 1.05, contrast: 1.04,
  },
  'golden-hour': {
    stops: [[0, 44, 30, 22], [0.35, 118, 74, 44], [0.62, 214, 138, 76], [0.85, 255, 196, 116], [1, 255, 238, 196]],
    saturation: 1.12, contrast: 1.0,
  },
  'ink-poster': {
    stops: [[0, 20, 22, 34], [0.3, 70, 90, 120], [0.55, 170, 150, 120], [0.8, 240, 190, 130], [1, 252, 244, 224]],
    saturation: 0.85, contrast: 1.12, posterize: 5,
  },
};

// Build a 256x3 lookup table from a grade's gradient stops. Each input
// level's luminance picks a colour off the gradient; saturation and
// contrast then shape the channels around that colour.
export function buildGradientLUT(gradeId) {
  const def = GRADE_DEFS[gradeId] || GRADE_DEFS['vice-sunset'];
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = def.stops[0], b = def.stops[def.stops.length - 1];
    for (let s = 0; s < def.stops.length - 1; s++) {
      if (t >= def.stops[s][0] && t <= def.stops[s + 1][0]) { a = def.stops[s]; b = def.stops[s + 1]; break; }
    }
    const span = Math.max(0.0001, b[0] - a[0]);
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    lut[i * 3] = a[1] + (b[1] - a[1]) * f;
    lut[i * 3 + 1] = a[2] + (b[2] - a[2]) * f;
    lut[i * 3 + 2] = a[3] + (b[3] - a[3]) * f;
  }
  return { lut, saturation: def.saturation, contrast: def.contrast, posterize: def.posterize || 0 };
}

// Apply a grade LUT to a canvas region in place: luminance drives the
// gradient colour, the original chroma is blended back by saturation.
export function applyGradeLUT(ctx, x, y, w, h, gradeId) {
  const { lut, saturation, contrast, posterize } = buildGradientLUT(gradeId);
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let p = 0; p < d.length; p += 4) {
    let r = d[p], g = d[p + 1], b = d[p + 2];
    if (posterize > 1) {
      const step = 255 / (posterize - 1);
      r = Math.round(r / step) * step; g = Math.round(g / step) * step; b = Math.round(b / step) * step;
    }
    const lum = Math.max(0, Math.min(255, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)));
    const gr = lut[lum * 3], gg = lut[lum * 3 + 1], gb = lut[lum * 3 + 2];
    const mix = 0.62;
    r = gr * mix + r * (1 - mix); g = gg * mix + g * (1 - mix); b = gb * mix + b * (1 - mix);
    const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = grey + (r - grey) * saturation; g = grey + (g - grey) * saturation; b = grey + (b - grey) * saturation;
    r = (r - 128) * contrast + 128; g = (g - 128) * contrast + 128; b = (b - 128) * contrast + 128;
    d[p] = Math.max(0, Math.min(255, r)); d[p + 1] = Math.max(0, Math.min(255, g)); d[p + 2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(img, x, y);
  if (gradeId === 'ink-poster') drawHalftone(ctx, x, y, w, h);
}

function drawHalftone(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,20,0.16)';
  const gap = Math.max(6, Math.round(w / 90));
  for (let yy = y + gap / 2; yy < y + h; yy += gap) {
    for (let xx = x + gap / 2; xx < x + w; xx += gap) {
      ctx.beginPath(); ctx.arc(xx, yy, gap * 0.16, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// Panel rectangles for a layout, as fractions of W x H.
export function layoutPanels(layoutId, W, H) {
  const fr = (x, y, w, h) => ({ x: x * W, y: y * H, w: w * W, h: h * H });
  switch (layoutId) {
    case 'hero-stack':
      return [fr(0, 0, 0.62, 1), fr(0.62, 0, 0.38, 0.34), fr(0.62, 0.34, 0.38, 0.33), fr(0.62, 0.67, 0.38, 0.33)];
    case 'nine': {
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(fr(c / 3, r / 3, 1 / 3, 1 / 3));
      return out;
    }
    case 'fullbleed':
      return [fr(0, 0, 1, 1)];
    case 'tilted':
      return [fr(0, 0, 1, 1)];
    case 'duo':
      return [fr(0, 0, 0.5, 1), fr(0.5, 0, 0.5, 1)];
    case 'grid':
    default:
      return [
        fr(0, 0, 0.55, 0.52), fr(0.55, 0, 0.45, 0.26), fr(0.55, 0.26, 0.45, 0.26),
        fr(0, 0.52, 0.68, 0.48), fr(0.68, 0.52, 0.32, 0.48),
      ];
  }
}

// Draw one photo cover-fitted into a rect, honouring zoom and offset.
export function drawPanelPhoto(ctx, img, rect, transform) {
  if (!img) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, '#123a4a'); g.addColorStop(1, '#7a2450');
    ctx.fillStyle = g; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    return;
  }
  const zoom = Math.max(1, (transform && transform.zoom) || 1);
  const dx = (transform && transform.dx) || 0;
  const dy = (transform && transform.dy) || 0;
  const scale = Math.max(rect.w / img.width, rect.h / img.height) * zoom;
  const dw = img.width * scale, dh = img.height * scale;
  const cx = rect.x + (rect.w - dw) / 2 + dx * (dw - rect.w) / 2;
  const cy = rect.y + (rect.h - dh) / 2 + dy * (dh - rect.h) / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.drawImage(img, cx, cy, dw, dh);
  ctx.restore();
}

// Shrink a font size until the text fits maxWidth; returns the size used.
export function fitTitleFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

export function drawHeatMeter(ctx, W, heat) {
  const n = Math.max(0, Math.min(5, heat | 0));
  if (!n) return;
  const size = Math.round(W * 0.045);
  ctx.save();
  ctx.font = `${size}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = size * 0.25; ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffd319';
  ctx.fillText('★'.repeat(n), W * 0.975, W * 0.022);
  ctx.restore();
}

export function drawBadgeRibbon(ctx, W, H, text) {
  if (!text) return;
  // A diagonal strip centred just inside the top-left corner, long
  // enough that both ends run off the edges of the cover.
  ctx.save();
  const bw = W * 0.52, bh = Math.max(22, W * 0.045);
  ctx.translate(W * 0.135, H * 0.052);
  ctx.rotate(-Math.PI / 7.5);
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ff2975';
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#14101c';
  ctx.font = `${Math.round(bh * 0.58)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 0, 1);
  ctx.restore();
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas'); c.width = 160; c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = seed % 256;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

function drawGrain(ctx, W, H) {
  const tile = getGrainTile();
  ctx.save();
  ctx.globalAlpha = 0.07;
  const pat = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const r = Math.hypot(W, H) / 2;
  const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(4,2,12,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawTiltedSnaps(ctx, state, panels, W, H) {
  const snaps = [
    { cx: 0.30, cy: 0.58, w: 0.42, rot: -0.10, photo: 1 },
    { cx: 0.66, cy: 0.52, w: 0.40, rot: 0.08, photo: 0 },
    { cx: 0.50, cy: 0.78, w: 0.44, rot: -0.03, photo: 1 },
  ];
  for (const s of snaps) {
    const pw = s.w * W, ph = pw * 0.72, frame = Math.max(6, W * 0.012);
    ctx.save();
    ctx.translate(s.cx * W, s.cy * H);
    ctx.rotate(s.rot);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = W * 0.03; ctx.shadowOffsetY = W * 0.015;
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(-pw / 2 - frame, -ph / 2 - frame, pw + frame * 2, ph + frame * 2.6);
    ctx.shadowColor = 'transparent';
    const idx = state.panels[s.photo] || state.panels[0];
    const entry = idx ? state.photos[idx.photoId] : null;
    drawPanelPhoto(ctx, entry ? entry.img : null, { x: -pw / 2, y: -ph / 2, w: pw, h: ph }, idx);
    ctx.restore();
  }
}

// The lettering block: title, script subtitle and spaced tagline.
export function drawTitleBlock(ctx, state, W, H, anchor) {
  const title = (state.title || '').toUpperCase();
  // Left-anchored blocks (hero-stack) align to a margin instead of a
  // centre point, so a long title can never spill off the left edge.
  const leftAligned = anchor.align === 'left';
  const cx = leftAligned ? W * 0.045 : anchor.x * W;
  let y = anchor.y * H;
  ctx.save();
  ctx.textAlign = leftAligned ? 'left' : 'center'; ctx.textBaseline = 'top';
  if (title) {
    const start = Math.round(W * (anchor.titleScale || 0.15));
    // Fit against the room the anchor actually leaves: an off-centre
    // block (hero-stack) must not spill past the nearer edge.
    const room = leftAligned ? W * 0.9 : Math.min(W * 0.94, Math.min(cx, W - cx) * 2 - W * 0.02);
    const size = fitTitleFont(ctx, title, Math.max(W * 0.3, room), start, '"Anton", sans-serif');
    ctx.font = `${size}px "Anton", sans-serif`;
    if (state.titleStyle === 'sunset') {
      const grad = ctx.createLinearGradient(0, y, 0, y + size);
      grad.addColorStop(0, '#ffd319'); grad.addColorStop(1, '#ff2975');
      ctx.lineWidth = Math.max(2, size * 0.05); ctx.strokeStyle = '#ffffff'; ctx.lineJoin = 'round';
      ctx.strokeText(title, cx, y);
      ctx.fillStyle = grad; ctx.fillText(title, cx, y);
    } else if (state.titleStyle === 'neon') {
      ctx.shadowColor = '#ff2ec4'; ctx.shadowBlur = size * 0.45;
      ctx.fillStyle = '#ff71ce'; ctx.fillText(title, cx, y);
      ctx.shadowColor = '#01cdfe'; ctx.shadowBlur = size * 0.35;
      ctx.fillStyle = '#ffffff'; ctx.fillText(title, cx, y);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillText(title, cx + size * 0.06, y + size * 0.07);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, cx, y);
    }
    y += size * 1.04;
  }
  if (state.subtitle) {
    const sSize = Math.round(W * 0.052);
    ctx.font = `${sSize}px "Pacifico", cursive`;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(state.subtitle, cx, y);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    y += sSize * 1.25;
  }
  ctx.restore();
  if (state.tagline) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const tSize = Math.round(W * 0.034);
    ctx.font = `${tSize}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(tSize * 0.35)}px`; } catch (e) { /* older engines */ }
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.tagline.toUpperCase(), W / 2, H * 0.965);
    ctx.restore();
  }
}

function titleAnchor(layoutId) {
  switch (layoutId) {
    case 'fullbleed': return { x: 0.5, y: 0.70, titleScale: 0.16 };
    case 'hero-stack': return { x: 0.31, y: 0.045, titleScale: 0.115, align: 'left' };
    case 'tilted': return { x: 0.5, y: 0.045, titleScale: 0.14 };
    case 'nine': return { x: 0.5, y: 0.40, titleScale: 0.13 };
    default: return { x: 0.5, y: 0.035, titleScale: 0.14 };
  }
}

// Render the whole cover described by state onto canvas at its own size.
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(0, 0, W, H);
  const panels = layoutPanels(state.layout, W, H);
  const border = Math.max(2, Math.round(W * 0.01));

  if (state.layout === 'tilted') {
    const first = state.panels[0];
    const entry = first ? state.photos[first.photoId] : null;
    ctx.save(); ctx.globalAlpha = 0.55;
    drawPanelPhoto(ctx, entry ? entry.img : null, { x: 0, y: 0, w: W, h: H }, first);
    ctx.restore();
    ctx.fillStyle = 'rgba(6,4,16,0.35)'; ctx.fillRect(0, 0, W, H);
  } else {
    panels.forEach((rect, i) => {
      const slot = state.panels[i % state.panels.length] || state.panels[0];
      const entry = slot ? state.photos[slot.photoId] : null;
      drawPanelPhoto(ctx, entry ? entry.img : null, rect, slot);
    });
  }

  // Grade the photography as one sheet before any lettering goes on.
  applyGradeLUT(ctx, 0, 0, W, H, state.grade);

  if (state.layout === 'tilted') drawTiltedSnaps(ctx, state, panels, W, H);

  // White panel borders with a soft inner shadow line.
  if (state.layout !== 'tilted' && state.layout !== 'fullbleed') {
    ctx.save();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = border;
    for (const rect of panels) ctx.strokeRect(rect.x + border / 2, rect.y + border / 2, rect.w - border, rect.h - border);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (const rect of panels) ctx.strokeRect(rect.x + border + 1, rect.y + border + 1, rect.w - border * 2 - 2, rect.h - border * 2 - 2);
    ctx.restore();
  }
  if (state.layout === 'fullbleed') {
    const bandH = H * 0.30;
    const g = ctx.createLinearGradient(0, H - bandH, 0, H);
    g.addColorStop(0, 'rgba(5,3,14,0)'); g.addColorStop(1, 'rgba(5,3,14,0.82)');
    ctx.fillStyle = g; ctx.fillRect(0, H - bandH, W, bandH);
  }
  if (state.layout === 'nine') {
    ctx.save();
    ctx.fillStyle = 'rgba(5,3,14,0.38)';
    const cw = W / 3, ch = H / 3;
    ctx.fillRect(cw, ch, cw, ch);
    ctx.restore();
  }

  drawTitleBlock(ctx, state, W, H, titleAnchor(state.layout));
  drawHeatMeter(ctx, W, state.heat);
  if (state.badgeOn) drawBadgeRibbon(ctx, W, H, state.badge);
  if (state.vignette) drawVignette(ctx, W, H);
  if (state.grain) drawGrain(ctx, W, H);
  return panels;
}
