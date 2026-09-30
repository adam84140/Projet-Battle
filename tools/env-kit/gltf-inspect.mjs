// Lecture d'un fichier glTF (.gltf + .bin + images) ou GLB sans dépendance ni navigateur :
// bornes (min / max des positions, transformations des nœuds comprises), triangles, matériaux,
// fichiers référencés (présents ou manquants), extensions exigeant un décodeur.
// Utilisé par ingest.mjs et inventory.mjs (docs/map1/MAP1-ASSET-INVENTORY.md).
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import * as THREE from 'three';

// Extensions qui demandent un décodeur au chargement (à signaler avant tout branchement)
export const DECODER_EXTENSIONS = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'];

function readJson(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32LE(0) === 0x46546c67) {
    // GLB : en-tête 12 octets, puis morceau JSON
    const len = buf.readUInt32LE(12);
    return { json: JSON.parse(buf.subarray(20, 20 + len).toString('utf8')), glb: true, bytes: buf.length };
  }
  return { json: JSON.parse(buf.toString('utf8')), glb: false, bytes: buf.length };
}

// Fichiers référencés par un glTF (tampons et images externes), chemins absolus
export function gltfRefs(file, json = readJson(file).json) {
  const dir = dirname(file);
  const refs = [];
  for (const [kind, list] of [['buffer', json.buffers ?? []], ['image', json.images ?? []]]) {
    for (const item of list) {
      if (!item.uri || item.uri.startsWith('data:')) continue;
      refs.push({ kind, uri: item.uri, abs: join(dir, decodeURIComponent(item.uri)) });
    }
  }
  return refs;
}

function pngSize(file) {
  try {
    const b = readFileSync(file);
    if (b.readUInt32BE(0) !== 0x89504e47) return null;
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } catch {
    return null;
  }
}

function localMatrix(node) {
  const m = new THREE.Matrix4();
  if (node.matrix) return m.fromArray(node.matrix);
  const t = new THREE.Vector3().fromArray(node.translation ?? [0, 0, 0]);
  const q = new THREE.Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]);
  const s = new THREE.Vector3().fromArray(node.scale ?? [1, 1, 1]);
  return m.compose(t, q, s);
}

// Inspection complète d'un fichier (chemins du rapport relatifs à `root`)
export function inspectGltf(file, root = dirname(file)) {
  const { json, glb, bytes } = readJson(file);
  const rel = (p) => relative(root, p).split(sep).join('/');
  const out = {
    file: rel(file), glb, bytes: { file: bytes, refs: 0 }, triangles: 0, meshes: (json.meshes ?? []).length, primitives: 0, nodes: (json.nodes ?? []).length,
    materials: (json.materials ?? []).map((m, i) => m.name ?? `#${i}`), images: [], missing: [], extensions: { used: json.extensionsUsed ?? [], required: json.extensionsRequired ?? [] },
    bounds: null, warnings: [],
  };
  for (const r of gltfRefs(file, json)) {
    if (!existsSync(r.abs)) {
      out.missing.push(r.uri);
      continue;
    }
    out.bytes.refs += statSync(r.abs).size;
    if (r.kind === 'image') out.images.push({ path: rel(r.abs), size: pngSize(r.abs) });
  }
  const decoders = out.extensions.used.filter((e) => DECODER_EXTENSIONS.includes(e));
  if (decoders.length) out.warnings.push(`décodeur nécessaire : ${decoders.join(', ')}`);
  // bornes et triangles, nœuds de la scène par défaut
  const nodes = json.nodes ?? [];
  const acc = json.accessors ?? [];
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  let rootsList = json.scenes?.[json.scene ?? 0]?.nodes;
  if (!rootsList) {
    const children = new Set(nodes.flatMap((n) => n.children ?? []));
    rootsList = nodes.map((_, i) => i).filter((i) => !children.has(i));
  }
  const visit = (i, parent) => {
    const n = nodes[i];
    const world = new THREE.Matrix4().multiplyMatrices(parent, localMatrix(n));
    if (n.mesh !== undefined) {
      for (const p of json.meshes[n.mesh].primitives) {
        out.primitives++;
        const pos = acc[p.attributes.POSITION];
        const count = p.indices !== undefined ? acc[p.indices].count : pos.count;
        const mode = p.mode ?? 4;
        out.triangles += mode === 4 ? count / 3 : mode === 5 || mode === 6 ? Math.max(0, count - 2) : 0;
        if (!pos.min || !pos.max) {
          out.warnings.push('bornes des positions absentes (min / max) : dimensions incomplètes');
          continue;
        }
        for (let k = 0; k < 8; k++) {
          v.set(k & 1 ? pos.max[0] : pos.min[0], k & 2 ? pos.max[1] : pos.min[1], k & 4 ? pos.max[2] : pos.min[2]).applyMatrix4(world);
          box.expandByPoint(v);
        }
      }
    }
    for (const c of n.children ?? []) visit(c, world);
  };
  for (const r of rootsList) visit(r, new THREE.Matrix4());
  out.triangles = Math.round(out.triangles);
  if (!box.isEmpty()) {
    const r3 = (a) => a.map((x) => Math.round(x * 1000) / 1000);
    const size = box.getSize(new THREE.Vector3());
    out.bounds = { min: r3(box.min.toArray()), max: r3(box.max.toArray()), size: r3(size.toArray()) };
  } else out.warnings.push('aucune géométrie');
  if (out.missing.length) out.warnings.push(`fichier(s) référencé(s) manquant(s) : ${out.missing.join(', ')}`);
  return out;
}
