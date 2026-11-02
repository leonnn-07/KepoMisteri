// Per-shot direction: camera moves, character animation, props, phone UI, overlays.
import * as THREE from 'three';
import { SHOTS, lineActive } from './timeline.js';
import { logoImg } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
const ss = (a, b, x) => sm((x - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
const lv = (a, b, u) => new THREE.Vector3(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u));
// handheld camera noise
const hh = (T, amt = 1) => V(Math.sin(T * 1.3) * 0.006 + Math.sin(T * 3.1) * 0.0025, Math.sin(T * 1.7 + 1) * 0.005 + Math.sin(T * 2.9) * 0.002, Math.sin(T * 1.1 + 2) * 0.004).multiplyScalar(amt);
const blinkAt = (T) => { const per = 3.4, ph = (T + 0.7) % per; return ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : 0; };

export function makeDirector(ctx) {
  const { sets, nando, phone, phoneObj, engine, keysObj, ringHeld, phoneGlow } = ctx;
  const N = nando;
  const golf = sets.golf, road = sets.road, house = sets.house, base = sets.basement;
  const club = ctx.club;

  // ----- helpers -----
  function pose() { N.pose = N.constructor.defaultPose(); return N.pose; }
  function idle(p, T, { talk = true, shout = false } = {}) {
    p.hipDrop += Math.sin(T * 1.6) * 0.004; p.blink = Math.max(p.blink, blinkAt(T));
    p.look[0] += Math.sin(T * 0.7) * 0.06; p.look[1] += Math.sin(T * 0.53 + 1) * 0.04;
    p.headPitch += Math.sin(T * 0.9) * 0.015; p.headYaw += Math.sin(T * 0.6) * 0.02;
    if (talk) { const c = lineActive(T, 'NANDO', ['dialog']); if (c) { const u = T - c.start; const env = ss(0, 0.08, u) * (1 - ss(c.est - 0.15, c.est, u)); const big = c.text === c.text.toUpperCase() && /[A-Z]/.test(c.text) ? 1.4 : 1; p.mouthOpen = Math.max(p.mouthOpen, env * big * (0.25 + 0.75 * Math.abs(Math.sin(u * 12.5)) * (0.6 + 0.4 * Math.sin(u * 4.7)))); p.headPitch += Math.sin(u * 7) * 0.02 * big; } }
  }
  const fwd = (r) => V(Math.sin(r), 0, Math.cos(r));
  const right = (r) => V(-Math.cos(r), 0, Math.sin(r));
  const headW = () => N.head.getWorldPosition(new THREE.Vector3());
  const handW = (s = 'R') => N.hands[s].getWorldPosition(new THREE.Vector3());
  function walkTo(p, a, b, u, dist, y = 0, stride = 0.48) { // a,b: [x,z]
    const x = lerp(a[0], b[0], u), z = lerp(a[1], b[1], u);
    p.x = x; p.z = z; p.y = y; p.rotY = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const ph = 2 * dist / stride; N.walkLegs(p, ph, stride); N.armSwing(p, ph, 0.1); return ph;
  }
  // phone placement modes
  function phoneTo(scene, mode, opts = {}) {
    scene.add(phoneObj); phoneObj.visible = true; phoneObj.scale.setScalar(opts.scale || 1);
    N.update();
    if (mode === 'front') {
      const h = handW('R'), hd = headW(); const up = V(0, 1, 0);
      phoneObj.position.copy(h).add(up.multiplyScalar(0.075)).add(hd.clone().sub(h).normalize().multiplyScalar(0.025));
      phoneObj.up.set(0, 1, 0); phoneObj.lookAt(hd.clone().add(V(0, 0.15, 0)));
    } else if (mode === 'ear') {
      const ear = N.head.localToWorld(V(-N.R * 1.06, -0.03, 0.06)); const hd = headW();
      phoneObj.position.copy(ear); phoneObj.up.copy(V(0, 1, 0)); phoneObj.lookAt(hd); phoneObj.rotateX(-0.25);
    }
    if (opts.vib) { phoneObj.position.x += Math.sin(opts.T * 160) * 0.0012; phoneObj.position.z += Math.cos(opts.T * 140) * 0.0012; }
  }
  function phoneScreenFacingPoint(dist = 0.25, side = 0, up = 0) { dist = Math.min(dist, 0.235); // a point in front of the phone screen
    const n = V(0, 0, 1).applyQuaternion(phoneObj.quaternion), r = V(1, 0, 0).applyQuaternion(phoneObj.quaternion), u = V(0, 1, 0).applyQuaternion(phoneObj.quaternion);
    return phoneObj.position.clone().add(n.multiplyScalar(dist)).add(r.multiplyScalar(side)).add(u.multiplyScalar(up));
  }
  const handPhoneFront = (p) => { p.hand.R = V(-0.08, 0.48, 0.42); p.pole.R = V(-1, -0.6, 0); p.headPitch = -0.32; p.look = [0.1, -0.7]; };
  const handPhoneEar = (p) => { p.hand.R = V(-0.37, 0.86, 0.1); p.pole.R = V(-0.6, -1, -0.2); };
  function glow(on, intensity = 0.7) { phoneGlow.intensity = on ? intensity * 0.45 : 0; if (on) phoneGlow.position.copy(phoneScreenFacingPoint(0.2, 0, -0.06)); }

  // golf swing pose. th>0 backswing (hands to golfer's right = -x), th<0 follow-through
  function swing(p, th, hinge) {
    const C = V(0, 0.42, 0.12), rho = 0.36;
    const hp = V(C.x - rho * Math.sin(th), C.y - rho * Math.cos(th), 0.26 - 0.08 * Math.abs(Math.sin(th)));
    p.hand.R = hp.clone().add(V(0.0, 0.0, 0.02)); p.hand.L = hp.clone().add(V(0.035, 0.05, 0.0));
    p.pole.R = V(-0.3, -1, -0.4); p.pole.L = V(0.3, -1, -0.4);
    p.twist = -th * 0.32; p.headYaw = th * 0.28; p.headPitch = -0.42; p.look = [0, -0.6]; p.lean = 0.28; p.hipDrop = 0.04;
    p.foot.L = V(0.17, 0.045, 0.05); p.foot.R = V(-0.17, 0.045, 0.05);
    const phi = th + hinge;
    N.update();
    club.visible = true; N.torso.add(club);
    club.position.copy(hp).add(V(0, -0.01, 0.03)); club.scale.setScalar(0.58);
    const dir = V(-Math.sin(phi), -Math.cos(phi), 0.32 * Math.cos(phi)).normalize();
    club.quaternion.setFromUnitVectors(V(0, -1, 0), dir);
  }

  const ov = engine.ovCtx;
  function ovClear() { ov.clearRect(0, 0, 1920, 1080); }
  function caption(text, sub, a) { // location caption, lower left
    ov.save(); ov.globalAlpha = a; ov.fillStyle = '#a3161a'; ov.fillRect(120, 830, 6, 66);
    ov.fillStyle = '#f2ede4'; ov.font = '700 34px Inter'; ov.textBaseline = 'top'; ov.fillText(text, 142, 830);
    ov.fillStyle = 'rgba(242,237,228,0.75)'; ov.font = '500 24px Inter'; ov.fillText(sub, 142, 872); ov.restore();
  }

  // ---------------- shot implementations ----------------
  // each returns { scene, cam:{p,l,fov,near,far}, focus, aperture, set, overlay, fade, flash, letterbox }
  const S = {};
  const GOLF_Y = 0.17;
  const teeY = (x, z) => { const ex = Math.max(0, Math.abs(x) - 4.5), ez = Math.max(0, Math.abs(z) - 3.5); const d = Math.max(ex, ez); return GOLF_Y * (1 - ss(0, 0.35, d)); };
  const NAND0 = [0, 0];
  const TABLE_PH = V(2.22, GOLF_Y + 0.752, -0.95);
  const PICK = [1.72, -0.55], PICK_R = Math.atan2(2.22 - 1.72, -0.95 + 0.55);

  function golfBase(T) { golf.scene.add(N.root); golf.ball.visible = true; golf.peg.visible = true; golf.setTrail(null); club.visible = false; keysObj.visible = false; ringHeld.visible = false; phoneGlow.intensity = 0; }
  function phoneOnTable(T, vib = false) { golf.scene.add(phoneObj); phoneObj.scale.setScalar(1); phoneObj.position.copy(TABLE_PH); phoneObj.rotation.set(-Math.PI / 2, 0, 0.5); if (vib) { phoneObj.position.x += Math.sin(T * 170) * 0.0015; phoneObj.rotation.z += Math.sin(T * 90) * 0.01; } }
  const T_IMPACT = () => SHOTS.find(s => s.id === 's03').t0 + 1.75;
  function ballAt(T) { const ti = T_IMPACT(); if (T < ti) { golf.ball.position.copy(golf.BALL0); golf.setTrail(null); return golf.BALL0.clone(); } const u = (T - ti) / 5.2; const bp = golf.ballPath(u); golf.ball.position.copy(bp); const pts = []; for (let k = 0; k <= 12; k++) pts.push(golf.ballPath(Math.max(0, u - 0.25 + k * 0.25 / 12))); golf.setTrail(pts); golf.peg.visible = true; return bp; }
  function lockNotifs(T, t0) { return [{ app: 'HOME SECURITY SYSTEM', title: 'CRITICAL ALERT', body: 'MOTION DETECTED — RESIDENCE', at: t0 }]; }

  S.s01 = (lt, T, sh) => { // establishing drone
    golfBase(T); phoneOnTable(T); const p = pose(); p.y = GOLF_Y; swing(p, Math.sin(T * 1.3) * 0.08, 0); idle(p, T, { talk: false }); N.update();
    const u = sm(lt / sh.dur); ballAt(T);
    ovClear(); const a = ss(0.3, 1.0, lt) * (1 - ss(2.9, 3.5, lt));
    if (a > 0 && logoImg()) { ov.save(); ov.globalAlpha = a; ov.fillStyle = 'rgba(0,0,0,0.35)'; ov.fillRect(0, 0, 1920, 1080); ov.drawImage(logoImg(), 960 - 230, 540 - 260, 460, 460); ov.fillStyle = '#efe9df'; ov.font = '500 30px Inter'; ov.textAlign = 'center'; ov.letterSpacing = '8px'; ov.fillText('M E M P E R S E M B A H K A N', 960, 760); ov.restore(); }
    caption('LAPANGAN GOLF — TAMBUN', 'Sabtu, 15.40 WIB', ss(3.4, 3.9, lt));
    return { scene: golf.scene, set: golf, cam: { p: lv([-26, 15, 26], [-10.5, 5.2, 13], u), l: lv([25, 0, -8], [0, 0.9, 0], u), fov: 42 }, focus: 14, aperture: 0.0015, overlay: true };
  };
  S.s02 = (lt, T, sh) => { // tracking orbit, stance + waggle
    golfBase(T); phoneOnTable(T); const p = pose(); p.y = GOLF_Y; swing(p, Math.sin(lt * 3.2) * 0.12 * (1 - ss(2.2, 3, lt)), 0.1); idle(p, T, { talk: false }); p.blink = blinkAt(T); N.update(); swing(p, Math.sin(lt * 3.2) * 0.12 * (1 - ss(2.2, 3, lt)), 0.1); ballAt(T);
    const a = lerp(0.95, 0.35, sm(lt / sh.dur)); const R = 3.0;
    return { scene: golf.scene, set: golf, cam: { p: V(Math.sin(a) * R, 1.2, Math.cos(a) * R).add(hh(T)), l: V(0, 0.85, 0.15), fov: 36 }, focus: 3.0, aperture: 0.012 };
  };
  S.s03 = (lt, T, sh) => { // the swing
    golfBase(T); phoneOnTable(T); const p = pose(); p.y = GOLF_Y;
    let th, hinge;
    if (lt < 0.35) { th = 0; hinge = 0; }
    else if (lt < 1.45) { const u = sm((lt - 0.35) / 1.1); th = 2.35 * u; hinge = 1.25 * u; }
    else if (lt < 1.75) { const u = Math.pow((lt - 1.45) / 0.3, 2); th = 2.35 * (1 - u); hinge = 1.25 * (1 - u) * (1 - u); }
    else { const u = sm((lt - 1.75) / 0.5); th = -2.5 * u; hinge = -1.0 * u; }
    swing(p, th, hinge); if (lt > 1.9) { p.headYaw = lerp(p.headYaw, 0.9, ss(1.9, 2.4, lt)); p.headPitch = lerp(-0.42, 0.05, ss(1.9, 2.4, lt)); p.look = [0.6, 0.2]; }
    p.foot.R.z += lt > 1.8 ? 0.04 : 0; p.footRot.R = lt > 1.85 ? -0.5 * ss(1.85, 2.2, lt) : 0;
    idle(p, T, { talk: false }); N.update(); swing(p, th, hinge); if (lt > 1.9) { p.headYaw = lerp(-2.5 * 0.28, 0.9, ss(1.9, 2.4, lt)); p.headPitch = lerp(-0.42, 0.05, ss(1.9, 2.4, lt)); N.update(); }
    ballAt(T);
    const shake = lt > 1.75 && lt < 1.95 ? (1.95 - lt) * 0.05 : 0;
    return { scene: golf.scene, set: golf, cam: { p: V(0.3 + Math.sin(T * 60) * shake, 0.6, 3.9 - lt * 0.1), l: V(0, 1.15, 0.1), fov: 40 }, focus: 3.8, aperture: 0.01 };
  };
  S.s04 = (lt, T, sh) => { // ball flight over-the-shoulder
    golfBase(T); phoneOnTable(T); const p = pose(); p.y = GOLF_Y; swing(p, -2.5, -1.0); p.headYaw = 0.95; p.headPitch = 0.1; p.look = [0.5, 0.3]; p.footRot.R = -0.5; idle(p, T, { talk: false }); N.update(); swing(p, -2.5, -1.0); p.headYaw = 0.95; p.headPitch = 0.12; N.update();
    const bp = ballAt(T);
    const camP = V(-2.6, 1.25, -0.9).add(hh(T, 1.5));
    const l = V(8, 3.5, 1.0).lerp(bp, 0.55 + 0.3 * sm(lt / sh.dur));
    return { scene: golf.scene, set: golf, cam: { p: camP, l, fov: 38 }, focus: 14, aperture: 0.004 };
  };
  S.s05 = (lt, T, sh) => { // small smile CU
    golfBase(T); phoneOnTable(T); const p = pose(); p.y = GOLF_Y; swing(p, -2.5, -1.0); p.headYaw = 0.95; p.headPitch = 0.12; p.look = [0.65, 0.35]; p.smile = ss(0.2, 0.6, lt); p.footRot.R = -0.5; idle(p, T, { talk: false }); p.look = [0.65, 0.35]; N.update(); swing(p, -2.5, -1.0); p.headYaw = 0.95; p.headPitch = 0.12; N.update(); club.visible = true;
    ballAt(T); const hd = headW();
    return { scene: golf.scene, set: golf, cam: { p: hd.clone().add(V(1.55 + lt * -0.08, -0.12, 0.75)).add(hh(T)), l: hd.clone().add(V(0.0, -0.08, 0)), fov: 32 }, focus: 1.72, aperture: 0.02 };
  };
  S.s06 = (lt, T, sh) => { // phone on table lights up
    golfBase(T); const p = pose(); p.y = GOLF_Y; p.x = 0; swing(p, -2.5, -1.0); p.headYaw = 0.95; N.update(); swing(p, -2.5, -1.0); club.visible = true;
    ballAt(T); const vib = lt > 0.3 && lt < 1.0;
    phoneOnTable(T, vib);
    if (lt < 0.3) phone.dark(); else phone.lock(lt, lockNotifs(T, 0.3)); phone.commit();
    const u = sm(lt / sh.dur);
    return { scene: golf.scene, set: golf, cam: { p: lv([2.62, 1.22, -0.52], [2.5, 1.12, -0.7], u), l: TABLE_PH.clone().add(V(0, 0, 0.0)), fov: 32, near: 0.02 }, focus: 0.5, aperture: 0.025 };
  };
  S.s07 = (lt, T, sh) => { // walks to table, picks up phone: "Hah? Rumah?"
    golfBase(T); const p = pose(); const a = [0.9, -0.05]; const u = sm(lt / 0.8);
    const ph = walkTo(p, a, PICK, u, Math.hypot(PICK[0] - a[0], PICK[1] - a[1]) * u, GOLF_Y);
    if (lt > 0.8) { p.foot = { L: null, R: null }; p.hipDrop = 0; }
    p.rotY = PICK_R * ss(0, 0.6, lt) + Math.atan2(PICK[0] - a[0], PICK[1] - a[1]) * (1 - ss(0, 0.6, lt));
    const reach = ss(0.35, 0.75, lt) * (1 - ss(0.75, 1.15, lt));
    idle(p, T);
    p.lean = 0.35 * reach; p.headPitch = -0.45 * reach - 0.3 * ss(0.9, 1.2, lt); p.look = [0.1, -0.6];
    N.update();
    if (lt < 0.75) { p.hand.R = { world: TABLE_PH.clone().add(V(0, 0.03, 0)).lerp(handW('R'), 1 - reach) }; N.update(); phoneOnTable(T); if (reach > 0.95) p.hand.R = { world: TABLE_PH.clone().add(V(0, 0.03, 0)) }; }
    else { const k = ss(0.75, 1.15, lt); handPhoneFront(p); p.headPitch = -0.32 * k - 0.4 * (1 - k); p.brow = 0.5 * ss(1.0, 1.5, lt); p.browRaise = 0.8 * ss(1.0, 1.3, lt); p.pupil = 1 - 0.2 * ss(1.0, 1.4, lt); N.update(); phoneTo(golf.scene, 'front'); }
    if (lt < 0.3) phone.dark(); else phone.lock(lt + 2, lockNotifs(T, 0)); phone.commit();
    const nf = fwd(p.rotY), nr = right(p.rotY);
    const base = V(p.x, 0, p.z);
    return { scene: golf.scene, set: golf, cam: { p: base.clone().add(nf.clone().multiplyScalar(2.3)).add(nr.clone().multiplyScalar(-0.9)).add(V(0, 1.25, 0)).add(hh(T)), l: base.clone().add(V(0, 1.05, 0)).add(nf.multiplyScalar(0.2)), fov: 34 }, focus: 2.45, aperture: 0.012 };
  };
  function nandoHoldingPhone(p, T, scene) { // standing at PICK reading phone
    p.x = PICK[0]; p.z = PICK[1]; p.y = GOLF_Y; p.rotY = PICK_R; handPhoneFront(p); idle(p, T); p.look = [0.05, -0.75]; N.update(); phoneTo(scene, 'front');
  }
  S.s08 = (lt, T, sh) => { // OTS on phone: ALARM ACTIVATED
    golfBase(T); const p = pose(); nandoHoldingPhone(p, T, golf.scene);
    if (lt < 0.15) phone.lock(lt + 2, lockNotifs(T, -5)); else if (lt < 1.05) phone.lock(lt, [...lockNotifs(T, -5), { app: 'HOME SECURITY SYSTEM', title: 'ALARM ACTIVATED', body: 'Sirene rumah berbunyi — Tambun', at: 0.15, pulse: true, icon: '!' }]); else phone.alarmFull(lt); phone.commit();
    const ph = phoneObj.position.clone(); const camP = phoneScreenFacingPoint(lerp(0.36, 0.27, sm(lt / sh.dur)), 0.03, 0.05);
    return { scene: golf.scene, set: golf, cam: { p: camP.add(hh(T, 0.6)), l: ph, fov: 40, near: 0.01 }, focus: camP.distanceTo(ph), aperture: 0.03 };
  };
  S.s09 = (lt, T, sh) => { // CU face, slow push: worry sets in
    golfBase(T); const p = pose(); p.x = PICK[0]; p.z = PICK[1]; p.y = GOLF_Y; p.rotY = PICK_R; handPhoneFront(p);
    idle(p, T, { talk: false }); const k = ss(0.2, 1.2, lt); p.brow = 0.9 * k; p.browRaise = 0.3; p.pupil = 1 - 0.3 * k; p.look = [lerp(0.05, 0.25, ss(2.2, 2.8, lt)), lerp(-0.75, 0.1, ss(2.2, 2.8, lt))]; p.headPitch = lerp(-0.32, -0.05, ss(2.2, 2.9, lt)); p.mouthW = 0.8;
    N.update(); phoneTo(golf.scene, 'front'); phone.alarmFull(T); phone.commit();
    const hd = headW(); const f = fwd(PICK_R + 0.15); const d = lerp(1.6, 1.15, sm(lt / sh.dur));
    return { scene: golf.scene, set: golf, cam: { p: hd.clone().add(f.multiplyScalar(d)).add(V(0, -0.05, 0)).add(hh(T, 0.5)), l: hd.clone().add(V(0, -0.02, 0)), fov: 30 }, focus: d, aperture: 0.022 };
  };
  S.s10 = () => ({ black: true });

  // ---------- SCENE 02 ----------
  S.s11 = (lt, T) => { // Calling... Papa (screen CU)
    golfBase(T); const p = pose(); nandoHoldingPhone(p, T, golf.scene); p.brow = 0.8; N.update(); phoneTo(golf.scene, 'front');
    phone.call(lt, { name: 'Papa', status: lt < 0.2 ? 'Menghubungkan' : 'Calling…', avatar: phone.avatar }); phone.commit();
    const camP = phoneScreenFacingPoint(lerp(0.27, 0.22, lt / 2.4), 0.02, 0.0);
    return { scene: golf.scene, set: golf, cam: { p: camP.add(hh(T, 0.4)), l: phoneObj.position, fov: 40, near: 0.01 }, focus: camP.distanceTo(phoneObj.position), aperture: 0.03 };
  };
  S.s12 = (lt, T, sh) => { // waiting, phone at ear, no answer
    golfBase(T); const p = pose(); p.x = PICK[0]; p.z = PICK[1]; p.y = GOLF_Y; p.rotY = PICK_R + Math.sin(lt * 0.8) * 0.25;
    handPhoneEar(p); if (lt > 2.9) { const k = ss(2.9, 3.2, lt); p.hand.R = V(-0.37, 0.86, 0.1).lerp(V(-0.08, 0.48, 0.42), k); }
    idle(p, T, { talk: false }); p.brow = 0.8; p.headYaw = Math.sin(lt * 1.1) * 0.35; p.look = [Math.sin(lt * 1.1) * 0.3, 0.0];
    p.hand.L = V(0.3, 0.26, 0.12); p.pole.L = V(1, -0.2, -0.5); // hand on hip-ish
    N.update(); if (lt <= 2.9) phoneTo(golf.scene, 'ear'); else phoneTo(golf.scene, 'front');
    phone.call(lt, { name: 'Papa', status: lt > 2.9 ? 'Tidak dijawab' : 'Calling…', avatar: phone.avatar }); phone.commit();
    const base = V(PICK[0], 0, PICK[1]); const r = right(PICK_R), f = fwd(PICK_R);
    const camP = base.clone().add(r.clone().multiplyScalar(1.9)).add(f.clone().multiplyScalar(0.9)).add(V(0, 1.35, 0)).add(r.multiplyScalar(-lt * 0.08));
    return { scene: golf.scene, set: golf, cam: { p: camP.add(hh(T)), l: base.clone().add(V(0, 1.2, 0)), fov: 36 }, focus: 2.15, aperture: 0.012 };
  };
  S.s13 = (lt, T) => { // second call attempt (screen)
    golfBase(T); const p = pose(); nandoHoldingPhone(p, T, golf.scene); p.brow = 0.9; N.update(); phoneTo(golf.scene, 'front');
    phone.call(lt, { name: 'Papa', status: 'Calling…', avatar: phone.avatar }); phone.commit();
    const camP = phoneScreenFacingPoint(0.24, -0.03, 0.03);
    return { scene: golf.scene, set: golf, cam: { p: camP.add(hh(T, 0.6)), l: phoneObj.position, fov: 40, near: 0.01 }, focus: 0.24, aperture: 0.03 };
  };
  S.s14 = (lt, T, sh) => { // CU: "Angkat, Pa..."
    golfBase(T); const p = pose(); p.x = PICK[0]; p.z = PICK[1]; p.y = GOLF_Y; p.rotY = PICK_R; handPhoneEar(p); idle(p, T); p.brow = 1; p.pupil = 0.8; p.look = [-0.3, -0.2]; p.headPitch -= 0.1;
    N.update(); phoneTo(golf.scene, 'ear'); phone.call(lt, { name: 'Papa', status: 'Calling…', avatar: phone.avatar }); phone.commit();
    const hd = headW(); const dir = fwd(PICK_R + 0.55);
    return { scene: golf.scene, set: golf, cam: { p: hd.clone().add(dir.multiplyScalar(lerp(1.5, 1.3, lt / sh.dur))).add(V(0, -0.08, 0)).add(hh(T, 0.6)), l: hd.clone().add(V(-0.03, -0.08, 0)), fov: 30 }, focus: 1.4, aperture: 0.02 };
  };
  const WALK_A = [0.8, -0.2], WALK_B = [-5.6, 6.1], WALK_C = [-8.0, 8.6];
  S.s15 = (lt, T, sh) => { // wide lateral tracking: walks away
    golfBase(T); const p = pose(); const u = lt / sh.dur; const L = Math.hypot(WALK_B[0] - WALK_A[0], WALK_B[1] - WALK_A[1]);
    const x = lerp(WALK_A[0], WALK_B[0], u), z = lerp(WALK_A[1], WALK_B[1], u);
    walkTo(p, WALK_A, WALK_B, u, L * u, teeY(x, z)); p.hand.R = null; handPhoneEar(p); if (lt < 0.25) { p.hand.R = V(-0.08, 0.48, 0.42).lerp(V(-0.37, 0.86, 0.1), lt / 0.25); }
    idle(p, T, { talk: false }); p.brow = 0.9; N.update(); phoneTo(golf.scene, 'ear'); phone.dark(); phone.commit();
    const r = right(p.rotY), base = V(p.x, 0, p.z);
    const camP = base.clone().add(r.multiplyScalar(6.5)).add(V(0, 1.45, 0)).add(fwd(p.rotY).multiplyScalar(0.6));
    return { scene: golf.scene, set: golf, cam: { p: camP.add(hh(T, 2)), l: base.clone().add(V(0, 1.05, 0)), fov: 32 }, focus: 6.6, aperture: 0.006 };
  };
  S.s16 = (lt, T, sh) => { // calls the guard: walking, camera backing in front
    golfBase(T); const p = pose(); const u = lt / sh.dur; const L = Math.hypot(WALK_C[0] - WALK_B[0], WALK_C[1] - WALK_B[1]);
    walkTo(p, WALK_B, WALK_C, u, L * u, 0, 0.36); handPhoneEar(p);
    idle(p, T); p.brow = 0.6; p.look = [0, -0.1]; N.update(); phoneTo(golf.scene, 'ear'); phone.dark(); phone.commit();
    const f = fwd(p.rotY), base = V(p.x, 0, p.z);
    const camP = base.clone().add(f.clone().multiplyScalar(2.1)).add(right(p.rotY).multiplyScalar(0.5)).add(V(0, 1.35, 0));
    return { scene: golf.scene, set: golf, cam: { p: camP.add(hh(T, 1.5)), l: base.clone().add(V(0, 1.2, 0)), fov: 34 }, focus: 2.15, aperture: 0.012 };
  };
  S.s17 = (lt, T, sh) => { // "Tolong kabari saya secepatnya." + car keys
    golfBase(T); const p = pose(); p.x = WALK_C[0]; p.z = WALK_C[1]; p.y = 0; p.rotY = Math.atan2(WALK_C[0] - WALK_B[0], WALK_C[1] - WALK_B[1]);
    handPhoneEar(p); if (lt > 2.0) p.hand.R = V(-0.37, 0.86, 0.1).lerp(V(-0.3, 0.1, 0.06), ss(2.0, 2.4, lt));
    const kk = ss(2.1, 2.5, lt); p.hand.L = V(0.3, 0.08, 0.05).lerp(V(0.12, 0.42, 0.32), kk); p.pole.L = V(1, -0.5, -0.4);
    idle(p, T); p.brow = 0.8 - 0.8 * ss(2.2, 2.6, lt); p.look = [0.2 * kk, -0.4 * kk]; p.headPitch -= 0.2 * kk;
    if (lt > 2.4) p.brow = -0.6; // resolve
    N.update(); if (lt < 2.2) phoneTo(golf.scene, 'ear'); else { phoneObj.visible = false; }
    keysObj.visible = lt > 2.1; if (keysObj.visible) { golf.scene.add(keysObj); keysObj.position.copy(handW('L')).add(V(0, 0.04, 0)); keysObj.rotation.set(0.4, p.rotY, 0); }
    phone.dark(); phone.commit();
    const hd = headW(), f = fwd(p.rotY + 0.4);
    return { scene: golf.scene, set: golf, cam: { p: hd.clone().add(f.multiplyScalar(1.8)).add(V(0, -0.3, 0)).add(hh(T, 0.8)), l: hd.clone().add(V(0, -0.3, 0)), fov: 34 }, focus: 1.82, aperture: 0.016 };
  };

  // ---------- SCENE 03: road ----------
  const car = road.car; const CS = 1.25;
  const carLocal = (x, y, z) => car.localToWorld(V(x, y, z));
  function driving(T, carZ, { talk = true, phoneMode = null } = {}) {
    road.update(T, carZ); car.updateMatrixWorld(true);
    const p = pose(); road.scene.add(N.root);
    const seat = carLocal(-0.38, 0.6, 0.22); p.x = seat.x; p.y = seat.y - N.hipBase; p.z = seat.z; p.rotY = 0;
    p.foot.L = V(0.1, 0.0, 0.45); p.foot.R = V(-0.1, 0.0, 0.45);
    const sw = car.userData.sw; sw.updateMatrixWorld(true);
    p.hand.L = { world: sw.localToWorld(V(0.17, 0.05, 0)) }; p.hand.R = { world: sw.localToWorld(V(-0.17, 0.05, 0)) };
    p.pole.L = V(1, -1, -0.2); p.pole.R = V(-1, -1, -0.2);
    idle(p, T, { talk }); p.look[0] *= 0.3; p.brow = 0.9; p.lean = -0.05;
    // phone in dash holder
    const hold = car.userData.holder; hold.add(phoneObj); phoneObj.visible = true; phoneObj.position.set(0, 0, -0.006); phoneObj.rotation.set(0, Math.PI, 0); phoneObj.scale.setScalar(1 / CS); phoneGlow.intensity = 0;
    return p;
  }
  const CARZ0 = -40, CV = 11.5; // car z at the start of scene 3 and speed
  const carZAt = (T) => CARZ0 + (T - SHOTS.find(s => s.id === 's18').t0) * CV;
  S.s18 = (lt, T, sh) => { // establishing road, car passes camera
    const z = carZAt(T); const p = driving(T, z); p.headYaw = 0; N.update(); phone.dark(); phone.commit();
    ovClear(); caption('TAMBUN, BEKASI', '15.47 WIB', ss(0.4, 0.9, lt) * (1 - ss(2.6, 3.1, lt)));
    const camP = V(4.0, 1.15, CARZ0 + 36.5); const l = car.position.clone().add(V(0, 1.0, 0));
    return { scene: road.scene, set: road, cam: { p: camP, l, fov: 38 }, focus: camP.distanceTo(l), aperture: 0.004, overlay: true };
  };
  S.s19 = (lt, T) => { // hands on wheel, calling Papa in the holder
    const z = carZAt(T); const p = driving(T, z, { talk: false }); p.headYaw = 0.2; p.look = [0.3, -0.4]; N.update();
    phone.call(lt, { name: 'Papa', status: 'Calling…', avatar: phone.avatar }); phone.commit();
    const hd = headW(); const camP = carLocal(-2.1, 1.25, 0.9 - lt * 0.12), l = hd.clone().add(V(0, -0.35, 0.2));
    return { scene: road.scene, set: road, cam: { p: camP.add(hh(T, 0.8)), l, fov: 36 }, focus: camP.distanceTo(l), aperture: 0.012 };
  };
  S.s20 = (lt, T, sh) => { // reflection in the side window
    const z = carZAt(T); const p = driving(T, z, { talk: false }); p.headYaw = -0.15 + Math.sin(lt) * 0.05; p.look = [-0.2, 0]; N.update(); road.refl.visible = true;
    phone.call(lt + 3, { name: 'Papa', status: 'Calling…', avatar: phone.avatar }); phone.commit();
    const hd = headW(); const camP = carLocal(-1.5, 1.22, 0.15 - lt * 0.05);
    return { scene: road.scene, set: road, cam: { p: camP, l: hd, fov: 30 }, focus: camP.distanceTo(hd), aperture: 0.015, after: () => { road.refl.visible = false; } };
  };
  S.s21 = (lt, T) => { // incoming call in holder, tap to answer
    const z = carZAt(T); const p = driving(T, z, { talk: false });
    const tap = ss(1.6, 2.05, lt) * (1 - ss(2.15, 2.3, lt)); car.userData.holder.updateMatrixWorld(true);
    if (tap > 0) { const hw = car.userData.holder.localToWorld(V(0, -0.02, 0.05)); const cur = car.userData.sw.localToWorld(V(-0.17, 0.05, 0)); p.hand.R = { world: cur.lerp(hw, tap) }; }
    p.headYaw = 0.25 * ss(0.2, 0.6, lt); p.look = [0.4, -0.5]; N.update();
    phone.call(lt, { name: 'Pos Satpam Komplek', status: 'Panggilan masuk', mode: 'incoming', number: 'Seluler' }); phone.commit();
    const camP = carLocal(0.02, 1.3, 0.38), l = carLocal(0.05, 1.22, 0.62);
    return { scene: road.scene, set: road, cam: { p: camP.add(hh(T, 0.4)), l, fov: 34, near: 0.02 }, focus: camP.distanceTo(l), aperture: 0.03 };
  };
  S.s22 = (lt, T, sh) => { // interior medium: conversation on speaker
    const z = carZAt(T); const p = driving(T, z); p.headYaw = 0.05 + (lineActive(T, 'SATPAM', ['phone']) ? 0.25 : 0); p.look = [0.15, -0.1]; N.update();
    phone.call(lt, { name: 'Pos Satpam Komplek', mode: 'incall', secs: lt + 1 }); phone.commit();
    const hd = headW(); const camP = carLocal(0.5, 1.12, 0.5), l = hd.clone().add(V(0, -0.15, 0));
    return { scene: road.scene, set: road, cam: { p: camP.add(hh(T, 0.7)), l, fov: 44, near: 0.02 }, focus: camP.distanceTo(l), aperture: 0.01 };
  };
  S.s23 = (lt, T, sh) => { // exterior tracking alongside the car
    const z = carZAt(T); const p = driving(T, z); N.update(); phone.call(lt, { name: 'Pos Satpam Komplek', mode: 'incall', secs: lt + 8.4 }); phone.commit();
    const camP = carLocal(-2.6 - lt * 0.1, 1.3, 3.6 - lt * 0.35), l = carLocal(-0.2, 1.1, 0.3);
    return { scene: road.scene, set: road, cam: { p: camP.add(hh(T, 1.2)), l, fov: 36 }, focus: camP.distanceTo(l), aperture: 0.006 };
  };
  S.s24 = (lt, T, sh) => { // push-in through the windshield
    const z = carZAt(T); const p = driving(T, z, { talk: false }); p.brow = 1; p.pupil = 0.8; p.look = [0, 0.05]; N.update(); phone.dark(); phone.commit();
    const u = sm(lt / sh.dur); const camP = carLocal(-0.4, 1.62, lerp(3.2, 1.75, u)); const hd = headW();
    return { scene: road.scene, set: road, cam: { p: camP.add(hh(T, 0.6)), l: hd, fov: 30 }, focus: camP.distanceTo(hd), aperture: 0.014 };
  };
  S.s25 = (lt, T, sh) => { // drone over Tambun
    const z = carZAt(T); const p = driving(T, z, { talk: false }); N.update(); phone.dark(); phone.commit();
    const u = sm(lt / sh.dur); const camP = V(lerp(-9, -4, u), lerp(24, 15, u), z + lerp(-22, -6, u)); const l = car.position.clone().add(V(0, 0, 6));
    return { scene: road.scene, set: road, cam: { p: camP, l, fov: 42 }, focus: camP.distanceTo(l), aperture: 0.002 };
  };

  // ---------- SCENE 04: house ----------
  const hcar = ctx.houseCar;
  const groundY = (x, z) => (z > 2.4 ? -0.15 : (z > 0.1 ? -0.0 : 0)) * (z > 2.4 ? 1 : 1);
  function houseBase(mode) { house.mode(mode); house.scene.add(N.root); club.visible = false; keysObj.visible = false; phoneGlow.intensity = 0; house.setFall(false); house.symMat.opacity = 0; }
  S.s26 = (lt, T, sh) => { // car arrives, Nando steps out
    houseBase('ext'); house.doorPivot.rotation.y = 0.18; house.update(T);
    const stop = 1.2; const xx = lt < stop ? lerp(14, 1.4, 1 - Math.pow(1 - lt / stop, 2)) : 1.4; hcar.position.set(xx, -0.15, 11.4); for (const w of hcar.userData.wheels) w.rotation.x = -xx / 0.34;
    const p = pose(); phoneObj.visible = false;
    if (lt < 2.2) { N.root.visible = false; } else { N.root.visible = true; const u = (lt - 2.2) / (sh.dur - 2.2); walkTo(p, [1.2, 10.0], [0.6, 8.2], u, 1.9 * u, -0.15); idle(p, T, { talk: false }); p.brow = 0.8; }
    N.update();
    ovClear(); caption('RUMAH KELUARGA NANDO', 'Perumahan Tambun — 16.12 WIB', ss(0.3, 0.8, lt) * (1 - ss(3.2, 3.8, lt)));
    const camP = V(-5.2, 1.7, 17.5), l = V(0.6, 1.3, 6.5);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.6)), l, fov: 40 }, focus: 9, aperture: 0.004, overlay: true };
  };
  S.s27 = (lt, T, sh) => { // tracking behind him to the door
    houseBase('ext'); house.doorPivot.rotation.y = 0.18; house.update(T); hcar.position.set(1.4, -0.15, 11.4); N.root.visible = true;
    const p = pose(); const u = lt / sh.dur; walkTo(p, [0.6, 8.2], [0.25, 1.75], u, 6.5 * u, 0, 0.5); p.y = lerp(-0.15, 0, ss(0.5, 0.75, u)); idle(p, T, { talk: false }); N.update();
    const base = V(p.x, 0, p.z); const camP = base.clone().add(V(0.6, 2.3, 3.2)); const l = base.clone().add(V(0, 1.0, -4));
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 1.5)), l, fov: 40 }, focus: 2.5, aperture: 0.008 };
  };
  S.s28 = (lt, T, sh) => { // door ajar, "Papa?"
    houseBase('ext'); house.doorPivot.rotation.y = 0.18; house.update(T); hcar.position.set(1.4, -0.15, 11.4); N.root.visible = true;
    const p = pose(); p.x = 0.25; p.z = 1.2; p.rotY = Math.PI; idle(p, T); p.brow = 1; p.pupil = 0.8; p.look = [0, 0]; p.headPitch = -0.05; N.update();
    const camP = V(1.7, 1.5, 2.1).add(V(-lt * 0.05, 0, 0)), l = V(-0.1, 1.2, -0.1);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.5)), l, fov: 36 }, focus: 1.3, aperture: 0.016 };
  };
  S.s29 = (lt, T, sh) => { // pushes door open (creak)
    houseBase('ext'); house.update(T); hcar.position.set(1.4, -0.15, 11.4); N.root.visible = true;
    const k = ss(0.25, 2.6, lt); house.doorPivot.rotation.y = lerp(0.18, 1.35, k); house.doorPivot.updateMatrixWorld(true);
    const p = pose(); p.x = 0.2; p.z = lerp(1.0, 0.55, k); p.rotY = Math.PI;
    const hpos = house.doorPivot.localToWorld(V(0.82, 1.05, 0.06)); idle(p, T, { talk: false }); p.brow = 1;
    p.hand.L = { world: hpos }; p.pole.L = V(1, -0.5, -1); N.walkLegs(p, k * 4, 0.25, 0.04); N.update();
    const camP = V(1.3, 2.3, 3.6).lerp(V(1.0, 2.2, 3.0), k), l = V(0.0, 1.0, -2.5);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.7)), l, fov: 40 }, focus: 2.2, aperture: 0.01 };
  };
  S.s30 = (lt, T, sh) => { // enters: reveal of the ransacked living room
    houseBase('int'); house.doorPivot.rotation.y = 1.35; house.update(T); N.root.visible = true;
    const p = pose(); const u = sm(lt / sh.dur); walkTo(p, [0.2, 0.5], [0.45, -1.7], u, 2.2 * u, 0, 0.42); p.rotY = Math.PI - 0.1; idle(p, T, { talk: false }); p.headYaw = Math.sin(lt * 1.2) * 0.5; p.brow = 1; p.pupil = 0.75; N.update();
    const camP = lv([0.9, 2.3, 2.6], [1.2, 2.4, 0.3], u), l = lv([0.2, 1.0, -3], [-1.2, 0.4, -4.5], u);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 1)), l, fov: 46 }, focus: 3.0, aperture: 0.006 };
  };
  S.s31 = (lt, T, sh) => { // "Papa!?"
    houseBase('int'); house.doorPivot.rotation.y = 1.35; house.update(T);
    const p = pose(); p.x = 0.45; p.z = -1.8; p.rotY = Math.PI - 0.1 - 0.4 * ss(1.2, 2.2, lt); idle(p, T); p.headYaw = -0.4 * ss(1.0, 2.0, lt); p.brow = 0.6; p.browRaise = 1; p.headPitch += 0.08; p.look = [-0.2, 0.1];
    p.hand.R = V(-0.26, 0.4, 0.2); p.hand.L = V(0.26, 0.4, 0.2); N.update();
    const camP = V(-1.0, 1.05, -4.3).add(V(lt * 0.06, 0, 0)), l = V(0.45, 1.45, -1.8);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.8)), l, fov: 34 }, focus: camP.distanceTo(l), aperture: 0.01 };
  };
  S.s32 = (lt, T, sh) => { // bedroom: empty (POV)
    houseBase('int'); house.update(T); N.root.visible = true;
    const p = pose(); p.x = 3.45; p.z = -2.75; p.rotY = Math.PI / 2 + 0.3; idle(p, T, { talk: false }); N.update();
    const u = sm(lt / sh.dur); const camP = lv([3.25, 1.62, -2.35], [4.4, 1.55, -2.85], u), l = lv([6.3, 0.9, -4.0], [6.5, 0.7, -4.6], u);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 1.2)), l, fov: 50 }, focus: 2.5, aperture: 0.005 };
  };
  S.s33 = (lt, T, sh) => { // family room: empty
    houseBase('int'); house.update(T); N.root.visible = true; house.ceilLampFR.intensity = 0;
    const p = pose(); const u = lt / sh.dur; walkTo(p, [1.5, -7.7], [0.6, -9.8], u, 2.3 * u, 0, 0.45); idle(p, T, { talk: false }); p.headYaw = Math.sin(lt * 1.5) * 0.6; N.update();
    const camP = V(2.6, 2.55, -6.2).add(V(0, 0, -lt * 0.15)), l = V(0.0, 0.7, -12.5);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 1)), l, fov: 48 }, focus: 3.5, aperture: 0.006 };
  };
  S.s34 = (lt, T, sh) => { // alone in the house (high angle)
    houseBase('int'); house.update(T);
    const p = pose(); p.x = 0.95; p.z = -9.2; p.rotY = 0.3; idle(p, T, { talk: false }); p.headPitch = -0.3; p.look = [0, -0.4]; p.brow = 1; N.update();
    const camP = V(3.5, 2.8, -12.6).add(V(-lt * 0.05, -lt * 0.04, 0)), l = V(0.95, 0.8, -9.2);
    return { scene: house.scene, set: house, cam: { p: camP, l, fov: 40 }, focus: camP.distanceTo(l), aperture: 0.006 };
  };

  // ---------- SCENE 05: the floor ----------
  const NK = [0.75, -3.05], NK_R = 2.94; // where Nando kneels; facing -z toward the ring
  function ringOnFloor() { house.ring.visible = true; house.ring.position.copy(house.RING0); house.ring.rotation.copy(house.RINGR); ringHeld.visible = false; }
  S.s35 = (lt, T, sh) => { // glint: rack focus from Nando to ring
    houseBase('int'); house.update(T); ringOnFloor();
    const p = pose(); const u = sm(lt / 1.9); walkTo(p, [3.3, -2.7], NK, u, 2.6 * u, 0, 0.45); if (lt > 1.9) { p.foot = { L: null, R: null }; p.hipDrop = 0; }
    p.rotY = lerp(Math.atan2(NK[0] - 3.3, NK[1] + 2.7), NK_R, ss(1.4, 2.4, lt)); idle(p, T, { talk: false }); p.headPitch = -0.45 * ss(1.9, 2.4, lt); p.look = [0, -0.8 * ss(1.9, 2.3, lt)]; p.brow = 0.6; N.update();
    const R0 = house.RING0; const camP = V(0.2, 0.4, -4.7); const l = V(1.6, 0.6, -2.6);
    const k = ss(1.9, 2.5, lt); const dN = camP.distanceTo(V(p.x, 1.0, p.z)), dR = camP.distanceTo(R0);
    const glint = Math.max(0, 1 - Math.abs(lt - 2.15) / 0.25); ctx.glint.visible = glint > 0; ctx.glint.position.copy(R0).add(V(0, 0.018, 0)); ctx.glint.scale.setScalar(0.06 * glint); house.scene.add(ctx.glint);
    return { scene: house.scene, set: house, cam: { p: camP, l: l.lerp(R0.clone().add(V(0, 0.15, 0.25)), k * 0.5), fov: 38, near: 0.005, far: 120 }, focus: lerp(dN, dR, k), aperture: 0.035, after: () => { ctx.glint.visible = false; } };
  };
  function kneel(p, k, reachW = null) { p.x = NK[0]; p.z = NK[1]; p.rotY = NK_R; p.hipDrop = 0.3 * k; p.lean = 0.62 * k; p.foot.L = V(0.11, 0.045, 0.1 * k); p.foot.R = V(-0.11, 0.045, -0.12 * k); p.headPitch = -0.2 * k; p.look = [0, -0.8]; if (reachW) p.hand.R = { world: reachW }; }
  S.s36 = (lt, T, sh) => { // crouch, pick ring
    houseBase('int'); house.update(T);
    const p = pose(); const down = ss(0.0, 1.0, lt) * (1 - 0.45 * ss(1.95, 2.7, lt));
    idle(p, T, { talk: false }); kneel(p, down); p.brow = 0.6;
    const R0 = house.RING0.clone().add(V(0, 0.03, 0));
    if (lt < 1.95) { ringOnFloor(); N.update(); const reach = ss(1.0, 1.9, lt); if (reach > 0) { p.hand.R = { world: handW('R').lerp(R0, reach) }; } }
    else { house.ring.visible = false; p.hand.R = V(-0.05, 0.62, 0.36).lerp(V(-0.05, 0.62, 0.36), 1); p.pole.R = V(-1, -1, 0); }
    N.update();
    if (lt >= 1.95) { ringHeld.visible = true; house.scene.add(ringHeld); ringHeld.position.copy(handW('R')).add(V(0, 0.055, 0)); ringHeld.rotation.set(0.2, 0, 0); }
    const camP = V(2.9, 0.95, -2.55), l = V(0.85, 0.5, -3.35);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.7)), l, fov: 36 }, focus: camP.distanceTo(l), aperture: 0.012 };
  };
  function kneelHoldRing(p, T, lift = 1) { idle(p, T, { talk: true }); kneel(p, 0.55); p.hand.R = V(-0.02, 0.55, 0.42); p.pole.R = V(-1, -1, 0); p.headPitch = -0.35; p.look = [0, -0.6]; N.update(); ringHeld.visible = true; house.scene.add(ringHeld); ringHeld.position.copy(handW('R')).add(V(0, 0.058, 0)); ringHeld.rotation.set(0.15, 0.4, 0); house.ring.visible = false; }
  S.s37 = (lt, T, sh) => { // ECU ring in palm "Ini... punya Papa."
    houseBase('int'); house.update(T); const p = pose(); kneelHoldRing(p, T); p.brow = 1; p.pupil = 0.85; N.update();
    const rp = ringHeld.position.clone(); const camP = rp.clone().add(V(0.12, 0.07, 0.17).multiplyScalar(lerp(1.05, 0.85, sm(lt / sh.dur))));
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.25)), l: rp.clone().add(V(0, 0.012, 0)), fov: 30, near: 0.005, far: 80 }, focus: camP.distanceTo(rp), aperture: 0.03 };
  };
  S.s38 = (lt, T, sh) => { // tilt down from palm to the sand
    houseBase('int'); house.update(T); const p = pose(); kneelHoldRing(p, T); N.update(); house.symMat.opacity = 0.06;
    const u = sm(lt / sh.dur); const rp = ringHeld.position.clone(); const S0 = house.SAND_C.clone();
    const camP = rp.clone().add(V(0.32, 0.2, 0.05)).lerp(V(1.05, 0.6, -3.2), u); const l = rp.clone().lerp(V(S0.x - 0.15, 0, S0.z + 0.1), u);
    return { scene: house.scene, set: house, cam: { p: camP, l, fov: 38, near: 0.005, far: 100 }, focus: camP.distanceTo(l), aperture: lerp(0.03, 0.02, u) };
  };
  S.s39 = (lt, T, sh) => { // high wide: sand trail across the floor
    houseBase('int'); house.update(T); const p = pose(); kneelHoldRing(p, T); p.headYaw = 0.4 * ss(0.5, 1.5, lt); p.look = [0.4, -0.6]; N.update(); house.symMat.opacity = 0.06;
    const camP = V(-1.0, 2.75, -1.4).add(V(lt * 0.06, 0, -lt * 0.04)), l = V(1.4, 0, -5.0);
    return { scene: house.scene, set: house, cam: { p: camP, l, fov: 44 }, focus: camP.distanceTo(V(1.0, 0, -4)), aperture: 0.004 };
  };
  S.s40 = (lt, T, sh) => { // macro sand + grains falling through fingers: "Pasir?"
    houseBase('int'); house.update(T); const p = pose(); idle(p, T); kneel(p, 0.85); p.hand.L = V(0.05, 0.5, 0.35); house.symMat.opacity = 0.06;
    const fp = V(0.86, 0.13 + 0.04 * ss(0.2, 1.0, lt), -3.82); p.hand.R = { world: fp }; p.pole.R = V(-1, -1, 0); N.update();
    ringHeld.visible = true; house.scene.add(ringHeld); ringHeld.position.copy(handW('L')).add(V(0, 0.058, 0));
    house.setFall(true, handW('R').add(V(0, -0.05, 0)), T);
    const u = sm(lt / sh.dur); const camP = V(lerp(0.66, 0.74, u), 0.045, lerp(-3.62, -3.66, u)); const l = V(0.95, 0.03, -3.9);
    return { scene: house.scene, set: house, cam: { p: camP, l, fov: 36, near: 0.004, far: 60 }, focus: camP.distanceTo(V(0.88, 0.05, -3.84)), aperture: 0.04, after: () => house.setFall(false) };
  };
  S.s41 = (lt, T, sh) => { // stands, looks around: "Siapa yang masuk ke rumah ini?"
    houseBase('int'); house.update(T); house.symMat.opacity = 0.06; const p = pose(); const up = ss(0, 0.6, lt); idle(p, T); kneel(p, 0.85 * (1 - up)); p.hand.R = null; p.headYaw = Math.sin(lt * 1.3) * 0.5 * up; p.headPitch = 0.0; p.look = [Math.sin(lt * 1.3) * 0.4, 0]; p.brow = -0.3; p.pupil = 0.85;
    p.hand.L = V(0.12, 0.45, 0.3); N.update(); ringHeld.visible = true; house.scene.add(ringHeld); ringHeld.position.copy(handW('L')).add(V(0, 0.058, 0));
    const f = fwd(NK_R), hd = headW(); const camP = V(NK[0], 0, NK[1]).add(f.multiplyScalar(1.9)).add(V(0.35, 1.05, 0));
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.8)), l: hd.clone().add(V(0, -0.15, 0)), fov: 36 }, focus: camP.distanceTo(hd), aperture: 0.012 };
  };
  function standingAmid(p, T) { p.x = NK[0]; p.z = NK[1]; p.rotY = NK_R; idle(p, T, { talk: false }); p.hand.L = V(0.12, 0.45, 0.3); p.brow = 0.9; }
  S.s42 = (lt, T, sh) => { // slow orbit — narration
    houseBase('int'); house.update(T); house.symMat.opacity = 0.06; const p = pose(); standingAmid(p, T); p.headYaw = Math.sin(lt * 0.5) * 0.3; p.look = [0.1, -0.3]; p.headPitch = -0.15; N.update();
    ringHeld.visible = true; house.scene.add(ringHeld); ringHeld.position.copy(handW('L')).add(V(0, 0.058, 0));
    const a = lerp(-0.6, 0.65, sm(lt / sh.dur)) + NK_R; const camP = V(NK[0] + Math.sin(a) * 3.0, 1.75, NK[1] + Math.cos(a) * 3.0); const l = V(NK[0], 1.0, NK[1]);
    return { scene: house.scene, set: house, cam: { p: camP, l, fov: 38 }, focus: 3.0, aperture: 0.008 };
  };
  S.s43 = (lt, T, sh) => { // dolly toward the sand in the light shaft
    houseBase('int'); house.update(T); house.symMat.opacity = 0.08; const p = pose(); standingAmid(p, T); p.headPitch = -0.4; p.look = [0, -0.8]; N.update();
    ringHeld.visible = true; house.scene.add(ringHeld); ringHeld.position.copy(handW('L')).add(V(0, 0.058, 0));
    const u = sm(lt / sh.dur); const camP = lv([3.2, 1.45, -2.2], [2.05, 0.55, -3.55], u); const l = lv([1.2, 0.3, -3.9], [1.2, 0.0, -4.05], u);
    return { scene: house.scene, set: house, cam: { p: camP, l, fov: 40 }, focus: camP.distanceTo(l), aperture: 0.01 };
  };

  // ---------- SCENE 06: messages ----------
  const MSG1 = 'Jangan cari ayahmu.', MSG2 = 'Kalau kamu ingin dia kembali, berhenti mencari tahu.';
  function standPhone(p, T, mode = 'front') { p.x = NK[0]; p.z = NK[1]; p.rotY = NK_R; if (mode === 'front') handPhoneFront(p); else handPhoneEar(p); idle(p, T); p.hand.L = V(0.12, 0.45, 0.3); if (mode === 'front') p.look = [0.05, -0.75]; }
  function holdRingL() { ringHeld.visible = true; house.scene.add(ringHeld); ringHeld.position.copy(handW('L')).add(V(0, 0.058, 0)); }
  const t0 = (id) => SHOTS.find(s => s.id === id).t0;
  function chatState(T) { const msgs = [{ text: MSG1, at: t0('s44') + 0.3, time: '15:58' }, { text: MSG2, at: t0('s47') + 0.25, time: '15:59' }]; return msgs.map(m => ({ ...m, at: m.at - T })); }
  S.s44 = (lt, T, sh) => { // phone buzzes: message 1
    houseBase('int'); house.update(T); const p = pose(); standPhone(p, T); p.brow = 0.8; N.update(); holdRingL();
    phoneTo(house.scene, 'front', { vib: lt > 0.25 && lt < 0.9, T }); phone.chat(0, { msgs: chatState(T) }); phone.commit(); glow(true, 0.6);
    const camP = phoneScreenFacingPoint(lerp(0.32, 0.26, lt / sh.dur), 0.03, -0.02);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.5)), l: phoneObj.position, fov: 40, near: 0.01 }, focus: camP.distanceTo(phoneObj.position), aperture: 0.03 };
  };
  S.s45 = (lt, T, sh) => { // face: expression changes
    houseBase('int'); house.update(T); const p = pose(); standPhone(p, T); const k = ss(0.2, 0.6, lt); p.brow = lerp(0.8, -0.7, k); p.pupil = lerp(1, 0.6, k); p.browRaise = 0.5 * (1 - k); N.update(); holdRingL();
    phoneTo(house.scene, 'front'); phone.chat(0, { msgs: chatState(T) }); phone.commit(); glow(true, 0.9);
    const hd = headW(); const camP = hd.clone().add(fwd(NK_R - 0.3).multiplyScalar(lerp(1.35, 1.15, lt / sh.dur))).add(V(0, -0.1, 0));
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.5)), l: hd, fov: 30 }, focus: camP.distanceTo(hd), aperture: 0.022 };
  };
  S.s46 = (lt, T, sh) => { // calls back: unreachable
    houseBase('int'); house.update(T); const p = pose(); standPhone(p, T); p.brow = -0.7; N.update(); holdRingL();
    phoneTo(house.scene, 'front'); phone.call(lt, { name: 'Nomor Tidak Dikenal', number: '+62 8•• •••• ••17', status: lt < 0.55 ? 'Calling…' : 'Nomor tidak dapat dihubungi', avatar: null }); phone.commit(); glow(true, 0.7);
    const camP = phoneScreenFacingPoint(0.27, -0.02, 0.0);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.5)), l: phoneObj.position, fov: 40, near: 0.01 }, focus: 0.27, aperture: 0.03 };
  };
  S.s47 = (lt, T, sh) => { // message 2
    houseBase('int'); house.update(T); const p = pose(); standPhone(p, T); p.brow = -0.8; N.update(); holdRingL();
    phoneTo(house.scene, 'front', { vib: lt > 0.2 && lt < 0.8, T }); phone.chat(0, { msgs: chatState(T) }); phone.commit(); glow(true, 0.7);
    const camP = phoneScreenFacingPoint(lerp(0.3, 0.25, lt / sh.dur), 0.0, -0.02);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.5)), l: phoneObj.position, fov: 40, near: 0.01 }, focus: camP.distanceTo(phoneObj.position), aperture: 0.03 };
  };
  S.s48 = (lt, T, sh) => { // "Siapa yang ngirim ini?!"
    houseBase('int'); house.update(T); const p = pose(); standPhone(p, T); p.brow = -1; p.pupil = 0.7; p.headPitch = -0.15; p.look = [0, -0.2]; N.update(); holdRingL();
    phoneTo(house.scene, 'front'); phone.chat(0, { msgs: chatState(T) }); phone.commit(); glow(true, 0.7);
    const hd = headW(); const camP = hd.clone().add(fwd(NK_R + 0.45).multiplyScalar(1.65)).add(V(0, -0.25, 0));
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 1.2)), l: hd.clone().add(V(0, -0.1, 0)), fov: 34 }, focus: camP.distanceTo(hd), aperture: 0.016 };
  };
  S.s49 = (lt, T, sh) => { // incoming call from the same number
    houseBase('int'); house.update(T); const p = pose(); standPhone(p, T); p.brow = -1; N.update(); holdRingL();
    phoneTo(house.scene, 'front', { vib: true, T }); phone.call(lt, { name: 'Nomor Tidak Dikenal', number: '+62 8•• •••• ••17', status: 'Panggilan masuk', mode: 'incoming' }); phone.commit(); glow(true, 0.8);
    const camP = phoneScreenFacingPoint(0.3, 0.02, 0.0);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.6)), l: phoneObj.position, fov: 40, near: 0.01 }, focus: 0.3, aperture: 0.03 };
  };
  S.s50 = (lt, T, sh) => { // "HEI! LO SIAPA?! ..." then silence
    houseBase('int'); house.update(T); const p = pose(); standPhone(p, T, 'ear'); if (lt < 0.25) p.hand.R = V(-0.08, 0.48, 0.42).lerp(V(-0.37, 0.86, 0.1), lt / 0.25); p.brow = -1; p.pupil = 0.65; p.headPitch += 0.05; p.lean = 0.08;
    if (lt > 2.7) { p.brow = -0.4; p.pupil = 0.55; p.look = [0.15, -0.1]; }
    N.update(); holdRingL(); phoneTo(house.scene, 'ear'); phone.dark(); phone.commit(); glow(false);
    const hd = headW(); const d = lerp(1.75, 1.2, sm(lt / sh.dur)); const camP = hd.clone().add(fwd(NK_R + 0.35).multiplyScalar(d)).add(V(0, -0.12, 0));
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.7)), l: hd.clone().add(V(0, -0.04, 0)), fov: 32 }, focus: d, aperture: 0.02 };
  };
  S.s51 = (lt, T, sh) => { // the voice: sand pouring in a dark basement beam (identity hidden)
    club.visible = false; base.update(T, true); phoneObj.visible = false; N.root.visible = false; base.scene.add(N.root);
    const u = sm(lt / sh.dur); const camP = V(lerp(2.6, 1.9, u), lerp(0.55, 0.45, u), lerp(0.8, 0.2, u)); const l = V(0.6, 0.6, -1.6);
    return { scene: base.scene, set: base, cam: { p: camP, l, fov: 38 }, focus: camP.distanceTo(V(0.6, 0.6, -1.6)), aperture: 0.012, after: () => { N.root.visible = true; } };
  };
  S.s52 = (lt, T, sh) => { // "PETUNJUK APA?!" ... "Perhatikan pasirnya." — line goes dead
    houseBase('int'); house.update(T); house.symMat.opacity = 0.18; const p = pose(); standPhone(p, T, 'ear'); p.brow = -1; p.pupil = 0.65;
    if (lt > 1.55) { p.brow = lerp(-1, 0.6, ss(1.6, 2.6, lt)); p.pupil = 0.55; p.look = [0, -0.6 * ss(2.4, 3.2, lt)]; p.headPitch = -0.35 * ss(2.4, 3.3, lt); }
    if (lt > 3.3) p.hand.R = V(-0.37, 0.86, 0.1).lerp(V(-0.3, 0.2, 0.15), ss(3.3, 3.6, lt));
    N.update(); holdRingL(); if (lt < 3.3) phoneTo(house.scene, 'ear'); else { phoneTo(house.scene, 'front'); }
    phone.call(lt, { name: 'Nomor Tidak Dikenal', number: '+62 8•• •••• ••17', status: 'Panggilan berakhir', mode: lt < 3.3 ? 'incall' : 'outgoing', secs: lt + 4 }); phone.commit();
    const hd = headW(); const camP = hd.clone().add(fwd(NK_R - 0.35).multiplyScalar(1.3)).add(V(0, -0.1, 0));
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.9)), l: hd.clone().add(V(0, -0.03, 0)), fov: 30 }, focus: camP.distanceTo(hd), aperture: 0.022 };
  };

  // ---------- SCENE 07: cliffhanger ----------
  S.s53 = (lt, T, sh) => { // stares at the floor; camera drifts to the sand
    houseBase('int'); house.update(T); house.symMat.opacity = 0.25; const p = pose(); standPhone(p, T); p.hand.R = V(-0.3, 0.2, 0.15); p.headPitch = -0.5; p.look = [0, -0.9]; p.brow = 0.7; N.update(); holdRingL();
    phoneTo(house.scene, 'front'); phone.dark(); phone.commit();
    const hd = headW(); const u = sm(lt / sh.dur); const camP = hd.clone().add(V(0.25, 0.25, 0.35)).lerp(V(1.35, 0.85, -3.4), u); const l = V(1.05, 0, -3.95);
    return { scene: house.scene, set: house, cam: { p: camP, l, fov: 40 }, focus: camP.distanceTo(l), aperture: 0.012 };
  };
  S.s54 = (lt, T, sh) => { // the symbol emerges (top-down)
    houseBase('int'); house.update(T); const k = ss(0.4, 1.2, lt); house.symMat.opacity = lerp(0.25, 1, k);
    const p = pose(); standPhone(p, T); p.hand.R = V(-0.3, 0.2, 0.15); N.update(); holdRingL(); phoneObj.visible = false;
    house.sun.intensity = 2.6 + 1.2 * k;
    const S0 = house.SAND_C; const camP = V(S0.x + 0.12, lerp(1.35, 0.95, sm(lt / sh.dur)), S0.z - 0.05 + 0.001); const l = V(S0.x + 0.12, 0, S0.z - 0.05);
    return { scene: house.scene, set: house, cam: { p: camP, l, fov: 42, near: 0.02 }, focus: camP.y, aperture: 0.006, after: () => { house.sun.intensity = 2.6; } };
  };
  S.s55 = (lt, T, sh) => { // takes a photo of the symbol
    houseBase('int'); house.update(T); house.symMat.opacity = 1; const p = pose(); standPhone(p, T); p.hand.R = V(-0.04, 0.5, 0.42); p.headPitch = -0.55; N.update(); holdRingL();
    phoneTo(house.scene, 'front'); phoneObj.lookAt(V(1.2, 1.8, -3.0)); phone.camera(lt, { view: phone.cameraView, flash: Math.max(0, 1 - Math.abs(lt - 1.65) / 0.15) }); phone.commit(); glow(true, 0.6);
    const l = phoneObj.position.clone(); const camP = phoneScreenFacingPoint(0.23, 0.0, -0.04);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.4)), l, fov: 36, near: 0.01 }, focus: camP.distanceTo(l), aperture: 0.02, flash: Math.max(0, 1 - Math.abs(lt - 1.65) / 0.12) * 0.25 };
  };
  S.s56 = (lt, T, sh) => { // a photo arrives
    houseBase('int'); house.update(T); house.symMat.opacity = 1; const p = pose(); standPhone(p, T); p.brow = 0.2; p.pupil = 0.8; N.update(); holdRingL();
    phoneTo(house.scene, 'front', { vib: lt > 0.4 && lt < 0.9, T }); const msgs = [...chatState(T), { photo: phone.basementPhoto, at: 0.4 - lt, time: '16:03' }];
    phone.chat(0, { msgs: msgs.slice(1) }); phone.commit(); glow(true, 0.7);
    const camP = phoneScreenFacingPoint(lerp(0.33, 0.28, lt / sh.dur), 0.02, 0.0);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.4)), l: phoneObj.position, fov: 40, near: 0.01 }, focus: camP.distanceTo(phoneObj.position), aperture: 0.03 };
  };
  S.s57 = (lt, T, sh) => { // zooms into the photo: papa's watch
    houseBase('int'); house.update(T); const p = pose(); standPhone(p, T); N.update(); holdRingL();
    phoneTo(house.scene, 'front'); const z = 1 + 2.6 * sm((lt - 0.3) / 2.6); const c = phone.watchUV || [0.75, 0.75];
    phone.photo(lt, { img: phone.basementPhoto, zoom: z, cx: lerp(0.5, c[0], sm((lt - 0.3) / 2.6)), cy: lerp(0.5, c[1], sm((lt - 0.3) / 2.6)) }); phone.commit(); glow(true, 0.7);
    const camP = phoneScreenFacingPoint(lerp(0.24, 0.2, lt / sh.dur), 0, 0);
    return { scene: house.scene, set: house, cam: { p: camP.add(hh(T, 0.3)), l: phoneObj.position, fov: 40, near: 0.01 }, focus: camP.distanceTo(phoneObj.position), aperture: 0.03 };
  };
  S.s58 = (lt, T, sh) => { // silence; narration
    houseBase('int'); house.update(T); house.symMat.opacity = 1; const p = pose(); standPhone(p, T); p.hand.R = V(-0.3, 0.25, 0.15); p.headPitch = 0.0; p.look = [0, 0.0]; p.brow = 0.4; p.pupil = 0.6 + 0.1 * Math.sin(lt * 0.7); p.mouthW = 0.7; N.update(); holdRingL();
    phoneTo(house.scene, 'front'); phone.dark(); phone.commit();
    const hd = headW(); const d = lerp(2.0, 1.35, sm(lt / sh.dur)); const camP = hd.clone().add(fwd(NK_R).multiplyScalar(d)).add(V(0, -0.14, 0));
    return { scene: house.scene, set: house, cam: { p: camP, l: hd.clone().add(V(0, -0.04, 0)), fov: 32 }, focus: d, aperture: 0.02 };
  };
  S.s59 = (lt, T, sh) => { // "Gue bakal temuin Papa..."
    houseBase('int'); house.update(T); house.symMat.opacity = 1; const p = pose(); standPhone(p, T); p.hand.R = V(-0.3, 0.25, 0.15); p.hand.L = V(0.15, 0.4, 0.28); p.headPitch = 0.02; p.look = [0, 0.02]; p.brow = -0.9; p.pupil = 0.65; p.blink = 0.22; N.update(); holdRingL();
    idle(p, T); p.blink = Math.max(0.22, p.blink); p.look = [0, 0.02]; N.update(); phoneTo(house.scene, 'front'); phone.dark(); phone.commit();
    const hd = headW(); const d = lerp(1.35, 0.95, sm(lt / sh.dur)); const camP = hd.clone().add(fwd(NK_R).multiplyScalar(d)).add(V(0, -0.05, 0));
    return { scene: house.scene, set: house, cam: { p: camP, l: hd.clone().add(V(0, -0.02, 0)), fov: 30 }, focus: d, aperture: 0.024, fade: 1 - ss(sh.dur - 0.25, sh.dur, lt) };
  };
  S.s60 = () => ({ black: true });
  S.s61 = (lt, T, sh) => { // title card
    ovClear(); const x = ov; x.fillStyle = '#000'; x.fillRect(0, 0, 1920, 1080);
    const a1 = ss(0.2, 1.0, lt), a2 = ss(1.0, 1.6, lt), a3 = ss(1.8, 2.4, lt), a4 = ss(2.6, 3.2, lt), out = 1 - ss(sh.dur - 0.6, sh.dur, lt);
    x.save(); x.globalAlpha = a1 * out; x.textAlign = 'center'; x.textBaseline = 'middle';
    const g = x.createLinearGradient(0, 330, 0, 520); g.addColorStop(0, '#e8d3a6'); g.addColorStop(1, '#a8834e'); x.fillStyle = g; x.font = '900 220px "Inter Display", Inter';
    const sc = 1.06 - 0.06 * sm(lt / 2); x.translate(960, 430); x.scale(sc, sc); x.fillText('PASIR', 0, 0); x.restore();
    // drifting sand grains
    x.save(); x.globalAlpha = a1 * out * 0.7; for (let i = 0; i < 160; i++) { const px = (i * 97.13) % 1920, py = (i * 53.7 + lt * (20 + i % 7 * 6)) % 1080; x.fillStyle = 'rgba(220,190,140,0.7)'; x.fillRect(px, py, 2, 2); } x.restore();
    x.save(); x.textAlign = 'center'; x.globalAlpha = a2 * out; x.fillStyle = '#a3161a'; x.fillRect(900, 560, 120, 4); x.fillStyle = '#efe9df'; x.font = '600 40px Inter'; x.fillText('E P I S O D E   0 1   —   A L A R M', 960, 620);
    x.globalAlpha = a3 * out; x.font = '500 italic 34px Inter'; x.fillStyle = '#cfc6b8'; x.fillText('BERSAMBUNG…', 960, 700);
    x.globalAlpha = a4 * out; if (logoImg()) x.drawImage(logoImg(), 960 - 95, 770, 190, 190); x.restore();
    return { titleCard: true };
  };

  return S;
}
