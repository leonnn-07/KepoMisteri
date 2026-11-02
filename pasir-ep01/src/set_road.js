// SCENE 03: drive home through Tambun. Road runs along +Z. Car drives +Z on the left lane (Indonesia drives left).
import * as THREE from 'three';
import { M, mesh, box, rbox, cyl, sky, makeTree, makePalm, swayTrees, billboard, rollBanner, shadowSun, rng, tex, RoundedBoxGeometry } from './common.js';
import { roadTex, asphaltTex, concreteTex, plasterTex, shopSignTex, brandTex, labelTex, fabricTex } from './textures.js';

export function makeCar(color = 0x1f2226) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const dark = M(0x0e0f11, 0.6);
  g.add(rbox(1.82, 0.62, 4.6, 0.18, paint, 0, 0.62, 0));
  g.add(rbox(1.78, 0.18, 1.3, 0.08, paint, 0, 0.98, 1.5)); // hood
  g.add(rbox(1.78, 0.18, 0.9, 0.08, paint, 0, 0.98, -1.75)); // trunk
  // cabin pillars + roof
  g.add(rbox(1.56, 0.07, 1.9, 0.05, paint, 0, 1.5, -0.25));
  for (const sx of [-0.76, 0.76]) { const a = box(0.06, 0.6, 0.08, paint, sx, 1.22, 0.78); a.rotation.x = -0.55; g.add(a); const b = box(0.06, 0.5, 0.08, paint, sx, 1.25, -0.2); g.add(b); const c = box(0.06, 0.55, 0.08, paint, sx, 1.22, -1.22); c.rotation.x = 0.5; g.add(c); }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x1c262c, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
  const ws = mesh(new THREE.PlaneGeometry(1.5, 0.72), glass, { cast: false }); ws.position.set(0, 1.23, 0.82); ws.rotation.x = -0.98; g.add(ws);
  const rw = mesh(new THREE.PlaneGeometry(1.5, 0.62), glass, { cast: false }); rw.position.set(0, 1.23, -1.3); rw.rotation.x = 0.95; g.add(rw);
  const sideGlass = [];
  for (const sx of [-0.79, 0.79]) { const sg = mesh(new THREE.PlaneGeometry(2.0, 0.48), glass, { cast: false }); sg.position.set(sx, 1.22, -0.22); sg.rotation.y = Math.PI / 2; g.add(sg); sideGlass.push(sg); }
  // lights, grille, mirrors, plates
  for (const sx of [-0.62, 0.62]) {
    g.add(rbox(0.38, 0.12, 0.06, 0.03, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 1.2 }), sx, 0.78, 2.29));
    g.add(rbox(0.34, 0.1, 0.06, 0.03, new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1a1a, emissiveIntensity: 0.9 }), sx, 0.82, -2.29));
    const mir = rbox(0.18, 0.1, 0.08, 0.03, paint, sx * 1.48, 1.08, 0.62); g.add(mir);
  }
  g.add(rbox(0.9, 0.16, 0.05, 0.03, dark, 0, 0.58, 2.3));
  g.add(mesh(new THREE.PlaneGeometry(0.52, 0.12), new THREE.MeshStandardMaterial({ map: tex(labelTex('B 1717 NDO', '#111', '#eee', 512, 120, 80), { repeat: [1, 1] }) }), { cast: false })).position.set(0, 0.45, 2.33);
  const plate2 = mesh(new THREE.PlaneGeometry(0.52, 0.12), new THREE.MeshStandardMaterial({ map: tex(labelTex('B 1717 NDO', '#111', '#eee', 512, 120, 80), { repeat: [1, 1] }) }), { cast: false }); plate2.position.set(0, 0.6, -2.33); plate2.rotation.y = Math.PI; g.add(plate2);
  // wheels
  const wheels = [];
  for (const [x, z] of [[-0.82, 1.45], [0.82, 1.45], [-0.82, -1.4], [0.82, -1.4]]) {
    const hold = new THREE.Group(); hold.position.set(x, 0.34, z); g.add(hold); const w = new THREE.Group(); hold.add(w); w.userData.hold = hold;
    const tyre = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 24), M(0x111111, 0.9)); tyre.rotation.z = Math.PI / 2; w.add(tyre);
    const rim = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 10), M(0x9a9da2, 0.25, { metalness: 0.9 })); rim.rotation.z = Math.PI / 2; w.add(rim);
    wheels.push(w);
  }
  // interior (RHD: driver on -X side)
  const seatM = M(0x2a2420, 0.8);
  for (const sx of [-0.38, 0.38]) { g.add(rbox(0.5, 0.14, 0.5, 0.05, seatM, sx, 0.55, 0.12)); const bk = rbox(0.5, 0.65, 0.14, 0.05, seatM, sx, 0.95, -0.16); bk.rotation.x = -0.18; g.add(bk); g.add(rbox(0.26, 0.16, 0.1, 0.04, seatM, sx, 1.33, -0.22)); }
  g.add(rbox(1.5, 0.3, 0.5, 0.06, M(0x16171a, 0.7), 0, 0.98, 0.72)); // dashboard
  const sw = new THREE.Group(); sw.position.set(-0.38, 1.08, 0.48); sw.rotation.x = -0.45; g.add(sw);
  sw.add(mesh(new THREE.TorusGeometry(0.18, 0.02, 10, 32), M(0x101010, 0.5))); const hub = cyl(0.05, 0.05, 0.05, M(0x1a1a1a, 0.4), 0, 0, 0, 16); hub.rotation.x = Math.PI / 2; sw.add(hub);
  for (const a of [0, 2.2, -2.2]) { const sp = box(0.16, 0.02, 0.02, M(0x101010), Math.cos(a - Math.PI / 2) * 0.08, Math.sin(a - Math.PI / 2) * 0.08, 0); sp.rotation.z = a - Math.PI / 2; sw.add(sp); }
  const col = cyl(0.03, 0.03, 0.3, M(0x101010), 0, 0, 0.16, 8); col.rotation.x = Math.PI / 2; sw.add(col);
  // phone holder on dash (phone attached later)
  const holder = new THREE.Group(); holder.position.set(0.05, 1.22, 0.62); holder.rotation.x = -0.25; g.add(holder);
  holder.add(box(0.09, 0.02, 0.03, M(0x111111), 0, -0.085, 0));
  g.userData = { wheels, sw, holder, sideGlass, driverSeat: new THREE.Vector3(-0.38, 0.0, -0.1) };
  g.traverse(o => { if (o.isMesh && o.material !== glass) o.castShadow = true; });
  return g;
}

function ruko(r, x, z, side, idx) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  const w = 6, floors = 2 + (r() < 0.45 ? 1 : 0), fh = 3.4, d = 10;
  const wallCols = ['#d9d1c2', '#cfc6b0', '#c9cfd2', '#e0d6c0', '#bfb59c', '#d4c4b0'];
  const wm = new THREE.MeshStandardMaterial({ map: tex(plasterTex(200 + idx, wallCols[idx % wallCols.length]), { repeat: [2, 2] }), roughness: 0.9 });
  g.add(box(w - 0.1, floors * fh, d, wm, 0, floors * fh / 2, -d / 2));
  // ground floor shop: shutter / open front
  const open = r() < 0.6;
  g.add(box(w - 0.6, fh - 0.6, 0.1, open ? M(0x2b2a28, 0.9) : M(0x8c9196, 0.5, { metalness: 0.6 }), 0, (fh - 0.6) / 2, 0.02));
  if (open) { // warm interior glow + goods
    g.add(box(w - 0.8, fh - 0.8, 0.05, new THREE.MeshStandardMaterial({ color: 0x302820, emissive: 0xffd9a0, emissiveIntensity: 0.25 }), 0, (fh - 0.8) / 2, 0.05));
    for (let i = 0; i < 6; i++) g.add(box(0.5 + r() * 0.6, 0.5 + r(), 0.4, M(['#a3161a', '#2a6fb5', '#e0b24a', '#3d7a3a', '#ddd'][(r() * 5) | 0], 0.7), -2 + r() * 4, 0.4, 0.4));
  } else { for (let i = 0; i < 18; i++) g.add(box(w - 0.7, 0.02, 0.03, M(0x6e7378, 0.5, { metalness: 0.6 }), 0, 0.2 + i * 0.15, 0.08)); }
  // sign board
  const shops = [['TOKO BANGUNAN', 'Sinar Jaya • Tambun', '#1d4f91'], ['APOTEK', 'Sehat Selalu 24 Jam', '#2b7a3c'], ['RUMAH MAKAN', 'Masakan Padang', '#b3191f'], ['BENGKEL', 'Servis Motor & Mobil', '#e0a020'], ['LAUNDRY KILAT', 'Cuci • Setrika • Kiloan', '#1a8fa8'], ['KONTER HP', 'Pulsa • Aksesoris', '#6a2a8a'], ['FOTOKOPI', 'Print • Jilid • ATK', '#c45a12'], ['BAKSO', 'Mas Joko', '#9a1a1a'], ['KEPOMISTERI', 'Serial PASIR tayang sekarang', '#141518']];
  const sh = shops[idx % shops.length];
  let st;
  if (sh[0] === 'KEPOMISTERI') st = tex(brandTex('fence'), { repeat: [0.5, 1] });
  else st = tex(shopSignTex(sh[0], sh[1], sh[2], sh[2] === '#e0a020' ? '#111' : '#fff', idx), { repeat: [1, 1] });
  const sign = mesh(new THREE.PlaneGeometry(w - 0.4, 1.1), new THREE.MeshStandardMaterial({ map: st, roughness: 0.6, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.15 }), { cast: false });
  sign.position.set(0, fh - 0.15, 0.12); g.add(sign);
  // canopy
  const can = box(w, 0.08, 1.4, M(0x7a7f84, 0.5, { metalness: 0.5 }), 0, fh - 0.75, 0.7); can.rotation.x = 0.12; g.add(can);
  // upper floor windows / balcony
  for (let f = 1; f < floors; f++) {
    for (const wx of [-1.6, 1.6]) { g.add(box(1.6, 1.5, 0.08, M(0x24313a, 0.1, { metalness: 0.5 }), wx, f * fh + 1.6, 0.03)); g.add(box(1.8, 0.1, 0.25, M(0xeeeeee, 0.6), wx, f * fh + 0.8, 0.12)); }
    if (r() < 0.4) { const ac = box(0.8, 0.5, 0.3, M(0xe8e8e4, 0.5), 0, f * fh + 2.3, 0.2); g.add(ac); }
  }
  g.add(box(w, 0.4, 0.4, M(0xcfcfc8, 0.7), 0, floors * fh + 0.2, -0.1)); // parapet
  return g;
}

export function buildRoad() {
  const s = new THREE.Scene(); const r = rng(303);
  const fogC = new THREE.Color(0xb7aea0); s.fog = new THREE.Fog(fogC, 30, 330); s.background = fogC;
  sky(s, ['#6e7680', '#b1aea6', '#c9bfae'], 900, 1.1, 77);
  s.add(new THREE.HemisphereLight(0xcfd2d6, 0x5a5348, 1.25));
  const sun = shadowSun(s, 0xffe2c0, 1.7, [40, 50, -10], [0, 0, 0], 20, 2048);

  const rt = tex(roadTex(), { repeat: [1, 70] });
  const road = mesh(new THREE.PlaneGeometry(9, 700), new THREE.MeshStandardMaterial({ map: rt, roughness: 0.85 }), { cast: false }); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 50); s.add(road);
  const sideM = new THREE.MeshStandardMaterial({ map: tex(concreteTex(5), { repeat: [2, 140] }), roughness: 0.9 });
  for (const sx of [-1, 1]) {
    s.add(box(3, 0.18, 700, sideM, sx * 6, 0.09, 50, { cast: false }));
    s.add(box(0.2, 0.22, 700, M(0x9a9a95, 0.8), sx * 4.6, 0.11, 50, { cast: false }));
    s.add(box(0.5, 0.05, 700, M(0x2a2a28, 0.9), sx * 4.25, 0.02, 50, { cast: false })); // gutter
  }
  const ground = mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ map: tex(asphaltTex(9), { repeat: [200, 200] }), color: 0x8a8578, roughness: 1 }), { cast: false }); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; s.add(ground);

  // shophouse rows
  let idx = 0;
  for (let z = -160; z < 300; z += 6.1) { for (const sx of [-1, 1]) { if (r() < 0.06) continue; s.add(ruko(r, sx * 7.6, z, sx, idx++)); } }
  // power poles + wires
  const poles = [];
  for (let z = -160; z < 300; z += 32) {
    const p = cyl(0.12, 0.16, 9, M(0x8b8d8f, 0.7), 5.1, 4.5, z, 10); s.add(p);
    s.add(box(1.8, 0.1, 0.1, M(0x5a5c5e, 0.6), 4.6, 8.4, z));
    poles.push(new THREE.Vector3(5.1, 8.3, z));
  }
  const wireM = M(0x111111, 0.8);
  for (let i = 0; i < poles.length - 1; i++) for (const ox of [-0.6, 0, 0.6]) {
    const a = poles[i].clone(), b = poles[i + 1].clone(); a.x += ox - 0.5; b.x += ox - 0.5; const mid = a.clone().lerp(b, 0.5); mid.y -= 0.9;
    s.add(mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 12, 0.015, 4), wireM, { cast: false }));
  }
  // trees along sidewalk
  const trees = [];
  for (let z = -150; z < 300; z += 14 + r() * 10) { const t = r() < 0.3 ? makePalm(r, 7) : makeTree(r, { h: 5 + r() * 3, spread: 1.6 + r() }); t.position.set(-5.6 + (r() < 0.5 ? 0 : 11.2), 0.18, z); s.add(t); trees.push(t); }
  // branding: big billboards, cross-road spanduk, vertical banners on poles
  const bbs = [[16, -1, 0], [96, 1, 1], [176, -1, 2], [250, 1, 0]];
  for (const [z, sx, v] of bbs) { const b = billboard(v, 11, 4.6, 8.5); b.position.set(sx * 11, 0, z); b.rotation.y = -sx * 2.21; s.add(b); }
  for (const z of [60, 140, 220]) {
    const st = tex(brandTex('fence', 1), { repeat: [1, 1] });
    const sp = mesh(new THREE.PlaneGeometry(10, 1.1), new THREE.MeshStandardMaterial({ map: st, side: THREE.DoubleSide, roughness: 0.7, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.1 }), { cast: false });
    sp.position.set(0, 5.4, z); sp.rotation.y = Math.PI; s.add(sp);
    for (const sx of [-1, 1]) s.add(cyl(0.06, 0.06, 6, M(0x777777, 0.5, { metalness: 0.7 }), sx * 5.2, 3, z, 8));
  }
  for (let z = -140; z < 300; z += 32) { const rb = rollBanner(((z / 32) | 0) % 2); rb.scale.setScalar(1.3); rb.position.set(5.0, 2.6, z + 0.3); rb.rotation.y = -Math.PI / 2; s.add(rb); }

  // traffic (other vehicles), parked motorbikes
  const traffic = [];
  const colors = [0xd9d9d6, 0x8a1c1c, 0x2a4a7a, 0x9a9da2, 0x1a1a1a, 0x2f7d8a];
  for (let i = 0; i < 7; i++) { const c = makeCar(colors[i % colors.length]); c.rotation.y = Math.PI; c.position.set(-2.1, 0, 0); s.add(c); traffic.push({ car: c, z0: -60 + i * 55, v: -11 - (i % 3) * 2 }); }
  for (let i = 0; i < 26; i++) { // parked motorbikes
    const m = new THREE.Group(); m.position.set((r() < 0.5 ? -1 : 1) * (5.4 + r() * 0.8), 0.18, -150 + r() * 440); m.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.4; s.add(m);
    m.add(rbox(0.25, 0.35, 1.3, 0.08, M(colors[(r() * colors.length) | 0], 0.4), 0, 0.55, 0)); for (const z of [-0.55, 0.55]) { const w = cyl(0.27, 0.27, 0.08, M(0x111111, 0.9), 0, 0.27, z, 16); w.rotation.z = Math.PI / 2; m.add(w); }
    m.add(rbox(0.22, 0.12, 0.6, 0.05, M(0x151515, 0.8), 0, 0.82, -0.15));
  }

  const car = makeCar(0x1d2024); s.add(car); car.userData.sideGlass[0].visible = false; // driver window rolled down
  const cabin = new THREE.PointLight(0xffe8d0, 5, 4, 1.3); s.add(cabin);
  car.position.set(2.1, 0, 0);

  // scrolling window reflection (for the reflection shot)
  const rc = document.createElement('canvas'); rc.width = 1024; rc.height = 256; const x = rc.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#b9b4aa'); gr.addColorStop(1, '#3a3836'); x.fillStyle = gr; x.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${30 + r() * 60},${30 + r() * 60},${30 + r() * 60},0.8)`; const bx = r() * 1024, bw = 20 + r() * 90, bh = 60 + r() * 160; x.fillRect(bx, 256 - bh, bw, bh); }
  for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(163,22,26,0.8)'; x.fillRect(r() * 1024, 90 + r() * 60, 30 + r() * 50, 14); }
  x.filter = 'blur(6px)'; x.drawImage(rc, 0, 0); x.filter = 'none';
  const reflT = tex(rc, { repeat: [1, 1] });
  const refl = mesh(new THREE.PlaneGeometry(2.0, 0.48), new THREE.MeshBasicMaterial({ map: reflT, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), { cast: false });
  refl.position.set(-0.8, 1.22, -0.22); refl.rotation.y = -Math.PI / 2; car.add(refl); refl.visible = false;

  return {
    scene: s, sun, car, trees, refl, reflT,
    grade: { lift: [0.03, 0.025, 0.02], gamma: [1.0, 1.0, 0.98], gain: [1.04, 1.0, 0.94], sat: 0.8, contrast: 1.1, exposure: 1.0, vignette: 0.38 },
    update(t, carZ = 0, carV = 12) {
      swayTrees(trees, t, 0.015);
      car.position.z = carZ; cabin.position.set(car.position.x + 0.2, 2.0, carZ + 0.9);
      for (const w of car.userData.wheels) w.rotation.x = carZ / 0.34;
      for (const tr of traffic) { const z = tr.z0 + tr.v * t; tr.car.position.z = ((z + 160) % 460 + 460) % 460 - 160; for (const w of tr.car.userData.wheels) w.rotation.x = z / 0.34; }
      reflT.offset.x = carZ * 0.02;
      // keep shadow camera centred on the car
      sun.target.position.set(car.position.x, 0, carZ); sun.position.set(car.position.x + 40, 50, carZ - 10);
    },
  };
}

// stretch a car vertically into a tall MPV so the big-headed characters fit inside; keeps wheels round
export function tallCar(car, s = 1.25, sy = 1.55) {
  car.scale.set(s, sy, s);
  for (const w of car.userData.wheels) { const h = w.userData.hold; h.scale.set(1, s / sy, 1); h.position.y = 0.34 * s / sy; }
  return car;
}
