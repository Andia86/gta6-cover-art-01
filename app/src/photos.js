// Photo store: owns the image list (bundled samples + user uploads) and
// hands out plain entries the editor can assign to panels.

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

export class PhotoStore {
  constructor() {
    this.photos = []; // {id, name, img, url, sample}
    this.nextId = 1;
    this.listeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.photos);
  }

  add(img, name, { sample = false, url = null } = {}) {
    const entry = { id: this.nextId++, name, img, url, sample };
    this.photos.push(entry);
    this.emit();
    return entry;
  }

  async addSample(src, name) {
    const img = await loadImage(src);
    return this.add(img, name, { sample: true, url: src });
  }

  async addFile(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      return this.add(img, file.name, { url });
    } catch (err) {
      URL.revokeObjectURL(url);
      throw err;
    }
  }

  async addFiles(fileList) {
    const added = [];
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue;
      added.push(await this.addFile(file));
    }
    return added;
  }

  remove(id) {
    const i = this.photos.findIndex((p) => p.id === id);
    if (i === -1) return;
    const [entry] = this.photos.splice(i, 1);
    if (entry.url && !entry.sample) URL.revokeObjectURL(entry.url);
    this.emit();
  }

  get(id) {
    return this.photos.find((p) => p.id === id) || null;
  }
}

export function defaultPanelAssignments(store, panelCount) {
  // Boulevard leads (large / hero panels), pier fills the rest.
  const boulevard = store.photos.find((p) => p.name.toLowerCase().includes('boulevard'));
  const pier = store.photos.find((p) => p.name.toLowerCase().includes('pier'));
  const fallback = store.photos[0] || null;
  const lead = boulevard || fallback;
  const rest = pier || fallback;
  return Array.from({ length: panelCount }, (_, i) => (i === 0 ? lead : rest));
}
