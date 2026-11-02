// Procedural canvas textures (no external image assets except the KepoMisteri logo).
import * as THREE from 'three';

// deterministic RNG so every render is identical
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export function tex(c, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// soft value-noise layer drawn by stacking blurred random blobs
function speckle(ctx, w, h, n, colors, rmin, rmax, alpha, r) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * (0.4 + 0.6 * r());
    ctx.fillStyle = colors[(r() * colors.length) | 0];
    const x = r() * w, y = r() * h, rad = rmin + (rmax - rmin) * r();
    for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { // wrap for tiling
      if (x + ox + rad < 0 || x + ox - rad > w || y + oy + rad < 0 || y + oy - rad > h) continue;
      ctx.beginPath(); ctx.ellipse(x + ox, y + oy, rad, rad * (0.6 + 0.4 * r()), r() * 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function grassTex(stripes = false, seed = 3) {
  const w = 512, c = canvas(w, w), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = '#4c6b34'; x.fillRect(0, 0, w, w);
  speckle(x, w, w, 400, ['#3f5d2a', '#587a3c', '#466530', '#5e7f40'], 10, 40, 0.35, r);
  x.lineWidth = 1.2;
  for (let i = 0; i < 9000; i++) {
    const px = r() * w, py = r() * w, l = 3 + r() * 6, a = -Math.PI / 2 + (r() - 0.5) * 0.8;
    x.strokeStyle = ['#36522a', '#6b8d47', '#4f7235', '#7a9a52', '#2f4823'][(r() * 5) | 0];
    x.globalAlpha = 0.5 + r() * 0.5; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  x.globalAlpha = 1;
  if (stripes) { for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,230,0.07)' : 'rgba(0,20,0,0.07)'; x.fillRect(i * w / 4, 0, w / 4, w); } }
  return c;
}

export function sandTex(seed = 5, base = '#c9a874') {
  const w = 512, c = canvas(w, w), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, w, w);
  speckle(x, w, w, 300, ['#b8955f', '#d8b988', '#c19c66', '#e0c497'], 8, 30, 0.3, r);
  const im = x.getImageData(0, 0, w, w), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 60; d[i] += n; d[i + 1] += n * 0.9; d[i + 2] += n * 0.7; }
  x.putImageData(im, 0, 0);
  for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(90,60,30,0.35)' : 'rgba(255,240,210,0.4)'; x.fillRect(r() * w, r() * w, 1.5, 1.5); }
  return c;
}

export function asphaltTex(seed = 7) {
  const w = 512, c = canvas(w, w), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = '#3a3b3d'; x.fillRect(0, 0, w, w);
  speckle(x, w, w, 250, ['#2e2f31', '#46474a', '#333436', '#505154'], 10, 60, 0.35, r);
  const im = x.getImageData(0, 0, w, w), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 50; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(im, 0, 0);
  x.strokeStyle = 'rgba(20,20,20,0.6)'; x.lineWidth = 1;
  for (let i = 0; i < 12; i++) { x.beginPath(); let px = r() * w, py = r() * w; x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (r() - 0.5) * 30; py += (r() - 0.5) * 30; x.lineTo(px, py); } x.stroke(); }
  return c;
}

export function roadTex() { // one lane-pair segment, repeat along length (v)
  const w = 512, h = 1024, c = canvas(w, h), x = c.getContext('2d');
  x.drawImage(asphaltTex(11), 0, 0, w, h / 2); x.drawImage(asphaltTex(11), 0, h / 2, w, h / 2);
  x.fillStyle = 'rgba(235,235,225,0.85)'; x.fillRect(w / 2 - 5, 80, 10, 360); x.fillRect(w / 2 - 5, 592, 10, 360);
  x.fillStyle = 'rgba(230,230,220,0.8)'; x.fillRect(14, 0, 8, h); x.fillRect(w - 22, 0, 8, h);
  return c;
}

export function tileFloorTex(seed = 9, a = '#d9d2c4', b = '#cfc7b8', n = 4) {
  const w = 512, c = canvas(w, w), x = c.getContext('2d'), r = rng(seed), s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    x.fillStyle = r() < 0.5 ? a : b; x.fillRect(i * s, j * s, s, s);
    speckle(x, w, w, 0, [], 0, 0, 0, r);
    for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(120,110,95,${0.05 + r() * 0.08})`; x.beginPath(); x.ellipse(i * s + r() * s, j * s + r() * s, 4 + r() * 18, 2 + r() * 8, r() * 3, 0, 7); x.fill(); }
  }
  x.strokeStyle = 'rgba(90,85,75,0.8)'; x.lineWidth = 3;
  for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, w); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); }
  return c;
}

export function woodTex(seed = 13, base = '#6b4428') {
  const w = 512, c = canvas(w, w), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 260; i++) {
    const y = r() * w; x.strokeStyle = r() < 0.5 ? 'rgba(40,22,10,0.25)' : 'rgba(150,100,60,0.2)'; x.lineWidth = 0.5 + r() * 2.5;
    x.beginPath(); x.moveTo(0, y); for (let px = 0; px <= w; px += 32) x.lineTo(px, y + Math.sin(px * 0.02 + i) * 3 + (r() - 0.5) * 2); x.stroke();
  }
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(25,12,5,0.5)'; x.fillRect(0, (i * w) / 6, w, 2); }
  return c;
}

export function plasterTex(seed = 17, base = '#e6e0d4') {
  const w = 512, c = canvas(w, w), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, w, w);
  speckle(x, w, w, 500, ['rgba(0,0,0,0.5)', 'rgba(255,255,255,0.6)', 'rgba(120,100,80,0.5)'], 6, 40, 0.06, r);
  const im = x.getImageData(0, 0, w, w), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(im, 0, 0);
  return c;
}

export function concreteTex(seed = 19) {
  const c = plasterTex(seed, '#7d7a74'), x = c.getContext('2d'), r = rng(seed + 1);
  speckle(x, 512, 512, 200, ['#5e5b55', '#8f8b84', '#4a4844'], 10, 70, 0.25, r);
  x.strokeStyle = 'rgba(30,30,30,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 256); x.lineTo(512, 256); x.moveTo(256, 0); x.lineTo(256, 512); x.stroke();
  return c;
}

export function fabricTex(base, seed = 23, weave = 'rgba(0,0,0,0.08)') {
  const w = 256, c = canvas(w, w), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, w, w);
  x.strokeStyle = weave; x.lineWidth = 1;
  for (let i = 0; i < w; i += 3) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, w); x.stroke(); x.beginPath(); x.moveTo(0, i + 1); x.lineTo(w, i + 1); x.stroke(); }
  speckle(x, w, w, 120, ['rgba(255,255,255,0.5)', 'rgba(0,0,0,0.5)'], 4, 20, 0.05, r);
  return c;
}

// Papa's batik: brown with ochre ring motifs (as in the turnaround reference)
export function batikTex() {
  const w = 512, c = canvas(w, w), x = c.getContext('2d'), r = rng(29);
  x.fillStyle = '#8a4f22'; x.fillRect(0, 0, w, w);
  speckle(x, w, w, 200, ['#7a431b', '#955a29', '#6e3c18'], 8, 30, 0.3, r);
  const ring = (cx, cy, s) => {
    x.strokeStyle = '#e0b24a'; x.lineWidth = 3.2 * s; x.beginPath(); x.arc(cx, cy, 11 * s, 0, 7); x.stroke();
    x.fillStyle = '#3a1d0b'; x.beginPath(); x.arc(cx, cy, 6 * s, 0, 7); x.fill();
    x.fillStyle = '#e0b24a'; x.beginPath(); x.arc(cx, cy, 2.4 * s, 0, 7); x.fill();
  };
  for (let i = 0; i < 46; i++) { const cx = r() * w, cy = r() * w, s = 0.8 + r() * 0.6; for (const ox of [0, -w, w]) for (const oy of [0, -w, w]) ring(cx + ox, cy + oy, s); }
  for (let i = 0; i < 30; i++) { // little isen dots
    const cx = r() * w, cy = r() * w; x.fillStyle = '#c99436'; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(cx + k * 9, cy, 2.5, 0, 7); x.fill(); }
  }
  return c;
}

export function ulosTex() {
  const w = 64, h = 256, c = canvas(w, h), x = c.getContext('2d');
  const cols = ['#1a1414', '#f2ece0', '#b3191f', '#1a1414', '#f2ece0', '#b3191f', '#1a1414'];
  cols.forEach((cl, i) => { x.fillStyle = cl; x.fillRect(i * w / cols.length, 0, w / cols.length + 1, h); });
  for (let y = 0; y < h; y += 8) { x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(0, y, w, 2); }
  return c;
}

export function skyTex(top = '#7d8893', mid = '#a9b2b8', bot = '#c4c8c6', clouds = 0.8, seed = 31) {
  const w = 2048, h = 1024, c = canvas(w, h), x = c.getContext('2d'), r = rng(seed);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(0.42, mid); g.addColorStop(0.5, bot); g.addColorStop(1, bot);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // layered soft cloud masses
  for (let i = 0; i < 900 * clouds; i++) {
    const cx = r() * w, cy = h * (0.05 + r() * 0.42), rad = 30 + r() * 120;
    const gg = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const dark = r() < 0.45; const a = 0.05 + r() * 0.08;
    gg.addColorStop(0, dark ? `rgba(70,78,88,${a})` : `rgba(230,233,235,${a})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gg; x.beginPath(); x.ellipse(cx, cy, rad * 2.2, rad * 0.7, 0, 0, 7); x.fill();
  }
  return c;
}

// generic radial glow sprite / light-shaft gradient
export function glowTex() {
  const w = 128, c = canvas(w, w), x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, w); return c;
}
export function shaftTex() {
  const w = 128, h = 256, c = canvas(w, h), x = c.getContext('2d');
  const gx = x.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gx; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'destination-in';
  const gy = x.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(0,0,0,0.9)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gy; x.fillRect(0, 0, w, h); return c;
}

// --- Branding: KepoMisteri billboards / banners -------------------------------------------
export function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

let LOGO = null;
export async function initBrand() { LOGO = await loadImage('/assets/kepomisteri_logo.png'); }
export function logoImg() { return LOGO; }

function drawLogo(x, cx, cy, size) { x.drawImage(LOGO, cx - size / 2, cy - size / 2, size, size); }

// style: 'billboard' (wide), 'banner' (vertical roll-up), 'fence' (long low board), 'poster'
export function brandTex(style = 'billboard', variant = 0) {
  const dims = { billboard: [1536, 640], banner: [512, 1280], fence: [2048, 256], poster: [768, 1024], flag: [512, 1024] }[style];
  const [w, h] = dims; const c = canvas(w, h), x = c.getContext('2d'); const r = rng(41 + variant);
  // dark paper-grain background with red accent (brand palette from the logo)
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#15161a'); g.addColorStop(1, '#262125'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  speckle(x, w, h, 300, ['rgba(255,255,255,0.6)', 'rgba(160,20,20,0.6)'], 3, 18, 0.03, r);
  x.fillStyle = '#a3161a';
  const font = (wt, s) => `${wt} ${s}px Inter, "DejaVu Sans", sans-serif`;
  x.textBaseline = 'middle';
  if (style === 'billboard') {
    x.fillRect(0, h - 70, w, 70);
    drawLogo(x, h * 0.5, h * 0.48, h * 0.95);
    x.fillStyle = '#f1ece4'; x.font = font(800, 92); x.textAlign = 'left';
    const lines = [['Kepo sama misteri?', 'Kami selidiki sampai tuntas.'], ['Setiap misteri', 'punya jejak.'], ['Penasaran itu', 'awal kebenaran.']][variant % 3];
    x.fillText(lines[0], h * 0.98, h * 0.33); x.fillStyle = '#d7cfc4'; x.font = font(500, 60); x.fillText(lines[1], h * 0.98, h * 0.53);
    x.fillStyle = '#f1ece4'; x.font = font(700, 40); x.fillText('TONTON SERIAL "PASIR" — HANYA DI KEPOMISTERI', 60, h - 35);
    x.fillStyle = '#a3161a'; x.fillRect(h * 0.98, h * 0.66, 160, 10);
  } else if (style === 'banner') {
    x.fillRect(0, 0, w, 40); x.fillRect(0, h - 40, w, 40);
    drawLogo(x, w / 2, h * 0.3, w * 0.98);
    x.fillStyle = '#f1ece4'; x.textAlign = 'center'; x.font = font(800, 64); x.fillText('KEPO?', w / 2, h * 0.62);
    x.font = font(500, 40); x.fillStyle = '#d7cfc4'; x.fillText('Selidiki sampai', w / 2, h * 0.7); x.fillText('tuntas.', w / 2, h * 0.75);
    x.fillStyle = '#a3161a'; x.fillRect(w / 2 - 80, h * 0.82, 160, 8);
    x.fillStyle = '#f1ece4'; x.font = font(700, 30); x.fillText('Official Partner', w / 2, h * 0.88);
  } else if (style === 'fence') {
    for (let i = 0; i < 4; i++) { drawLogo(x, 128 + i * 512, h / 2, h * 1.05); x.fillStyle = '#f1ece4'; x.textAlign = 'left'; x.font = font(800, 54); x.fillText(i % 2 ? 'SELIDIKI SAMPAI TUNTAS' : 'KEPOMISTERI', 270 + i * 512, h / 2); }
    x.fillStyle = '#a3161a'; x.fillRect(0, 0, w, 14); x.fillRect(0, h - 14, w, 14);
  } else if (style === 'poster') {
    drawLogo(x, w / 2, h * 0.38, w * 0.95);
    x.fillStyle = '#a3161a'; x.fillRect(0, h * 0.74, w, h * 0.26);
    x.fillStyle = '#f1ece4'; x.textAlign = 'center'; x.font = font(800, 66); x.fillText('SERIAL BARU: PASIR', w / 2, h * 0.82);
    x.font = font(500, 40); x.fillText('Setiap TKP berantakan. Selalu ada pasir.', w / 2, h * 0.9);
  } else if (style === 'flag') {
    x.fillStyle = '#a3161a'; x.fillRect(0, 0, w, h); x.fillStyle = '#17181c'; x.fillRect(24, 24, w - 48, h - 48);
    drawLogo(x, w / 2, h * 0.4, w * 0.95); x.fillStyle = '#f1ece4'; x.textAlign = 'center'; x.font = font(800, 54); x.fillText('KEPO?', w / 2, h * 0.78);
  }
  return c;
}

// generic shop sign for Tambun shophouses (ruko)
export function shopSignTex(text, sub, bg, fg = '#ffffff', seed = 1) {
  const w = 1024, h = 256, c = canvas(w, h), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  speckle(x, w, h, 80, ['rgba(0,0,0,0.6)', 'rgba(255,255,255,0.5)'], 6, 30, 0.05, r);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 92px Inter, sans-serif'; x.fillText(text, w / 2, h * 0.42);
  x.font = '500 40px Inter, sans-serif'; x.fillText(sub, w / 2, h * 0.8);
  return c;
}

// house number plate etc.
export function labelTex(text, bg = '#222', fg = '#eee', w = 256, h = 128, size = 64) {
  const c = canvas(w, h), x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `700 ${size}px Inter, sans-serif`; x.fillText(text, w / 2, h / 2); return c;
}
