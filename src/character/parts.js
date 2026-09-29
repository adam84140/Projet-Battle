import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Petites briques de modélisation procédurale partagées par les personnages,
// les armes, les véhicules et le décor.

const materials = new Map();

export function mat(color, opts = {}) {
  const rough = opts.rough ?? 0.78;
  const metal = opts.metal ?? 0;
  const emissive = opts.emissive ?? 0;
  const side = opts.side ?? THREE.FrontSide;
  const key = `${color}|${rough}|${metal}|${emissive}|${side}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive, side });
    materials.set(key, m);
  }
  return m;
}

export const SPHERE = new THREE.SphereGeometry(1, 20, 14);
export const SPHERE_MED = new THREE.SphereGeometry(1, 12, 9);
export const SPHERE_LOW = new THREE.SphereGeometry(1, 10, 8);

// Niveau de détail des constructions : 'high' (menu, fiche) ou 'low' (soldats en jeu)
let DETAIL = 'high';
export function setDetail(level) {
  const prev = DETAIL;
  DETAIL = level;
  return prev;
}
export function isLowDetail() {
  return DETAIL === 'low';
}

export function rbox(w, h, d, r) {
  const min = Math.min(w, h, d);
  const radius = Math.min(r ?? min * 0.25, min / 2 - 1e-4);
  return new RoundedBoxGeometry(w, h, d, DETAIL === 'low' ? 1 : 2, Math.max(radius, 1e-4));
}

export function box(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

export function capsule(r, len, radial = 12) {
  return DETAIL === 'low' ? new THREE.CapsuleGeometry(r, len, 2, 8) : new THREE.CapsuleGeometry(r, len, 4, radial);
}

export function cyl(rt, rb, h, seg = 14) {
  return new THREE.CylinderGeometry(rt, rb, h, DETAIL === 'low' ? Math.max(6, Math.round(seg * 0.6)) : seg);
}

// Ajoute un maillage à un parent. o = { p: [x,y,z], r: [x,y,z], s: nombre | [x,y,z], rough, metal, emissive, name }
export function part(parent, geo, color, o = {}) {
  if (DETAIL === 'low' && geo === SPHERE) geo = SPHERE_MED;
  const m = new THREE.Mesh(geo, o.material ?? mat(color, o));
  if (o.p) m.position.set(o.p[0], o.p[1], o.p[2]);
  if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]);
  if (o.s !== undefined) {
    if (typeof o.s === 'number') m.scale.setScalar(o.s);
    else m.scale.set(o.s[0], o.s[1], o.s[2]);
  }
  if (o.name) m.name = o.name;
  m.castShadow = o.shadow !== false;
  m.receiveShadow = !!o.receive;
  if (o.dynamic) m.userData.dynamic = true;
  parent.add(m);
  return m;
}

// Assombrit / éclaircit une couleur hexadécimale
export function shade(hex, f) {
  const c = new THREE.Color(hex);
  if (f < 1) c.multiplyScalar(f);
  else c.lerp(new THREE.Color(0xffffff), f - 1);
  return c.getHex();
}

const bakedMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.02 });

function prepareGeometry(mesh, relMatrix) {
  let g = mesh.geometry.clone();
  g.applyMatrix4(relMatrix);
  if (g.index) g = g.toNonIndexed();
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  const color = mesh.material.color || new THREE.Color(0xffffff);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

// Fusionne tous les maillages statiques rattachés à chaque "os" (userData.bone)
// en un seul maillage à couleurs de sommets : on passe d'une centaine
// d'appels de rendu par personnage à une quinzaine. Un groupe animé qui n'est pas
// un os (l'arme sur son support) porte userData.bakeOwner et reçoit son propre maillage.
export function bakeHierarchy(root, { material = bakedMaterial, shadow = true } = {}) {
  root.updateMatrixWorld(true);
  const owners = [root];
  root.traverse((o) => {
    if (o !== root && (o.userData.bone || o.userData.bakeOwner)) owners.push(o);
  });
  const inv = new THREE.Matrix4();
  const rel = new THREE.Matrix4();
  for (const owner of owners) {
    const meshes = [];
    const visit = (obj) => {
      for (const child of obj.children) {
        if (child.userData.bone || child.userData.bakeOwner || child.userData.dynamic || child.userData.noBake) continue;
        if (child.isMesh && child.visible) meshes.push(child);
        visit(child);
      }
    };
    visit(owner);
    if (meshes.length < 2) continue;
    inv.copy(owner.matrixWorld).invert();
    const geos = meshes.map((m) => prepareGeometry(m, rel.multiplyMatrices(inv, m.matrixWorld)));
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    for (const m of meshes) m.parent.remove(m);
    const bakedMesh = new THREE.Mesh(merged, material);
    bakedMesh.castShadow = shadow;
    bakedMesh.userData.baked = true;
    owner.add(bakedMesh);
  }
  return root;
}

// Fusionne un groupe statique entier (décor) en un maillage par matériau "vertex colors"
export function bakeStatic(group, { shadow = true, receive = true } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const geos = [];
  const keep = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.dynamic || o.material.transparent || o.material.map) {
      keep.push(o);
      return;
    }
    geos.push(prepareGeometry(o, rel.multiplyMatrices(inv, o.matrixWorld)));
  });
  const out = new THREE.Group();
  // Découpage par paquets pour ne pas dépasser les limites d'index
  const CHUNK = 400;
  for (let i = 0; i < geos.length; i += CHUNK) {
    const merged = mergeGeometries(geos.slice(i, i + CHUNK), false);
    const m = new THREE.Mesh(merged, bakedMaterial);
    m.castShadow = shadow;
    m.receiveShadow = receive;
    out.add(m);
  }
  geos.forEach((g) => g.dispose());
  for (const k of keep) {
    const clone = k.clone();
    rel.multiplyMatrices(inv, k.matrixWorld).decompose(clone.position, clone.quaternion, clone.scale);
    out.add(clone);
  }
  return out;
}

export { bakedMaterial };
