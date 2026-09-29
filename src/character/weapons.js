import * as THREE from 'three';
import { part, rbox, cyl, box, SPHERE, mat, shade, markShared } from './parts.js';

// Armes modélisées le long de +Z (canon vers l'avant), poignée à l'origine.
// Chaque arme expose les points de prise en main utilisés par la cinématique
// inverse des bras : poignet droit (poignée), poignet gauche (garde-main),
// chargeur (rechargement) et bouche du canon.

const METAL = 0x2a2c30;
const METAL2 = 0x3c3f45;
const POLY = 0x33363b;
const WOOD = 0x7a5232;
const TAN = 0x8b7a57; // polymère sable : l'arme se détache du gilet sombre

function flashGeometry() {
  const s = new THREE.Shape();
  const n = 8;
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 1 : 0.35;
    const a = (i / (n * 2)) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return new THREE.ShapeGeometry(s);
}
const FLASH_GEO = markShared(flashGeometry());
const FLASH_MAT = new THREE.MeshBasicMaterial({
  color: 0xffd27a,
  transparent: true,
  opacity: 0.95,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const FLASH_CONE_MAT = FLASH_MAT.clone();
FLASH_CONE_MAT.color = new THREE.Color(0xff9a3a);

function addFlash(g, muzzle, size) {
  const flash = new THREE.Group();
  flash.position.copy(muzzle);
  const front = new THREE.Mesh(FLASH_GEO, FLASH_MAT);
  front.scale.setScalar(size * 0.7);
  flash.add(front);
  // Deux plans en croix alignés sur le canon
  const a = new THREE.Mesh(FLASH_GEO, FLASH_CONE_MAT);
  a.rotation.x = Math.PI / 2;
  a.scale.set(size * 0.5, size * 1.5, 1);
  a.position.z = size * 0.9;
  const b = new THREE.Mesh(FLASH_GEO, FLASH_CONE_MAT);
  b.rotation.y = Math.PI / 2;
  b.scale.set(size * 1.5, size * 0.5, 1);
  b.position.z = size * 0.9;
  flash.add(a, b);
  flash.visible = false;
  flash.userData.dynamic = true;
  flash.traverse((o) => (o.castShadow = false));
  g.add(flash);
  return flash;
}

function rifle(g) {
  part(g, rbox(0.066, 0.095, 0.34, 0.014), METAL, { p: [0, 0.02, 0.05], rough: 0.5, metal: 0.3 });
  part(g, rbox(0.032, 0.018, 0.3, 0.004), METAL2, { p: [0, 0.07, 0.05], metal: 0.4, rough: 0.5 });
  // Viseur point rouge
  part(g, cyl(0.027, 0.027, 0.075, 14), METAL, { p: [0, 0.11, 0.02], r: [Math.PI / 2, 0, 0], metal: 0.4, rough: 0.4 });
  part(g, cyl(0.021, 0.021, 0.077, 14), 0x6a1a1a, { p: [0, 0.11, 0.02], r: [Math.PI / 2, 0, 0], rough: 0.2, emissive: 0x220000 });
  part(g, rbox(0.03, 0.02, 0.05, 0.005), METAL, { p: [0, 0.084, 0.02] });
  // Garde-main + canon
  part(g, rbox(0.076, 0.086, 0.23, 0.02), TAN, { p: [0, 0.013, 0.31] });
  for (let i = 0; i < 4; i++) part(g, box(0.078, 0.012, 0.02), shade(TAN, 0.75), { p: [0, 0.0, 0.225 + i * 0.05] });
  part(g, cyl(0.011, 0.011, 0.2, 10), METAL, { p: [0, 0.022, 0.5], r: [Math.PI / 2, 0, 0], metal: 0.5, rough: 0.4 });
  part(g, cyl(0.023, 0.023, 0.065, 10), METAL2, { p: [0, 0.022, 0.61], r: [Math.PI / 2, 0, 0], metal: 0.5, rough: 0.4 });
  part(g, box(0.012, 0.04, 0.012), METAL, { p: [0, 0.06, 0.4] });
  // Crosse
  part(g, cyl(0.014, 0.014, 0.14, 8), METAL, { p: [0, 0.03, -0.09], r: [Math.PI / 2, 0, 0] });
  part(g, rbox(0.058, 0.11, 0.16, 0.022), TAN, { p: [0, -0.002, -0.2] });
  part(g, rbox(0.062, 0.122, 0.028, 0.01), 0x1c1d20, { p: [0, -0.007, -0.285] });
  // Poignée pistolet + pontet
  part(g, rbox(0.042, 0.105, 0.05, 0.012), TAN, { p: [0, -0.065, -0.02], r: [0.35, 0, 0] });
  part(g, box(0.012, 0.012, 0.07), METAL, { p: [0, -0.042, 0.03] });
  // Chargeur courbe (animé au rechargement)
  const mag = part(g, rbox(0.042, 0.15, 0.072, 0.012), METAL2, { p: [0, -0.095, 0.11], r: [-0.28, 0, 0], dynamic: true });
  return {
    mag,
    rightWrist: new THREE.Vector3(0, -0.075, -0.075),
    leftWrist: new THREE.Vector3(0, -0.045, 0.24),
    magWrist: new THREE.Vector3(0.0, -0.15, 0.06),
    muzzle: new THREE.Vector3(0, 0.022, 0.64),
    flashSize: 0.09,
  };
}

function machineGun(g) {
  part(g, rbox(0.088, 0.118, 0.42, 0.018), METAL, { p: [0, 0.02, 0.06], rough: 0.5, metal: 0.3 });
  // Poignée de transport
  part(g, box(0.014, 0.05, 0.014), METAL2, { p: [0, 0.095, -0.02] });
  part(g, box(0.014, 0.05, 0.014), METAL2, { p: [0, 0.095, 0.14] });
  part(g, cyl(0.014, 0.014, 0.18, 8), 0x1c1d20, { p: [0, 0.125, 0.06], r: [Math.PI / 2, 0, 0] });
  // Canon avec manchon ajouré
  part(g, cyl(0.032, 0.032, 0.3, 12), METAL2, { p: [0, 0.02, 0.42], r: [Math.PI / 2, 0, 0], metal: 0.4, rough: 0.5 });
  for (let i = 0; i < 5; i++) part(g, cyl(0.035, 0.035, 0.014, 12), 0x1c1d20, { p: [0, 0.02, 0.3 + i * 0.055], r: [Math.PI / 2, 0, 0] });
  part(g, cyl(0.014, 0.014, 0.18, 10), METAL, { p: [0, 0.02, 0.66], r: [Math.PI / 2, 0, 0], metal: 0.5 });
  part(g, cyl(0.03, 0.022, 0.07, 10), METAL, { p: [0, 0.02, 0.775], r: [Math.PI / 2, 0, 0] });
  // Bipied replié
  for (const sd of [1, -1]) part(g, cyl(0.007, 0.007, 0.26, 6), METAL2, { p: [0.02 * sd, -0.02, 0.55], r: [Math.PI / 2 - 0.08, 0, 0] });
  // Crosse bois
  part(g, rbox(0.055, 0.1, 0.24, 0.02), WOOD, { p: [0, -0.005, -0.24], rough: 0.7 });
  part(g, rbox(0.058, 0.115, 0.02, 0.008), 0x1c1d20, { p: [0, -0.005, -0.365] });
  part(g, rbox(0.036, 0.1, 0.05, 0.01), WOOD, { p: [0, -0.07, -0.03], r: [0.3, 0, 0] });
  part(g, rbox(0.06, 0.06, 0.18, 0.02), WOOD, { p: [0, -0.035, 0.24] }); // garde-main
  // Caisse de munitions + bande
  const mag = part(g, rbox(0.1, 0.12, 0.12, 0.012), 0x55583f, { p: [0.075, -0.06, 0.1], dynamic: true });
  part(g, box(0.02, 0.02, 0.06), 0xc9a13a, { p: [0.03, 0.02, 0.1], metal: 0.6, rough: 0.35 });
  return {
    mag,
    rightWrist: new THREE.Vector3(0, -0.08, -0.09),
    leftWrist: new THREE.Vector3(0, -0.06, 0.2),
    magWrist: new THREE.Vector3(0.08, -0.12, 0.05),
    muzzle: new THREE.Vector3(0, 0.02, 0.81),
    flashSize: 0.13,
  };
}

function sniper(g) {
  part(g, rbox(0.052, 0.07, 0.3, 0.012), METAL, { p: [0, 0.03, 0.05], metal: 0.35, rough: 0.45 });
  // Lunette
  part(g, cyl(0.031, 0.031, 0.26, 16), 0x1c1d20, { p: [0, 0.12, 0.04], r: [Math.PI / 2, 0, 0], metal: 0.4, rough: 0.35 });
  part(g, cyl(0.043, 0.031, 0.065, 16), 0x1c1d20, { p: [0, 0.12, 0.195], r: [Math.PI / 2, 0, 0] });
  part(g, cyl(0.039, 0.031, 0.05, 16), 0x1c1d20, { p: [0, 0.12, -0.11], r: [Math.PI / 2, 0, 0] });
  part(g, cyl(0.037, 0.037, 0.005, 16), 0x6ab0ff, { p: [0, 0.12, 0.229], r: [Math.PI / 2, 0, 0], rough: 0.05, metal: 0.8, shadow: false });
  part(g, cyl(0.012, 0.012, 0.03, 8), 0x1c1d20, { p: [0, 0.15, 0.04] });
  for (const z of [-0.03, 0.12]) part(g, box(0.03, 0.05, 0.018), METAL, { p: [0, 0.075, z] });
  // Long canon
  part(g, cyl(0.013, 0.015, 0.5, 10), METAL, { p: [0, 0.035, 0.45], r: [Math.PI / 2, 0, 0], metal: 0.55, rough: 0.35 });
  part(g, cyl(0.02, 0.02, 0.07, 10), METAL2, { p: [0, 0.035, 0.72], r: [Math.PI / 2, 0, 0] });
  // Culasse
  part(g, cyl(0.008, 0.008, 0.06, 6), METAL2, { p: [-0.045, 0.04, -0.02], r: [0, 0, Math.PI / 2] });
  part(g, SPHERE, METAL2, { p: [-0.075, 0.04, -0.02], s: 0.013 });
  // Fût et crosse bois
  part(g, rbox(0.06, 0.065, 0.36, 0.02), WOOD, { p: [0, -0.01, 0.2], rough: 0.65 });
  part(g, rbox(0.052, 0.12, 0.26, 0.025), WOOD, { p: [0, -0.02, -0.2], rough: 0.65 });
  part(g, rbox(0.055, 0.13, 0.02, 0.008), 0x1c1d20, { p: [0, -0.02, -0.33] });
  part(g, rbox(0.034, 0.09, 0.05, 0.01), WOOD, { p: [0, -0.06, -0.03], r: [0.3, 0, 0] });
  const mag = part(g, rbox(0.03, 0.06, 0.07, 0.008), METAL2, { p: [0, -0.055, 0.1], dynamic: true });
  return {
    mag,
    rightWrist: new THREE.Vector3(0, -0.075, -0.085),
    leftWrist: new THREE.Vector3(0, -0.055, 0.25),
    magWrist: new THREE.Vector3(0, -0.12, 0.05),
    muzzle: new THREE.Vector3(0, 0.035, 0.76),
    flashSize: 0.12,
  };
}

const BUILDERS = { fusil: rifle, mitrailleuse: machineGun, sniper };

export function buildWeapon(id) {
  const group = new THREE.Group();
  group.name = 'weapon-' + id;
  group.userData.bakeOwner = true; // fusionnée à part : elle suit son support animé
  const info = (BUILDERS[id] || rifle)(group);
  group.scale.setScalar(1.12); // armes légèrement surdimensionnées (style cartoon)
  const flash = addFlash(group, info.muzzle, info.flashSize);
  return { id, group, flash, ...info };
}

export function buildKnife() {
  const g = new THREE.Group();
  part(g, rbox(0.024, 0.1, 0.03, 0.008), 0x2a1f18, { p: [0, 0, 0] });
  part(g, box(0.05, 0.012, 0.035), METAL2, { p: [0, 0.055, 0] });
  const blade = new THREE.Shape();
  blade.moveTo(-0.014, 0);
  blade.lineTo(0.014, 0);
  blade.lineTo(0.012, 0.13);
  blade.lineTo(0, 0.17);
  blade.lineTo(-0.014, 0.12);
  blade.closePath();
  const geo = new THREE.ExtrudeGeometry(blade, { depth: 0.004, bevelEnabled: false });
  const m = new THREE.Mesh(geo, mat(0xd8dde3, { metal: 0.8, rough: 0.25 }));
  m.position.set(0, 0.06, -0.002);
  g.add(m);
  return g;
}

// Roquette / obus visibles en vol
export function buildRocket() {
  const g = new THREE.Group();
  part(g, cyl(0.045, 0.045, 0.4, 10), 0x55583f, { r: [Math.PI / 2, 0, 0] });
  part(g, new THREE.ConeGeometry(0.045, 0.14, 10), 0xb33a2b, { p: [0, 0, 0.27], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const fin = part(g, box(0.004, 0.08, 0.1), 0x3c3f45, { p: [0, 0, -0.17] });
    fin.rotation.z = (i * Math.PI) / 2;
    fin.position.set(Math.cos((i * Math.PI) / 2) * 0.04, Math.sin((i * Math.PI) / 2) * 0.04, -0.17);
  }
  return g;
}
