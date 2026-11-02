// Entry point: builds every set once, prepares in-story photos, exposes window.renderFrame(f).
import * as THREE from 'three';
import { Engine } from './engine.js';
import { initBrand, tex } from './textures.js';
import { makeNando, makePapa, makePhone, makeGolfClub, makeRing, makeWatch } from './characters.js';
import { buildGolf } from './set_golf.js';
import { buildRoad, makeCar, tallCar } from './set_road.js';
import { buildHouse, buildBasement, buildStudio } from './set_house.js';
import { Phone } from './phone.js';
import { glowSprite } from './common.js';
import { FPS, SHOTS, TOTAL, shotAt } from './timeline.js';
import { makeDirector } from './shots.js';

async function init() {
  await initBrand();
  const engine = new Engine(); window.__engine = engine;
  const nando = makeNando();
  const papa = makePapa();
  const phone = new Phone();
  const cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.05, 1200);

  // --- in-story photos (rendered with the same 3D characters) ---
  const studio = buildStudio();
  studio.scene.add(nando.root, papa.root);
  const P = nando.constructor.defaultPose;
  nando.pose = P(); Object.assign(nando.pose, { x: -0.42, rotY: 0.18, smile: 1, look: [0.0, 0.05] }); nando.pose.hand.R = new THREE.Vector3(-0.3, 0.12, 0.1);
  papa.pose = P(); Object.assign(papa.pose, { x: 0.45, rotY: -0.15, smile: 1, look: [0, 0.05] }); papa.pose.hand.R = { world: new THREE.Vector3(-0.15, 1.12, 0.32) }; papa.pose.pole.R = new THREE.Vector3(-0.5, -1, 0.5);
  nando.update(); papa.update(); papa.pose.hand.R = { world: nando.torso.localToWorld(new THREE.Vector3(0.28, 0.5, -0.05)) }; papa.update();
  engine.setGrade({ ...studio.grade, sat: 0.9 });
  cam.fov = 26; cam.position.set(0, 1.45, 5.2); cam.lookAt(0, 1.3, 0); cam.updateProjectionMatrix();
  const familyPhoto = engine.snapshot(studio.scene, cam, 900, 620, { aperture: 0.004, focus: 5.2, grain: 0 });
  cam.fov = 22; cam.position.set(0.4, 1.52, 2.0); cam.lookAt(0.4, 1.47, 0); cam.updateProjectionMatrix();
  phone.avatar = engine.snapshot(studio.scene, cam, 400, 400, { aperture: 0, focus: 2 });
  studio.scene.remove(nando.root, papa.root);

  // --- sets ---
  const golf = buildGolf();
  const road = buildRoad(); tallCar(road.car);
  const house = buildHouse({ familyPhoto });
  const basement = buildBasement();
  const houseCar = tallCar(makeCar(0x1d2024)); houseCar.rotation.y = -Math.PI / 2; house.scene.add(houseCar);

  // basement photo with papa's watch in the corner of the frame
  const watch = makeWatch(); watch.scale.setScalar(2.2); watch.position.set(2.35, 0.02, -2.75); watch.rotation.set(0, 0.6, 0.15); basement.scene.add(watch);
  basement.update(0, false); engine.setGrade({ ...basement.grade, exposure: 1.35 });
  cam.fov = 50; cam.position.set(-0.6, 1.55, 2.6); cam.lookAt(1.1, 0.2, -2.0); cam.updateProjectionMatrix();
  phone.basementPhoto = engine.snapshot(basement.scene, cam, 720, 960, { aperture: 0, focus: 4, grain: 0 });
  { // where the watch lands in the cropped portrait photo
    cam.aspect = 16 / 9; cam.updateProjectionMatrix(); const v = watch.position.clone().project(cam);
    const px = (v.x * 0.5 + 0.5) * 1920, py = (1 - (v.y * 0.5 + 0.5)) * 1080; const sw = 1080 * 0.75, x0 = (1920 - sw) / 2;
    phone.watchUV = [(px - x0) / sw, py / 1080];
  }
  // camera-app view of the sand symbol
  house.symMat.opacity = 1; house.mode('int'); engine.setGrade(house.grade);
  cam.fov = 48; cam.position.set(house.SAND_C.x + 0.12, 1.15, house.SAND_C.z - 0.05 + 0.25); cam.lookAt(house.SAND_C.x + 0.12, 0, house.SAND_C.z - 0.05); cam.updateProjectionMatrix();
  nando.root.visible = false; phone.cameraView = engine.snapshot(house.scene, cam, 720, 960, { aperture: 0, focus: 1.2 }); nando.root.visible = true;
  house.symMat.opacity = 0;

  // --- props ---
  const phoneObj = makePhone(phone.tex);
  const club = makeGolfClub();
  const keysObj = new THREE.Group(); keysObj.add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.014), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 }))); const kb = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.002, 8, 16), new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 1, roughness: 0.2 })); kb.position.y = 0.04; keysObj.add(kb);
  const ringHeld = makeRing();
  const glint = glowSprite(0xfff4dd, 1, 1);
  const phoneGlow = new THREE.PointLight(0xbcd4ff, 0, 1.6, 1.5); house.scene.add(phoneGlow);

  const sets = { golf, road, house, basement };
  // camera-following soft fill light per set (classic animation key/fill): keeps faces readable
  const FILL = { golf: 1.1, road: 1.3, house: 1.35, basement: 0.15 };
  for (const [k, st] of Object.entries(sets)) { const f = new THREE.DirectionalLight(0xfff1e2, FILL[k]); st.scene.add(f, f.target); st.fill = f; st.fillI = FILL[k]; }
  const S = makeDirector({ sets, nando, phone, phoneObj, engine, keysObj, ringHeld, phoneGlow, club, houseCar, glint });

  function resetFrame() {
    phoneObj.visible = false; keysObj.visible = false; ringHeld.visible = false; club.visible = false; glint.visible = false;
    house.ring.visible = true; road.refl.visible = false; nando.root.visible = true; phoneGlow.intensity = 0;
  }

  window.renderFrame = (f, q = 0.92) => {
    const T = f / FPS; const sh = shotAt(T); const lt = T - sh.t0;
    resetFrame();
    const r = S[sh.id](lt, T, sh) || { black: true };
    const R = engine.renderer;
    if (r.black) { R.setRenderTarget(null); R.setClearColor(0x000000, 1); R.clear(); return R.domElement.toDataURL('image/jpeg', q); }
    if (r.titleCard) { const c = document.createElement('canvas'); c.width = R.domElement.width; c.height = R.domElement.height; c.getContext('2d').drawImage(engine.ov, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); }
    engine.setGrade(r.set.grade || {});
    cam.fov = r.cam.fov || 36; cam.near = r.cam.near || 0.05; cam.far = r.cam.far || 1200; cam.aspect = 16 / 9; cam.updateProjectionMatrix();
    // safety: never let the camera end up inside Nando's (big) head
    if (nando.root.visible && nando.root.parent === r.scene) { const hc = nando.head.getWorldPosition(new THREE.Vector3()); const d = r.cam.p.distanceTo(hc), minD = nando.R * 1.06 + 0.06; if (d < minD) r.cam.p = hc.clone().add(r.cam.p.clone().sub(hc).normalize().multiplyScalar(minD)); }
    cam.position.copy(r.cam.p); cam.up.set(0, 1, 0); cam.lookAt(r.cam.l); if (r.cam.roll) cam.rotateZ(r.cam.roll);
    // gentle fade-in after cut-to-black moments
    let fade = r.fade ?? 1; if (sh.id === 's11') fade *= Math.min(1, lt / 0.6);
    if (r.set && r.set.fill) { const rt = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0); r.set.fill.position.copy(cam.position).add(rt.multiplyScalar(0.7)).add(new THREE.Vector3(0, 0.9, 0)); r.set.fill.target.position.copy(r.cam.l); r.set.fill.intensity = r.set.fillI * (r.fillMul ?? 1); }
    window.__lastScene = r.scene; window.__cam = cam;
    engine.render(r.scene, cam, { focus: r.focus || 5, aperture: r.aperture || 0, time: T, fade, flash: r.flash || 0, overlay: !!r.overlay });
    if (r.after) r.after();
    return R.domElement.toDataURL('image/jpeg', q);
  };
  window.TOTAL_FRAMES = Math.round(TOTAL * FPS);
  window.SHOT_LIST = SHOTS.map(s => [s.id, Math.round(s.t0 * FPS), Math.round(s.t1 * FPS)]);
  window.READY = true;
}

init().catch(e => { console.log('INIT FAIL', e.stack || e); window.FAIL = String(e); });
// profiling helper: time the stages for one frame
window.PROF = (f) => {
  const e = window.__engine, R = e.renderer, gl = R.getContext(), px = new Uint8Array(4), out = {};
  const fin = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let t = performance.now(); window.renderFrame(f); out.fullWithJpeg = performance.now() - t;
  const u = e.post.uniforms, ap = u.aperture.value;
  t = performance.now(); R.setRenderTarget(null); R.render(e.postScene, e.postCam); fin(); out.post = performance.now() - t;
  u.aperture.value = 0; t = performance.now(); R.render(e.postScene, e.postCam); fin(); out.postNoDof = performance.now() - t; u.aperture.value = ap;
  t = performance.now(); R.domElement.toDataURL('image/jpeg', 0.92); out.jpeg = performance.now() - t;
  R.shadowMap.autoUpdate = false; t = performance.now(); window.renderFrame(f); out.noShadowUpdate = performance.now() - t; R.shadowMap.autoUpdate = true;
  return out;
};
window.PROF2 = (f) => { // scene pass only, with and without msaa-resolve/post
  const e = window.__engine, R = e.renderer, gl = R.getContext(), px = new Uint8Array(4); const fin = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  window.renderFrame(f); const out = {}; let t;
  const sc = window.__lastScene, cam = window.__cam; R.shadowMap.autoUpdate = false;
  R.setRenderTarget(e.rt); t = performance.now(); R.render(sc, cam); fin(); out.scene = performance.now() - t;
  let n = 0, tris = 0; sc.traverseVisible(o => { if (o.isMesh) { n++; } }); out.meshes = n; out.calls = R.info.render.calls; out.tris = R.info.render.triangles;
  R.shadowMap.autoUpdate = true; R.setRenderTarget(null); return out;
};
