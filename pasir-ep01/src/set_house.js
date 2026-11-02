// SCENES 04-07: Nando's house in Tambun (exterior + ransacked interior + sand evidence).
import * as THREE from 'three';
import { M, mesh, box, rbox, cyl, sky, makeTree, makePalm, swayTrees, lightShaft, dust, animateDust, glowSprite, shadowSun, rng, tex } from './common.js';
import { tileFloorTex, woodTex, plasterTex, sandTex, fabricTex, concreteTex, labelTex, asphaltTex, brandTex } from './textures.js';
import { makeRing } from './characters.js';

// axis-aligned wall with rectangular holes. along='x' => wall spans x from a to b at fixed z=c
function wall(group, along, a, b, c, h, holes, mat, th = 0.16) {
  const add = (p0, p1, y0, y1) => {
    if (p1 - p0 < 1e-3 || y1 - y0 < 1e-3) return;
    const L = p1 - p0, mid = (p0 + p1) / 2, ym = (y0 + y1) / 2;
    const m = along === 'x' ? box(L, y1 - y0, th, mat, mid, ym, c) : box(th, y1 - y0, L, mat, c, ym, mid);
    group.add(m);
  };
  holes = [...holes].sort((p, q) => p[0] - q[0]);
  let cur = a;
  for (const [h0, h1, y0, y1] of holes) { add(cur, h0, 0, h); add(h0, h1, 0, y0); add(h0, h1, y1, h); cur = h1; }
  add(cur, b, 0, h);
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// sand patch texture with irregular alpha; optional carved symbol layer
function sandPatchTex(seed, withSymbol = false) {
  const w = 1024, c = canvas(w, w), x = c.getContext('2d'); const r = rng(seed);
  const s = sandTex(seed, '#cdb184');
  x.save(); x.beginPath();
  for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; const rr = w * 0.36 * (1 + 0.18 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 7 + seed * 2) + (r() - 0.5) * 0.08); const px = w / 2 + Math.cos(a) * rr, py = w / 2 + Math.sin(a) * rr; i ? x.lineTo(px, py) : x.moveTo(px, py); }
  x.closePath(); x.filter = 'blur(10px)'; x.fillStyle = '#fff'; x.fill(); x.restore(); x.filter = 'none';
  x.globalCompositeOperation = 'source-in'; x.drawImage(s, 0, 0, w, w); x.globalCompositeOperation = 'source-over';
  // scattered outer grains
  for (let i = 0; i < 2500; i++) { const a = r() * 6.28, d = w * (0.3 + r() * 0.2); x.fillStyle = `rgba(${190 + r() * 40},${160 + r() * 30},${110 + r() * 30},${0.4 + r() * 0.5})`; x.fillRect(w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, 2, 2); }
  return c;
}
export function symbolTex() { // carved groove: circle + hourglass + bar (the mystery symbol)
  const w = 1024, c = canvas(w, w), x = c.getContext('2d');
  const path = () => {
    x.beginPath(); x.arc(w / 2, w / 2, 250, 0, Math.PI * 2);
    x.moveTo(w / 2 - 150, w / 2 - 170); x.lineTo(w / 2 + 150, w / 2 - 170); x.lineTo(w / 2, w / 2); x.lineTo(w / 2 + 150, w / 2 + 170); x.lineTo(w / 2 - 150, w / 2 + 170); x.lineTo(w / 2, w / 2); x.closePath();
    x.moveTo(w / 2 - 330, w / 2); x.lineTo(w / 2 - 250, w / 2); x.moveTo(w / 2 + 250, w / 2); x.lineTo(w / 2 + 330, w / 2);
  };
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.translate(6, 7); x.strokeStyle = 'rgba(255,245,220,0.55)'; x.lineWidth = 22; path(); x.stroke(); // lit ridge
  x.translate(-12, -14); x.strokeStyle = 'rgba(60,38,16,0.85)'; x.lineWidth = 26; path(); x.stroke(); // groove shadow
  x.translate(6, 7); x.strokeStyle = 'rgba(110,78,40,0.9)'; x.lineWidth = 12; path(); x.stroke();
  return c;
}
function footprintTex() {
  const w = 128, h = 256, c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = 'rgba(205,177,132,0.9)'; x.beginPath(); x.ellipse(64, 80, 40, 66, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(64, 196, 32, 44, 0, 0, 7); x.fill();
  x.globalCompositeOperation = 'source-atop'; for (let i = 0; i < 9; i++) { x.fillStyle = 'rgba(120,90,50,0.35)'; x.fillRect(20, 30 + i * 14, 88, 4); }
  return c;
}

export function buildHouse(assets = {}) {
  const s = new THREE.Scene(); const r = rng(505);
  const fogC = new THREE.Color(0x9fa3a6); s.fog = new THREE.Fog(fogC, 25, 260); s.background = fogC;
  sky(s, ['#5d6670', '#9aa0a4', '#b4b3ad'], 600, 1.2, 55);
  const hemi = new THREE.HemisphereLight(0xc2c8cf, 0x4e4a42, 1.2); s.add(hemi);
  const sun = shadowSun(s, 0xffe9cf, 2.2, [9, 11, 14], [0, 0, -4], 13, 2048);

  const plaster = new THREE.MeshStandardMaterial({ map: tex(plasterTex(91, '#e9e3d6'), { repeat: [3, 2] }), roughness: 0.92 });
  const plasterInt = new THREE.MeshStandardMaterial({ map: tex(plasterTex(92, '#d9cfbd'), { repeat: [3, 2] }), roughness: 0.95 });
  const floorM = new THREE.MeshStandardMaterial({ map: tex(tileFloorTex(93, '#d6cdbb', '#cdc3b0', 4), { repeat: [10, 10] }), roughness: 0.35, metalness: 0.05 });
  const woodM = new THREE.MeshStandardMaterial({ map: tex(woodTex(94, '#5a3820'), { repeat: [1, 1] }), roughness: 0.55 });
  const woodL = new THREE.MeshStandardMaterial({ map: tex(woodTex(95, '#8a6038'), { repeat: [1, 1] }), roughness: 0.55 });
  const H = 3.0;

  // ---------- exterior ----------
  const ground = mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: tex(asphaltTex(21), { repeat: [80, 80] }), color: 0x9a968c, roughness: 1 }), { cast: false }); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.16; s.add(ground);
  const yard = mesh(new THREE.PlaneGeometry(12, 7.2), new THREE.MeshStandardMaterial({ map: tex(tileFloorTex(96, '#8d8a84', '#86837d', 6), { repeat: [4, 3] }), roughness: 0.8 }), { cast: false }); yard.rotation.x = -Math.PI / 2; yard.position.set(0, -0.15, 3.6); s.add(yard);
  s.add(box(12, 0.15, 2.4, new THREE.MeshStandardMaterial({ map: tex(tileFloorTex(97, '#b9b1a2', '#b1a998', 4), { repeat: [6, 2] }), roughness: 0.5 }), 0, -0.075, 1.2, { cast: false })); // porch
  const street = mesh(new THREE.PlaneGeometry(200, 7), new THREE.MeshStandardMaterial({ map: tex(asphaltTex(23), { repeat: [40, 2] }), roughness: 0.9 }), { cast: false }); street.rotation.x = -Math.PI / 2; street.position.set(0, -0.15, 11.5); s.add(street);
  const floor = mesh(new THREE.PlaneGeometry(12.2, 13.2), floorM, { cast: false }); floor.rotation.x = -Math.PI / 2; floor.position.set(2, 0.001, -6.5); s.add(floor);
  const ceil = mesh(new THREE.PlaneGeometry(12.2, 13.2), M(0xe9e4da, 0.95), { cast: false }); ceil.rotation.x = Math.PI / 2; ceil.position.set(2, H, -6.5); s.add(ceil);

  const shell = new THREE.Group(); s.add(shell);
  // front facade z=0 (door x -0.5..0.5, windows)
  wall(shell, 'x', -4.1, 8.1, 0, H, [[-0.55, 0.55, 0, 2.25], [-3.2, -1.6, 0.9, 2.3], [1.6, 3.2, 0.9, 2.3], [5.2, 7.0, 0.9, 2.3]], plaster, 0.2);
  // side walls, back walls, partitions
  wall(shell, 'z', -13.1, 0, -4.1, H, [], plasterInt, 0.2);
  wall(shell, 'z', -13.1, 0, 8.1, H, [[-4.2, -2.4, 0.9, 2.3]], plasterInt, 0.2);
  wall(shell, 'x', -4.1, 8.1, -13.1, H, [[-1.4, 0.8, 0.9, 2.3]], plasterInt, 0.2);
  wall(shell, 'x', -4.1, 4.0, -7.0, H, [[1.0, 2.4, 0, 2.3]], plasterInt, 0.14); // LR/FR divider with hallway opening
  wall(shell, 'z', -7.0, 0, 4.0, H, [[-3.2, -2.2, 0, 2.2]], plasterInt, 0.14); // LR/bedroom divider with door
  wall(shell, 'x', 4.0, 8.1, -7.0, H, [], plasterInt, 0.14);
  // upper storey + roof (exterior only)
  s.add(box(12.4, 3.0, 13.4, plaster, 2, H + 1.52, -6.5));
  for (const i of [-1, 1]) s.add(box(1.8, 1.4, 0.06, M(0x2a3238, 0.08, { metalness: 0.6 }), 2 + i * 3, H + 1.6, 0.21));
  const roof = mesh(new THREE.ConeGeometry(9.8, 3.2, 4), M(0x4b3a33, 0.75)); roof.rotation.y = Math.PI / 4; roof.position.set(2, H + 4.6, -6.5); roof.scale.set(1, 1, 1.05); s.add(roof);
  // windows glass + frames + curtains
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fb0b8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  for (const [x0, x1] of [[-3.2, -1.6], [1.6, 3.2], [5.2, 7.0]]) {
    const g = mesh(new THREE.PlaneGeometry(x1 - x0, 1.4), glass, { cast: false }); g.position.set((x0 + x1) / 2, 1.6, 0); s.add(g);
    s.add(box(x1 - x0 + 0.1, 0.06, 0.24, woodM, (x0 + x1) / 2, 0.9, 0)); s.add(box(x1 - x0 + 0.1, 0.06, 0.24, woodM, (x0 + x1) / 2, 2.3, 0)); s.add(box(0.05, 1.4, 0.22, woodM, (x0 + x1) / 2, 1.6, 0));
    const cur = M(0xcdbfa4, 0.95, { side: THREE.DoubleSide }); const cu = mesh(new THREE.PlaneGeometry(0.5, 1.6, 6, 1), cur); const p = cu.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 30) * 0.03); cu.position.set(x0 + 0.25, 1.55, -0.18); s.add(cu);
  }
  // front door (hinged at x=-0.5), frame, handle, number, lamp
  const doorPivot = new THREE.Group(); doorPivot.position.set(-0.5, 0, 0); s.add(doorPivot);
  const door = box(1.0, 2.22, 0.06, woodM, 0.5, 1.11, 0); doorPivot.add(door);
  for (let i = 0; i < 3; i++) doorPivot.add(box(0.7, 0.5, 0.02, woodL, 0.5, 0.45 + i * 0.68, 0.035));
  const handle = cyl(0.015, 0.015, 0.14, M(0xc0b090, 0.2, { metalness: 1 }), 0.88, 1.05, 0.06, 8); handle.rotation.z = Math.PI / 2; doorPivot.add(handle);
  const handle2 = handle.clone(); handle2.position.z = -0.06; doorPivot.add(handle2);
  s.add(box(0.1, 2.3, 0.26, woodM, -0.58, 1.15, 0)); s.add(box(0.1, 2.3, 0.26, woodM, 0.58, 1.15, 0)); s.add(box(1.26, 0.1, 0.26, woodM, 0, 2.3, 0));
  const num = mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshStandardMaterial({ map: tex(labelTex('No. 17', '#2a2522', '#e8dcc4', 256, 128, 60)) }), { cast: false }); num.position.set(1.0, 2.0, 0.11); s.add(num);
  const lamp = cyl(0.08, 0.1, 0.25, new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffd9a0, emissiveIntensity: 0.6 }), -1.0, 2.0, 0.18, 12); s.add(lamp);
  // fence + gate (open)
  const fenceM = M(0x1c1c1e, 0.5, { metalness: 0.7 });
  for (const [x0, x1] of [[-6, -1.6], [3.0, 10]]) { for (let x = x0; x <= x1; x += 0.18) s.add(box(0.03, 1.6, 0.03, fenceM, x, 0.65, 7.2, { cast: true })); s.add(box(x1 - x0, 0.06, 0.06, fenceM, (x0 + x1) / 2, 1.45, 7.2)); s.add(box(x1 - x0, 0.06, 0.06, fenceM, (x0 + x1) / 2, 0.05, 7.2)); }
  const gate = new THREE.Group(); gate.position.set(-3.2, 0, 7.4); s.add(gate); for (let x = 0; x <= 2.4; x += 0.18) gate.add(box(0.03, 1.6, 0.03, fenceM, x - 1.2, 0.65, 0)); gate.add(box(2.4, 0.06, 0.06, fenceM, 0, 1.45, 0));
  s.add(box(0.4, 1.9, 0.4, plaster, -1.6, 0.8, 7.2)); s.add(box(0.4, 1.9, 0.4, plaster, 3.0, 0.8, 7.2));
  // plants
  const potM = M(0x7a4a32, 0.8);
  for (const [x, z] of [[-1.3, 0.8], [1.3, 0.8], [-3.6, 3.5], [6, 3.6]]) { s.add(cyl(0.22, 0.16, 0.4, potM, x, 0.05, z, 14)); for (let i = 0; i < 7; i++) { const l = mesh(new THREE.SphereGeometry(0.16, 10, 8), M(0x2f5a2a, 0.8)); l.scale.set(0.5, 1.4, 0.3); l.position.set(x + (r() - 0.5) * 0.25, 0.45 + r() * 0.25, z + (r() - 0.5) * 0.25); l.rotation.set((r() - 0.5), r() * 6, (r() - 0.5)); s.add(l); } }
  const trees = [];
  for (const [x, z] of [[-9, 4], [12, 3], [-14, -4], [16, -8], [-20, 14], [22, 15], [6, 16], [-6, 17]]) { const t = r() < 0.4 ? makePalm(r, 8) : makeTree(r, { h: 6 + r() * 2, spread: 2.2 }); t.position.set(x, -0.15, z); s.add(t); trees.push(t); }
  // neighbour houses
  for (const x of [-16, 20]) { const nh = new THREE.Group(); nh.position.set(x, -0.15, -6); s.add(nh); nh.add(box(11, 5.6, 12, new THREE.MeshStandardMaterial({ map: tex(plasterTex(130 + x, x < 0 ? '#d8d2c0' : '#cfd4d2'), { repeat: [3, 2] }), roughness: 0.9 }), 0, 2.8, 0)); const rf = mesh(new THREE.ConeGeometry(8.8, 3, 4), M(0x5a4038, 0.8)); rf.rotation.y = Math.PI / 4; rf.position.y = 7.1; nh.add(rf); for (const wx of [-3, 0, 3]) nh.add(box(1.4, 1.2, 0.06, M(0x2a3238, 0.1, { metalness: 0.5 }), wx, 1.8, 6.02)); }
  for (let x = -40; x <= 40; x += 13) { const nh = new THREE.Group(); nh.position.set(x, -0.15, 22); nh.rotation.y = Math.PI; s.add(nh); nh.add(box(11, 5.4, 10, new THREE.MeshStandardMaterial({ map: tex(plasterTex(150 + x, ['#d8d2c0', '#cfd4d2', '#e0d4c4'][Math.abs(x) % 3]), { repeat: [3, 2] }), roughness: 0.9 }), 0, 2.7, 0)); const rf = mesh(new THREE.ConeGeometry(8.2, 3, 4), M(0x5a4038, 0.8)); rf.rotation.y = Math.PI / 4; rf.position.y = 6.9; nh.add(rf); }
  // street lamp + KepoMisteri poster on neighbour wall / lamp-post banner
  const sl = cyl(0.07, 0.09, 6, M(0x55585c, 0.6, { metalness: 0.7 }), 6.5, 2.85, 8.4, 10); s.add(sl);
  const poster = mesh(new THREE.PlaneGeometry(1.2, 1.6), new THREE.MeshStandardMaterial({ map: tex(brandTex('poster'), { repeat: [1, 1] }), roughness: 0.7 }), { cast: false }); poster.position.set(6.5, 2.4, 8.5); s.add(poster);

  // ---------- interior: living room ----------
  const lr = new THREE.Group(); s.add(lr);
  const rug = mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshStandardMaterial({ map: tex(fabricTex('#7a2a22', 301, 'rgba(0,0,0,0.15)'), { repeat: [3, 2] }), roughness: 1 }), { cast: false }); rug.rotation.x = -Math.PI / 2; rug.rotation.z = 0.15; rug.position.set(-1.6, 0.006, -3.2); lr.add(rug);
  const leather = M(0x4a2c1c, 0.55);
  const sofa = new THREE.Group(); sofa.position.set(-3.45, 0, -3.2); sofa.rotation.y = Math.PI / 2; lr.add(sofa);
  sofa.add(rbox(2.4, 0.45, 0.9, 0.08, leather, 0, 0.25, 0)); sofa.add(rbox(2.4, 0.6, 0.22, 0.08, leather, 0, 0.7, -0.38)); sofa.add(rbox(0.22, 0.65, 0.9, 0.08, leather, -1.2, 0.4, 0)); sofa.add(rbox(0.22, 0.65, 0.9, 0.08, leather, 1.2, 0.4, 0));
  // cushions knocked to floor
  for (const [x, z, ry] of [[-2.3, -1.9, 0.6], [-1.9, -4.6, -0.4], [0.4, -2.6, 1.2]]) { const c = rbox(0.45, 0.14, 0.45, 0.06, M(0xb08a5a, 0.95), x, 0.07, z); c.rotation.y = ry; c.rotation.x = 0.1; lr.add(c); }
  const armchair = new THREE.Group(); armchair.position.set(-1.6, 0, -5.6); armchair.rotation.y = 0.3; lr.add(armchair); armchair.add(rbox(0.9, 0.45, 0.85, 0.08, leather, 0, 0.25, 0)); armchair.add(rbox(0.9, 0.6, 0.2, 0.08, leather, 0, 0.7, -0.35));
  // coffee table (pushed askew) with knocked items
  const ct = new THREE.Group(); ct.position.set(-1.7, 0, -3.1); ct.rotation.y = 0.35; lr.add(ct);
  ct.add(rbox(1.2, 0.05, 0.6, 0.02, woodM, 0, 0.42, 0)); for (const [x, z] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) ct.add(box(0.05, 0.4, 0.05, woodM, x, 0.2, z));
  const vase = cyl(0.06, 0.08, 0.28, new THREE.MeshPhysicalMaterial({ color: 0x2b5a6a, roughness: 0.2, clearcoat: 1 }), -1.0, 0.07, -2.3, 16); vase.rotation.z = Math.PI / 2; vase.rotation.y = 0.6; lr.add(vase);
  // fallen dining chair
  const chair = new THREE.Group(); chair.position.set(1.9, 0.24, -2.1); chair.rotation.set(0, 0.7, Math.PI / 2); lr.add(chair);
  chair.add(box(0.45, 0.04, 0.45, woodL, 0, 0.45, 0)); for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) chair.add(box(0.04, 0.45, 0.04, woodL, x, 0.22, z)); chair.add(box(0.45, 0.5, 0.04, woodL, 0, 0.72, -0.2));
  // sideboard with open drawers (back wall)
  const sb = new THREE.Group(); sb.position.set(-2.0, 0, -6.68); lr.add(sb);
  sb.add(box(2.2, 0.85, 0.5, woodM, 0, 0.425, 0));
  const drawers = [];
  for (let i = 0; i < 3; i++) { const d = new THREE.Group(); d.position.set(-0.7 + i * 0.7, 0.62, 0.0); sb.add(d); const out = [0.32, 0.18, 0.4][i]; d.position.z = out; d.add(box(0.62, 0.2, 0.5, woodL, 0, 0, 0)); d.add(box(0.1, 0.02, 0.03, M(0xc0b090, 0.2, { metalness: 1 }), 0, 0, 0.26)); drawers.push(d); }
  for (let i = 0; i < 3; i++) { const d = box(0.62, 0.22, 0.04, woodL, -0.7 + i * 0.7, 0.25, 0.26); sb.add(d); }
  // papers scattered
  const paperM = M(0xf2efe6, 0.9, { side: THREE.DoubleSide });
  for (let i = 0; i < 26; i++) { const p = mesh(new THREE.PlaneGeometry(0.21, 0.297), paperM, { cast: false }); p.rotation.set(-Math.PI / 2, 0, r() * 6.28); p.position.set(-3 + r() * 3.4, 0.004 + i * 0.0004, -6.2 + r() * 2.2); lr.add(p); }
  for (let i = 0; i < 6; i++) { const b = rbox(0.16, 0.035, 0.23, 0.005, M([0x8a1c1c, 0x1d4f91, 0x2b2b2b, 0x6a5a2a][i % 4], 0.6), -2.6 + r() * 2.4, 0.02, -5.9 + r() * 1.4); b.rotation.y = r() * 6; lr.add(b); }
  // family photo frame (on sideboard wall) + Batak gorga panel + wall clock
  const photoT = assets.familyPhoto ? tex(assets.familyPhoto, { repeat: [1, 1] }) : null;
  const pf = new THREE.Group(); pf.position.set(-2.0, 1.75, -6.88); lr.add(pf);
  pf.add(box(1.1, 0.8, 0.04, M(0x2a1a10, 0.4), 0, 0, 0)); const ph = mesh(new THREE.PlaneGeometry(0.98, 0.68), new THREE.MeshStandardMaterial({ map: photoT, color: photoT ? 0xffffff : 0x777777, roughness: 0.3 }), { cast: false }); ph.position.z = 0.025; pf.add(ph);
  pf.rotation.z = 0.06; // knocked crooked
  const gorgaC = canvas(512, 256), gx = gorgaC.getContext('2d'); gx.fillStyle = '#1a1210'; gx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 8; i++) { gx.fillStyle = '#b3191f'; gx.beginPath(); gx.moveTo(i * 64, 256); gx.lineTo(i * 64 + 32, 128); gx.lineTo(i * 64 + 64, 256); gx.fill(); gx.fillStyle = '#f2ece0'; gx.beginPath(); gx.moveTo(i * 64, 0); gx.lineTo(i * 64 + 32, 128); gx.lineTo(i * 64 + 64, 0); gx.fill(); gx.strokeStyle = '#f2ece0'; gx.lineWidth = 6; gx.beginPath(); gx.arc(i * 64 + 32, 128, 18, 0, 7); gx.stroke(); }
  const gorga = mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshStandardMaterial({ map: tex(gorgaC, { repeat: [1, 1] }), roughness: 0.6 }), { cast: false }); gorga.position.set(-3.98, 2.3, -3.2); gorga.rotation.y = Math.PI / 2; lr.add(gorga);
  const clock = new THREE.Group(); clock.position.set(0.9, 2.3, -6.92); lr.add(clock);
  clock.add(cyl(0.22, 0.22, 0.04, M(0x2a1a10, 0.4), 0, 0, 0, 32)); clock.children[0].rotation.x = Math.PI / 2;
  const face = mesh(new THREE.CircleGeometry(0.19, 32), M(0xf0ebe0, 0.5), { cast: false }); face.position.z = 0.025; clock.add(face);
  const hourH = box(0.012, 0.1, 0.005, M(0x111111), 0, 0.05, 0.03); const minH = box(0.008, 0.15, 0.005, M(0x111111), 0, 0.075, 0.032); const secH = box(0.004, 0.16, 0.004, M(0xa3161a), 0, 0.08, 0.034);
  const hp = new THREE.Group(), mp = new THREE.Group(), sp = new THREE.Group(); hp.add(hourH); mp.add(minH); sp.add(secH); hp.position.z = mp.position.z = sp.position.z = 0; clock.add(hp, mp, sp);
  // floor lamp (on, warm) + TV wall in family room
  const fl = new THREE.Group(); fl.position.set(-3.6, 0, -6.4); lr.add(fl); fl.add(cyl(0.15, 0.15, 0.03, M(0x222222), 0, 0.015, 0)); fl.add(cyl(0.015, 0.015, 1.5, M(0x222222), 0, 0.75, 0, 8));
  const shade = cyl(0.14, 0.22, 0.3, new THREE.MeshStandardMaterial({ color: 0xf0e2c0, emissive: 0xffc880, emissiveIntensity: 0.9, side: THREE.DoubleSide }), 0, 1.6, 0, 20); fl.add(shade);
  const lampL = new THREE.PointLight(0xffb870, 3.0, 7, 1.6); lampL.position.set(-3.6, 1.55, -6.3); s.add(lampL);

  // ---------- family room ----------
  const fr = new THREE.Group(); s.add(fr);
  fr.add(box(2.4, 0.5, 0.45, woodM, 0, 0.25, -12.75)); const tv = box(1.8, 1.0, 0.06, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.5 }), 0, 1.25, -12.9); fr.add(tv);
  const fsofa = new THREE.Group(); fsofa.position.set(0, 0, -8.6); fsofa.rotation.y = Math.PI; fr.add(fsofa); fsofa.add(rbox(2.2, 0.45, 0.9, 0.08, M(0x5a5a52, 0.9), 0, 0.25, 0)); fsofa.add(rbox(2.2, 0.6, 0.22, 0.08, M(0x5a5a52, 0.9), 0, 0.7, -0.38));
  const shelf = new THREE.Group(); shelf.position.set(3.7, 0, -10.5); shelf.rotation.y = -Math.PI / 2; fr.add(shelf);
  shelf.add(box(1.6, 1.9, 0.38, woodM, 0, 0.95, 0)); for (let i = 0; i < 4; i++) shelf.add(box(1.5, 0.03, 0.36, woodL, 0, 0.2 + i * 0.45, 0.02));
  const dtable = new THREE.Group(); dtable.position.set(-2.4, 0, -10.6); fr.add(dtable); dtable.add(rbox(1.6, 0.06, 0.9, 0.02, woodL, 0, 0.76, 0)); for (const [x, z] of [[-0.7, -0.38], [0.7, -0.38], [-0.7, 0.38], [0.7, 0.38]]) dtable.add(box(0.06, 0.76, 0.06, woodL, x, 0.38, z));
  const ceilLampFR = new THREE.PointLight(0xdfe8f0, 0.0, 8, 1.5); ceilLampFR.position.set(0, 2.8, -10); s.add(ceilLampFR);

  // ---------- bedroom ----------
  const bed = new THREE.Group(); bed.position.set(6.3, 0, -4.4); s.add(bed);
  bed.add(rbox(1.7, 0.4, 2.1, 0.05, woodM, 0, 0.2, 0)); bed.add(rbox(1.6, 0.22, 2.0, 0.08, M(0xe8e2d6, 0.95), 0, 0.5, 0)); bed.add(box(1.8, 1.0, 0.1, woodM, 0, 0.6, -1.08));
  const blanket = rbox(1.62, 0.08, 1.2, 0.04, M(0x6a4a3a, 0.95), 0.0, 0.64, 0.4); blanket.rotation.z = 0.04; bed.add(blanket);
  bed.add(rbox(0.6, 0.14, 0.35, 0.06, M(0xf2efe6, 0.95), -0.4, 0.68, -0.7)); bed.add(rbox(0.6, 0.14, 0.35, 0.06, M(0xf2efe6, 0.95), 0.4, 0.68, -0.7));
  const wardrobe = new THREE.Group(); wardrobe.position.set(7.75, 0, -1.4); wardrobe.rotation.y = -Math.PI / 2; s.add(wardrobe); wardrobe.add(box(1.6, 2.2, 0.6, woodM, 0, 1.1, 0));
  const wd = box(0.78, 2.1, 0.03, woodL, 0, 1.1, 0); const wdp = new THREE.Group(); wdp.position.set(-0.78, 0, 0.31); wdp.rotation.y = -1.2; wd.position.x = 0.39; wdp.add(wd); wardrobe.add(wdp);
  for (let i = 0; i < 4; i++) { const cl = box(0.04, 0.9, 0.5, M([0x8a5a2a, 0xeeeeee, 0x1d2433, 0x6a2a22][i], 0.9), -0.6 + i * 0.12, 1.4, 0); wardrobe.add(cl); }
  const shirt = box(0.5, 0.02, 0.6, M(0x8a5a2a, 0.9), 6.6, 0.01, -2.0); shirt.rotation.y = 0.8; s.add(shirt);

  // ---------- SAND evidence ----------
  const SAND_C = new THREE.Vector3(1.25, 0, -4.05);
  const sandPatch = mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshStandardMaterial({ map: tex(sandPatchTex(7), { repeat: [1, 1] }), transparent: true, roughness: 1, depthWrite: false }), { cast: false });
  sandPatch.rotation.x = -Math.PI / 2; sandPatch.position.set(SAND_C.x, 0.004, SAND_C.z); s.add(sandPatch);
  // low mound (displaced disc)
  const mound = new THREE.RingGeometry(0.0001, 0.38, 96, 24); const mpz = mound.attributes.position;
  for (let i = 0; i < mpz.count; i++) { const x = mpz.getX(i), y = mpz.getY(i); const d = Math.hypot(x, y) / 0.38; const a = Math.atan2(y, x); mpz.setZ(i, Math.pow(Math.max(0, 1 - d * d), 2.0) * 0.04 * (1 + 0.25 * d * Math.sin(a * 5))); }
  mound.computeVertexNormals();
  const moundM = mesh(mound, new THREE.MeshStandardMaterial({ map: tex(sandTex(12, '#cdb184'), { repeat: [2, 2] }), roughness: 1 }), { cast: true });
  moundM.rotation.x = -Math.PI / 2; moundM.position.set(SAND_C.x - 0.42, 0.003, SAND_C.z + 0.22); s.add(moundM);
  // carved symbol layer (on main patch)
  const symMat = new THREE.MeshStandardMaterial({ map: tex(symbolTex(), { repeat: [1, 1] }), transparent: true, opacity: 0.0, roughness: 1, depthWrite: false });
  const sym = mesh(new THREE.PlaneGeometry(0.82, 0.82), symMat, { cast: false }); sym.rotation.x = -Math.PI / 2; sym.position.set(SAND_C.x + 0.12, 0.006, SAND_C.z - 0.05); s.add(sym);
  // ring lies at the patch edge
  const ring = makeRing(); ring.position.set(SAND_C.x - 0.38, 0.009, SAND_C.z + 0.42); ring.rotation.set(Math.PI / 2 - 0.25, 0, 0.4); s.add(ring);
  const RING0 = ring.position.clone(), RINGR = ring.rotation.clone();
  // sand trail / footprints toward the hallway (x~1.7, z=-7) and some toward front door
  const fpT = tex(footprintTex(), { repeat: [1, 1] });
  const fpM = new THREE.MeshStandardMaterial({ map: fpT, transparent: true, roughness: 1, depthWrite: false });
  const prints = [];
  for (let i = 0; i < 9; i++) { const u = i / 8; const x = SAND_C.x + 0.3 + u * 0.35 + (i % 2 ? 0.12 : -0.12), z = SAND_C.z - 0.6 - u * 2.4; const fp = mesh(new THREE.PlaneGeometry(0.12, 0.28), fpM, { cast: false }); fp.rotation.set(-Math.PI / 2, 0, -0.1); fp.position.set(x, 0.005 + i * 0.0003, z); s.add(fp); prints.push(fp); }
  for (let i = 0; i < 7; i++) { const x = -0.2 + (i % 2 ? 0.15 : -0.15) + i * 0.15, z = -0.8 - i * 0.42; const sp3 = mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ map: tex(sandPatchTex(40 + i), { repeat: [1, 1] }), transparent: true, opacity: 0.8, roughness: 1, depthWrite: false }), { cast: false }); sp3.rotation.set(-Math.PI / 2, 0, i); sp3.position.set(x, 0.0045, z); s.add(sp3); }
  // instanced grains around the patch (for macro shots)
  const gGeo = new THREE.IcosahedronGeometry(1, 0);
  const grains = new THREE.InstancedMesh(gGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }), 5000); grains.castShadow = false; grains.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (let i = 0; i < 5000; i++) { const a = r() * 6.28, d = Math.pow(r(), 0.7) * 0.75; const sc = 0.0018 + r() * 0.0028; q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)); m4.compose(new THREE.Vector3(SAND_C.x - 0.3 + Math.cos(a) * d, sc * 0.6, SAND_C.z + 0.25 + Math.sin(a) * d * 0.8), q, new THREE.Vector3(sc, sc * 0.8, sc)); grains.setMatrixAt(i, m4); col.setHSL(0.09 + r() * 0.03, 0.35 + r() * 0.2, 0.55 + r() * 0.25); grains.setColorAt(i, col); }
  s.add(grains);
  // falling sand stream (used when Nando lets sand run through fingers)
  const fallN = 600, fallPos = new Float32Array(fallN * 3); const fallG = new THREE.BufferGeometry(); fallG.setAttribute('position', new THREE.BufferAttribute(fallPos, 3));
  const fall = new THREE.Points(fallG, new THREE.PointsMaterial({ color: 0xd9bf8c, size: 0.004, sizeAttenuation: true })); fall.visible = false; fall.frustumCulled = false; s.add(fall);
  const fallSeed = []; for (let i = 0; i < fallN; i++) fallSeed.push([r(), r(), r()]);

  // atmosphere: window light shafts + dust
  const shafts = [];
  for (const [x0, x1] of [[-3.2, -1.6], [1.6, 3.2]]) { const sh = lightShaft(0xfff0d8, 1.3, 4.5, 0.11); sh.position.set((x0 + x1) / 2, 2.3, -0.2); sh.rotation.set(0.75, 0, 0.35); s.add(sh); shafts.push(sh); }
  { const sh = lightShaft(0xe8f0ff, 1.8, 5, 0.09); sh.position.set(-0.3, 2.3, -13.0); sh.rotation.set(-0.7, 0, 0.2); s.add(sh); shafts.push(sh); }
  const dLR = dust(r, 500, [7, 2.8, 6], [0, 1.5, -3.5], 0.02); s.add(dLR);
  const winFill = new THREE.PointLight(0xcfdcf0, 1.4, 9, 1.4); winFill.position.set(0, 2.2, -1.2); s.add(winFill);
  const bedLight = new THREE.PointLight(0xd8e2f0, 1.2, 6, 1.5); bedLight.position.set(6, 2.6, -3); s.add(bedLight);

  return {
    scene: s, sun, hemi, doorPivot, gate, ring, RING0, RINGR, SAND_C, symMat, sandPatch, fall, fallSeed, lampL, winFill, ceilLampFR, shafts, dLR, grains, clock: { hp, mp, sp },
    grade: { lift: [0.0, 0.01, 0.025], gamma: [1.0, 1.0, 1.03], gain: [1.02, 0.99, 0.95], sat: 0.72, contrast: 1.14, exposure: 1.0, vignette: 0.45 },
    mode(m) { // 'ext' daylight dusk exterior, 'int' moody interior
      if (m === 'ext') { hemi.intensity = 1.15; sun.intensity = 1.6; s.fog.near = 25; s.fog.far = 260; }
      else { hemi.intensity = 0.32; sun.intensity = 2.6; s.fog.near = 60; s.fog.far = 400; }
    },
    update(t) {
      swayTrees(trees, t, 0.015); animateDust(dLR, t);
      const sec = Math.floor(t); sp.rotation.z = -sec / 60 * Math.PI * 2; mp.rotation.z = -(17 + t / 60) / 60 * Math.PI * 2; hp.rotation.z = -(4.3) / 12 * Math.PI * 2;
    },
    setFall(on, origin, t) {
      fall.visible = on; if (!on) return;
      const p = fallG.attributes.position.array;
      for (let i = 0; i < fallN; i++) { const [a, b, c] = fallSeed[i]; const ph = (t * 0.9 + a) % 1; const y = origin.y - ph * (origin.y - 0.01); p[i * 3] = origin.x + (b - 0.5) * 0.02 * (1 + ph * 3); p[i * 3 + 1] = y; p[i * 3 + 2] = origin.z + (c - 0.5) * 0.02 * (1 + ph * 3); }
      fallG.attributes.position.needsUpdate = true;
    },
  };
}

// ---------------- basement (seen in the photo + the voice shot) ----------------
export function buildBasement() {
  const s = new THREE.Scene(); const r = rng(707);
  s.background = new THREE.Color(0x050608); s.fog = new THREE.FogExp2(0x0a0c0e, 0.06);
  const conc = new THREE.MeshStandardMaterial({ map: tex(concreteTex(31), { repeat: [16, 16] }), roughness: 0.85, color: 0x9a9a96 });
  const fl = mesh(new THREE.PlaneGeometry(60, 60), conc, { cast: false }); fl.rotation.x = -Math.PI / 2; s.add(fl);
  const ce = mesh(new THREE.PlaneGeometry(60, 60), M(0x4a4a48, 0.95), { cast: false }); ce.rotation.x = Math.PI / 2; ce.position.y = 3.2; s.add(ce);
  // parking lines + pillars
  for (let i = -6; i <= 6; i++) { s.add(box(0.12, 0.005, 5, M(0xd8c84a, 0.7), i * 2.6, 0.003, -4, { cast: false })); s.add(box(0.12, 0.005, 5, M(0xd8c84a, 0.7), i * 2.6, 0.003, 4, { cast: false })); }
  const pillM = new THREE.MeshStandardMaterial({ map: tex(concreteTex(33), { repeat: [1, 2] }), roughness: 0.9 });
  for (let i = -3; i <= 3; i++) for (const z of [-8, 0, 8]) { s.add(box(0.7, 3.2, 0.7, pillM, i * 5.2, 1.6, z)); s.add(box(0.72, 0.5, 0.72, M(0xd8c84a, 0.6), i * 5.2, 0.25, z)); s.add(box(0.72, 0.15, 0.72, M(0x1a1a1a, 0.6), i * 5.2, 0.55, z)); }
  const sign = mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshStandardMaterial({ map: tex(labelTex('B2 — ZONA C', '#1d4f91', '#ffffff', 512, 256, 70)), emissive: 0xffffff, emissiveMap: tex(labelTex('B2 — ZONA C', '#1d4f91', '#ffffff', 512, 256, 70)), emissiveIntensity: 0.3 }), { cast: false }); sign.position.set(0, 2.2, -7.64); s.add(sign);
  // fluorescent tubes
  const lights = [];
  for (const [x, z] of [[-5, -4], [2, -4], [-2, 4], [6, 2]]) { const tube = box(1.2, 0.05, 0.1, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 2 }), x, 3.15, z); s.add(tube); const l = new THREE.PointLight(0xcfe8ff, 6, 12, 1.6); l.position.set(x, 2.9, z); s.add(l); lights.push({ l, tube }); }
  s.add(new THREE.HemisphereLight(0x405060, 0x101010, 0.25));
  const key = new THREE.SpotLight(0xd8ecff, 30, 14, 0.6, 0.6, 1.5); key.position.set(1.0, 3.1, 1.5); key.target.position.set(1.2, 0, -1.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); s.add(key, key.target);
  // sand on the floor
  const sandM = new THREE.MeshStandardMaterial({ map: tex(sandPatchTex(70), { repeat: [1, 1] }), transparent: true, roughness: 1, depthWrite: false });
  for (const [x, z, sc] of [[0.8, -1.4, 2.6], [-0.9, -0.2, 1.6], [2.5, -2.4, 1.4], [-2.6, 1.5, 1.8], [1.5, 1.0, 1.2]]) { const p = mesh(new THREE.PlaneGeometry(sc, sc), sandM, { cast: false }); p.rotation.set(-Math.PI / 2, 0, x); p.position.set(x, 0.004, z); s.add(p); }
  const pile = new THREE.RingGeometry(0.0001, 0.6, 64, 16); const pp = pile.attributes.position; for (let i = 0; i < pp.count; i++) { const d = Math.hypot(pp.getX(i), pp.getY(i)) / 0.6; pp.setZ(i, Math.pow(Math.max(0, 1 - d * d), 2.0) * 0.14); } pile.computeVertexNormals();
  const pm = mesh(pile, new THREE.MeshStandardMaterial({ map: tex(sandTex(71, '#c7a978'), { repeat: [2, 2] }), roughness: 1 })); pm.rotation.x = -Math.PI / 2; pm.position.set(0.6, 0.002, -1.6); s.add(pm);
  // falling sand stream from a ceiling crack (voice shot)
  const N = 1400, pos = new Float32Array(N * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stream = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe0c896, size: 0.012, transparent: true, opacity: 0.9 })); stream.frustumCulled = false; s.add(stream);
  const seeds = []; for (let i = 0; i < N; i++) seeds.push([r(), r(), r()]);
  const beam = lightShaft(0xdff0ff, 0.9, 3.2, 0.16); beam.position.set(0.6, 3.2, -1.6); s.add(beam);
  // papa's watch near the pillar corner
  return {
    scene: s, lights, stream, beam,
    grade: { lift: [0.0, 0.015, 0.03], gamma: [1.0, 1.02, 1.05], gain: [0.95, 1.0, 1.05], sat: 0.6, contrast: 1.2, exposure: 1.1, vignette: 0.55 },
    update(t, streamOn = false) {
      lights.forEach((o, i) => { const fl = i === 1 ? (Math.sin(t * 37) > 0.6 || Math.sin(t * 5.3) > 0.9 ? 0.15 : 1) : 1; o.l.intensity = 6 * fl; o.tube.material.emissiveIntensity = 2 * fl; });
      stream.visible = streamOn; beam.visible = streamOn;
      if (streamOn) { for (let i = 0; i < N; i++) { const [a, b, c] = seeds[i]; const ph = (t * 0.7 + a) % 1; pos[i * 3] = 0.6 + (b - 0.5) * 0.03 * (1 + ph * 2); pos[i * 3 + 1] = 3.15 - ph * 3.0; pos[i * 3 + 2] = -1.6 + (c - 0.5) * 0.03 * (1 + ph * 2); } g.attributes.position.needsUpdate = true; }
    },
  };
}

// small studio for the framed family portrait & phone avatar
export function buildStudio() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x6b5a48);
  const bg = mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }), { cast: false }); bg.position.set(0, 3, -2); s.add(bg);
  s.add(new THREE.HemisphereLight(0xfff0e0, 0x5a4030, 1.4));
  const k = new THREE.DirectionalLight(0xfff0dd, 2.4); k.position.set(2, 4, 5); s.add(k);
  return { scene: s, grade: { sat: 0.95, contrast: 1.0, exposure: 1.15, vignette: 0.3 } };
}
