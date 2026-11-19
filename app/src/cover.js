// Vice Panels — cover render engine.
// Pure Canvas 2D, no dependencies. renderCover draws a complete GTA-style
// cover onto any canvas at that canvas's exact pixel size: photos are laid
// out in panels, colour-graded through a lookup table, then lettered.

export const LAYOUTS = [
  { id: 'grid', name: 'Grid Collage', panels: 5 },
  { id: 'hero-stack', name: 'Hero Stack', panels: 4 },
  { id: 'nine', name: 'Nine Grid', panels: 9 },
  { id: 'fullbleed', name: 'Full Bleed', panels: 1 },
  { id: 'tilted', name: 'Tilted Snaps', panels: 3 },
  { id: 'duo', name: 'Duo', panels: 2 },
];

export const GRADES = [
  {
    id: 'vice-sunset', name: 'Vice Sunset', saturation: 1.18, contrast: 1.06,
    stops: [[0, '#0b3b4a'], [0.35, '#14606b'], [0.62, '#e2703a'], [0.85, '#ff7e5f'], [1, '#ffd9a0']],
  },
  {
    id: 'neon-night', name: 'Neon Night', saturation: 1.25, contrast: 1.22,
    stops: [[0, '#050a2e'], [0.4, '#1b2a6b'], [0.7, '#7b2d8b'], [1, '#ff4fd8']],
  },
  {
    id: 'teal-gold', name: 'Teal & Gold', saturation: 0.9, contrast: 1.1,
    stops: [[0, '#04262b'], [0.5, '#0e5a5e'], [0.78, '#c9973f'], [1, '#ffe9a8']],
  },
  {
    id: 'golden-hour', name: 'Golden Hour', saturation: 1.08, contrast: 0.98,
    stops: [[0, '#2b1503'], [0.45, '#8a4b12'], [0.75, '#e8973c'], [1, '#fff3c4']],
  },
  {
    id: 'ink-poster', name: 'Ink Poster', saturation: 1.05, contrast: 1.15, posterize: 5, halftone: true,
    stops: [[0, '#101018'], [0.4, '#274060'], [0.7, '#d94f30'], [1, '#f7e8c3']],
  },
];

function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Build a 256-entry RGB lookup table (768 numbers) from gradient stops,
// then fold in saturation and contrast so one pass grades a whole frame.
export function buildGradientLUT(grade) {
  const stops = grade.stops.map(([t, c]) => [t, hexRGB(c)]);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = Math.max(1e-6, b[0] - a[0]);
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let ch = 0; ch < 3; ch++) lut[i * 3 + ch] = a[1][ch] + (b[1][ch] - a[1][ch]) * f;
  }
  const sat = grade.saturation ?? 1;
  const con = grade.contrast ?? 1;
  for (let i = 0; i < 256; i++) {
    let r = lut[i * 3], g = lut[i * 3 + 1], b = lut[i * 3 + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * sat; g = lum + (g - lum) * sat; b = lum + (b - lum) * sat;
    r = (r - 128) * con + 128; g = (g - 128) * con + 128; b = (b - 128) * con + 128;
    lut[i * 3] = r; lut[i * 3 + 1] = g; lut[i * 3 + 2] = b;
  }
  if (grade.posterize) {
    const levels = grade.posterize;
    for (let i = 0; i < lut.length; i++) {
      lut[i] = Math.round(Math.round((lut[i] / 255) * (levels - 1)) / (levels - 1) * 255);
    }
  }
  return lut;
}

// LUTs are pure functions of the grade definition, and the editor
// re-renders on every pointer move — cache one table per grade id.
const lutCache = new Map();
export function lutForGrade(grade) {
  let lut = lutCache.get(grade.id);
  if (!lut) {
    lut = buildGradientLUT(grade);
    lutCache.set(grade.id, lut);
  }
  return lut;
}

// Apply a LUT built by buildGradientLUT to ImageData in place.
export function applyGradeLUT(imageData, lut) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    // Grade by luminance so hue relationships in the photo survive.
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const mix = 0.72;
    d[i] = d[i] * (1 - mix) + lut[lum * 3] * mix;
    d[i + 1] = d[i + 1] * (1 - mix) + lut[lum * 3 + 1] * mix;
    d[i + 2] = d[i + 2] * (1 - mix) + lut[lum * 3 + 2] * mix;
  }
  return imageData;
}

// Panel rectangles for a layout, as fractions resolved against W x H.
// Each rect: {x, y, w, h} plus optional angle (radians) for tilted snaps.
export function layoutPanels(layoutId, W, H) {
  const m = Math.round(W * 0.012); // gutter / border unit
  switch (layoutId) {
    case 'hero-stack': {
      const heroW = Math.round(W * 0.62);
      const rightW = W - heroW - m;
      const rh = Math.floor((H - m * 2) / 3);
      return [
        { x: 0, y: 0, w: heroW, h: H },
        { x: heroW + m, y: 0, w: rightW, h: rh },
        { x: heroW + m, y: rh + m, w: rightW, h: rh },
        { x: heroW + m, y: (rh + m) * 2 - m, w: rightW, h: H - (rh + m) * 2 + m },
      ];
    }
    case 'nine': {
      const cw = Math.floor((W - m * 2) / 3), ch = Math.floor((H - m * 2) / 3);
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        out.push({ x: c * (cw + m), y: r * (ch + m), w: cw, h: ch });
      }
      return out;
    }
    case 'fullbleed':
      return [{ x: 0, y: 0, w: W, h: H }];
    case 'tilted': {
      const pw = Math.round(W * 0.34), ph = Math.round(H * 0.52);
      const cy = Math.round(H * 0.34);
      return [
        { x: Math.round(W * 0.04), y: cy, w: pw, h: ph, angle: -0.07 },
        { x: Math.round(W * 0.33), y: Math.round(H * 0.40), w: pw, h: ph, angle: 0.045 },
        { x: Math.round(W * 0.62), y: cy, w: pw, h: ph, angle: -0.03 },
      ];
    }
    case 'duo': {
      const half = Math.floor((W - m) / 2);
      return [
        { x: 0, y: 0, w: half, h: H },
        { x: half + m, y: 0, w: W - half - m, h: H },
      ];
    }
    case 'grid':
    default: {
      const bigW = Math.round(W * 0.55), bigH = Math.round(H * 0.52);
      const rightX = bigW + m, rightW = W - rightX;
      const rh = Math.floor((bigH - m) / 2);
      const botY = bigH + m, botH = H - botY;
      const smallW = Math.round(W * 0.34);
      return [
        { x: 0, y: 0, w: bigW, h: bigH },
        { x: rightX, y: 0, w: rightW, h: rh },
        { x: rightX, y: rh + m, w: rightW, h: bigH - rh - m },
        { x: 0, y: botY, w: W - smallW - m, h: botH },
        { x: W - smallW, y: botY, w: smallW, h: botH },
      ];
    }
  }
}

// Draw one photo cover-fitted into a rect, honouring offset (-1..1) and zoom.
export function drawPanelPhoto(ctx, img, rect, panel) {
  const zoom = Math.max(1, panel?.zoom ?? 1);
  const ox = panel?.offsetX ?? 0, oy = panel?.offsetY ?? 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img || !img.naturalWidth) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, '#123a4d'); g.addColorStop(1, '#3d1650');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return;
  }
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  const slackX = Math.max(0, (dw - rect.w) / 2), slackY = Math.max(0, (dh - rect.h) / 2);
  const dx = rect.x + (rect.w - dw) / 2 + ox * slackX;
  const dy = rect.y + (rect.h - dh) / 2 + oy * slackY;
  ctx.drawImage(img, dx, dy, dw, dh);
  // Subtle inner shadow so each panel sits into the collage.
  const depth = Math.max(6, Math.round(rect.w * 0.03));
  const top = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + depth);
  top.addColorStop(0, 'rgba(0,0,0,0.28)'); top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top;
  ctx.fillRect(rect.x, rect.y, rect.w, depth);
  const left = ctx.createLinearGradient(rect.x, rect.y, rect.x + depth, rect.y);
  left.addColorStop(0, 'rgba(0,0,0,0.22)'); left.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = left;
  ctx.fillRect(rect.x, rect.y, depth, rect.h);
  ctx.restore();
}

// Shrink a title font size until the text fits maxWidth.
export function fitTitleFont(ctx, text, maxWidth, startSize, family = 'Anton') {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${size}px ${family}, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

function titleAnchor(layoutId, W, H) {
  switch (layoutId) {
    case 'fullbleed': return { x: W / 2, y: H * 0.80, align: 'center', band: true };
    case 'hero-stack': return { x: W * 0.035, y: H * 0.10, align: 'left' };
    case 'tilted': return { x: W / 2, y: H * 0.075, align: 'center' };
    case 'nine': return { x: W / 2, y: H * 0.44, align: 'center', plate: true };
    case 'duo': return { x: W / 2, y: H * 0.07, align: 'center' };
    case 'grid':
    default: return { x: W / 2, y: H * 0.055, align: 'center' };
  }
}

// Title, subtitle and tagline, styled per state.titleStyle.
export function drawTitleBlock(ctx, state, W, H) {
  const title = (state.title || '').toUpperCase();
  const a = titleAnchor(state.layout, W, H);
  ctx.save();
  if (a.band) {
    const bandH = H * 0.30;
    const grad = ctx.createLinearGradient(0, H - bandH, 0, H);
    grad.addColorStop(0, 'rgba(5,5,12,0)');
    grad.addColorStop(0.45, 'rgba(5,5,12,0.88)');
    grad.addColorStop(1, 'rgba(5,5,12,0.96)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - bandH, W, bandH);
  }
  if (a.plate) {
    ctx.fillStyle = 'rgba(6,6,14,0.72)';
    const pw = W * 0.72, ph = H * 0.20;
    ctx.fillRect(W / 2 - pw / 2, H * 0.36, pw, ph);
  }
  ctx.textAlign = a.align;
  ctx.textBaseline = 'top';
  const baseX = a.x;
  let y = a.y;
  if (a.band) y = H * 0.735;
  if (a.plate) y = H * 0.385;

  const size = fitTitleFont(ctx, title, W * 0.88, Math.round(H * 0.115));
  ctx.font = `${size}px Anton, sans-serif`;
  const style = state.titleStyle || 'block';
  if (style === 'sunset') {
    const g = ctx.createLinearGradient(0, y, 0, y + size);
    g.addColorStop(0, '#ffd319'); g.addColorStop(1, '#ff2975');
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(title, baseX, y);
    ctx.fillStyle = g;
    ctx.fillText(title, baseX, y);
  } else if (style === 'neon') {
    ctx.shadowColor = '#ff2fd6'; ctx.shadowBlur = size * 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, baseX, y);
    ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = size * 0.22;
    ctx.fillText(title, baseX, y);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillText(title, baseX + size * 0.045, y + size * 0.055);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, baseX, y);
  }

  y += size * 1.04;
  if (state.subtitle) {
    const sSize = Math.max(14, Math.round(size * 0.34));
    ctx.font = `${sSize}px Pacifico, cursive`;
    // A soft dark scrim behind the subtitle keeps the script lettering
    // legible where it straddles panel borders and bright photo areas.
    if (!a.plate && !a.band) {
      const sw = ctx.measureText(state.subtitle).width;
      const padX = sSize * 0.55, padY = sSize * 0.30;
      const rx = a.align === 'left' ? baseX - padX : baseX - sw / 2 - padX;
      ctx.fillStyle = 'rgba(5,5,14,0.52)';
      ctx.beginPath();
      ctx.roundRect(rx, y - padY * 0.4, sw + padX * 2, sSize + padY * 1.1, sSize * 0.4);
      ctx.fill();
    }
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(state.subtitle, baseX, y);
    ctx.shadowBlur = 0;
    y += sSize * 1.25;
  }
  ctx.restore();

  if (state.tagline) {
    ctx.save();
    // The tagline lives in its own backing strip along the bottom edge,
    // clear of panel frames and anything busy in the photos.
    const tSize = Math.max(12, Math.round(H * 0.026));
    const stripH = Math.max(30, Math.round(H * 0.052));
    ctx.fillStyle = 'rgba(5,5,12,0.82)';
    ctx.fillRect(0, H - stripH, W, stripH);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(0, H - stripH, W, Math.max(1, Math.round(stripH * 0.05)));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${tSize}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(tSize * 0.35)}px`; } catch { /* older engines */ }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.tagline.toUpperCase(), W / 2, H - stripH / 2 + 1);
    ctx.restore();
  }
}

// Five-star wanted/heat meter; (x, y) anchors the pill's top-right corner.
// A dark backing pill keeps the stars readable over any photo content.
export function drawHeatMeter(ctx, x, y, heat, size = 30) {
  ctx.save();
  const pillW = 5 * size * 1.08 + size * 0.7;
  const pillH = size * 1.5;
  ctx.fillStyle = 'rgba(5,5,12,0.58)';
  ctx.beginPath();
  ctx.roundRect(x - pillW, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${size}px sans-serif`;
  for (let i = 0; i < 5; i++) {
    const cx = x - (4 - i) * (size * 1.08) - size / 2;
    ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 5;
    ctx.fillStyle = i < heat ? '#ffc21f' : 'rgba(255,255,255,0.35)';
    ctx.fillText('★', cx, y + size * 0.75);
  }
  ctx.restore();
}

// Rotated ribbon across the top-left corner.
export function drawBadgeRibbon(ctx, W, H, text) {
  if (!text) return;
  ctx.save();
  const len = Math.min(W, H) * 0.46;
  const thick = Math.max(22, H * 0.042);
  // Anchor the strip's centre a little in from the corner, on the diagonal,
  // so the rotated ribbon crosses the corner and its text stays on-canvas.
  const inset = Math.min(W, H) * 0.062;
  ctx.translate(inset, inset);
  ctx.rotate(-Math.PI / 4);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  const g = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
  g.addColorStop(0, '#ff2975'); g.addColorStop(1, '#ff7a18');
  ctx.fillStyle = g;
  ctx.fillRect(-len / 2, -thick / 2, len, thick);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.font = `${Math.round(thick * 0.52)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text.toUpperCase(), 0, 1);
  ctx.restore();
}

let noiseCanvas = null;
// Seeded PRNG (mulberry32) so the film grain — and therefore every render
// of the same state — is deterministic across runs and machines.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function getNoise(size = 256) {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = size; noiseCanvas.height = size;
  const nctx = noiseCanvas.getContext('2d');
  const img = nctx.createImageData(size, size);
  const rand = mulberry32(0x5eed1234);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 256);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  return noiseCanvas;
}

function drawPanelFrame(ctx, rect, W) {
  const bw = Math.max(3, Math.round(W * 0.01));
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = bw;
  ctx.strokeRect(rect.x + bw / 2, rect.y + bw / 2, rect.w - bw, rect.h - bw);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(1, bw * 0.35);
  const inset = bw + 3;
  ctx.strokeRect(rect.x + inset, rect.y + inset, rect.w - inset * 2, rect.h - inset * 2);
  ctx.restore();
}

// Full render: photos -> grade -> frames -> lettering -> extras.
export function renderCover(canvas, state) {
  const W = canvas.width, H = canvas.height;
  if (!W || !H) return;
  const stage = document.createElement('canvas');
  stage.width = W; stage.height = H;
  const sctx = stage.getContext('2d');
  sctx.fillStyle = '#0a0a12';
  sctx.fillRect(0, 0, W, H);

  const rects = layoutPanels(state.layout, W, H);
  const panels = state.panels || [];

  if (state.layout === 'tilted') {
    // Dimmed full-bleed backdrop from the first panel's photo.
    drawPanelPhoto(sctx, panels[0]?.img, { x: 0, y: 0, w: W, h: H }, panels[0]);
    sctx.fillStyle = 'rgba(8,6,20,0.55)';
    sctx.fillRect(0, 0, W, H);
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const p = panels[i] || {};
      sctx.save();
      sctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      sctx.rotate(r.angle || 0);
      sctx.shadowColor = 'rgba(0,0,0,0.65)'; sctx.shadowBlur = 26; sctx.shadowOffsetY = 10;
      sctx.fillStyle = '#ffffff';
      const pad = Math.round(W * 0.012);
      sctx.fillRect(-r.w / 2 - pad, -r.h / 2 - pad, r.w + pad * 2, r.h + pad * 2 + pad * 1.6);
      sctx.shadowBlur = 0; sctx.shadowOffsetY = 0;
      drawPanelPhoto(sctx, p.img, { x: -r.w / 2, y: -r.h / 2, w: r.w, h: r.h }, p);
      sctx.restore();
    }
  } else {
    for (let i = 0; i < rects.length; i++) {
      drawPanelPhoto(sctx, panels[i]?.img, rects[i], panels[i]);
    }
  }

  // Grade the composed photo area before any lettering goes on.
  const grade = GRADES.find((g) => g.id === state.grade) || GRADES[0];
  const lut = lutForGrade(grade);
  const frame = sctx.getImageData(0, 0, W, H);
  applyGradeLUT(frame, lut);
  sctx.putImageData(frame, 0, 0);

  if (grade.halftone) {
    sctx.save();
    sctx.fillStyle = 'rgba(0,0,0,0.16)';
    const gap = Math.max(6, Math.round(W * 0.008));
    for (let yy = gap / 2; yy < H; yy += gap) {
      for (let xx = gap / 2; xx < W; xx += gap) {
        sctx.beginPath(); sctx.arc(xx, yy, gap * 0.16, 0, Math.PI * 2); sctx.fill();
      }
    }
    sctx.restore();
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(stage, 0, 0);

  if (state.layout !== 'tilted' && state.layout !== 'fullbleed') {
    for (const r of rects) drawPanelFrame(ctx, r, W);
  }

  if (state.selectedPanel != null && state.showSelection) {
    const r = rects[state.selectedPanel];
    if (r) {
      ctx.save();
      ctx.strokeStyle = '#b4f224';
      ctx.lineWidth = Math.max(3, W * 0.006);
      ctx.setLineDash([14, 9]);
      ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      ctx.restore();
    }
  }

  drawTitleBlock(ctx, state, W, H);
  if (state.badgeOn) drawBadgeRibbon(ctx, W, H, state.badge);
  if (state.heat > 0) {
    const hSize = Math.max(18, Math.round(H * 0.034));
    const stripH = Math.max(30, Math.round(H * 0.052));
    // Scenes may move the meter to the bottom-right, above the tagline
    // strip, when the top-right corner of the composition holds a face.
    const hy = state.heatAnchor === 'bottom-right'
      ? H - stripH - hSize * 1.5 - H * 0.016
      : H * 0.018;
    drawHeatMeter(ctx, W * 0.985, hy, state.heat, hSize);
  }

  if (state.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.grain) {
    const noise = getNoise();
    ctx.save();
    ctx.globalAlpha = 0.07;
    const pat = ctx.createPattern(noise, 'repeat');
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
}
