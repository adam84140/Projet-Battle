// Validateur du contrat d'asset du Master Assault (docs/characters/ASSET-CONTRACT.md).
// Aucun service externe : lit le fichier GLB / glTF directement (Node). Option --fit : essai réel
// dans le jeu (navigateur local) avec l'adaptateur de squelette.
// Usage : npm run check:glb -- <fichier.glb|.gltf> [--stade prototype|production] [--fit] [--json]
// Code de sortie : 0 accepté, 1 refusé.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_BONES, OPTIONAL_BONES, SOCKETS, ASSET, ANIMATION_CONTRACT, MORPH_TARGETS, FPS, TEAM_MASK, decodeMask, runtimeName, RIG_CONTRACT_VERSION } from '../src/character/rigContract.js';

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const TYPES = { 5120: ['getInt8', 1, 127], 5121: ['getUint8', 1, 255], 5122: ['getInt16', 2, 32767], 5123: ['getUint16', 2, 65535], 5125: ['getUint32', 4, 4294967295], 5126: ['getFloat32', 4, 1] };

// ---------- Lecture du fichier ----------
export function parseAsset(data, baseDir = '.') {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  let json;
  const buffers = [];
  if (buf.readUInt32LE(0) === 0x46546c67) {
    // GLB : en-tête, bloc JSON, bloc binaire
    if (buf.readUInt32LE(4) !== 2) throw new Error(`version GLB ${buf.readUInt32LE(4)} (2 attendue)`);
    let off = 12;
    let bin = null;
    while (off < buf.length) {
      const len = buf.readUInt32LE(off);
      const type = buf.readUInt32LE(off + 4);
      const chunk = buf.subarray(off + 8, off + 8 + len);
      if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
      else if (type === 0x004e4942) bin = chunk;
      off += 8 + len;
    }
    if (!json) throw new Error('bloc JSON absent');
    (json.buffers || []).forEach((b, i) => buffers.push(b.uri ? loadUri(b.uri, baseDir) : i === 0 ? bin : null));
  } else {
    json = JSON.parse(buf.toString('utf8'));
    (json.buffers || []).forEach((b) => buffers.push(loadUri(b.uri, baseDir)));
  }
  return { json, buffers };
}

function loadUri(uri, baseDir) {
  if (!uri) return null;
  if (uri.startsWith('data:')) return Buffer.from(uri.split(',')[1], 'base64');
  return readFileSync(resolve(baseDir, decodeURIComponent(uri)));
}

function viewBytes(asset, viewIndex) {
  const v = asset.json.bufferViews[viewIndex];
  const b = asset.buffers[v.buffer];
  return b.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
}

export function readAccessor(asset, index) {
  const acc = asset.json.accessors[index];
  const n = COMPONENTS[acc.type];
  const out = new Float64Array(acc.count * n);
  if (acc.bufferView === undefined) return out;
  const [getter, size, maxv] = TYPES[acc.componentType];
  const view = asset.json.bufferViews[acc.bufferView];
  const bytes = viewBytes(asset, acc.bufferView);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const stride = view.byteStride || n * size;
  for (let i = 0; i < acc.count; i++) {
    for (let k = 0; k < n; k++) {
      let x = dv[getter]((acc.byteOffset || 0) + i * stride + k * size, true);
      if (acc.normalized && acc.componentType !== 5126) x = Math.max(x / maxv, -1);
      out[i * n + k] = x;
    }
  }
  return out;
}

// ---------- Mathématiques minimales (matrices 4×4 colonne par colonne, comme glTF) ----------
export function trs(node) {
  if (node.matrix) return node.matrix.slice();
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
export function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
const posOf = (m) => [m[12], m[13], m[14]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const angle = (a, b) => (Math.acos(Math.min(1, Math.max(-1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b))))) * 180) / Math.PI;
const cm = (m) => `${(m * 100).toFixed(1)} cm`;
const mm = (v) => v.map((x) => x.toFixed(3)).join(' ; ');

// Dimensions d'une image intégrée (PNG, JPEG, WebP, KTX2)
function imageSize(b) {
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), format: 'PNG' };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o < b.length) {
      if (b[o] !== 0xff) break;
      const m = b[o + 1];
      const l = b.readUInt16BE(o + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(o + 7), h: b.readUInt16BE(o + 5), format: 'JPEG' };
      o += 2 + l;
    }
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const k = b.toString('ascii', 12, 16);
    if (k === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), format: 'WebP' };
    if (k === 'VP8L') {
      const v = b.readUInt32LE(21);
      return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1, format: 'WebP' };
    }
    if (k === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, format: 'WebP' };
  }
  if (b.toString('hex', 0, 12) === 'ab4b5458203230bb0d0a1a0a') return { w: b.readUInt32LE(20), h: b.readUInt32LE(24), format: 'KTX2' };
  return null;
}

// ---------- Validation ----------
export function validateAsset(asset, { stage = 'production', fileBytes = 0 } = {}) {
  const errors = [];
  const warnings = [];
  const info = {};
  const need = (level) => level === 'prototype' || stage === 'production'; // exigence active à ce stade
  const issue = (list, code, message, fix) => list.push({ code, message, fix });
  const err = (code, m, f) => issue(errors, code, m, f);
  const warn = (code, m, f) => issue(warnings, code, m, f);
  const staged = (level, code, m, f) => (need(level) ? err(code, m, f) : warn(code, m, f));
  const { json } = asset;

  if (json.asset?.version !== '2.0') err('VERSION', `glTF ${json.asset?.version} (2.0 attendu).`, 'Exporter avec l’exportateur glTF 2.0 de Blender.');
  info.generator = json.asset?.generator || '?';
  const reqExt = json.extensionsRequired || [];
  for (const e of reqExt) warn('EXTENSION', `Extension requise « ${e} » : le jeu ne la décode pas encore (contrat M2 : pas de compression).`, 'Exporter sans compression Draco / meshopt / KTX2 tant que M5 ne l’a pas validée.');

  // Graphe de scène : matrices monde de repos
  const nodes = json.nodes || [];
  const parent = new Array(nodes.length).fill(-1);
  nodes.forEach((n, i) => (n.children || []).forEach((c) => (parent[c] = i)));
  const world = new Array(nodes.length);
  const worldOf = (i) => world[i] || (world[i] = parent[i] >= 0 ? mul(worldOf(parent[i]), trs(nodes[i])) : trs(nodes[i]));
  const nameOf = (i) => runtimeName(nodes[i]?.name || `noeud_${i}`);

  // Squelette
  const skins = json.skins || [];
  if (!skins.length) {
    err('SQUELETTE', 'Aucun squelette (skin) dans le fichier.', 'Lier le maillage à l’armature (modificateur Armature) et exporter avec « Skinning ».');
    return { errors, warnings, info };
  }
  const skin = skins[0];
  if (skins.length > 1) warn('SQUELETTES_MULTIPLES', `${skins.length} squelettes : un seul est attendu pour tout le personnage.`, 'Une seule armature ; tous les maillages lui sont liés.');
  const joints = skin.joints;
  const byRuntime = new Map();
  const rawNames = joints.map((j) => nodes[j].name || '');
  const dup = [];
  joints.forEach((j) => {
    const rn = nameOf(j);
    if (byRuntime.has(rn)) dup.push(nodes[j].name);
    byRuntime.set(rn, j);
  });
  if (dup.length) err('OS_DOUBLON', `Noms d’os en double après chargement : ${dup.join(', ')}.`, 'Chaque os doit avoir un nom unique (les points et espaces sont ignorés par le jeu : « hand.L » et « handL » sont le même nom).');
  const nodeByRuntime = new Map();
  nodes.forEach((n, i) => nodeByRuntime.set(nameOf(i), i));
  const missing = REQUIRED_BONES.filter((b) => !byRuntime.has(runtimeName(b.name))).map((b) => b.name);
  if (missing.length) err('OS_MANQUANTS', `Os requis absents : ${missing.join(', ')}.`, 'Renommer ou ajouter ces os avec les noms exacts du contrat (section 2 de ASSET-CONTRACT.md).');
  const known = new Set([...REQUIRED_BONES, ...OPTIONAL_BONES, ...SOCKETS].map((b) => runtimeName(b.name)));
  const rigify = rawNames.filter((n) => /^(DEF|MCH|ORG|CTRL|IK|FK)[-_.]/i.test(n));
  if (rigify.length) err('OS_DE_CONTROLE', `Os de contrôle ou préfixés Rigify exportés : ${rigify.slice(0, 8).join(', ')}${rigify.length > 8 ? '…' : ''}.`, 'N’exporter que le squelette de déformation aux noms canoniques (option « Deformation Bones Only » ou armature de jeu dédiée).');
  const unknown = rawNames.filter((n) => !known.has(runtimeName(n)) && !rigify.includes(n));
  if (unknown.length) warn('OS_INCONNUS', `Os hors contrat (ignorés par le jeu) : ${unknown.slice(0, 10).join(', ')}${unknown.length > 10 ? '…' : ''}.`, 'Les supprimer s’ils ne servent pas, ou demander leur ajout au contrat.');
  info.bones = joints.length;
  if (missing.length) return { errors, warnings, info };

  const J = (name) => worldOf(byRuntime.get(runtimeName(name)));
  const P = (name) => posOf(J(name));
  // Hiérarchie
  for (const b of REQUIRED_BONES) {
    if (!b.parent) continue;
    const p = parent[byRuntime.get(runtimeName(b.name))];
    if (p < 0 || nameOf(p) !== runtimeName(b.parent)) err('HIERARCHIE', `« ${b.name} » doit être enfant de « ${b.parent} » (trouvé : ${p < 0 ? 'aucun parent' : nodes[p].name}).`, 'Corriger le parent de l’os dans l’armature (Bone Properties > Relations > Parent).');
  }
  // Liaison = repos
  if (skin.inverseBindMatrices !== undefined) {
    const ibm = readAccessor(asset, skin.inverseBindMatrices);
    let worst = 0;
    joints.forEach((j, k) => {
      const m = mul(worldOf(j), Array.from(ibm.subarray(k * 16, k * 16 + 16)));
      for (let e = 0; e < 16; e++) worst = Math.max(worst, Math.abs(m[e] - (e % 5 === 0 ? 1 : 0)));
    });
    info.bindPoseDeviation = +worst.toFixed(5);
    if (worst > 1e-3) err('LIAISON', `La pose de repos exportée ne correspond pas à la pose de liaison (écart ${worst.toFixed(4)}).`, 'Exporter en pose de repos (« Use Rest Position ») et appliquer les transformations de l’armature et du maillage (Ctrl+A > All Transforms) avant l’export.');
  }
  // Orientation et pose
  const root = P('root');
  if (len(root) > 0.01) err('RACINE', `L’os « root » doit être à l’origine (trouvé ${mm(root)}).`, 'Placer l’origine de l’armature et l’os root au sol, entre les pieds.');
  const up = P('head')[1] > P('hips')[1] && P('hips')[1] > P('foot.L')[1];
  if (!up) err('AXE_HAUT', 'La tête n’est pas au-dessus du bassin, ou le bassin au-dessus des pieds : axe vertical incorrect.', 'Exporter avec « +Y Up » et appliquer la rotation de l’armature.');
  const facing = P('toe.L')[2] > P('foot.L')[2] + 0.03 && P('toe.R')[2] > P('foot.R')[2] + 0.03;
  if (!facing) err('ORIENTATION', 'Les pieds ne pointent pas vers +Z : le personnage ne regarde pas vers l’avant du jeu.', 'Dans Blender, le personnage regarde −Y (vue de face, touche 1) ; appliquer la rotation avant l’export.');
  const side = P('upperArm.L')[0] > 0 && P('upperArm.R')[0] < 0;
  if (!side) err('COTES', 'Gauche et droite inversées : upperArm.L doit être du côté +X (la gauche du personnage).', 'Renommer .L / .R selon la gauche du personnage, pas celle de la caméra.');
  for (const sd of ['L', 'R']) {
    const upper = sub(P(`lowerArm.${sd}`), P(`upperArm.${sd}`));
    const lower = sub(P(`hand.${sd}`), P(`lowerArm.${sd}`));
    const a = angle(upper, [0, -1, 0]);
    const bend = angle(upper, lower);
    info[`aPoseArm${sd}`] = +a.toFixed(1);
    const [lo, hi] = ASSET.aPoseArmFromVerticalDeg;
    if (a < lo || a > hi) err('POSE_A', `Bras ${sd} à ${a.toFixed(0)}° de la verticale (attendu ${lo} à ${hi}° : A-pose).`, 'Modéliser et lier en A-pose : bras tendus vers le bas et l’extérieur (≈ 45°), ni T-pose ni bras le long du corps.');
    if (bend > ASSET.maxElbowBendDeg) err('COUDE', `Coude ${sd} plié de ${bend.toFixed(0)}° au repos (${ASSET.maxElbowBendDeg}° au plus).`, 'Tendre les bras dans la pose de repos.');
  }
  // Proportions compatibles avec le squelette de gameplay (armes, IK, hitboxes)
  for (const b of REQUIRED_BONES) {
    const p = P(b.name);
    if (b.target) {
      const off = [0, 1, 2].map((k) => Math.abs(p[k] - b.target[k]) - b.tol[k]);
      if (off.some((d) => d > 0)) err('PROPORTIONS', `« ${b.name} » à ${mm(p)} m ; attendu ${mm(b.target)} ± ${mm(b.tol)} m.`, 'Déplacer l’articulation vers la position cible : elle garantit que les mains atteignent l’arme et que la tête reste dans sa zone de touche.');
    }
    if (b.length) {
      const l = len(sub(p, P(b.parent)));
      if (Math.abs(l - b.length[0]) > b.length[1]) err('LONGUEUR', `Segment « ${b.parent} » → « ${b.name} » de ${cm(l)} (attendu ${cm(b.length[0])} ± ${cm(b.length[1])}).`, 'Ajuster la longueur du membre : au-delà, les mains ne tiennent plus l’arme ou les pieds quittent le sol.');
    }
  }
  for (const [l, r] of [['upperArm.L', 'upperArm.R'], ['hand.L', 'hand.R'], ['thigh.L', 'thigh.R'], ['foot.L', 'foot.R']]) {
    const a = P(l);
    const b = P(r);
    if (Math.abs(a[0] + b[0]) > 0.01 || Math.abs(a[1] - b[1]) > 0.01 || Math.abs(a[2] - b[2]) > 0.01) warn('SYMETRIE', `« ${l} » et « ${r} » ne sont pas symétriques (${mm(a)} / ${mm(b)}).`, 'Symétriser l’armature (Armature > Symmetrize).');
  }
  info.joints = Object.fromEntries(['hips', 'upperArm.L', 'neck', 'head', 'foot.L'].map((n) => [n, P(n).map((x) => +x.toFixed(3))]));
  // Points d'attache
  for (const s of SOCKETS) {
    const i = nodeByRuntime.get(runtimeName(s.name));
    if (i === undefined) {
      if (s.required) staged('prototype', 'POINT_ATTACHE', `Point d’attache absent : « ${s.name} » (${s.use}).`, `Ajouter « ${s.name} » enfant de « ${s.parent} » : objet vide (Empty) parenté à l’os, ou os non déformant (Deform décoché).`);
      continue;
    }
    if (parent[i] < 0 || nameOf(parent[i]) !== runtimeName(s.parent)) err('POINT_ATTACHE_PARENT', `« ${s.name} » doit être enfant de « ${s.parent} » (trouvé : ${parent[i] < 0 ? 'aucun' : nodes[parent[i]].name}).`, 'Corriger le parent du point d’attache.');
  }

  // Maillages
  const meshNodes = nodes.map((n, i) => [n, i]).filter(([n]) => n.mesh !== undefined);
  const named = (n) => runtimeName(n.name || json.meshes[n.mesh].name || '');
  const lodNames = ASSET.lods.map((l) => l.name);
  const socketJoints = new Set(SOCKETS.map((s) => byRuntime.get(runtimeName(s.name))).filter((x) => x !== undefined).map((j) => joints.indexOf(j)));
  const usedMaterials = new Set();
  info.lods = {};
  for (const [n] of meshNodes) {
    const name = named(n);
    const isBody = lodNames.includes(name);
    if (!isBody && !ASSET.accessoryPattern.test(name)) err('MAILLAGE_NOM', `Maillage « ${n.name} » : nom hors contrat.`, 'Nommer les objets body_LOD0, body_LOD1, body_LOD2 et acc_<nom>_LOD<n> (ex. acc_backpack_LOD0).');
    if (isBody && n.skin === undefined) err('MAILLAGE_SANS_PEAU', `« ${n.name} » n’est pas lié au squelette.`, 'Ajouter le modificateur Armature et exporter le skinning.');
    let tris = 0;
    for (const prim of json.meshes[n.mesh].primitives) {
      if ((prim.mode ?? 4) !== 4) err('PRIMITIVE', `« ${n.name} » contient des primitives qui ne sont pas des triangles.`, 'Trianguler à l’export (Mesh > Triangulate ou option de l’exportateur).');
      if (prim.material !== undefined) usedMaterials.add(prim.material);
      const count = prim.indices !== undefined ? json.accessors[prim.indices].count : json.accessors[prim.attributes.POSITION].count;
      tris += count / 3;
      const at = prim.attributes;
      if (at.JOINTS_1 !== undefined || at.WEIGHTS_1 !== undefined) err('INFLUENCES', `« ${n.name} » : plus de ${ASSET.maxInfluences} os influencent certains sommets.`, 'Limiter à 4 influences par sommet (Weights > Limit Total, 4) et exporter sans « Include All Bone Influences ».');
      if (n.skin !== undefined && at.WEIGHTS_0 !== undefined && at.JOINTS_0 !== undefined) {
        const w = readAccessor(asset, at.WEIGHTS_0);
        const j = readAccessor(asset, at.JOINTS_0);
        let badSum = 0, badIdx = 0, onSocket = 0, empty = 0;
        for (let v = 0; v < w.length / 4; v++) {
          let s = 0;
          for (let k = 0; k < 4; k++) {
            const wk = w[v * 4 + k];
            s += wk;
            if (wk > 0 && (j[v * 4 + k] >= joints.length || !Number.isInteger(j[v * 4 + k]))) badIdx++;
            if (wk > 0.001 && socketJoints.has(j[v * 4 + k])) onSocket++;
          }
          if (s < 1e-6) empty++;
          else if (Math.abs(s - 1) > 0.01) badSum++;
        }
        if (empty) err('POIDS_VIDES', `« ${n.name} » : ${empty} sommets ne sont liés à aucun os.`, 'Peindre les poids manquants (Weight Paint) : chaque sommet doit suivre au moins un os.');
        if (badSum) err('POIDS_NORMALISES', `« ${n.name} » : ${badSum} sommets ont des poids dont la somme ≠ 1.`, 'Normaliser les poids (Weights > Normalize All, verrouillage désactivé).');
        if (badIdx) err('POIDS_INDEX', `« ${n.name} » : ${badIdx} influences pointent hors du squelette.`, 'Réexporter : l’armature et le maillage ne correspondent plus.');
        if (onSocket) err('POIDS_POINT_ATTACHE', `« ${n.name} » : ${onSocket} influences sur des points d’attache (socket_*).`, 'Les os socket_* ne doivent pas déformer : décocher « Deform » et retirer leurs groupes de sommets.');
      } else if (isBody) err('PEAU_ATTRIBUTS', `« ${n.name} » : attributs JOINTS_0 / WEIGHTS_0 absents.`, 'Exporter avec le skinning activé.');
    }
    tris = Math.round(tris);
    if (isBody) {
      info.lods[name] = tris;
      const lod = ASSET.lods.find((l) => l.name === name);
      if (tris < lod.minTris || tris > lod.maxTris) err('BUDGET_TRIANGLES', `« ${name} » : ${tris} triangles (attendu ${lod.minTris} à ${lod.maxTris}).`, 'Ajuster la densité du maillage de ce niveau de détail.');
    }
  }
  for (const l of ASSET.lods) if (!(l.name in info.lods)) staged(l.required, 'LOD_MANQUANT', `Niveau de détail absent : « ${l.name} ».`, `Fournir ${l.name} (${l.minTris} à ${l.maxTris} triangles), lié au même squelette.`);

  // Dimensions (pose de liaison, maillage principal)
  const lod0 = meshNodes.find(([n]) => named(n) === 'body_LOD0');
  if (lod0) {
    const posAcc = json.accessors[json.meshes[lod0[0].mesh].primitives[0].attributes.POSITION];
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const prim of json.meshes[lod0[0].mesh].primitives) {
      const a = json.accessors[prim.attributes.POSITION];
      const mn = a.min || [0, 0, 0], mx = a.max || [0, 0, 0];
      min = min.map((v, k) => Math.min(v, mn[k]));
      max = max.map((v, k) => Math.max(v, mx[k]));
    }
    if (!posAcc.min) warn('BORNES', 'POSITION sans min / max : dimensions non vérifiées.', 'Réexporter avec l’exportateur glTF de Blender.');
    const h = max[1] - min[1];
    info.heightM = +h.toFixed(3);
    info.bounds = { min: min.map((x) => +x.toFixed(3)), max: max.map((x) => +x.toFixed(3)) };
    if (h > 10) err('UNITES', `Hauteur ${h.toFixed(1)} : le fichier est en centimètres ou mal mis à l’échelle.`, 'Échelle d’unité 1,0 (mètres) dans la scène Blender, appliquer l’échelle (Ctrl+A > Scale).');
    else if (Math.abs(h - ASSET.heightM) > ASSET.heightTolM) err('TAILLE', `Hauteur ${cm(h)} (attendu ${cm(ASSET.heightM)} ± ${cm(ASSET.heightTolM)}, sommet des cheveux).`, 'Mettre le personnage à 1,85 m, pieds au sol.');
    if (Math.abs(min[1]) > ASSET.originTolM) err('ORIGINE', `Les pieds sont à y = ${min[1].toFixed(3)} m (0 attendu).`, 'Poser les semelles sur le sol (z = 0 dans Blender).');
    if (Math.abs((min[0] + max[0]) / 2) > 0.05 || Math.abs((min[2] + max[2]) / 2) > 0.12) warn('CENTRAGE', `Personnage décentré (x ${((min[0] + max[0]) / 2).toFixed(2)}, z ${((min[2] + max[2]) / 2).toFixed(2)}).`, 'Centrer le personnage sur l’origine.');
    // Masque d'équipe (contrat M3 : 8 couleurs pures, TEAM_MASK de rigContract.js)
    const palette = TEAM_MASK.codes.map((c) => `${c.paint} = ${c.zone}`).join(', ');
    for (const prim of json.meshes[lod0[0].mesh].primitives) {
      const at = prim.attributes;
      if (at.COLOR_0 === undefined) {
        staged('production', 'MASQUE_EQUIPE', 'body_LOD0 : masque d’équipe absent (attribut de couleur COLOR_0).', `Peindre l’attribut de couleur « teamMask » avec les 8 couleurs pures du contrat (${palette}) et l’exporter (Vertex Color : Active).`);
        continue;
      }
      const cA = json.accessors[at.COLOR_0];
      const c = readAccessor(asset, at.COLOR_0);
      const n = COMPONENTS[cA.type];
      const zones = Object.fromEntries(TEAM_MASK.codes.map((z) => [z.zone, 0]));
      let out = 0, fuzzy = 0, alpha = 0;
      for (let v = 0; v < cA.count; v++) {
        const x = c[v * n], y = c[v * n + 1], z = c[v * n + 2];
        zones[decodeMask(x, y, z).zone]++;
        if ([x, y, z].some((q) => q < -1e-3 || q > 1 + 1e-3)) out++;
        else if ([x, y, z].some((q) => q > 0.1 && q < 0.9)) fuzzy++;
        if (n === 4 && c[v * n + 3] < 0.9) alpha++;
      }
      info.teamMask = { ...zones, vertices: cA.count };
      const emblem = zones.embleme + zones.embleme_principale + zones.embleme_secondaire;
      if (out) err('MASQUE_VALEURS', `COLOR_0 : ${out} sommets hors de [0, 1].`, 'Réexporter le masque en couleurs normales (0 à 1).');
      if (fuzzy) warn('MASQUE_NUANCES', `Masque d’équipe : ${fuzzy} sommets ont des valeurs intermédiaires (ni 0 ni 1) ; le jeu les arrondit.`, `Peindre seulement avec les 8 couleurs pures (${palette}), pinceau sans dégradé, de préférence par coin de face (Face Corner).`);
      if (alpha) warn('MASQUE_ALPHA', `Masque d’équipe : canal A différent de 1 sur ${alpha} sommets (canal réservé).`, 'Laisser l’alpha de l’attribut teamMask à 1.');
      if (!zones.principale && !zones.embleme_principale) staged('production', 'MASQUE_PRINCIPAL', 'Masque d’équipe : aucune zone de couleur principale (rouge pur).', 'Peindre la chemise et les manches en rouge pur dans l’attribut teamMask.');
      if (!emblem) staged('production', 'MASQUE_EMBLEME', 'Masque d’équipe : aucune zone d’emblème (bleu, magenta ou cyan pur).', 'Peindre les emplacements d’emblème (poitrine, deux manches, dos) : cyan sur la teinte sombre d’équipe, magenta sur la chemise, bleu sur une zone neutre.');
      if (!zones.peau) staged('production', 'MASQUE_PEAU', 'Masque d’équipe : aucune zone de peau (jaune pur) : le teint choisi par le joueur ne s’appliquerait pas.', 'Peindre la peau (visage, cou, bras, mains visibles) en jaune pur.');
      if (!zones.cheveux) staged('production', 'MASQUE_CHEVEUX', 'Masque d’équipe : aucune zone de cheveux (blanc pur) : la couleur de cheveux choisie ne s’appliquerait pas.', 'Peindre les cheveux et les sourcils en blanc pur.');
      if (emblem && at.TEXCOORD_1 === undefined) err('UV_EMBLEME', 'Zones d’emblème sans UV dédiées (TEXCOORD_1).', 'Créer une 2ᵉ carte UV « emblem » : chaque zone d’emblème couvre le carré [0, 1], à l’endroit.');
      if (at.TEXCOORD_0 === undefined) staged('production', 'UV', 'body_LOD0 sans UV (TEXCOORD_0).', 'Déplier le maillage sur l’atlas de couleur.');
    }
    // Expressions
    const names = json.meshes[lod0[0].mesh].extras?.targetNames || [];
    info.morphTargets = names.length;
    const missingMorphs = MORPH_TARGETS.filter((m) => !names.includes(m));
    if (missingMorphs.length) staged('production', 'EXPRESSIONS', `Expressions (shape keys) absentes sur body_LOD0 : ${missingMorphs.join(', ')}.`, 'Créer ces shape keys aux noms exacts ; elles sont exportées comme morph targets.');
  } else err('LOD_MANQUANT', 'Maillage principal « body_LOD0 » absent.', 'Nommer l’objet du corps body_LOD0.');

  // Matériaux et textures
  info.materials = usedMaterials.size;
  if (usedMaterials.size > ASSET.maxMaterialsHard) err('MATERIAUX', `${usedMaterials.size} matériaux utilisés (${ASSET.maxMaterials} attendu, ${ASSET.maxMaterialsHard} au plus).`, 'Regrouper les textures dans un atlas unique et un seul matériau « M_body ».');
  else if (usedMaterials.size > ASSET.maxMaterials) warn('MATERIAUX', `${usedMaterials.size} matériaux (1 attendu).`, 'Regrouper corps et accessoires dans M_body si possible.');
  for (const mi of usedMaterials) {
    const m = json.materials[mi];
    if ((m.alphaMode || 'OPAQUE') !== 'OPAQUE') warn('TRANSPARENCE', `Matériau « ${m.name} » en ${m.alphaMode} (OPAQUE attendu).`, 'Pas de transparence sur le corps (Blend Mode : Opaque).');
    if (m.doubleSided) warn('DOUBLE_FACE', `Matériau « ${m.name} » double face.`, 'Cocher « Backface Culling » dans les réglages du matériau : faces simples, normales vers l’extérieur.');
    if (!m.pbrMetallicRoughness?.baseColorTexture) staged('production', 'TEXTURE_COULEUR', `Matériau « ${m.name} » sans texture de couleur de base.`, 'Brancher l’atlas de couleur (sRGB) sur Base Color.');
  }
  info.textures = [];
  (json.images || []).forEach((img, i) => {
    let bytes = null;
    if (img.bufferView !== undefined) bytes = viewBytes(asset, img.bufferView);
    else if (img.uri) bytes = loadUri(img.uri, '.');
    const s = bytes && imageSize(bytes);
    if (!s) {
      warn('TEXTURE_FORMAT', `Image ${img.name || i} : format non reconnu.`, 'PNG ou JPEG.');
      return;
    }
    info.textures.push(`${img.name || i} ${s.w}×${s.h} ${s.format}`);
    if (!ASSET.textureSizes.includes(s.w) || !ASSET.textureSizes.includes(s.h)) err('TEXTURE_TAILLE', `Image ${img.name || i} : ${s.w}×${s.h} (puissance de deux de 256 à ${ASSET.maxTextureSize} attendue).`, 'Redimensionner l’atlas (1024 × 1024 recommandé).');
  });

  // Animations
  const clips = (json.animations || []).map((a) => a.name || '');
  info.clips = clips;
  for (const spec of ANIMATION_CONTRACT.filter((a) => a.clip)) {
    const a = (json.animations || []).find((x) => x.name === spec.clip);
    if (!a) {
      if (spec.required) staged('production', 'CLIP_MANQUANT', `Clip absent : « ${spec.clip} » (${spec.mask}${spec.events ? ', ' + spec.events : ''}).`, `Créer l’action « ${spec.clip} » (${spec.seconds ? `${spec.seconds} s, ${Math.round(spec.seconds * FPS)} images à ${FPS} i/s` : 'pose d’une image'}).`);
      continue;
    }
    let dur = 0;
    for (const s of a.samplers) dur = Math.max(dur, json.accessors[s.input].max?.[0] ?? 0);
    if (Math.abs(dur - spec.seconds) > 1.01 / FPS) err('CLIP_DUREE', `Clip « ${spec.clip} » : ${dur.toFixed(2)} s (attendu ${spec.seconds} s).`, `Ajuster la plage d’images de l’action à ${Math.round(spec.seconds * FPS)} images à ${FPS} i/s.`);
  }
  const contractClips = new Set(ANIMATION_CONTRACT.filter((a) => a.clip).map((a) => a.clip));
  for (const c of clips) if (!contractClips.has(c)) warn('CLIP_INCONNU', `Clip hors contrat : « ${c} » (ignoré).`, 'Le supprimer ou demander son ajout au contrat.');
  const rootJoint = byRuntime.get('root');
  for (const a of json.animations || []) {
    for (const ch of a.channels) {
      if (ch.target.node === rootJoint && ch.target.path === 'translation') err('MOUVEMENT_RACINE', `Clip « ${a.name} » : la racine se déplace.`, 'Pas de déplacement de la racine : le jeu déplace le personnage lui-même (animer le bassin, pas root).');
      if (ch.target.path === 'scale') warn('CLIP_ECHELLE', `Clip « ${a.name} » : piste d’échelle sur « ${nodes[ch.target.node]?.name} ».`, 'Pas d’échelle animée sur les os.');
    }
  }

  if (fileBytes) {
    info.fileMB = +(fileBytes / 1048576).toFixed(2);
    if (fileBytes > 1.5 * 1048576) warn('TAILLE_FICHIER', `Fichier de ${info.fileMB} Mo (objectif < 1,5 Mo, LOD compris).`, 'Réduire textures et densité ; compression éventuelle à valider en M5.');
  }
  info.contract = RIG_CONTRACT_VERSION;
  info.stage = stage;
  return { errors, warnings, info };
}

export function formatReport(file, report) {
  const lines = [`Contrat Master Assault ${RIG_CONTRACT_VERSION} — stade ${report.info.stage}`, `Fichier : ${file}${report.info.fileMB ? ` (${report.info.fileMB} Mo)` : ''}`];
  for (const e of report.errors) lines.push(`  ✘ [${e.code}] ${e.message}\n      → ${e.fix}`);
  for (const w of report.warnings) lines.push(`  ⚠ [${w.code}] ${w.message}\n      → ${w.fix}`);
  const i = report.info;
  lines.push(`  Mesures : hauteur ${i.heightM ?? '?'} m ; os ${i.bones ?? '?'} ; A-pose ${i.aPoseArmL ?? '?'}° / ${i.aPoseArmR ?? '?'}° ; LOD ${JSON.stringify(i.lods || {})} ; matériaux ${i.materials ?? '?'} ; textures ${(i.textures || []).join(', ') || 'aucune'} ; clips ${(i.clips || []).length} ; expressions ${i.morphTargets ?? 0}`);
  if (i.teamMask) lines.push(`  Masque d’équipe (sommets par zone) : ${Object.entries(i.teamMask).map(([k, v]) => `${k} ${v}`).join(' ; ')}`);
  if (i.fit) lines.push(`  Essai en jeu : ${i.fit.summary}`);
  lines.push(`Résultat : ${report.errors.length ? 'REFUSÉ' : 'ACCEPTÉ'} (${report.errors.length} erreur(s), ${report.warnings.length} avertissement(s))`);
  return lines.join('\n');
}

// Essai réel : le squelette livré suit le squelette de gameplay (adaptateur) dans toutes les poses
export async function fitTest(bytes, name = 'asset') {
  const { startServer, launch } = await import('./lib.mjs');
  const { server, url } = await startServer();
  const { browser, page, errors } = await launch();
  try {
    await page.goto(url + '/tests/rig.html');
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const b64 = Buffer.from(bytes).toString('base64');
    const res = await page.evaluate(async (b64) => {
      const m = await window.__rig.measureRig('assaut', 'blue', { glb: b64 });
      return m;
    }, b64);
    // captures : bleu, rouge (même fichier, matériau d'équipe de M3) et zones du masque
    const dir = fileURLToPath(new URL('../test-results/check-glb/', import.meta.url));
    mkdirSync(dir, { recursive: true });
    for (const [suffix, team, showMask] of [['essai', 'blue', false], ['essai-rouge', 'red', false], ['essai-masque', 'blue', true]]) {
      const img = await page.evaluate(([b64, team, showMask]) => window.__rig.renderRigLineup('assaut', team, { glb: b64, backpack: false, showMask }), [b64, team, showMask]);
      writeFileSync(`${dir}${name}-${suffix}.png`, Buffer.from(img.split(',')[1], 'base64'));
    }
    const steady = res.rows.filter((r) => r.steady);
    const handMm = Math.max(...steady.map((r) => Math.max(r.handLMm, r.handRMm)));
    const nan = res.rows.reduce((a, r) => a + r.nan, 0);
    const untouched = res.rows.every((r) => r.untouched);
    const upright = res.rows.filter((r) => ['idle', 'aim', 'walk', 'jump', 'pivot'].includes(r.pose));
    const headCm = Math.max(...upright.map((r) => r.headCm));
    return { handMm, nan, untouched, headCm, poses: res.rows.length, adapterMs: res.adapterMsPerUpdate, errors, image: `${dir}${name}-essai.png (+ -essai-rouge, -essai-masque)` };
  } finally {
    await browser.close();
    await server.close();
  }
}

// ---------- Ligne de commande ----------
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--') && !['prototype', 'production'].includes(a));
  const stage = args.includes('--stade') ? args[args.indexOf('--stade') + 1] : 'production';
  if (!file) {
    console.log('Usage : npm run check:glb -- <fichier.glb|.gltf> [--stade prototype|production] [--fit] [--json]');
    process.exit(2);
  }
  let report;
  try {
    const bytes = readFileSync(file);
    const asset = parseAsset(bytes, dirname(resolve(file)));
    report = validateAsset(asset, { stage, fileBytes: bytes.length });
    if (args.includes('--fit') && !report.errors.some((e) => ['OS_MANQUANTS', 'HIERARCHIE', 'SQUELETTE'].includes(e.code))) {
      const fit = await fitTest(bytes, basename(file).replace(/\.[^.]+$/, ''));
      const summary = `${fit.poses} poses ; mains sur l’arme ≤ ${fit.handMm.toFixed(1)} mm (poses stables) ; tête / zone de touche ≤ ${fit.headCm.toFixed(1)} cm (debout) ; gameplay intact : ${fit.untouched ? 'oui' : 'NON'} ; capture ${fit.image}`;
      report.info.fit = { ...fit, summary };
      if (fit.nan) report.errors.push({ code: 'ESSAI_DEFORMATION', message: `${fit.nan} sommets invalides pendant l’essai.`, fix: 'Vérifier poids et hiérarchie.' });
      if (fit.handMm > 10) report.errors.push({ code: 'ESSAI_MAINS', message: `Mains à ${fit.handMm.toFixed(1)} mm de l’arme (10 mm au plus).`, fix: 'Rapprocher épaules et longueur des bras des cibles du contrat.' });
      if (!fit.untouched) report.errors.push({ code: 'ESSAI_GAMEPLAY', message: 'Le squelette de gameplay a été modifié pendant l’essai.', fix: 'Signaler (bogue de l’adaptateur).' });
      if (fit.headCm > 6) report.warnings.push({ code: 'ESSAI_TETE', message: `Tête à ${fit.headCm.toFixed(1)} cm du centre de sa zone de touche (debout).`, fix: 'Rapprocher l’os head de sa cible (1,56 m).' });
    }
  } catch (e) {
    report = { errors: [{ code: 'FICHIER', message: `Lecture impossible : ${e.message}`, fix: 'Exporter en glTF Binaire (.glb) depuis Blender.' }], warnings: [], info: { stage } };
  }
  console.log(args.includes('--json') ? JSON.stringify(report, null, 1) : formatReport(file, report));
  process.exit(report.errors.length ? 1 : 0);
}
