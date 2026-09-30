// Sonde de la carte 1 pour tests/env.mjs : empreinte des ancres de gameplay (drapeaux, bases,
// véhicules, routes, relief), des collisions et de la grille de navigation ; coût du décor ;
// vue de dessus annotée ; essai du chargeur d'assets d'environnement par identifiant sémantique.
// Rien n'est modifié dans le jeu : la carte est construite à part, comme dans Game.
import * as THREE from 'three';
import { Physics } from '../src/game/physics.js';
import { World } from '../src/game/World.js';
import { NavGrid } from '../src/game/nav.js';
import { MAP, terrainHeight } from '../src/game/map.js';
import { createRegistry } from '../src/environment/registry.js';
import { EnvAssetLibrary } from '../src/environment/EnvAssetLibrary.js';

async function sha(text) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
const cm = (v) => Math.round(v * 100) / 100;

let built = null;
function build() {
  if (built) return built;
  const scene = new THREE.Scene();
  const physics = new Physics();
  const t0 = performance.now();
  const world = new World(scene, physics);
  const buildMs = performance.now() - t0;
  const t1 = performance.now();
  const nav = new NavGrid(physics);
  const navMs = performance.now() - t1;
  built = { scene, physics, world, nav, buildMs, navMs };
  return built;
}

// Empreinte de la carte 1 : ce qui ne doit pas changer quand seul l'habillage change.
export async function map1Fingerprint() {
  const { scene, physics, world, nav, buildMs, navMs } = build();
  const anchors = { bounds: MAP.bounds, bases: MAP.bases, points: MAP.points, vehicles: MAP.vehicles, roads: MAP.roads };
  const relief = [];
  for (let x = MAP.bounds.minX; x <= MAP.bounds.maxX; x += 8) for (let z = MAP.bounds.minZ; z <= MAP.bounds.maxZ; z += 8) relief.push(cm(terrainHeight(x, z)));
  const tags = {};
  const boxes = physics.colliders.map((c) => {
    tags[c.tag] = (tags[c.tag] || 0) + 1;
    return [c.min.x, c.min.y, c.min.z, c.max.x, c.max.y, c.max.z].map(cm).join(',') + ':' + c.tag;
  });
  const camera = physics.cameraBoxes.map((c) => [c.min.x, c.min.y, c.min.z, c.max.x, c.max.y, c.max.z].map(cm).join(','));
  const blockedCells = [];
  for (let i = 0; i < nav.blocked.length; i++) if (nav.blocked[i] & 1) blockedCells.push(i);
  // coût du décor (hors soldats, véhicules et drapeaux de la conquête)
  const stat = scene.getObjectByName('world-static');
  let meshes = 0, tris = 0, sceneMeshes = 0;
  const mats = new Set();
  stat.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    mats.add(o.material.uuid);
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  scene.traverse((o) => o.isMesh && sceneMeshes++);
  return {
    anchors: { hash: await sha(JSON.stringify(anchors)), points: MAP.points.map((p) => `${p.id} ${p.name} (${p.x} ; ${p.z}) r=${p.radius}`), bases: Object.entries(MAP.bases).map(([k, b]) => `${k} (${b.x} ; ${b.z})`), vehicles: MAP.vehicles.length, roads: MAP.roads.length },
    relief: { hash: await sha(relief.join(',')), samples: relief.length },
    colliders: { count: boxes.length, tags, hash: await sha(boxes.join('|')) },
    cameraBoxes: { count: camera.length, hash: await sha(camera.join('|')) },
    nav: { cell: nav.cell, size: `${nav.w} x ${nav.h}`, blocked: blockedCells.length, hash: await sha(blockedCells.join(',')) },
    footprints: world.footprints.length,
    decor: { staticMeshes: meshes, staticTriangles: Math.round(tris), staticMaterials: mats.size, sceneMeshes, buildMs: Math.round(buildMs), navMs: Math.round(navMs) },
  };
}

// Vue aérienne réelle de la zone jouable (nord = +z = Légion en haut ; vu du ciel, l'ouest,
// x négatif, où se trouve A, est donc à DROITE, comme sur la mini-carte du jeu), avec les ancres
// de gameplay et les repères dessinés par-dessus.
export function topView(px = 1024) {
  const { scene } = build();
  const B = MAP.bounds, margin = 6;
  const wW = B.maxX - B.minX + margin * 2, wD = B.maxZ - B.minZ + margin * 2;
  const W = px, H = Math.round((px * wD) / wW);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cam = new THREE.OrthographicCamera(-wW / 2, wW / 2, wD / 2, -wD / 2, 1, 600);
  cam.position.set((B.minX + B.maxX) / 2, 300, (B.minZ + B.maxZ) / 2);
  cam.up.set(0, 0, 1);
  cam.lookAt(cam.position.x, 0, cam.position.z);
  cam.updateMatrixWorld();
  const lights = [new THREE.HemisphereLight(0xffffff, 0x8a8a70, 1.6), new THREE.DirectionalLight(0xffffff, 1.6)];
  lights[1].position.set(40, 100, 30);
  scene.add(...lights);
  const calls0 = renderer.info.render.calls;
  renderer.render(scene, cam);
  const calls = renderer.info.render.calls - calls0;
  scene.remove(...lights);
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const g = out.getContext('2d');
  g.drawImage(canvas, 0, 0);
  const toPx = (x, z) => [((B.maxX + margin - x) / wW) * W, ((B.maxZ + margin - z) / wD) * H];
  const s = W / wW;
  // limites jouables
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.setLineDash([8, 6]);
  g.lineWidth = 2;
  const [bx0, by0] = toPx(B.maxX, B.maxZ);
  g.strokeRect(bx0, by0, (B.maxX - B.minX) * s, (B.maxZ - B.minZ) * s);
  g.setLineDash([]);
  // routes
  g.strokeStyle = 'rgba(120,70,20,0.55)';
  g.lineWidth = 3;
  for (const road of MAP.roads) {
    g.beginPath();
    road.forEach(([x, z], i) => (i ? g.lineTo(...toPx(x, z)) : g.moveTo(...toPx(x, z))));
    g.stroke();
  }
  g.font = `bold ${Math.round(W / 40)}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // repères (positions de World.js) : vérifient l'alignement du rendu et des annotations
  g.font = `${Math.round(W / 70)}px sans-serif`;
  g.fillStyle = '#fff';
  for (const [label, x, z] of [['moulin', -75, -3], ['clocher', 10, 30], ['grange', 76, 20], ['fontaine', 0, 2]]) {
    const [px, py] = toPx(x, z);
    g.fillText(label, px, py - 16);
  }
  g.font = `bold ${Math.round(W / 40)}px sans-serif`;
  g.fillText('N ↑', W - 40, 30);
  for (const p of MAP.points) {
    const [x, y] = toPx(p.x, p.z);
    g.strokeStyle = '#ffd23a';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, p.radius * s, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#111';
    g.fillText(p.id, x + 1, y + 1);
    g.fillStyle = '#ffd23a';
    g.fillText(p.id, x, y);
  }
  for (const [team, b] of Object.entries(MAP.bases)) {
    const [x, y] = toPx(b.x, b.z);
    g.fillStyle = team === 'blue' ? '#2f6fe0' : '#d0343a';
    g.fillRect(x - 10, y - 10, 20, 20);
    g.fillStyle = '#fff';
    g.fillText(team === 'blue' ? 'Aigles' : 'Légion', x, y + (team === 'blue' ? -26 : 26));
  }
  for (const v of MAP.vehicles) {
    const [x, y] = toPx(v.x, v.z);
    g.fillStyle = v.team === 'blue' ? '#8fb4ff' : '#ff9a9a';
    g.beginPath();
    g.arc(x, y, 5, 0, Math.PI * 2);
    g.fill();
  }
  renderer.dispose();
  return { png: out.toDataURL('image/png'), webp: out.toDataURL('image/webp', 0.85), calls, width: W, height: H };
}

// Chargeur d'environnement : identifiant sémantique → registre → fichier glTF (ici un kit d'essai
// synthétique servi depuis test-results/). Vérifie cache, partage, emprise, assemblage, libération.
export async function loaderTrial(catalog, packs, baseUrl, { single, assembly, unbound }) {
  const registry = createRegistry(catalog, packs);
  const lib = new EnvAssetLibrary(registry, { baseUrl });
  const out = { validate: registry.validate() };
  await lib.preload([single, assembly]);
  out.loadedFiles = lib.stats().files;
  const size = (o) => {
    const b = new THREE.Box3().setFromObject(o);
    return { size: b.getSize(new THREE.Vector3()).toArray().map(cm), minY: cm(b.min.y) };
  };
  const a = lib.instantiate(single);
  const b = lib.instantiate(single);
  const ga = [], gb = [];
  a.traverse((o) => o.isMesh && ga.push(o.geometry));
  b.traverse((o) => o.isMesh && gb.push(o.geometry));
  out.single = { ...size(a), meshes: ga.length, sharedGeometry: ga.length > 0 && ga.every((g, i) => g === gb[i]), env: { ...a.userData.env }, textured: a.getObjectByProperty('isMesh', true)?.material?.map ? true : false };
  const asm = lib.instantiate(assembly);
  let parts = 0;
  asm.traverse((o) => o.userData.env && o !== asm && parts++);
  out.assembly = { ...size(asm), parts, env: { ...asm.userData.env } };
  // identifiant du catalogue non lié : null (l'appelant garde alors le décor actuel)
  out.unboundResult = lib.instantiate(unbound);
  try {
    lib.instantiate('INCONNU_A');
    out.unknownThrows = false;
  } catch {
    out.unknownThrows = true;
  }
  const before = lib.stats();
  lib.dispose();
  out.stats = { before, after: lib.stats() };
  return out;
}
