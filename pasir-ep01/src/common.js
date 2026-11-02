// shared scene-building helpers
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, tex, skyTex, brandTex, glowTex, shaftTex } from './textures.js';

export { RoundedBoxGeometry, mergeGeometries };

export function M(color, rough = 0.7, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra }); }
export function mesh(geo, mat, { cast = true, recv = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
export function box(w, h, d, mat, x = 0, y = 0, z = 0, opts) { const m = mesh(new THREE.BoxGeometry(w, h, d), mat, opts); m.position.set(x, y, z); return m; }
export function rbox(w, h, d, r, mat, x = 0, y = 0, z = 0, opts) { const m = mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, opts); m.position.set(x, y, z); return m; }
export function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 16, opts) { const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, opts); m.position.set(x, y, z); return m; }

export function sky(scene, colors, radius = 900, clouds = 0.8, seed = 31) {
  const t = tex(skyTex(...colors, clouds, seed), { repeat: [1, 1] }); t.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -1; scene.add(m); return m;
}

// organic tree: merged jittered icosahedra canopy + tapered trunk
export function makeTree(r, { h = 7, spread = 2.6, green = [0x2f4a22, 0x3b5a2a, 0x27401c], trunk = 0x4a3826 } = {}) {
  const g = new THREE.Group();
  const tr = cyl(0.12 * h / 7, 0.22 * h / 7, h * 0.6, M(trunk, 0.9), 0, h * 0.3, 0, 8); g.add(tr);
  const parts = [];
  const n = 5 + ((r() * 4) | 0);
  for (let i = 0; i < n; i++) {
    let ge = new THREE.IcosahedronGeometry(spread * (0.45 + r() * 0.4), 1); ge.deleteAttribute('normal'); ge.deleteAttribute('uv'); ge = mergeVertices(ge);
    const p = ge.attributes.position; for (let k = 0; k < p.count; k++) { const s = 1 + (r() - 0.5) * 0.35; p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.8, p.getZ(k) * s); }
    ge.translate((r() - 0.5) * spread * 1.4, h * 0.62 + r() * h * 0.3, (r() - 0.5) * spread * 1.4); ge.computeVertexNormals(); parts.push(ge);
  }
  const can = mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: green[(r() * green.length) | 0], roughness: 0.95, flatShading: false }));
  const cg = new THREE.Group(); cg.add(can); g.add(cg); g.userData.canopy = cg; g.userData.phase = r() * 6.28;
  return g;
}
export function makePalm(r, h = 9) {
  const g = new THREE.Group(); const segs = 8; let x = 0, y = 0; const lean = (r() - 0.5) * 0.3;
  for (let i = 0; i < segs; i++) { const c = cyl(0.17, 0.2, h / segs + 0.05, M(0x6b5a44, 0.95), x, y + h / segs / 2, 0, 8); c.rotation.z = lean * i / segs; g.add(c); x -= Math.sin(lean * i / segs) * h / segs; y += h / segs; }
  const crown = new THREE.Group(); crown.position.set(x, y, 0); g.add(crown);
  const fm = M(0x3d5c26, 0.85, { side: THREE.DoubleSide });
  for (let i = 0; i < 11; i++) {
    const shp = new THREE.Shape(); shp.moveTo(0, 0); shp.quadraticCurveTo(1.6, 0.5, 3.4, -0.7); shp.quadraticCurveTo(1.6, -0.1, 0, 0);
    const f = mesh(new THREE.ShapeGeometry(shp, 6), fm); f.rotation.set(0, i / 11 * Math.PI * 2, -0.25 + r() * 0.3); f.rotation.order = 'YZX'; crown.add(f);
  }
  g.userData.canopy = crown; g.userData.phase = r() * 6.28; return g;
}
export function swayTrees(trees, t, amt = 0.025) { for (const tr of trees) { const c = tr.userData.canopy; c.rotation.z = Math.sin(t * 0.9 + tr.userData.phase) * amt; c.rotation.x = Math.sin(t * 0.63 + tr.userData.phase * 1.3) * amt * 0.6; } }

// instanced grass blades with wind sway (for close shots)
export function grassField(r, { count = 20000, radius = 12, cx = 0, cz = 0, h = 0.09, colors = [0x4c6b34, 0x5d7d3e, 0x3e5a2a, 0x6c8a45] } = {}) {
  const geo = new THREE.BufferGeometry();
  const v = new Float32Array([-0.006, 0, 0, 0.006, 0, 0, -0.003, 0.5, 0, 0.003, 0.5, 0, 0, 1, 0]);
  geo.setAttribute('position', new THREE.BufferAttribute(v, 3)); geo.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  const uT = { value: 0 };
  mat.onBeforeCompile = (s) => { s.uniforms.uT = uT; s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 ip = instanceMatrix * vec4(0.,0.,0.,1.);
      float sw = sin(uT*1.7 + ip.x*0.7 + ip.z*0.5) * 0.25 + sin(uT*3.1 + ip.x*2.1)*0.08;
      transformed.x += sw * position.y * position.y; transformed.z += sw*0.4*position.y*position.y;`); };
  const im = new THREE.InstancedMesh(geo, mat, count); im.receiveShadow = true; im.castShadow = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * radius;
    q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.4, r() * 6.28, (r() - 0.5) * 0.4));
    const s = h * (0.6 + r() * 0.8);
    m4.compose(new THREE.Vector3(cx + Math.cos(a) * d, 0, cz + Math.sin(a) * d), q, new THREE.Vector3(s * 6, s, s * 6));
    im.setMatrixAt(i, m4); c.set(colors[(r() * colors.length) | 0]).multiplyScalar(0.8 + r() * 0.4); im.setColorAt(i, c);
  }
  im.userData.uT = uT; return im;
}

// brand objects
export function billboard(variant = 0, w = 9, h = 3.75, poleH = 6) {
  const g = new THREE.Group();
  const t = tex(brandTex('billboard', variant), { repeat: [1, 1] });
  const face = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.12 }));
  face.position.set(0, poleH + h / 2, 0.16); g.add(face);
  g.add(box(w + 0.3, h + 0.3, 0.25, M(0x2a2a2c, 0.5, { metalness: 0.6 }), 0, poleH + h / 2, 0));
  g.add(cyl(0.22, 0.28, poleH, M(0x55585c, 0.5, { metalness: 0.7 }), 0, poleH / 2, -0.2));
  g.add(box(w, 0.08, 0.8, M(0x3a3a3c, 0.5, { metalness: 0.6 }), 0, poleH - 0.05, 0.4));
  // small spot lamps
  for (const sx of [-w / 3, 0, w / 3]) { const l = cyl(0.08, 0.12, 0.3, M(0x222222), sx, poleH + h + 0.35, 0.6); l.rotation.x = 1.2; g.add(l); }
  return g;
}
export function rollBanner(variant = 0) {
  const g = new THREE.Group();
  const t = tex(brandTex('banner', variant), { repeat: [1, 1] });
  const f = mesh(new THREE.PlaneGeometry(0.85, 2.1), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.08 }));
  f.position.y = 1.12; g.add(f);
  g.add(box(0.9, 0.08, 0.22, M(0x9a9da2, 0.3, { metalness: 0.9 }), 0, 0.04, 0));
  const back = box(0.03, 2.1, 0.03, M(0x9a9da2, 0.3, { metalness: 0.9 }), 0, 1.1, -0.03); g.add(back);
  return g;
}
export function fenceBoard(len = 8, h = 0.9) {
  const g = new THREE.Group(); const t = tex(brandTex('fence'), { repeat: [len / 8, 1] });
  const f = mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.08 })); f.position.y = h / 2 + 0.1; g.add(f);
  const b = box(len, h, 0.04, M(0x1a1a1c), 0, h / 2 + 0.1, -0.03); g.add(b);
  for (let i = 0; i <= 4; i++) g.add(box(0.05, h + 0.1, 0.05, M(0x777777, 0.4, { metalness: 0.8 }), -len / 2 + (i * len) / 4, (h + 0.1) / 2, -0.06));
  return g;
}
export function flagBanner(variant = 0) { // tall feather flag
  const g = new THREE.Group(); const t = tex(brandTex('flag', variant), { repeat: [1, 1] });
  const geo = new THREE.PlaneGeometry(0.8, 2.6, 12, 1);
  const f = mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, side: THREE.DoubleSide })); f.position.set(0.42, 2.0, 0); g.add(f);
  g.add(cyl(0.02, 0.02, 3.4, M(0x888888, 0.3, { metalness: 0.9 }), 0, 1.7, 0, 8));
  g.userData.flag = f; g.userData.base = geo.attributes.position.array.slice(); return g;
}
export function waveFlag(fg, t, amp = 0.12, freq = 3) {
  const f = fg.userData.flag, p = f.geometry.attributes.position, b = fg.userData.base;
  for (let i = 0; i < p.count; i++) { const x = b[i * 3] + 0.4; p.setZ(i, Math.sin(x * freq - t * 4) * amp * x); }
  p.needsUpdate = true; f.geometry.computeVertexNormals();
}

export function glowSprite(color = 0xffffff, size = 1, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(glowTex(), { srgb: false }), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1); return s;
}
// fake volumetric shaft: crossed additive planes
export function lightShaft(color = 0xfff2dd, w = 1.2, h = 4, opacity = 0.18) {
  const g = new THREE.Group(); const t = tex(shaftTex(), { srgb: false });
  const mat = new THREE.MeshBasicMaterial({ map: t, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.y = -h / 2; p.rotation.y = (i * Math.PI) / 3; g.add(p); }
  g.userData.mat = mat; return g;
}
// floating dust motes
export function dust(r, n = 400, box = [6, 3, 6], center = [0, 1.5, 0], size = 0.012) {
  const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = center[0] + (r() - 0.5) * box[0]; pos[i * 3 + 1] = center[1] + (r() - 0.5) * box[1]; pos[i * 3 + 2] = center[2] + (r() - 0.5) * box[2]; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size, color: 0xfff0d8, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, map: tex(glowTex(), { srgb: false }) }));
  p.userData.base = pos.slice(); p.userData.n = n; return p;
}
export function animateDust(p, t) { const a = p.geometry.attributes.position.array, b = p.userData.base; for (let i = 0; i < p.userData.n; i++) { a[i * 3] = b[i * 3] + Math.sin(t * 0.3 + i) * 0.08; a[i * 3 + 1] = b[i * 3 + 1] + Math.sin(t * 0.21 + i * 1.7) * 0.06; a[i * 3 + 2] = b[i * 3 + 2] + Math.cos(t * 0.25 + i * 0.7) * 0.08; } p.geometry.attributes.position.needsUpdate = true; }

export function shadowSun(scene, color, intensity, pos, target, size = 20, mapSize = 2048) {
  const d = new THREE.DirectionalLight(color, intensity); d.position.set(...pos); d.target.position.set(...target);
  d.castShadow = true; d.shadow.mapSize.set(mapSize, mapSize); const c = d.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 0.5; c.far = 300;
  d.shadow.bias = -0.0004; d.shadow.normalBias = 0.02; d.shadow.radius = 4;
  scene.add(d, d.target); return d;
}
export { rng, tex };
