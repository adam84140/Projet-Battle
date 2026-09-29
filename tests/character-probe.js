// Sonde de mesure du personnage (référence M0 du Master Assault).
// Chargée par tests/character.html, pilotée par tests/character.mjs.
// Lecture seule : elle construit des personnages et mesure, sans rien modifier du jeu.
import * as THREE from 'three';
import { Character } from '/src/character/Character.js';
import { JOINTS } from '/src/character/animation.js';

export const CLASS_IDS = ['assaut', 'artilleur', 'commando'];
export const TEAM_IDS = ['blue', 'red'];

// Disposition des canaux de l'Animator (voir animation.js) : 16 articulations × 3,
// hauteur du bassin (1), support d'arme (6), poids d'IK gauche / droite, décalage de la main gauche (3)
const O_IKL = JOINTS.length * 3 + 7;
const O_IKR = O_IKL + 1;
const O_LH = O_IKR + 1;
export const EXPECTED_CHANNELS = O_LH + 3;

const DT = 1 / 60;
const V = () => new THREE.Vector3();
const r3 = (v) => [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)];
const deg = (rad) => +(THREE.MathUtils.radToDeg(rad)).toFixed(2);

// Personnage à l'état reproductible : l'Animator tire une phase de respiration au hasard
export function freshCharacter(opts) {
  const c = new Character(opts);
  c.animator.time = 0;
  c.animator.phase = 0;
  c.animator.first = true;
  return c;
}

function simulate(c, secs, fn) {
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) {
    fn?.(c.anim);
    c.update(DT);
  }
}

// États d'animation mesurés (mêmes réglages que tests/poses.html, plus la visée et le tir)
export const POSES = [
  ['idle', (c) => simulate(c, 1)],
  ['aim', (c) => simulate(c, 1, (a) => { a.aim = true; a.pitch = 0; })],
  ['aim-up', (c) => simulate(c, 1, (a) => { a.aim = true; a.pitch = 0.6; })],
  ['aim-down', (c) => simulate(c, 1, (a) => { a.aim = true; a.pitch = -0.6; })],
  ['fire', (c) => { simulate(c, 1, (a) => { a.aim = true; a.pitch = 0; }); simulate(c, 3 * DT, (a) => { a.recoil = 1; }); }],
  ['walk', (c) => simulate(c, 1, (a) => { a.speed = 3.2; a.moveAngle = 0; })],
  ['run', (c) => simulate(c, 1, (a) => { a.speed = 5.6; a.moveAngle = 0; })],
  ['backward', (c) => simulate(c, 1, (a) => { a.speed = 3.2; a.moveAngle = Math.PI; })],
  ['strafe', (c) => simulate(c, 1.1, (a) => { a.speed = 3.2; a.moveAngle = Math.PI / 2; })],
  ['crouch', (c) => simulate(c, 1, (a) => { a.crouch = true; })],
  ['crouch-walk', (c) => simulate(c, 1, (a) => { a.crouch = true; a.speed = 2; })],
  ['crouch-aim', (c) => simulate(c, 1, (a) => { a.crouch = true; a.aim = true; a.pitch = 0; })],
  ['sprint', (c) => simulate(c, 1.2, (a) => { a.sprint = true; a.speed = 8.4; })],
  ['jump', (c) => simulate(c, 0.5, (a) => { a.grounded = false; a.vy = 7; })],
  ['fall', (c) => simulate(c, 0.5, (a) => { a.grounded = false; a.vy = -9; })],
  ['land', (c) => { simulate(c, 0.5, (a) => { a.grounded = false; a.vy = -12; }); Object.assign(c.anim, { grounded: true, vy: 0, landT: 1, landAmt: 1 }); simulate(c, 0.09); }],
  ['hit-front', (c) => { simulate(c, 1); Object.assign(c.anim, { hitT: 1, hitX: 0, hitZ: 1, hitAmt: 1 }); simulate(c, 0.07); }],
  ['hit-left', (c) => { simulate(c, 1); Object.assign(c.anim, { hitT: 1, hitX: 1, hitZ: 1, hitAmt: 1 }); simulate(c, 0.07); }],
  ['pivot', (c) => simulate(c, 0.62, (a) => { a.turnRate = 3; })],
  ['reload', (c) => simulate(c, 1, (a) => { a.reload = Math.min(0.5, (a.reload < 0 ? 0 : a.reload) + DT); })],
  ['throw', (c) => simulate(c, 0.3, (a) => { a.action = 'throw'; a.actionT = Math.min(0.4, (a.actionT || 0) + DT / 0.7); })],
  ['buff', (c) => simulate(c, 0.25, (a) => { a.action = 'buff'; a.actionT = Math.min(0.5, (a.actionT || 0) + DT / 0.45); })],
  ['heal', (c) => simulate(c, 0.3, (a) => { a.action = 'heal'; a.actionT = Math.min(0.5, (a.actionT || 0) + DT / 0.6); })],
  ['sit', (c) => simulate(c, 1, (a) => { a.mode = 'sit'; })],
  ['dead-back', (c) => { simulate(c, 0.3); Object.assign(c.anim, { mode: 'dead', deadDir: 1, deadVar: 0, deadT: 0 }); simulate(c, 2, (a) => { a.deadT += DT; }); }],
];

function visibleMesh(o) {
  if (!o.isMesh) return false;
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

// Coût d'un modèle : objets de rendu, triangles, matériaux, données de géométrie
export function modelStats(root) {
  let meshes = 0, visible = 0, shadow = 0, tris = 0, verts = 0, bytes = 0;
  const mats = new Set();
  const geos = new Set();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    if (!geos.has(g.uuid)) {
      geos.add(g.uuid);
      for (const a of Object.values(g.attributes)) bytes += a.array.byteLength;
      if (g.index) bytes += g.index.array.byteLength;
    }
    if (!visibleMesh(o)) return;
    visible++;
    if (o.castShadow) shadow++;
    mats.add(o.material.uuid);
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    verts += g.attributes.position.count;
  });
  return { meshes, visibleMeshes: visible, hiddenMeshes: meshes - visible, shadowCasters: shadow, materials: mats.size, triangles: Math.round(tris), vertices: verts, geometries: geos.size, geometryKB: Math.round(bytes / 1024) };
}

function topOf(root, under = null) {
  root.updateMatrixWorld(true);
  let max = -Infinity;
  const box = new THREE.Box3();
  root.traverse((o) => {
    if (!visibleMesh(o)) return;
    if (under) {
      let inside = false;
      for (let p = o; p; p = p.parent) if (p === under) inside = true;
      if (!inside) return;
    }
    o.geometry.computeBoundingBox();
    box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    max = Math.max(max, box.max.y);
  });
  return max;
}

// Coût par modèle (menu / fiche = non fusionné ; jeu = fusionné), temps de construction, hauteurs, squelette
export function measureModels() {
  const out = { models: {}, reference: {} };
  for (const classId of CLASS_IDS) {
    for (const team of TEAM_IDS) {
      for (const bake of [true, false]) {
        const opts = { team, classId, bake, custom: { backpack: true } };
        freshCharacter(opts).dispose(); // mise en cache des matériaux
        const times = [];
        let stats = null;
        for (let i = 0; i < 3; i++) {
          const t0 = performance.now();
          const c = new Character(opts);
          times.push(performance.now() - t0);
          if (!stats) stats = modelStats(c.root);
          c.dispose();
        }
        times.sort((a, b) => a - b);
        out.models[`${classId}-${team}-${bake ? 'jeu' : 'menu'}`] = { ...stats, buildMsMin: +times[0].toFixed(1), buildMsMedian: +times[1].toFixed(1) };
      }
    }
    const noBag = freshCharacter({ team: 'blue', classId, bake: true, custom: { backpack: false } });
    out.models[`${classId}-blue-jeu-sans-sac`] = modelStats(noBag.root);
    noBag.dispose();
  }
  // Hauteurs et squelette (Assaut bleu, sans arme ni accessoire de tête)
  for (const bake of [true, false]) {
    const c = freshCharacter({ team: 'blue', classId: 'assaut', bake, weapon: false, custom: { backpack: false, cap: false } });
    simulate(c, 1);
    const idleTop = topOf(c.root);
    const headBone = c.bones.head.getWorldPosition(V());
    c.anim.mode = 'apose';
    c.animator.update(0, true);
    const r = { topIdle: +idleTop.toFixed(3), topApose: +topOf(c.root).toFixed(3), headTopApose: +topOf(c.root, c.bones.head).toFixed(3), headBoneIdleY: +headBone.y.toFixed(3), headHitCentreIdleY: +(headBone.y + c.headOffset).toFixed(3) };
    if (!bake) {
      r.headOffset = +c.headOffset.toFixed(4);
      r.hipsHeight = c.hipsHeight;
      r.bonesApose = {};
      c.root.updateMatrixWorld(true);
      for (const [k, b] of Object.entries(c.bones)) r.bonesApose[k] = r3(b.getWorldPosition(V()));
      r.boneCount = Object.keys(c.bones).length;
      r.joints = JOINTS.slice();
      r.hasWeaponMount = !!c.weaponMount;
      r.animatorChannels = c.animator.cur.length;
    }
    out.reference[bake ? 'jeu' : 'menu'] = r;
    c.dispose();
  }
  return out;
}

// Centre visuel de la tête (maillage fusionné de l'os `head`) et couverture par la sphère de touche
function headProbe(c) {
  const head = c.bones.head;
  const hit = head.getWorldPosition(V());
  hit.y += c.headOffset; // même calcul que Soldier.update (headPos)
  const mesh = head.children.find((o) => o.isMesh && o.userData.baked);
  if (!mesh) return null;
  mesh.geometry.computeBoundingBox();
  const centre = mesh.geometry.boundingBox.getCenter(V()).applyMatrix4(mesh.matrixWorld);
  const pos = mesh.geometry.attributes.position;
  const v = V();
  let inside = 0, maxD = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const d = v.distanceTo(hit);
    if (d <= 0.17) inside++;
    if (d > maxD) maxD = d;
  }
  return { hitCentre: r3(hit), visualCentre: r3(centre), centreDistance: +centre.distanceTo(hit).toFixed(4), coverage: +(inside / pos.count).toFixed(3), farthestVertex: +maxD.toFixed(3) };
}

// Alignements par pose : mains / points de prise, tête / sphère, arme / visée, bouche du canon, support d'arme
export function measureAlignment(classId = 'assaut', team = 'blue') {
  const rows = [];
  for (const [id, prep] of POSES) {
    const c = freshCharacter({ team, classId, bake: true, custom: { backpack: true } });
    prep(c);
    c.root.updateMatrixWorld(true);
    const a = c.anim;
    const cur = c.animator.cur;
    const w = c.weapon;
    const row = { pose: id, mode: a.mode, ikL: +cur[O_IKL].toFixed(3), ikR: +cur[O_IKR].toFixed(3), leftHandOffset: +Math.hypot(cur[O_LH], cur[O_LH + 1], cur[O_LH + 2]).toFixed(4) };
    row.weaponVisible = !!(w && w.group.visible);
    if (row.weaponVisible && a.mode === 'combat') {
      const m = w.group.matrixWorld;
      const gripR = w.rightWrist.clone().applyMatrix4(m);
      const gripL = w.leftWrist.clone().applyMatrix4(m);
      const targetL = w.leftWrist.clone().add(new THREE.Vector3(cur[O_LH], cur[O_LH + 1], cur[O_LH + 2])).applyMatrix4(m);
      const hR = c.bones.handR.getWorldPosition(V());
      const hL = c.bones.handL.getWorldPosition(V());
      row.handR_toGrip = +hR.distanceTo(gripR).toFixed(4);
      row.handL_toTarget = +hL.distanceTo(targetL).toFixed(4);
      row.handL_toGrip = +hL.distanceTo(gripL).toFixed(4);
      const fwd = new THREE.Vector3(0, 0, 1).transformDirection(m);
      row.weaponForward = r3(fwd);
      if (a.aim) {
        const aimDir = new THREE.Vector3(0, Math.sin(a.pitch), Math.cos(a.pitch));
        row.pitch = a.pitch;
        row.weaponToAimDeg = deg(fwd.angleTo(aimDir));
      }
      row.muzzle = r3(c.getMuzzleWorld(V()));
      const mount = c.weaponMount.getWorldPosition(V());
      row.weaponMount = r3(mount);
      row.mountFromSpine = +mount.distanceTo(c.bones.spine.getWorldPosition(V())).toFixed(4);
    }
    if (a.mode !== 'dead') row.head = headProbe(c);
    rows.push(row);
    c.dispose();
  }
  return rows;
}

function stage(w, h) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // comme le jeu
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a3a55);
  scene.add(new THREE.HemisphereLight(0xe3eeff, 0x4a4030, 1.5));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
  key.position.set(2.5, 4, 5);
  key.castShadow = true;
  key.shadow.camera.left = key.shadow.camera.bottom = -2;
  key.shadow.camera.right = key.shadow.camera.top = 2;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa9c8ff, 2);
  rim.position.set(-3, 3, -4);
  scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshLambertMaterial({ color: 0x5a6a52 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const cam = new THREE.PerspectiveCamera(24, w / h, 0.05, 50);
  cam.position.set(0, 1.05, 6.2);
  cam.lookAt(0, 0.95, 0);
  return { renderer, scene, cam, floor, dispose: () => { floor.geometry.dispose(); renderer.dispose(); } };
}

// Appels de rendu d'un soldat seul (passe couleur + ombre) et mémoire GPU sur deux cycles création / libération
export function measureGpu(classId = 'assaut', team = 'blue') {
  const s = stage(256, 256);
  const info = s.renderer.info;
  info.autoReset = false;
  info.reset();
  s.renderer.render(s.scene, s.cam);
  const empty = { calls: info.render.calls, triangles: info.render.triangles };
  const base = info.memory.geometries;
  const cycles = [];
  let draw = null;
  for (let k = 0; k < 2; k++) {
    const c = freshCharacter({ team, classId, bake: true, custom: { backpack: true } });
    simulate(c, 0.5);
    s.scene.add(c.root);
    info.reset();
    s.renderer.render(s.scene, s.cam);
    draw ||= { calls: info.render.calls - empty.calls, triangles: info.render.triangles - empty.triangles };
    const uploaded = info.memory.geometries - base;
    s.scene.remove(c.root);
    c.dispose();
    s.renderer.render(s.scene, s.cam);
    cycles.push({ uploaded, remainingAfterDispose: info.memory.geometries - base });
  }
  s.dispose();
  return { soloDrawWithShadow: draw, cycles, textures: info.memory.textures };
}

// Mémoire JavaScript par personnage fusionné (nécessite --expose-gc).
// Les tampons des géométries sont libérés de façon différée : on laisse le ramasse-miettes se stabiliser.
async function settledHeap() {
  for (let i = 0; i < 3; i++) {
    window.gc();
    await new Promise((r) => setTimeout(r, 150));
  }
  return performance.memory.usedJSHeapSize;
}
export async function measureHeap(n = 8) {
  if (!window.gc || !performance.memory) return null;
  freshCharacter({ team: 'blue', classId: 'assaut', bake: true }).dispose();
  const m0 = await settledHeap();
  let list = [];
  for (let i = 0; i < n; i++) list.push(new Character({ team: i % 2 ? 'red' : 'blue', classId: 'assaut', bake: true }));
  const m1 = await settledHeap();
  for (const c of list) c.dispose();
  list = null;
  const m2 = await settledHeap();
  return { perCharacterKB: Math.round((m1 - m0) / n / 1024), residualKB: Math.round((m2 - m0) / 1024), n };
}

// Planche déterministe pour la comparaison A/B (mêmes poses, même lumière, même caméra)
const LINEUP = [
  ['face', 0, 'stand'], ['3/4', 0.7, 'stand'], ['profil', Math.PI / 2, 'stand'], ['dos', Math.PI, 'stand'],
  ['repos', -0.6, 'idle'], ['visée', -0.9, 'aim'], ['course', -1.2, 'run'], ['accroupi', -0.9, 'crouch'],
];
export function renderLineup(classId = 'assaut', team = 'blue', backpack = true) {
  const W = 200, H = 360;
  const s = stage(W, H);
  const out = document.createElement('canvas');
  out.width = W * LINEUP.length;
  out.height = H;
  const ctx = out.getContext('2d');
  LINEUP.forEach(([, yaw, pose], i) => {
    const c = freshCharacter({ team, classId, bake: true, custom: { backpack } });
    simulate(c, 50 * DT, (a) => {
      if (pose === 'stand') a.mode = 'stand';
      if (pose === 'aim') a.aim = true;
      if (pose === 'run') a.speed = 6;
      if (pose === 'crouch') a.crouch = true;
    });
    if (pose === 'run') {
      c.animator.phase = Math.PI * 0.45;
      c.animator.update(0, true);
    }
    c.root.rotation.y = yaw;
    s.scene.add(c.root);
    s.renderer.render(s.scene, s.cam);
    ctx.drawImage(s.renderer.domElement, i * W, 0);
    s.scene.remove(c.root);
    c.dispose();
  });
  s.dispose();
  return out.toDataURL('image/png');
}
