// Stylised-3D characters matching the PASIR turnaround reference:
// big round head, huge ringed eyes, boxy tapered torso, thin stick limbs (2-bone IK), ball hands.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { tex, batikTex, ulosTex, fabricTex } from './textures.js';

const Y = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();

export function outlineMat(thick = 0.008, color = 0x0b0a0a) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${thick.toFixed(4)};`); };
  return m;
}
function withOutline(mesh, thick = 0.008) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat(thick)); o.castShadow = false; o.receiveShadow = false; mesh.add(o); return mesh;
}
function std(color, rough = 0.6, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra }); }

// spherical cap centred on +Y (angular radius a), used for eyes/blush/mouth so they hug the head
function capGeo(R, a, seg = 28) { return new THREE.SphereGeometry(R, seg, 6, 0, Math.PI * 2, 0, a); }
function dirFromYawPitch(yaw, pitch) { return new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); }
function orientUp(obj, dir) { obj.quaternion.setFromUnitVectors(Y, dir.clone().normalize()); }

// hair = sphere shell with a shader-cut hairline (front cut high, back cut low, wavy fringe)
function hairMat(color, frontCut, backCut, wave = 0.04, rough = 0.75) {
  const m = std(color, rough);
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHP = normalize(position);');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHP;').replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float fz = vHP.z*0.5+0.5; float ang = atan(vHP.x, vHP.z);
      float cut = mix(${backCut.toFixed(3)}, ${frontCut.toFixed(3)}, smoothstep(0.15,0.95,fz)) + ${wave.toFixed(3)}*sin(ang*13.0)*smoothstep(0.4,0.9,fz);
      if (vHP.y < cut) discard;`);
  };
  m.side = THREE.DoubleSide;
  return m;
}

export class Character {
  constructor(spec) {
    this.spec = spec;
    const S = spec;
    this.root = new THREE.Group(); this.root.name = S.name;
    this.hipBase = S.hipBase || 0.52; this.legA = 0.25; this.legB = 0.245;
    this.armA = 0.25; this.armB = 0.24;
    const R = this.R = S.headR || 0.33;
    const skin = std(S.skin, 0.55);
    const black = std(S.limb || 0x141416, 0.5);

    // torso
    this.torso = new THREE.Group(); this.root.add(this.torso);
    const tw = S.torsoW || 0.5, th = S.torsoH || 0.6, td = S.torsoD || 0.3;
    const tg = new RoundedBoxGeometry(tw, th, td, 3, 0.05);
    const pos = tg.attributes.position; // taper: wider at the hem like the reference
    for (let i = 0; i < pos.count; i++) { const yy = pos.getY(i) / th + 0.5; const k = 1 + (S.flare ?? 0.1) * (1 - yy); pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * (1 + 0.05 * (1 - yy))); }
    tg.computeVertexNormals();
    const torsoMesh = withOutline(new THREE.Mesh(tg, S.torsoMat), 0.007); torsoMesh.position.y = th / 2 + 0.01; torsoMesh.castShadow = true; torsoMesh.receiveShadow = true;
    this.torso.add(torsoMesh); this.torsoMesh = torsoMesh; this.tw = tw; this.th = th; this.td = td;
    if (S.decorateTorso) S.decorateTorso(this, torsoMesh);

    // shoulders (torso-local)
    this.shoulder = { L: new THREE.Vector3(tw / 2 + 0.02, th - 0.04, 0), R: new THREE.Vector3(-tw / 2 - 0.02, th - 0.04, 0) };
    this.hip = { L: new THREE.Vector3(0.09, 0, 0), R: new THREE.Vector3(-0.09, 0, 0) };

    // head
    this.neck = new THREE.Group(); this.neck.position.set(0, th + 0.02, 0); this.torso.add(this.neck);
    this.head = new THREE.Group(); this.head.position.y = R * 0.92; this.neck.add(this.head);
    const headMesh = withOutline(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), skin), 0.008); headMesh.castShadow = true; this.head.add(headMesh);
    // ears
    for (const sx of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(R * 0.16, 16, 12), skin); e.scale.set(0.5, 1, 0.8); e.position.set(sx * R * 0.98, -R * 0.05, -R * 0.02); this.head.add(e); }
    // hair
    if (S.hair) { const h = new THREE.Mesh(new THREE.SphereGeometry(R * S.hair.scale, 48, 32), hairMat(S.hair.color, S.hair.front, S.hair.back, S.hair.wave ?? 0.04)); h.userData.noShadow = true; h.position.y = R * 0.02; this.head.add(h); this.hairMesh = h; }

    // eyes
    this.eyes = {};
    const eyeYaw = S.eyeYaw ?? 0.36, eyePitch = S.eyePitch ?? 0.08;
    const ringA = S.eyeRing ?? 0.3, whiteA = ringA * 0.76, pupA = ringA * 0.36;
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const g = new THREE.Group(); this.head.add(g);
      const dir = dirFromYawPitch(sx * eyeYaw, eyePitch);
      const ring = new THREE.Mesh(capGeo(R * 1.004, ringA), std(0x0c0b0b, 0.4)); orientUp(ring, dir); g.add(ring);
      const white = new THREE.Mesh(capGeo(R * 1.008, whiteA), std(0xf3efe6, 0.18)); orientUp(white, dir); g.add(white);
      const pupil = new THREE.Mesh(capGeo(R * 1.012, pupA), std(0x080808, 0.15)); g.add(pupil);
      const hl = new THREE.Mesh(capGeo(R * 1.016, pupA * 0.32), new THREE.MeshBasicMaterial({ color: 0xffffff })); g.add(hl);
      // eyelid (skin cap) for blinks: hidden unless blinking
      const lid = new THREE.Mesh(capGeo(R * 1.02, ringA * 1.05), skin); orientUp(lid, dir); lid.visible = false; g.add(lid);
      this.eyes[side] = { g, dir, pupil, hl, lid, white, ring, whiteA, pupA, sx, yaw: sx * eyeYaw, pitch: eyePitch };
      // brow: short thick dark bar
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.07, 4, 8), std(S.browColor ?? 0x111111, 0.6));
      brow.rotation.z = Math.PI / 2; const bg = new THREE.Group(); bg.add(brow); this.head.add(bg);
      this.eyes[side].brow = bg;
      // blush
      if (S.blush !== false) { const bl = new THREE.Mesh(capGeo(R * 1.005, 0.13), new THREE.MeshStandardMaterial({ color: 0xd9766a, transparent: true, opacity: 0.38, roughness: 0.8, depthWrite: false })); orientUp(bl, dirFromYawPitch(sx * 0.62, -0.18)); this.head.add(bl); }
    }
    // mouth: dark ellipse cap (talk) + smile arc
    this.mouth = new THREE.Group(); this.head.add(this.mouth);
    const mDir = dirFromYawPitch(0, S.mouthPitch ?? -0.33);
    this.mouthO = new THREE.Mesh(capGeo(R * 1.004, 0.07), std(0x2a0e0c, 0.5)); this.mouthO.quaternion.setFromUnitVectors(Y, mDir); this.mouth.add(this.mouthO);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.0065, 6, 16, Math.PI * 0.8), std(0x2a0e0c, 0.5));
    this.smileArc = new THREE.Group(); this.smileArc.add(arc); arc.rotation.z = -Math.PI * 0.9; this.head.add(this.smileArc);
    this.smileArc.position.copy(mDir.clone().multiplyScalar(R * 1.0)); this.smileArc.lookAt(mDir.clone().multiplyScalar(R * 3));
    this.mDir = mDir;
    if (S.decorateHead) S.decorateHead(this);

    // limbs
    const limbGeo = new THREE.CylinderGeometry(1, 1, 1, 10); limbGeo.translate(0, 0, 0);
    this.sticks = {};
    const mk = (name, r) => { const m = new THREE.Mesh(limbGeo, black); m.userData.r = r; m.castShadow = true; m.scale.set(r, 1, r); this.root.add(m); this.sticks[name] = m; return m; };
    for (const s of ['L', 'R']) { mk('ua' + s, 0.023); mk('la' + s, 0.022); mk('ul' + s, 0.03); mk('ll' + s, 0.028); }
    this.hands = {}; this.grip = {}; this.feet = {};
    for (const s of ['L', 'R']) {
      const h = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 14), skin), 0.006); h.castShadow = true; this.root.add(h); this.hands[s] = h;
      const g = new THREE.Group(); h.add(g); this.grip[s] = g;
      const shoe = withOutline(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), std(0x0b0b0c, 0.35)), 0.01); shoe.scale.set(0.075, 0.05, 0.12); shoe.castShadow = true; this.root.add(shoe); this.feet[s] = shoe;
    }
    if (S.decorateHands) S.decorateHands(this);

    this.root.traverse(o => { if (o.isMesh && o.material.side === THREE.FrontSide && !o.userData.noShadow) o.castShadow = true; });
    this.root.traverse(o => { if (o.isMesh && o.userData.noShadow) o.castShadow = false; });
    this.pose = Character.defaultPose();
    this.update();
  }

  static defaultPose() {
    return {
      x: 0, z: 0, y: 0, rotY: 0,
      hipDrop: 0, lean: 0, twist: 0, sway: 0,
      headYaw: 0, headPitch: 0, headRoll: 0,
      hand: { L: null, R: null }, // torso-local Vector3 or {world:Vector3}
      pole: { L: null, R: null },
      foot: { L: null, R: null }, // root-local
      footRot: { L: 0, R: 0 },
      look: [0, 0], blink: 0, pupil: 1, brow: 0, browRaise: 0, mouthOpen: 0, smile: 0, mouthW: 1,
    };
  }

  // convenience: walking legs. phase in radians; stride metres
  walkLegs(p, phase, stride = 0.5, lift = 0.09) {
    for (const s of ['L', 'R']) {
      const ph = phase + (s === 'L' ? 0 : Math.PI);
      const z = Math.sin(ph) * stride / 2, up = Math.max(0, Math.cos(ph)) * lift;
      p.foot[s] = new THREE.Vector3(s === 'L' ? 0.1 : -0.1, 0.045 + up, z + 0.03);
      p.footRot[s] = -Math.max(0, Math.cos(ph)) * 0.3;
    }
    p.hipDrop = -Math.abs(Math.cos(phase)) * 0.02 + 0.01;
    p.sway = Math.sin(phase) * 0.03;
    return p;
  }
  armSwing(p, phase, amt = 0.12) {
    for (const s of ['L', 'R']) { if (p.hand[s]) continue; const sx = s === 'L' ? 1 : -1; const ph = phase + (s === 'L' ? Math.PI : 0); p.hand[s] = new THREE.Vector3(sx * (this.tw / 2 + 0.06), 0.06, Math.sin(ph) * amt + 0.02); }
    return p;
  }

  update() {
    const p = this.pose, R = this.R;
    this.root.position.set(p.x, p.y, p.z); this.root.rotation.set(0, p.rotY, 0);
    this.root.updateMatrixWorld(true);
    const hipY = this.hipBase - p.hipDrop;
    this.torso.position.set(0, hipY, 0);
    this.torso.rotation.set(p.lean, p.twist, p.sway, 'YXZ');
    this.neck.rotation.set(p.headPitch * 0.3, p.headYaw * 0.3, p.headRoll * 0.3);
    this.head.rotation.set(p.headPitch * 0.7, p.headYaw * 0.7, p.headRoll * 0.7, 'YXZ');
    this.torso.updateMatrixWorld(true);
    const toRoot = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
    const torsoToRoot = new THREE.Matrix4().multiplyMatrices(toRoot, this.torso.matrixWorld);

    // arms
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const S = this.shoulder[s].clone().applyMatrix4(torsoToRoot);
      let T;
      const h = p.hand[s];
      if (h && h.world) T = h.world.clone().applyMatrix4(toRoot);
      else if (h) T = h.clone().applyMatrix4(torsoToRoot);
      else T = new THREE.Vector3(sx * (this.tw / 2 + 0.06), 0.04, 0.03).applyMatrix4(torsoToRoot);
      const pole = (p.pole[s] || new THREE.Vector3(sx * 0.4, -0.2, -1)).clone().transformDirection(torsoToRoot);
      const { E, T2 } = ik(S, T, this.armA, this.armB, pole);
      place(this.sticks['ua' + s], S, E); place(this.sticks['la' + s], E, T2);
      this.hands[s].position.copy(T2);
      this.grip[s].quaternion.setFromUnitVectors(Y, tmpA.copy(T2).sub(E).normalize());
      this.hands[s].quaternion.identity();
    }
    // legs
    for (const s of ['L', 'R']) {
      const H = this.hip[s].clone().applyMatrix4(torsoToRoot);
      const F = p.foot[s] ? p.foot[s].clone() : new THREE.Vector3(s === 'L' ? 0.1 : -0.1, 0.045, 0.03);
      const ankle = F.clone(); ankle.y += 0.03; ankle.z -= 0.03;
      const pole = new THREE.Vector3(0, 0, 1);
      const { E, T2 } = ik(H, ankle, this.legA, this.legB, pole);
      place(this.sticks['ul' + s], H, E); place(this.sticks['ll' + s], E, T2);
      this.feet[s].position.copy(F); this.feet[s].rotation.set(p.footRot[s] || 0, 0, 0);
    }

    // face
    for (const s of ['L', 'R']) {
      const e = this.eyes[s];
      const lx = Math.max(-1, Math.min(1, p.look[0])), ly = Math.max(-1, Math.min(1, p.look[1]));
      const maxOff = e.whiteA - e.pupA * p.pupil - 0.01;
      const d = dirFromYawPitch(e.yaw + lx * maxOff, e.pitch + ly * maxOff);
      e.pupil.quaternion.setFromUnitVectors(Y, d); e.pupil.scale.set(p.pupil, 1, p.pupil);
      const dh = dirFromYawPitch(e.yaw + lx * maxOff + e.pupA * 0.35 * p.pupil, e.pitch + ly * maxOff + e.pupA * 0.4 * p.pupil);
      e.hl.quaternion.setFromUnitVectors(Y, dh);
      // blink: squash the eye group vertically around eye centre
      const bl = Math.min(1, Math.max(0, p.blink));
      const c = e.dir.clone().multiplyScalar(R);
      e.g.position.copy(c); e.g.scale.set(1, 1 - bl * 0.92, 1); e.g.position.sub(c.clone().multiply(new THREE.Vector3(1, 1 - bl * 0.92, 1)));
      // brows: worried (brow>0) tilt inner-up, angry (brow<0) inner-down
      const bd = dirFromYawPitch(e.yaw * 0.95, e.pitch + 0.33 + p.browRaise * 0.08);
      e.brow.position.copy(bd.clone().multiplyScalar(R * 1.012));
      e.brow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bd);
      e.brow.rotateZ(e.sx * p.brow * 0.45);
    }
    const mo = Math.max(0, p.mouthOpen);
    this.mouthO.scale.set(p.mouthW * (1 + mo * 0.25), 1, 0.25 + mo * 1.1);
    this.mouthO.visible = p.smile < 0.35 || mo > 0.15;
    this.smileArc.visible = !this.mouthO.visible;
    this.smileArc.scale.setScalar(0.8 + p.smile * 0.4);
    this.root.updateMatrixWorld(true);
  }
}

function ik(S, T, a, b, pole) {
  const d = tmpA.copy(T).sub(S); let L = d.length(); const dir = d.clone().normalize();
  L = Math.min(Math.max(L, Math.abs(a - b) + 1e-3), a + b - 1e-4);
  const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
  const perp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const E = S.clone().add(dir.clone().multiplyScalar(x)).add(perp.multiplyScalar(h));
  const T2 = S.clone().add(dir.clone().multiplyScalar(L));
  return { E, T2 };
}
function place(mesh, A, B) {
  const d = tmpC.copy(B).sub(A); const L = d.length();
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y, d.normalize());
  const r = mesh.userData.r; mesh.scale.set(r, L + r * 1.2, r);
}

// ---------------- character specs ----------------
export function makeNando() {
  const navy = new THREE.MeshStandardMaterial({ color: 0x1c2333, roughness: 0.62, map: tex(fabricTex('#ffffff', 51, 'rgba(0,0,0,0.12)'), { repeat: [3, 3] }) });
  return new Character({
    name: 'Nando', skin: 0x8c5c3c, torsoMat: navy, limb: 0x111318,
    hair: { color: 0x0e0b0a, scale: 1.055, front: 0.47, back: -0.4, wave: 0.04 },
    browColor: 0x0d0b0a,
    decorateTorso(ch, m) {
      // shirt V + red tie + lapels + buttons
      const th = ch.th, tw = ch.tw, td = ch.td;
      const shirtShape = new THREE.Shape(); shirtShape.moveTo(-0.09, th / 2); shirtShape.lineTo(0.09, th / 2); shirtShape.lineTo(0.0, th / 2 - 0.3); shirtShape.closePath();
      const shirt = new THREE.Mesh(new THREE.ShapeGeometry(shirtShape), std(0xeeeae2, 0.6)); shirt.position.z = td / 2 + 0.004; m.add(shirt);
      const tie = new THREE.Shape(); tie.moveTo(-0.022, th / 2 - 0.01); tie.lineTo(0.022, th / 2 - 0.01); tie.lineTo(0.03, th / 2 - 0.27); tie.lineTo(0, th / 2 - 0.31); tie.lineTo(-0.03, th / 2 - 0.27); tie.closePath();
      const tieM = new THREE.Mesh(new THREE.ShapeGeometry(tie), std(0xb3161b, 0.45)); tieM.position.z = td / 2 + 0.008; m.add(tieM);
      for (const sx of [1, -1]) {
        const lap = new THREE.Shape(); lap.moveTo(sx * 0.09, th / 2); lap.lineTo(sx * 0.15, th / 2); lap.lineTo(sx * 0.03, th / 2 - 0.3); lap.lineTo(0, th / 2 - 0.3); lap.closePath();
        const lm = new THREE.Mesh(new THREE.ShapeGeometry(lap), std(0x151a26, 0.5, { side: THREE.DoubleSide })); lm.position.z = td / 2 + 0.006; m.add(lm);
      }
      for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 12), std(0x0a0a0a, 0.3)); b.rotation.x = Math.PI / 2; b.position.set(0, th / 2 - 0.36 - i * 0.07, td / 2 + 0.03); m.add(b); }
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.01), std(0x10141d)); pocket.position.set(0.14, th / 2 - 0.12, td / 2 + 0.005); m.add(pocket);
      const sq = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.006), std(0xeeeae2)); sq.position.set(0.14, th / 2 - 0.108, td / 2 + 0.008); m.add(sq);
    },
    decorateHands(ch) { // watch? Nando has none. small cuff
      for (const s of ['L', 'R']) { const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 14), std(0xeeeae2)); cuff.position.y = -0.07; ch.grip[s].add(cuff); }
    },
  });
}

export function makePapa() {
  const bt = tex(batikTex(), { repeat: [1.4, 1.4] });
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bt, roughness: 0.7 });
  const ch = new Character({
    name: 'Papa', skin: 0x744a30, torsoMat: mat, torsoW: 0.64, torsoH: 0.64, torsoD: 0.38, flare: 0.04, headR: 0.34, limb: 0x141210,
    hair: { color: 0x77726b, scale: 1.04, front: 0.55, back: -0.3, wave: 0.01 }, browColor: 0x3a3632,
    decorateTorso(c, m) {
      const ul = new THREE.MeshStandardMaterial({ map: tex(ulosTex(), { repeat: [1, 1] }), roughness: 0.8, side: THREE.DoubleSide });
      const front = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.5), ul); front.position.set(0.19, 0.03, c.td / 2 + 0.012); front.rotation.z = 0.12; m.add(front);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.5), ul); back.position.set(0.19, 0.03, -c.td / 2 - 0.012); back.rotation.y = Math.PI; back.rotation.z = 0.12; m.add(back);
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, c.td + 0.03), ul); top.position.set(0.2, c.th / 2 + 0.005, 0); m.add(top);
      // collar + pocket
      for (const sx of [1, -1]) { const col = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.02), std(0x6e3b17)); col.position.set(sx * 0.05, c.th / 2 - 0.02, c.td / 2 + 0.01); col.rotation.z = sx * 0.5; m.add(col); }
      for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.006, 10), std(0x2a160a)); b.rotation.x = Math.PI / 2; b.position.set(-0.01, c.th / 2 - 0.1 - i * 0.11, c.td / 2 + 0.005); m.add(b); }
    },
    decorateHead(c) {
      const R = c.R;
      const must = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 6, 12), std(0x2b2723, 0.85));
      must.rotation.z = Math.PI / 2; const g = new THREE.Group(); g.add(must);
      const d = dirFromYawPitch(0, -0.2); g.position.copy(d.multiplyScalar(R * 1.0)); g.lookAt(0, -R * 0.3, R * 3); g.scale.set(1, 1, 0.6); c.head.add(g);
      for (const sx of [1, -1]) { const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.05, 6, 10), std(0x2b2723, 0.85)); tip.position.set(sx * 0.085, -0.025, 0); tip.rotation.z = sx * 0.9; g.add(tip); }
      c.mouthO.quaternion.setFromUnitVectors(Y, dirFromYawPitch(0, -0.38));
    },
    decorateHands(c) {
      // akik ring on right hand, classic watch on left wrist
      const ring = new THREE.Group();
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 10, 24), new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 1, roughness: 0.25 }));
      const stone = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x7a1e12, roughness: 0.15, clearcoat: 1 }));
      stone.scale.set(1, 0.6, 1.2); stone.position.y = 0.03; ring.add(band, stone); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.02, 0.045); c.grip.R.add(ring);
      const watch = new THREE.Group();
      const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.022, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x3b2414, roughness: 0.6, side: THREE.DoubleSide }));
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 24), new THREE.MeshStandardMaterial({ color: 0xc9c2b0, metalness: 0.9, roughness: 0.25 }));
      face.rotation.z = Math.PI / 2; face.position.x = 0.03; watch.add(strap, face); watch.position.y = -0.08; c.grip.L.add(watch);
    },
  });
  return ch;
}

// ---------- standalone props shared by sets ----------
export function makeRing() {
  const ring = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0028, 12, 32), new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 1, roughness: 0.22 }));
  const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0095, 0.004, 24), new THREE.MeshStandardMaterial({ color: 0xc8962f, metalness: 1, roughness: 0.25 }));
  bezel.position.y = 0.0125;
  const stone = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0x8a2412, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }));
  stone.scale.set(1, 0.55, 1.25); stone.position.y = 0.0155;
  ring.add(band, bezel, stone);
  ring.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return ring;
}

export function makeWatch() {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 32), new THREE.MeshStandardMaterial({ color: 0xc9c2b0, metalness: 0.95, roughness: 0.2 }));
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.017, 32), new THREE.MeshStandardMaterial({ color: 0xece4cf, roughness: 0.4 })); dial.rotation.x = -Math.PI / 2; dial.position.y = 0.0042;
  const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.001, 0.012), std(0x111111)); hand1.position.set(0.002, 0.005, -0.004); hand1.rotation.y = 0.6;
  const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.001, 0.009), std(0x111111)); hand2.position.set(-0.003, 0.005, 0.002); hand2.rotation.y = 2.2;
  const strapM = new THREE.MeshStandardMaterial({ color: 0x3b2414, roughness: 0.65 });
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.06), strapM); s1.position.set(0, 0, 0.045);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.05), strapM); s2.position.set(0, 0, -0.04); s2.rotation.x = 0.4;
  g.add(face, dial, hand1, hand2, s1, s2);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function makePhone(screenTex) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.155, 0.009, 4, 0.008), new THREE.MeshStandardMaterial({ color: 0x1b1c20, metalness: 0.6, roughness: 0.3 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.069, 0.149), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1.25, roughness: 0.6, metalness: 0 }));
  scr.position.z = 0.0047;
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 16), std(0x050505, 0.2)); cam.rotation.x = Math.PI / 2; cam.position.set(-0.022, 0.06, -0.0055);
  g.add(body, scr, cam); g.userData.screen = scr;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function makeGolfClub() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.004, 1.0, 10), new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 1, roughness: 0.25 }));
  shaft.position.y = -0.5; g.add(shaft);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.009, 0.26, 12), std(0x161616, 0.8)); grip.position.y = -0.1; g.add(grip);
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.05, 0.035, 3, 0.012), new THREE.MeshStandardMaterial({ color: 0x23252a, metalness: 0.9, roughness: 0.3 }));
  head.position.set(0.045, -1.02, 0); g.add(head);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
