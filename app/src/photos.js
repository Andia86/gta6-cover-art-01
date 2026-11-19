// Vice Panels — photo store.
// Holds every photo the editor knows about (the two bundled samples plus
// anything the user drops in), and the per-panel assignment table that
// says which photo sits in which panel and how it is framed there.

export const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', label: 'Pier', src: 'samples/pier.jpg' },
];

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Load the bundled samples; resolves to { id: {id,label,img} }.
export async function loadSamples() {
  const photos = {};
  for (const s of SAMPLES) {
    photos[s.id] = { id: s.id, label: s.label, img: await loadImage(s.src) };
  }
  return photos;
}

// Turn File objects into photo entries via object URLs (all local).
export async function loadUserFiles(files, photos) {
  const added = [];
  let n = Object.keys(photos).length;
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    const id = `user-${++n}`;
    photos[id] = { id, label: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || id, img };
    added.push(id);
  }
  return added;
}

// The default panel assignment: boulevard anchors the big panels,
// pier fills the rest — the mix a finished cover opens with.
export function defaultPanels(panelCount) {
  const order = ['boulevard', 'pier', 'pier', 'boulevard', 'pier', 'boulevard', 'pier', 'pier', 'boulevard'];
  const out = [];
  for (let i = 0; i < panelCount; i++) {
    out.push({ photoId: order[i % order.length], dx: 0, dy: 0, zoom: 1 });
  }
  return out;
}

// Make sure the assignment table covers panelCount panels.
export function ensurePanels(state, panelCount) {
  while (state.panels.length < panelCount) {
    const fresh = defaultPanels(panelCount);
    state.panels.push(fresh[state.panels.length]);
  }
}
