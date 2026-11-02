// SCENE 01-02: overcast golf course (Tambun area). Tee box at origin, fairway runs toward +X.
import * as THREE from 'three';
import { M, mesh, box, rbox, cyl, sky, makeTree, makePalm, swayTrees, grassField, billboard, rollBanner, fenceBoard, flagBanner, waveFlag, shadowSun, rng, tex } from './common.js';
import { grassTex, sandTex, woodTex, plasterTex, fabricTex } from './textures.js';

export function buildGolf() {
  const s = new THREE.Scene(); const r = rng(101);
  const fogC = new THREE.Color(0xaab3b8); s.fog = new THREE.Fog(fogC, 40, 520); s.background = fogC;
  sky(s, ['#6f7b86', '#a3adb4', '#c0c6c6'], 900, 1.0, 33);
  s.add(new THREE.HemisphereLight(0xc4ccd4, 0x4d5a36, 1.35));
  const sun = shadowSun(s, 0xfff1e0, 1.9, [-30, 60, 25], [0, 0, 0], 16, 2048);

  // terrain
  const rough = tex(grassTex(false, 3), { repeat: [120, 120] });
  const ground = mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: rough, color: 0xb9c6a8, roughness: 0.95 }), { cast: false });
  ground.rotation.x = -Math.PI / 2; s.add(ground);
  const fwTex = tex(grassTex(true, 4), { repeat: [40, 6] }); fwTex.rotation = 0;
  const fwShape = new THREE.Shape(); fwShape.absarc(0, 0, 1, 0, Math.PI * 2, false);
  const fairway = mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ map: fwTex, color: 0xd6e6c0, roughness: 0.9 }), { cast: false });
  fairway.scale.set(140, 26, 1); fairway.rotation.x = -Math.PI / 2; fairway.position.set(130, 0.015, 0); s.add(fairway);
  const tee = rbox(9, 0.25, 7, 0.1, new THREE.MeshStandardMaterial({ map: tex(grassTex(true, 5), { repeat: [3, 3] }), color: 0xd0e2b8, roughness: 0.9 }), 0, 0.05, 0, { cast: false }); s.add(tee);
  const green = mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshStandardMaterial({ map: tex(grassTex(true, 6), { repeat: [8, 8] }), color: 0xd8eec2, roughness: 0.85 }), { cast: false });
  green.rotation.x = -Math.PI / 2; green.position.set(250, 0.03, 6); s.add(green);
  const sandM = new THREE.MeshStandardMaterial({ map: tex(sandTex(8, '#d8c39a'), { repeat: [6, 6] }), roughness: 1 });
  for (const [x, z, a, b] of [[160, -20, 12, 5], [215, 18, 9, 4], [236, -6, 5, 3], [120, 22, 7, 3]]) { const bk = mesh(new THREE.CircleGeometry(1, 40), sandM, { cast: false }); bk.scale.set(a, b, 1); bk.rotation.x = -Math.PI / 2; bk.position.set(x, 0.025, z); s.add(bk); }
  const pond = mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ color: 0x3c4a50, roughness: 0.06, metalness: 0.85 }), { cast: false });
  pond.scale.set(26, 12, 1); pond.rotation.x = -Math.PI / 2; pond.position.set(95, 0.03, 38); s.add(pond);
  // pin flag on green
  const pin = cyl(0.025, 0.025, 2.4, M(0xeeeeee, 0.3), 252, 1.2, 7, 8); s.add(pin);
  const pf = mesh(new THREE.PlaneGeometry(0.9, 0.55, 8, 1), M(0xc0181f, 0.6, { side: THREE.DoubleSide })); pf.position.set(252.45, 2.1, 7); s.add(pf);
  const pfBase = pf.geometry.attributes.position.array.slice();

  // distant hills
  for (let i = 0; i < 9; i++) { const h = mesh(new THREE.SphereGeometry(1, 24, 12), M(0x5d6d62, 1), { cast: false, recv: false }); h.scale.set(120 + r() * 120, 30 + r() * 40, 60); h.position.set(-200 + i * 110, -8, -340 - r() * 60); s.add(h); }
  for (let i = 0; i < 6; i++) { const h = mesh(new THREE.SphereGeometry(1, 24, 12), M(0x617263, 1), { cast: false, recv: false }); h.scale.set(140, 25 + r() * 25, 70); h.position.set(380 + r() * 60, -8, -200 + i * 90); s.add(h); }

  // trees: lines along fairway both sides + background forest
  const trees = [];
  const addTree = (x, z, palm = false, sc = 1) => { const t = palm ? makePalm(r, 8 + r() * 4) : makeTree(r, { h: (6 + r() * 5) * sc, spread: (2.2 + r() * 1.4) * sc }); t.position.set(x, 0, z); t.rotation.y = r() * 6.28; s.add(t); trees.push(t); };
  for (let x = -40; x < 320; x += 9 + r() * 6) { addTree(x, -32 - r() * 14, r() < 0.25); addTree(x + 4, 30 + r() * 16, r() < 0.25); }
  for (let x = -60; x < 340; x += 7 + r() * 5) { addTree(x, -60 - r() * 30, false, 1.2); addTree(x, 62 + r() * 30, false, 1.2); }
  for (let z = -50; z < 60; z += 8) addTree(300 + r() * 20, z, r() < 0.2, 1.1);
  // a few trees behind tee (visible in reverse angles)
  for (const [x, z] of [[-14, -9], [-18, 6], [-22, -2], [-12, 12], [-26, 14], [-9, -16]]) addTree(x, z, r() < 0.4);

  // clubhouse (behind-left of tee)
  const ch = new THREE.Group(); ch.position.set(-34, 0, -26); ch.rotation.y = 0.5; s.add(ch);
  const wall = new THREE.MeshStandardMaterial({ map: tex(plasterTex(81, '#ece6da'), { repeat: [4, 2] }), roughness: 0.85 });
  ch.add(box(22, 6, 12, wall, 0, 3, 0));
  const roof = mesh(new THREE.ConeGeometry(16, 5, 4), M(0x5a3428, 0.8)); roof.position.set(0, 8.5, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.62); ch.add(roof);
  for (let i = -4; i <= 4; i++) ch.add(box(1.6, 2.4, 0.1, M(0x22303a, 0.1, { metalness: 0.6 }), i * 2.3, 3.2, 6.02));
  ch.add(box(23, 0.4, 3, M(0xbdb5a5, 0.8), 0, 0.2, 7.2));
  for (let i = -3; i <= 3; i++) ch.add(cyl(0.18, 0.18, 4.6, M(0xf3efe6, 0.6), i * 3.4, 2.5, 8.2, 12));
  ch.add(box(23, 0.4, 3.4, M(0x5a3428, 0.8), 0, 4.95, 7.6));

  // tee furniture & branding
  const brand = [];
  const bb = billboard(0, 10, 4.2, 5); bb.position.set(-6, 0, -16); bb.rotation.y = 0.25; s.add(bb);
  const bb2 = billboard(1, 9, 3.75, 4.5); bb2.position.set(60, 0, -28); bb2.rotation.y = -0.1; s.add(bb2);
  const rb1 = rollBanner(0); rb1.position.set(-3.6, 0.17, -2.6); rb1.rotation.y = 0.5; s.add(rb1);
  const rb2 = rollBanner(1); rb2.position.set(3.8, 0.17, -2.9); rb2.rotation.y = -0.35; s.add(rb2);
  const fb = fenceBoard(9, 0.85); fb.position.set(0, 0.17, -3.6); s.add(fb);
  const flags = []; for (const [x, z, v] of [[-4.4, 2.6, 0], [4.6, 2.8, 1], [-8, -6, 2]]) { const f = flagBanner(v); f.position.set(x, 0.17, z); f.rotation.y = -0.6 + r(); s.add(f); flags.push(f); }
  // tee markers
  for (const x of [-1.8, 1.8]) { const tm = mesh(new THREE.SphereGeometry(0.08, 16, 12), M(0xc61a1f, 0.35)); tm.position.set(x - 0.8, 0.25, 1.4); s.add(tm); }
  // small table with phone/water (phone added later by shots)
  const table = new THREE.Group(); table.position.set(2.3, 0.17, -1.0); s.add(table);
  const wood = new THREE.MeshStandardMaterial({ map: tex(woodTex(61, '#7a5232'), { repeat: [1, 1] }), roughness: 0.6 });
  table.add(rbox(0.8, 0.05, 0.55, 0.01, wood, 0, 0.72, 0)); for (const [x, z] of [[-0.35, -0.22], [0.35, -0.22], [-0.35, 0.22], [0.35, 0.22]]) table.add(cyl(0.02, 0.02, 0.72, M(0x2b2b2b, 0.4, { metalness: 0.8 }), x, 0.36, z, 8));
  const bottle = cyl(0.035, 0.035, 0.22, new THREE.MeshPhysicalMaterial({ color: 0xbfd8e8, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.6 }), 0.25, 0.86, 0.08, 16); table.add(bottle);
  table.add(cyl(0.02, 0.02, 0.03, M(0x2a6fb5, 0.4), 0.25, 0.985, 0.08, 12));
  const towel = box(0.3, 0.02, 0.18, new THREE.MeshStandardMaterial({ map: tex(fabricTex('#e9e4da', 71), { repeat: [2, 2] }), roughness: 1 }), -0.2, 0.755, 0.1); towel.rotation.y = 0.3; table.add(towel);
  const keys = new THREE.Group(); keys.position.set(-0.05, 0.75, -0.12); table.add(keys);
  keys.add(rbox(0.035, 0.012, 0.06, 0.005, M(0x111111, 0.3), 0, 0.006, 0)); keys.add(cyl(0.012, 0.012, 0.002, M(0xb0b0b0, 0.2, { metalness: 1 }), 0, 0.002, 0.04, 12));
  // golf bag
  const bag = new THREE.Group(); bag.position.set(1.6, 0.17, -1.6); bag.rotation.z = 0.12; s.add(bag);
  bag.add(cyl(0.16, 0.14, 0.95, M(0x1d1d22, 0.5), 0, 0.48, 0, 20)); bag.add(cyl(0.165, 0.165, 0.12, M(0xa3161a, 0.4), 0, 0.85, 0, 20));
  for (let i = 0; i < 6; i++) { const cl = cyl(0.035, 0.035, 0.18, M([0x111111, 0xa3161a, 0x666666][i % 3], 0.5), Math.cos(i) * 0.08, 1.02, Math.sin(i) * 0.08, 10); bag.add(cl); }
  // bench + golf cart
  const bench = new THREE.Group(); bench.position.set(-2.8, 0.17, -1.6); bench.rotation.y = 0.4; s.add(bench);
  bench.add(box(1.6, 0.06, 0.4, wood, 0, 0.45, 0)); bench.add(box(1.6, 0.4, 0.05, wood, 0, 0.7, -0.2)); for (const x of [-0.7, 0.7]) bench.add(box(0.06, 0.45, 0.4, M(0x2b2b2b, 0.4, { metalness: 0.8 }), x, 0.22, 0));
  const cart = new THREE.Group(); cart.position.set(-6.5, 0, 4); cart.rotation.y = 1.2; s.add(cart);
  cart.add(rbox(1.2, 0.5, 2.4, 0.12, M(0xeeeeea, 0.4), 0, 0.55, 0)); cart.add(rbox(1.25, 0.08, 1.6, 0.04, M(0x1c1c1c, 0.5), 0, 2.0, -0.2));
  for (const [x, z] of [[-0.5, -0.8], [0.5, -0.8], [-0.5, 0.6], [0.5, 0.6]]) cart.add(cyl(0.03, 0.03, 1.4, M(0x333333, 0.4, { metalness: 0.8 }), x, 1.3, z - 0.1, 8));
  for (const [x, z] of [[-0.62, -0.8], [0.62, -0.8], [-0.62, 0.8], [0.62, 0.8]]) { const w = cyl(0.22, 0.22, 0.14, M(0x111111, 0.8), x, 0.22, z, 16); w.rotation.z = Math.PI / 2; cart.add(w); }
  cart.add(rbox(1.0, 0.5, 0.5, 0.06, M(0x1d1d22, 0.6), 0, 1.0, 0.1));

  // ball + tee peg
  const ball = mesh(new THREE.SphereGeometry(0.0214, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }));
  const BALL0 = new THREE.Vector3(0, 0.17 + 0.045, 0.42);
  ball.position.copy(BALL0); s.add(ball);
  const peg = cyl(0.004, 0.002, 0.05, M(0xd8c39a, 0.6), 0, 0.17 + 0.012, 0.42, 6); s.add(peg);
  // ball trail
  const trail = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })); s.add(trail); trail.frustumCulled = false;

  // grass blades around tee & table
  const gf = grassField(r, { count: 14000, radius: 8, cx: 0, cz: 0, h: 0.085 }); gf.position.y = 0.17; s.add(gf);
  const gf2 = grassField(r, { count: 6000, radius: 12, cx: -2, cz: 10, h: 0.12, colors: [0x48662f, 0x55753a, 0x3b5627] }); s.add(gf2);

  const ballPath = (u) => { // u 0..1 -> ball flight toward +X with slight draw
    const x = 230 * u, y = 0.21 + Math.sin(Math.PI * Math.min(u, 1)) * 38 * (1 - 0.15 * u), z = 0.42 + 6 * u * u;
    return new THREE.Vector3(x, Math.max(0.05, y), z);
  };

  return {
    scene: s, sun, ball, BALL0, peg, table, keys, ballPath, trail,
    grade: { lift: [0.02, 0.025, 0.035], gamma: [1.0, 1.0, 1.02], gain: [0.98, 1.0, 1.02], sat: 0.82, contrast: 1.1, exposure: 1.05, vignette: 0.32 },
    update(t) {
      swayTrees(trees, t, 0.02); gf.userData.uT.value = t; gf2.userData.uT.value = t;
      for (const f of flags) waveFlag(f, t + f.position.x, 0.1, 3);
      const p = pf.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = pfBase[i * 3] + 0.45; p.setZ(i, Math.sin(x * 5 - t * 6) * 0.08 * x); } p.needsUpdate = true;
    },
    setTrail(pts) {
      if (!pts || pts.length < 2) { trail.visible = false; return; }
      const curve = new THREE.CatmullRomCurve3(pts); trail.geometry.dispose(); trail.geometry = new THREE.TubeGeometry(curve, 40, 0.06, 5, false); trail.visible = true;
    },
  };
}
