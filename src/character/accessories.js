import * as THREE from 'three';
import { part, rbox, cyl, box, SPHERE, shade } from './parts.js';
import { emblemGeometry } from './emblems.js';

// Accessoires de la planche "Accessoires & détails".
// Chaque constructeur renvoie un groupe centré, face avant vers +Z.

const OLIVE = 0x6f6a45;
const LEATHER = 0x6b4a2e;
const BUCKLE = 0xb8a070;

export function buildBackpack(emblem = 'eagle', teamColor = null) {
  const g = new THREE.Group();
  part(g, rbox(0.32, 0.36, 0.15, 0.05), OLIVE);
  part(g, rbox(0.33, 0.13, 0.16, 0.035), shade(OLIVE, 0.88), { p: [0, 0.14, 0.006] });
  // bande aux couleurs de l'équipe : lisible de dos
  if (teamColor !== null) part(g, rbox(0.336, 0.036, 0.166, 0.012), teamColor, { p: [0, 0.092, 0.006] });
  part(g, rbox(0.22, 0.15, 0.07, 0.03), shade(OLIVE, 0.94), { p: [0, -0.07, 0.085] });
  part(g, rbox(0.23, 0.05, 0.075, 0.02), shade(OLIVE, 0.85), { p: [0, 0.005, 0.087] });
  for (const sd of [1, -1]) {
    part(g, rbox(0.06, 0.17, 0.11, 0.025), shade(OLIVE, 0.92), { p: [0.18 * sd, -0.06, 0] });
    part(g, box(0.032, 0.3, 0.012), LEATHER, { p: [0.07 * sd, 0.02, 0.128] });
    part(g, box(0.038, 0.03, 0.016), BUCKLE, { p: [0.07 * sd, -0.06, 0.13], metal: 0.6, rough: 0.35 });
  }
  part(g, emblemGeometry(emblem), 0xffffff, { p: [0, -0.07, 0.122], s: 0.05, shadow: false });
  // Sac de couchage roulé sur le dessus
  part(g, cyl(0.055, 0.055, 0.3, 14), 0x4f5a3a, { p: [0, 0.23, -0.01], r: [0, 0, Math.PI / 2] });
  return g;
}

export function buildGrenade() {
  const g = new THREE.Group();
  part(g, SPHERE, 0x55603c, { s: [0.034, 0.042, 0.034] });
  for (let i = 0; i < 3; i++) part(g, cyl(0.0352, 0.0352, 0.004, 16), 0x46502f, { p: [0, -0.02 + i * 0.02, 0] });
  part(g, cyl(0.014, 0.016, 0.03, 10), 0x7c7f84, { p: [0, 0.048, 0], metal: 0.6, rough: 0.4 });
  part(g, box(0.012, 0.06, 0.008), 0x8a8d91, { p: [0.014, 0.03, 0.02], r: [0, 0, -0.25], metal: 0.6, rough: 0.4 });
  part(g, new THREE.TorusGeometry(0.012, 0.0025, 6, 14), 0xb0b3b8, { p: [-0.018, 0.062, 0], r: [0, Math.PI / 2, 0], metal: 0.7, rough: 0.3 });
  return g;
}

export function buildCanteen() {
  const g = new THREE.Group();
  part(g, cyl(0.045, 0.048, 0.16, 18), 0x6f757b, { metal: 0.6, rough: 0.35 });
  part(g, cyl(0.03, 0.045, 0.03, 18), 0x6f757b, { p: [0, 0.093, 0], metal: 0.6, rough: 0.35 });
  part(g, cyl(0.02, 0.02, 0.03, 12), 0x2a2c30, { p: [0, 0.12, 0] });
  part(g, cyl(0.049, 0.049, 0.02, 18), 0x3a3d42, { p: [0, -0.05, 0] });
  part(g, box(0.012, 0.2, 0.01), 0x3a3d42, { p: [0.05, 0.02, 0] });
  return g;
}

export function buildPouches() {
  const g = new THREE.Group();
  for (const sd of [1, -1]) {
    part(g, rbox(0.1, 0.12, 0.06, 0.02), OLIVE, { p: [0.058 * sd, 0, 0] });
    part(g, rbox(0.104, 0.045, 0.066, 0.015), shade(OLIVE, 0.85), { p: [0.058 * sd, 0.045, 0.002] });
    part(g, box(0.02, 0.03, 0.01), LEATHER, { p: [0.058 * sd, 0.03, 0.035] });
  }
  part(g, box(0.24, 0.035, 0.03), LEATHER, { p: [0, -0.02, -0.035] });
  return g;
}

export function buildCap(emblem = 'eagle') {
  const g = new THREE.Group();
  const navy = 0x232c44;
  const dome = new THREE.SphereGeometry(0.136, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  part(g, dome, navy, { s: [1, 0.78, 1.08], rough: 0.9 });
  part(g, cyl(0.137, 0.137, 0.02, 22), shade(navy, 0.85), { p: [0, 0.005, 0], s: [1, 1, 1.08] });
  const brim = part(g, cyl(0.1, 0.1, 0.012, 22, 1), shade(navy, 0.9), { p: [0, 0.008, 0.15], r: [0.15, 0, 0] });
  brim.scale.set(1.05, 1, 0.8);
  part(g, SPHERE, shade(navy, 0.8), { p: [0, 0.106, 0], s: [0.014, 0.008, 0.014] });
  part(g, emblemGeometry(emblem), 0xffffff, { p: [0, 0.052, 0.13], s: 0.034, r: [-0.7, 0, 0], shadow: false });
  return g;
}

export function buildGlasses() {
  const g = new THREE.Group();
  for (const sd of [1, -1]) {
    part(g, SPHERE, 0x141a24, { p: [0.046 * sd, -0.002, 0], s: [0.027, 0.018, 0.006], r: [0, 0.12 * sd, -0.1 * sd], metal: 0.5, rough: 0.12, shadow: false });
    part(g, box(0.004, 0.004, 0.11), 0x30343a, { p: [0.098 * sd, 0.008, -0.05], metal: 0.6, shadow: false });
  }
  part(g, box(0.03, 0.005, 0.005), 0x30343a, { p: [0, 0.012, 0.004], metal: 0.6, shadow: false });
  return g;
}

export function buildBandana(color = 0x3a67c8) {
  const g = new THREE.Group();
  part(g, new THREE.TorusGeometry(0.078, 0.026, 8, 20), color, { r: [Math.PI / 2 + 0.15, 0, 0], rough: 0.9 });
  const flap = part(g, new THREE.ConeGeometry(0.075, 0.11, 3), color, { p: [0, -0.05, 0.075], r: [Math.PI, 0, 0], rough: 0.9 });
  flap.scale.set(1.2, 1, 0.35);
  part(g, SPHERE, shade(color, 0.85), { p: [0, -0.005, -0.09], s: 0.022 });
  return g;
}

export const ACCESSORY_LIST = [
  { id: 'backpack', label: 'Sac à dos', build: (e, team) => buildBackpack(e, team === 'red' ? 0xb2382c : 0x2f5bb7) },
  { id: 'grenades', label: 'Grenades', build: () => {
    const g = new THREE.Group();
    const a = buildGrenade();
    a.position.x = -0.04;
    const b = buildGrenade();
    b.position.set(0.045, 0.01, -0.01);
    g.add(a, b);
    return g;
  } },
  { id: 'canteen', label: 'Gourde', build: () => buildCanteen() },
  { id: 'cap', label: 'Casquette', build: (e) => buildCap(e) },
  { id: 'pouches', label: 'Sacoches', build: () => buildPouches() },
  { id: 'glasses', label: 'Lunettes', build: () => buildGlasses() },
  { id: 'bandana', label: 'Bandana', build: (e, team) => buildBandana(team === 'red' ? 0xc0453a : 0x3a67c8) },
];
