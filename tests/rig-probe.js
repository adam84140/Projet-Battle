// Sonde de l'étape M2 : squelette de production synthétique (donnée de test, pas de l'art),
// adaptateur de squelette, export / rechargement GLB. Chargée par tests/rig.html.
// Le squelette synthétique est construit à partir du personnage actuel, avec des repères d'os
// volontairement différents (A-pose, os orientés vers leur enfant avec un roll, racine couchée)
// pour prouver que l'adaptateur fonctionne vraiment.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { bakedMaterial } from '/src/character/parts.js';
import { M1_OPTIMIZED_RENDER_PATH } from '/src/character/renderPath.js';
import { RigAdapter } from '/src/character/rigAdapter.js';
import { IK_CHANNELS } from '/src/character/animation.js';
import { REQUIRED_BONES, SOCKETS, runtimeName } from '/src/character/rigContract.js';
import { freshCharacter, simulate, stage, LINEUP, POSES, EXTENT_POSES } from '/tests/character-probe.js';

const V = () => new THREE.Vector3();
const DT = 1 / 60;
const r3 = (v) => [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)];

// Variantes du squelette synthétique
export const VARIANTS = {
  // mêmes proportions que le gameplay, repères d'os différents : l'adaptateur doit reproduire M1
  orientation: { arm: 1, leg: 1, head: 1, shoulder: [0, 0, 0], headTop: null },
  // Master Assault simulé à 1,85 m : bras +5 %, jambes −3 %, épaules décalées, tête réduite
  proportions: { arm: 1.05, leg: 0.97, head: null, shoulder: [0.015, 0.01, 0], headTop: 1.85 },
};

// Pose A de référence du squelette synthétique (mêmes angles que Animator.poseA pour bras et jambes)
const A_POSE = { shoulderL: 0.72, shoulderR: -0.72, legL: 0.07, legR: -0.07, ankleL: -0.07, ankleR: 0.07 };

// Articulation du gameplay équivalente à chaque os de production (position en A-pose)
const EQUIV = { hips: 'hips', spine: 'spine', neck: 'neck', head: 'head' };
for (const sd of ['L', 'R']) Object.assign(EQUIV, { [`upperArm.${sd}`]: 'shoulder' + sd, [`lowerArm.${sd}`]: 'elbow' + sd, [`hand.${sd}`]: 'hand' + sd, [`thigh.${sd}`]: 'leg' + sd, [`calf.${sd}`]: 'knee' + sd, [`foot.${sd}`]: 'ankle' + sd });

function roll(i) {
  return (((i * 37) % 11) - 5) * 0.12; // de −0,6 à +0,6 rad, déterministe
}

// Matrices monde du squelette de gameplay (repère du personnage) au repos et en A-pose
function gameplayPoses(c) {
  const G = c.bones;
  const saved = Object.values(G).map((b) => [b, b.quaternion.clone(), b.position.clone()]);
  // repère du personnage (le personnage peut être déjà placé sur la carte)
  const read = () => {
    c.root.updateMatrixWorld(true);
    const inv = c.root.matrixWorld.clone().invert();
    return Object.fromEntries(Object.entries(G).map(([k, b]) => [k, inv.clone().multiply(b.matrixWorld)]));
  };
  for (const b of Object.values(G)) b.quaternion.identity();
  G.hips.position.y = c.hipsHeight;
  const rest = read();
  for (const [k, z] of Object.entries(A_POSE)) G[k].rotation.set(0, 0, z);
  const apose = read();
  for (const [b, q, p] of saved) {
    b.quaternion.copy(q);
    b.position.copy(p);
  }
  c.root.updateMatrixWorld(true);
  return { rest, apose };
}

// Construit le squelette synthétique et son maillage à partir d'un personnage M1 (root à l'origine)
export function buildFixture(c, variantName = 'orientation', { forExport = false } = {}) {
  const VAR = VARIANTS[variantName];
  const body = c.skinnedBody;
  const { rest, apose } = gameplayPoses(c);
  const P = (m) => new THREE.Vector3().setFromMatrixPosition(m);
  const gA = (name) => P(apose[name]);
  // positions de référence (gameplay, A-pose) des os de production
  const ref = {};
  ref.root = V();
  for (const [bn, g] of Object.entries(EQUIV)) ref[bn] = gA(g);
  ref.spine1 = ref.spine.clone().lerp(ref.neck, 1 / 3);
  ref.chest = ref.spine.clone().lerp(ref.neck, 2 / 3);
  for (const sd of ['L', 'R']) {
    const s = gA('shoulder' + sd);
    ref[`clavicle.${sd}`] = new THREE.Vector3(s.x * 0.25, s.y - 0.02, 0);
    ref[`toe.${sd}`] = ref[`foot.${sd}`].clone().add(new THREE.Vector3(0, -0.06, 0.13));
  }
  // facteurs de proportion par os (appliqués au segment qui mène à l'os)
  const segScale = (name) => {
    const base = name.split('.')[0];
    if (base === 'lowerArm' || base === 'hand') return VAR.arm;
    if (base === 'calf' || base === 'foot' || base === 'hips') return VAR.leg;
    return 1;
  };
  const specs = REQUIRED_BONES.map((b) => ({ ...b }));
  const pos = {};
  for (const b of specs) {
    if (!b.parent) {
      pos[b.name] = ref[b.name].clone();
      continue;
    }
    pos[b.name] = pos[b.parent].clone().add(ref[b.name].clone().sub(ref[b.parent]).multiplyScalar(segScale(b.name)));
    if (b.name.startsWith('upperArm.')) pos[b.name].add(new THREE.Vector3(VAR.shoulder[0] * (b.side === 'L' ? 1 : -1), VAR.shoulder[1], VAR.shoulder[2]));
  }
  // échelle de la tête : sommet des cheveux à la hauteur visée
  let headScale = VAR.head ?? 1;
  if (VAR.headTop) {
    const pa = body.geometry.attributes.position;
    const si = body.geometry.attributes.skinIndex;
    const hi = body.skeleton.bones.indexOf(c.bones.head);
    let top = -Infinity;
    for (let i = 0; i < pa.count; i++) if (si.getX(i) === hi) top = Math.max(top, pa.getY(i));
    headScale = (VAR.headTop - pos.head.y) / (top - P(rest.head).y);
  }
  // os : +Y local vers l'enfant (convention Blender), roll différent pour chacun, racine couchée vers +Z
  const tail = (name) => {
    const b = name.split('.')[0];
    const sd = name.split('.')[1];
    const kid = { root: null, hips: 'spine', spine: 'spine1', spine1: 'chest', chest: 'neck', neck: 'head', clavicle: `upperArm.${sd}`, upperArm: `lowerArm.${sd}`, lowerArm: `hand.${sd}`, thigh: `calf.${sd}`, calf: `foot.${sd}`, foot: `toe.${sd}` }[b];
    if (kid) return pos[kid].clone().sub(pos[name]);
    if (b === 'root') return new THREE.Vector3(0, 0, 1);
    if (b === 'head') return new THREE.Vector3(0, 1, 0);
    if (b === 'hand') return pos[name].clone().sub(pos[`lowerArm.${sd}`]);
    return new THREE.Vector3(0, 0, 1); // orteil
  };
  const bones = [];
  const byName = {};
  const worldQ = {};
  specs.forEach((b, i) => {
    const bone = new THREE.Bone();
    bone.name = b.name;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tail(b.name).normalize());
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), roll(i)));
    worldQ[b.name] = q;
    if (b.parent) {
      const pq = worldQ[b.parent].clone().invert();
      bone.quaternion.copy(pq).multiply(q);
      bone.position.copy(pos[b.name].clone().sub(pos[b.parent]).applyQuaternion(pq));
      byName[b.parent].add(bone);
    } else {
      bone.quaternion.copy(q);
      bone.position.copy(pos[b.name]);
    }
    byName[b.name] = bone;
    bones.push(bone);
  });
  // points d'attache : os non déformants
  const sockOffset = { 'socket_hand.R': [0, -0.02, 0.05], 'socket_hand.L': [0, -0.02, 0.05], socket_back: [0, 0, -0.22], socket_head: [0, 0.2, 0], socket_face: [0, 0.1, 0.12], 'socket_hip.L': [0.17, 0, 0.05], 'socket_hip.R': [-0.17, 0, 0.05], socket_grenade: [0.2, 0.05, 0.1], socket_weapon: [-0.19, 0.02, 0.21] };
  for (const s of SOCKETS) {
    const bone = new THREE.Bone();
    bone.name = s.name;
    const pq = worldQ[s.parent].clone().invert();
    bone.position.fromArray(sockOffset[s.name]).applyQuaternion(pq);
    byName[s.parent].add(bone);
    byName[s.name] = bone;
    bones.push(bone);
  }

  // géométrie : chaque sommet du corps M1 (gameplay au repos) passe en A-pose puis sur l'os de production
  const gBones = body.skeleton.bones;
  const gName = new Map(Object.entries(c.bones).map(([k, b]) => [b, k]));
  const src = body.geometry;
  const n = src.attributes.position.count;
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const skinIndex = new Uint16Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  const boneIndex = new Map(bones.map((b, i) => [b.name, i]));
  const toA = new Map();
  const nrm = new Map();
  const v = V();
  const nn = V();
  for (let i = 0; i < n; i++) {
    const g = gBones[src.attributes.skinIndex.getX(i)];
    const gk = gName.get(g) || 'root';
    if (!toA.has(gk)) {
      const m = gk === 'root' ? new THREE.Matrix4() : apose[gk].clone().multiply(rest[gk].clone().invert());
      toA.set(gk, m);
      nrm.set(gk, new THREE.Matrix3().getNormalMatrix(m));
    }
    v.fromBufferAttribute(src.attributes.position, i);
    const restY = v.y;
    const restZ = v.z;
    v.applyMatrix4(toA.get(gk));
    nn.fromBufferAttribute(src.attributes.normal, i).applyMatrix3(nrm.get(gk)).normalize();
    // os de production porteur
    let rb;
    const sd = gk.slice(-1);
    if (gk === 'root' || gk === 'hips' || gk === 'neck' || gk === 'head') rb = gk;
    else if (gk === 'spine') rb = restY < ref.spine1.y ? 'spine' : restY < ref.chest.y ? 'spine1' : 'chest';
    else if (gk.startsWith('shoulder')) rb = `upperArm.${sd}`;
    else if (gk.startsWith('elbow')) rb = `lowerArm.${sd}`;
    else if (gk.startsWith('hand')) rb = `hand.${sd}`;
    else if (gk.startsWith('leg')) rb = `thigh.${sd}`;
    else if (gk.startsWith('knee')) rb = `calf.${sd}`;
    else if (gk.startsWith('ankle')) rb = restZ - P(rest[gk]).z > 0.07 ? `toe.${sd}` : `foot.${sd}`;
    else rb = 'root';
    // ancre : articulation de référence de la pièce (la colonne entière suit `spine`, l'orteil suit le pied)
    const anchor = rb.startsWith('spine') || rb === 'chest' ? 'spine' : rb.startsWith('toe') ? `foot.${sd}` : rb;
    const s = rb === 'head' ? headScale : rb.startsWith('upperArm') || rb.startsWith('lowerArm') ? VAR.arm : rb.startsWith('thigh') || rb.startsWith('calf') ? VAR.leg : 1;
    v.sub(ref[anchor]).multiplyScalar(s).add(pos[anchor]);
    positions.set([v.x, v.y, v.z], i * 3);
    normals.set([nn.x, nn.y, nn.z], i * 3);
    skinIndex[i * 4] = boneIndex.get(rb);
    skinWeight[i * 4] = 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('color', src.attributes.color.clone());
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geo.setIndex(src.index.clone());
  const rig = new THREE.Group();
  rig.name = 'MasterAssault';
  rig.add(bones[0]);
  const mesh = new THREE.SkinnedMesh(geo, bakedMaterial);
  mesh.name = 'body_LOD0';
  mesh.castShadow = true;
  rig.add(mesh);
  rig.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.frustumCulled = false;
  if (forExport) prepareExport(c, mesh);
  return { rig, mesh, bones, headScale, positions: Object.fromEntries(Object.entries(pos).map(([k, p]) => [k, r3(p)])) };
}

// Version exportable conforme au contrat : couleur de base par texture (palette, TEXCOORD_0),
// masque d'équipe dans COLOR_0 (R chemise, G revers, B emblèmes), UV d'emblème dans TEXCOORD_1
function prepareExport(c, mesh) {
  const g = mesh.geometry;
  const col = g.attributes.color;
  const n = col.count;
  const T = c.team;
  const lin = (hex) => new THREE.Color(hex);
  const near = (i, cc) => Math.abs(col.getX(i) - cc.r) + Math.abs(col.getY(i) - cc.g) + Math.abs(col.getZ(i) - cc.b) < 1e-4;
  const shirt = lin(T.shirt);
  const cuff = lin(T.cuff);
  const white = lin(0xffffff);
  const headIndex = mesh.skeleton.bones.findIndex((b) => b.name === 'head');
  const keys = new Map();
  const uv = new Float32Array(n * 2);
  const uv1 = new Float32Array(n * 2);
  const mask = new Float32Array(n * 3);
  const c3 = new THREE.Color();
  for (let i = 0; i < n; i++) {
    c3.setRGB(col.getX(i), col.getY(i), col.getZ(i));
    const hex = c3.getHex();
    if (!keys.has(hex)) keys.set(hex, keys.size);
    const emblem = near(i, white) && g.attributes.skinIndex.getX(i) !== headIndex;
    mask.set([near(i, shirt) ? 1 : 0, near(i, cuff) ? 1 : 0, emblem ? 1 : 0], i * 3);
    if (emblem) uv1.set([(g.attributes.position.getX(i) * 7) % 1 + (g.attributes.position.getX(i) < 0 ? 1 : 0), (g.attributes.position.getY(i) * 7) % 1], i * 2);
  }
  const W = keys.size * 4;
  const data = new Uint8Array(W * 4 * 4);
  for (const [hex, k] of keys) {
    const r = (hex >> 16) & 255, gg = (hex >> 8) & 255, b = hex & 255;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) data.set([r, gg, b, 255], ((y * W) + k * 4 + x) * 4);
  }
  for (let i = 0; i < n; i++) {
    c3.setRGB(col.getX(i), col.getY(i), col.getZ(i));
    uv.set([(keys.get(c3.getHex()) * 4 + 2) / W, 0.5], i * 2);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
  g.setAttribute('color', new THREE.BufferAttribute(mask, 3));
  // taille de texture en puissance de deux (contrat) : la palette est étirée sur 64 × 4 pixels minimum
  const pot = Math.max(64, 2 ** Math.ceil(Math.log2(W)));
  const cv = document.createElement('canvas');
  cv.width = pot;
  cv.height = pot;
  const ctx = cv.getContext('2d');
  const img = new ImageData(new Uint8ClampedArray(data.buffer), W, 4);
  const tmp = document.createElement('canvas');
  tmp.width = W;
  tmp.height = 4;
  tmp.getContext('2d').putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, pot, pot);
  const texture = new THREE.CanvasTexture(cv);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  mesh.material = new THREE.MeshStandardMaterial({ name: 'M_body', map: texture, roughness: 0.75, metalness: 0.02 });
  mesh.userData.paletteColors = keys.size;
}

// Export GLB (base64) du squelette synthétique d'un personnage
export async function exportFixture(classId = 'assaut', team = 'blue', variantName = 'proportions') {
  const c = freshCharacter({ team, classId, bake: true, custom: { backpack: false }, renderPath: M1_OPTIMIZED_RENDER_PATH });
  const fx = buildFixture(c, variantName, { forExport: true });
  const scene = new THREE.Scene();
  scene.add(fx.rig);
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
  c.dispose();
  const bytes = new Uint8Array(glb);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { base64: btoa(s), bytes: bytes.length, headScale: fx.headScale, positions: fx.positions, palette: fx.mesh.userData.paletteColors };
}

function b64ToBuffer(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out.buffer;
}

// Chargement d'un GLB du contrat. COLOR_0 y est le masque d'équipe (contrat remis à M3), pas une couleur :
// le GLTFLoader active les couleurs de sommets dès qu'il le voit, on les désactive (sauf pour visualiser le masque).
export function loadGlb(b64, { showMask = false } = {}) {
  return new Promise((resolve, reject) =>
    new GLTFLoader().parse(
      b64ToBuffer(b64),
      '',
      (gltf) => {
        gltf.scene.traverse((o) => {
          if (o.material && !showMask) {
            o.material.vertexColors = false;
            o.material.needsUpdate = true;
          }
        });
        resolve(gltf);
      },
      reject,
    ),
  );
}

// Attache un squelette de production à un personnage du jeu : la peau M1 est masquée, le gameplay est intact
export function attachRig(c, rig, options = {}) {
  if (c.skinnedBody) c.skinnedBody.visible = false;
  c.root.add(rig);
  rig.traverse((o) => {
    if (o.isSkinnedMesh) o.frustumCulled = false;
  });
  c.root.updateMatrixWorld(true);
  return new RigAdapter(c, rig, options);
}

function rigBone(rig, name) {
  let out = null;
  rig.traverse((o) => {
    if (runtimeName(o.name) === runtimeName(name)) out = o;
  });
  return out;
}

// Instantané des matrices du squelette de gameplay (pour prouver que l'adaptateur n'y touche pas)
function gameplaySnapshot(c) {
  const out = [];
  for (const b of [...Object.values(c.bones), c.weaponMount]) out.push(...b.matrixWorld.elements);
  return out;
}

const ALL_POSES = [
  ...EXTENT_POSES,
  ['knife', (c) => simulate(c, 0.2, (a) => { a.action = 'knife'; a.actionT = Math.min(0.5, (a.actionT || 0) + DT / 0.55); })],
  ['stand', (c) => simulate(c, 1, (a) => { a.mode = 'stand'; })],
  ['apose', (c) => simulate(c, 1, (a) => { a.mode = 'apose'; })],
];
const TRANSIENT = new Set(['land', 'throw']);

// Mesures de l'adaptateur sur toutes les poses. source : { variant } (en mémoire) ou { glb } (base64 rechargé)
export async function measureRig(classId = 'assaut', team = 'blue', source = { variant: 'orientation' }, options = {}) {
  const rows = [];
  let gltfScene = null;
  if (source.glb) gltfScene = (await loadGlb(source.glb)).scene;
  const joints = ['hips', 'spine', 'neck', 'head', ...['L', 'R'].flatMap((s) => [`upperArm.${s}`, `lowerArm.${s}`, `hand.${s}`, `thigh.${s}`, `calf.${s}`, `foot.${s}`])];
  let perf = null;
  for (const [pose, prep] of ALL_POSES) {
    const c = freshCharacter({ team, classId, bake: true, custom: { backpack: false }, renderPath: M1_OPTIMIZED_RENDER_PATH });
    const rig = source.glb ? cloneSkinned(gltfScene) : buildFixture(c, source.variant).rig;
    const adapter = attachRig(c, rig, options);
    prep(c);
    c.root.updateMatrixWorld(true);
    const before = gameplaySnapshot(c);
    const hitBefore = c.bones.head.getWorldPosition(V()).y + c.headOffset;
    adapter.update();
    c.root.updateMatrixWorld(true);
    const after = gameplaySnapshot(c);
    const untouched = before.every((x, i) => x === after[i]) && c.bones.head.getWorldPosition(V()).y + c.headOffset === hitBefore;
    const row = { pose, mode: c.anim.mode, untouched };
    // articulations suivies : position production / gameplay (égales si mêmes proportions)
    let jointMax = 0;
    for (const j of joints) {
      const g = c.bones[{ 'upperArm.L': 'shoulderL', 'upperArm.R': 'shoulderR', 'lowerArm.L': 'elbowL', 'lowerArm.R': 'elbowR', 'hand.L': 'handL', 'hand.R': 'handR', 'thigh.L': 'legL', 'thigh.R': 'legR', 'calf.L': 'kneeL', 'calf.R': 'kneeR', 'foot.L': 'ankleL', 'foot.R': 'ankleR' }[j] || j];
      jointMax = Math.max(jointMax, rigBone(rig, j).getWorldPosition(V()).distanceTo(g.getWorldPosition(V())));
    }
    row.jointMaxMm = +(jointMax * 1000).toFixed(2);
    // mains : cible de l'IK (prise de l'arme ou main du gameplay)
    const w = c.weapon;
    if (c.anim.mode === 'combat' && w && w.group.visible) {
      for (const sd of ['L', 'R']) {
        const wt = c.animator.cur[sd === 'L' ? IK_CHANNELS.left : IK_CHANNELS.right];
        const hand = rigBone(rig, `hand.${sd}`).getWorldPosition(V());
        let target;
        if (wt >= 0.999) {
          const o = IK_CHANNELS.leftOffset;
          target = (sd === 'R' ? w.rightWrist.clone() : new THREE.Vector3(w.leftWrist.x + c.animator.cur[o], w.leftWrist.y + c.animator.cur[o + 1], w.leftWrist.z + c.animator.cur[o + 2])).applyMatrix4(w.group.matrixWorld);
        } else target = c.bones['hand' + sd].getWorldPosition(V());
        row[`hand${sd}Mm`] = +(hand.distanceTo(target) * 1000).toFixed(2);
        row[`ik${sd}`] = +wt.toFixed(3);
      }
      const o = IK_CHANNELS.leftOffset;
      const lh = Math.hypot(c.animator.cur[o], c.animator.cur[o + 1], c.animator.cur[o + 2]);
      row.steady = row.ikL >= 0.999 && row.ikR >= 0.999 && lh < 0.001 && !TRANSIENT.has(pose);
      row.muzzle = r3(c.getMuzzleWorld(V()));
    }
    // tête de production / sphère de touche du gameplay ; pieds / sol ; sommets
    const mesh = [];
    rig.traverse((o) => o.isSkinnedMesh && mesh.push(o));
    const m = mesh[0];
    const hi = m.skeleton.bones.findIndex((b) => runtimeName(b.name) === 'head');
    const hit = c.bones.head.getWorldPosition(V());
    hit.y += c.headOffset;
    const box = new THREE.Box3();
    const tmp = V();
    let nan = 0, far = 0, minY = Infinity, inside = 0, headN = 0;
    const centre = new THREE.Vector3(0, 0.9, 0).applyMatrix4(c.root.matrixWorld);
    for (let i = 0; i < m.geometry.attributes.position.count; i++) {
      m.getVertexPosition(i, tmp);
      tmp.applyMatrix4(m.matrixWorld);
      if (!Number.isFinite(tmp.x + tmp.y + tmp.z)) nan++;
      far = Math.max(far, tmp.distanceTo(centre));
      minY = Math.min(minY, tmp.y);
      if (m.geometry.attributes.skinIndex.getX(i) === hi) {
        box.expandByPoint(tmp);
        headN++;
        if (tmp.distanceTo(hit) <= 0.17) inside++;
      }
    }
    row.nan = nan;
    row.farthest = +far.toFixed(3);
    row.minY = +minY.toFixed(4);
    row.headCm = +(box.getCenter(V()).distanceTo(hit) * 100).toFixed(2);
    row.headCoverage = +(inside / headN).toFixed(3);
    if (pose === 'idle') {
      const t0 = performance.now();
      for (let k = 0; k < 200; k++) adapter.update();
      perf = +((performance.now() - t0) / 200).toFixed(4);
      row.proportions = adapter.proportions;
    }
    rows.push(row);
    c.dispose();
  }
  return { rows, adapterMsPerUpdate: perf };
}

// Écart entre les repères de repos du squelette synthétique et ceux du gameplay (preuve qu'ils diffèrent)
export function frameDifference(classId = 'assaut') {
  const c = freshCharacter({ team: 'blue', classId, bake: true, custom: { backpack: false }, renderPath: M1_OPTIMIZED_RENDER_PATH });
  const fx = buildFixture(c, 'orientation');
  fx.rig.updateMatrixWorld(true);
  const q = new THREE.Quaternion();
  const angles = [];
  for (const b of REQUIRED_BONES) {
    rigBone(fx.rig, b.name).getWorldQuaternion(q);
    angles.push((2 * Math.acos(Math.min(1, Math.abs(q.w))) * 180) / Math.PI);
  }
  const armDeg = (sd) => {
    const s = rigBone(fx.rig, `upperArm.${sd}`).getWorldPosition(V());
    const e = rigBone(fx.rig, `lowerArm.${sd}`).getWorldPosition(V());
    return (e.sub(s).angleTo(new THREE.Vector3(0, -1, 0)) * 180) / Math.PI;
  };
  c.dispose();
  return { minDeg: +Math.min(...angles).toFixed(1), meanDeg: +(angles.reduce((a, b) => a + b, 0) / angles.length).toFixed(1), maxDeg: +Math.max(...angles).toFixed(1), aPoseArmDeg: [+armDeg('L').toFixed(1), +armDeg('R').toFixed(1)] };
}

// Planche (mêmes vues que tests/character.mjs) d'un personnage vêtu du squelette synthétique
export async function renderRigLineup(classId = 'assaut', team = 'blue', source = { variant: 'orientation' }, options = {}) {
  const W = 200, H = 360;
  const s = stage(W, H);
  const out = document.createElement('canvas');
  out.width = W * LINEUP.length;
  out.height = H;
  const ctx = out.getContext('2d');
  const gltf = source.glb ? await loadGlb(source.glb, { showMask: !!source.showMask }) : null;
  for (const [i, [, yaw, pose]] of LINEUP.entries()) {
    const c = freshCharacter({ team, classId, bake: true, custom: { backpack: source.backpack ?? true }, renderPath: M1_OPTIMIZED_RENDER_PATH });
    const rig = gltf ? cloneSkinned(gltf.scene) : buildFixture(c, source.variant).rig;
    const adapter = attachRig(c, rig, options);
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
    c.root.updateMatrixWorld(true);
    adapter.update();
    s.scene.add(c.root);
    s.renderer.render(s.scene, s.cam);
    ctx.drawImage(s.renderer.domElement, i * W, 0);
    s.scene.remove(c.root);
    c.dispose();
  }
  s.dispose();
  return out.toDataURL('image/png');
}
