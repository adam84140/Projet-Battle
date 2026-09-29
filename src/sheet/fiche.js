import * as THREE from 'three';
import { Character } from '../character/Character.js';
import { EXPRESSIONS, EXPRESSION_ORDER } from '../character/face.js';
import { ACCESSORY_LIST } from '../character/accessories.js';
import { emblemSVG } from '../character/emblems.js';
import { CLASSES, CLASS_ORDER, TEAMS, GAME, ABILITIES, PALETTE, loadSettings } from '../config.js';
import { World } from '../game/World.js';
import { Physics } from '../game/physics.js';
import { terrainHeight } from '../game/map.js';
import { icon } from '../ui/icons.js';

// Planche de référence du personnage, rendue en direct avec le modèle du jeu.

const settings = loadSettings();
const state = {
  classId: new URLSearchParams(location.search).get('classe') || settings.classId || 'assaut',
  team: new URLSearchParams(location.search).get('equipe') || settings.team || 'blue',
  custom: { ...settings.custom, glasses: false, cap: false, bandana: false, backpack: false },
};
if (!CLASSES[state.classId]) state.classId = 'assaut';
if (!TEAMS[state.team]) state.team = 'blue';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const LOGO = (cls = '') => `<div class="logo ${cls}"><span class="logo-1">FR<span class="logo-star">★</span>NTLINE</span><span class="logo-2">LEGENDS</span></div>`;

// ---------------------------------------------------------------- HTML
const VIEWS = [
  ['Face', 0],
  ['3/4 droit', 0.72],
  ['Profil droit', Math.PI / 2],
  ['Dos', Math.PI],
  ['Profil gauche', -Math.PI / 2],
  ['3/4 gauche', -0.72],
];
const ANIMS = [
  ['Idle', (s) => {}],
  ['Marche', (s, a) => { s.speed = 2.4; a.phaseOverride = Math.PI * 0.5; }],
  ['Course', (s, a) => { s.speed = 6.5; a.phaseOverride = Math.PI * 0.45; }],
  ['Saut', (s) => { s.grounded = false; s.vy = 3; }],
  ['Accroupi', (s) => { s.crouch = true; }],
  ['Visée', (s) => { s.aim = true; }],
  ['Tir', (s, a) => { s.aim = true; a.fire = true; }],
  ['Rechargement', (s) => { s.reload = 0.42; }],
];
const FACE_DETAILS = ['face', 'profile', 'eye', 'smile'];
const EQUIP_DETAILS = ['chest', 'pouch', 'glove', 'knee', 'boot', 'back'];

document.getElementById('sheet').innerHTML = `
  <header class="toolbar">
    <a class="tb-back" href="./index.html">← Retour au jeu</a>
    <div class="tb-group"><span>Classe</span><div class="seg" data-seg="classId">${CLASS_ORDER.map((id) => `<button data-v="${id}">${CLASSES[id].name}</button>`).join('')}</div></div>
    <div class="tb-group"><span>Équipe</span><div class="seg" data-seg="team">${Object.values(TEAMS).map((t) => `<button data-v="${t.id}">${emblemSVG(t.emblem, '#fff', 14)} ${t.name}</button>`).join('')}</div></div>
    <span class="tb-status" aria-live="polite"></span>
  </header>
  <main class="board">
    <section class="hdr">
      <div class="hdr-logo">${LOGO('big')}<p class="hand">${GAME.tagline.split('. ').join('.<br>')}</p></div>
      <div class="hdr-hero"><canvas data-tile="hero" title="Glisser pour faire tourner le héros"></canvas><div class="hdr-quote hand"></div></div>
      <div class="hdr-class"></div>
      <div class="hdr-scene"><canvas data-tile="scene"></canvas><div class="motto hand">${GAME.motto.split('. ').join('.<br>')}</div></div>
    </section>
    <section class="p views"><h3>Vues du personnage <small>Modèle 3D — référence</small></h3>
      <div class="tiles t6">${VIEWS.map(([l], i) => `<figure><canvas data-tile="view" data-i="${i}"></canvas><figcaption>${l}</figcaption></figure>`).join('')}</div></section>
    <section class="p face"><h3>Détails visage</h3>
      <div class="tiles t2x2">${FACE_DETAILS.map((d) => `<figure><canvas data-tile="face" data-d="${d}"></canvas></figure>`).join('')}</div></section>
    <section class="p equip"><h3>Détails équipement</h3>
      <div class="tiles t2x3">${EQUIP_DETAILS.map((d) => `<figure><canvas data-tile="equip" data-d="${d}"></canvas></figure>`).join('')}</div></section>
    <section class="p expr"><h3>Expressions faciales</h3>
      <div class="tiles t6">${EXPRESSION_ORDER.map((e) => `<figure><canvas data-tile="expr" data-e="${e}"></canvas><figcaption>${EXPRESSIONS[e].label}</figcaption></figure>`).join('')}</div></section>
    <section class="p acc"><h3>Accessoires &amp; détails</h3>
      <div class="tiles tacc">${ACCESSORY_LIST.map((a, i) => `<figure class="${i === 0 ? 'big' : ''}"><canvas data-tile="acc" data-i="${i}"></canvas><figcaption>${a.label}</figcaption></figure>`).join('')}</div></section>
    <section class="p pal"><h3>Palette de couleurs</h3><div class="swatches"></div></section>
    <section class="p apose"><h3>Pose neutre (A-pose)</h3>
      <div class="tiles t2"><figure><canvas data-tile="apose" data-i="0"></canvas></figure><figure><canvas data-tile="apose" data-i="1"></canvas></figure></div></section>
    <section class="p anim"><h3>Animations clés <small>(aperçu)</small></h3>
      <div class="tiles t8">${ANIMS.map(([l], i) => `<figure><canvas data-tile="anim" data-i="${i}"></canvas><figcaption>${l}</figcaption></figure>`).join('')}</div></section>
    <section class="p scale"><h3>Échelle</h3><div class="tiles t1"><figure><canvas data-tile="scale"></canvas></figure></div></section>
    <footer class="foot">
      ${LOGO()}
      <span class="hand">Une nouvelle génération de héros.</span>
      <span class="feat">${icon('globe', 20)} Bots 8v8 / 16v16</span>
      <span class="feat">${icon('tank', 20)} Véhicules</span>
      <span class="feat">${icon('flag', 20)} Capture de points</span>
      <span class="feat">${icon('gear', 20)} Personnalisation</span>
      <span class="hand end">Plus qu'un jeu,<br>une aventure à partager.</span>
    </footer>
  </main>`;

// ---------------------------------------------------------------- Rendu
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
} catch (err) {
  document.querySelector('.tb-status').textContent = "WebGL n'est pas disponible : impossible d'afficher les rendus 3D.";
  throw err;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const DPR = Math.min(2, window.devicePixelRatio || 1);

// Studio : fond transparent, éclairage 3 points, ombre douce au sol
const studio = new THREE.Scene();
studio.add(new THREE.HemisphereLight(0xe3eeff, 0x4a4030, 1.5));
const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
key.position.set(2.5, 4, 5);
studio.add(key);
const rim = new THREE.DirectionalLight(0xa9c8ff, 2.0);
rim.position.set(-3, 3, -4);
studio.add(rim);
const fill = new THREE.DirectionalLight(0xffffff, 0.6);
fill.position.set(-4, 1, 3);
studio.add(fill);
const blobTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
blob.rotation.x = -Math.PI / 2;
blob.position.y = 0.002;
studio.add(blob);
const cam = new THREE.PerspectiveCamera(22, 1, 0.02, 100);

function sizeCanvas(canvas) {
  const w = Math.max(16, Math.round(canvas.clientWidth * DPR));
  const h = Math.max(16, Math.round(canvas.clientHeight * DPR));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return [w, h];
}

function draw(canvas, scene, camera, after) {
  const [w, h] = sizeCanvas(canvas);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(renderer.domElement, 0, 0, w, h);
  if (after) after(ctx, w, h);
}

function makeChar(opts = {}) {
  return new Character({ team: state.team, classId: state.classId, custom: { ...state.custom, ...(opts.custom || {}) }, expression: opts.expression || 'determine', weapon: opts.weapon !== false });
}

// Applique une pose de façon déterministe
function pose(ch, fn) {
  const a = ch.anim;
  const extra = {};
  fn(a, extra);
  for (let i = 0; i < 45; i++) ch.update(1 / 60);
  if (extra.phaseOverride !== undefined) ch.animator.phase = extra.phaseOverride;
  ch.animator.update(0, true);
  if (extra.fire && ch.weapon) {
    ch.weapon.flash.visible = true;
    a.recoil = 0.6;
    ch.animator.apply();
  }
  ch.root.updateMatrixWorld(true);
  return ch;
}

function withChar(ch, fn) {
  studio.add(ch.root);
  ch.root.updateMatrixWorld(true);
  blob.visible = true;
  fn();
  studio.remove(ch.root);
}

function lookAt(pos, target, fov) {
  cam.fov = fov;
  cam.position.copy(pos);
  cam.lookAt(target);
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const worldOf = (obj, off = V(0, 0, 0)) => obj.localToWorld(off.clone());

// ---------------------------------------------------------------- Tuiles
function renderViews() {
  const ch = pose(makeChar({ weapon: false }), (s) => (s.mode = 'stand'));
  withChar(ch, () => {
    document.querySelectorAll('[data-tile="view"]').forEach((c) => {
      ch.root.rotation.y = VIEWS[+c.dataset.i][1];
      ch.root.updateMatrixWorld(true);
      lookAt(V(0, 1.0, 6.4), V(0, 0.94, 0), 20);
      draw(c, studio, cam);
    });
  });
}

function renderFace() {
  const tiles = [...document.querySelectorAll('[data-tile="face"]')];
  for (const c of tiles) {
    const d = c.dataset.d;
    const ch = pose(makeChar({ weapon: false, expression: d === 'smile' ? 'confiant' : 'determine' }), (s) => (s.mode = 'stand'));
    ch.root.rotation.y = d === 'profile' ? Math.PI / 2 : d === 'smile' ? -0.55 : d === 'eye' ? -0.25 : 0;
    ch.root.updateMatrixWorld(true);
    withChar(ch, () => {
      const head = worldOf(ch.bones.head, V(0, 0.15, 0));
      if (d === 'eye') {
        const eye = ch.face.eyes[1].getWorldPosition(new THREE.Vector3());
        lookAt(eye.clone().add(V(-0.05, 0.02, 0.55)), eye.clone().add(V(0, 0.012, 0)), 9);
      } else lookAt(head.clone().add(V(0, 0.03, 1.58)), head, 17);
      blob.visible = false;
      draw(c, studio, cam);
    });
  }
}

function renderEquip() {
  const ch = pose(makeChar({ weapon: false, custom: { backpack: true } }), (s) => (s.mode = 'stand'));
  withChar(ch, () => {
    blob.visible = false;
    for (const c of document.querySelectorAll('[data-tile="equip"]')) {
      const d = c.dataset.d;
      let target;
      let from;
      let fov = 14;
      ch.root.rotation.y = 0;
      if (d === 'chest') {
        ch.root.rotation.y = 0.5;
        ch.root.updateMatrixWorld(true);
        target = worldOf(ch.bones.spine, V(-0.08, 0.34, 0.12));
        from = target.clone().add(V(0.15, 0.1, 1.5));
      } else if (d === 'pouch') {
        ch.root.rotation.y = -0.35;
        ch.root.updateMatrixWorld(true);
        target = worldOf(ch.bones.hips, V(0.13, 0.02, 0.12));
        from = target.clone().add(V(0.1, 0.12, 1.2));
        fov = 11;
      } else if (d === 'glove') {
        ch.root.rotation.y = -1.2;
        ch.root.updateMatrixWorld(true);
        target = worldOf(ch.bones.handR, V(0, -0.05, 0));
        from = target.clone().add(V(0.05, 0.08, 0.9));
        fov = 10;
      } else if (d === 'knee') {
        ch.root.rotation.y = 0.35;
        ch.root.updateMatrixWorld(true);
        target = worldOf(ch.bones.kneeR, V(0, -0.02, 0.05));
        from = target.clone().add(V(0, 0.1, 1.3));
        fov = 13;
      } else if (d === 'boot') {
        ch.root.rotation.y = 0.8;
        ch.root.updateMatrixWorld(true);
        target = worldOf(ch.bones.ankleR, V(0, -0.02, 0.04));
        from = target.clone().add(V(0.1, 0.25, 1.2));
        fov = 12;
      } else {
        ch.root.rotation.y = Math.PI + 0.35;
        ch.root.updateMatrixWorld(true);
        target = worldOf(ch.bones.spine, V(0, 0.28, -0.2));
        from = target.clone().add(V(-0.2, 0.15, 1.9));
        fov = 20;
      }
      lookAt(from, target, fov);
      draw(c, studio, cam);
    }
  });
}

function renderExpressions() {
  for (const c of document.querySelectorAll('[data-tile="expr"]')) {
    const ch = pose(makeChar({ weapon: false, expression: c.dataset.e }), (s) => (s.mode = 'stand'));
    withChar(ch, () => {
      blob.visible = false;
      const head = worldOf(ch.bones.head, V(0, 0.08, 0));
      lookAt(head.clone().add(V(0, 0.03, 1.6)), head, 18);
      draw(c, studio, cam);
    });
  }
}

function renderAccessories() {
  for (const c of document.querySelectorAll('[data-tile="acc"]')) {
    const def = ACCESSORY_LIST[+c.dataset.i];
    const obj = def.build(TEAMS[state.team].emblem, state.team);
    obj.rotation.y = def.id === 'glasses' ? -0.4 : -0.5;
    obj.rotation.x = def.id === 'cap' ? 0.15 : 0.1;
    studio.add(obj);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    blob.visible = false;
    lookAt(center.clone().add(V(0, size * 0.3, size * 1.75 + 0.04)), center, 24);
    draw(c, studio, cam);
    studio.remove(obj);
  }
}

function renderAPose() {
  const ch = pose(makeChar({ weapon: false }), (s) => (s.mode = 'apose'));
  withChar(ch, () => {
    for (const c of document.querySelectorAll('[data-tile="apose"]')) {
      ch.root.rotation.y = c.dataset.i === '0' ? 0 : Math.PI;
      ch.root.updateMatrixWorld(true);
      lookAt(V(0, 1.0, 8.4), V(0, 0.94, 0), 21);
      draw(c, studio, cam);
    }
  });
}

function renderAnims() {
  for (const c of document.querySelectorAll('[data-tile="anim"]')) {
    const [, fn] = ANIMS[+c.dataset.i];
    const ch = pose(makeChar({ custom: { backpack: true } }), fn);
    ch.root.rotation.y = -0.75;
    if (ch.anim.grounded === false) ch.root.position.y = 0.22;
    ch.root.updateMatrixWorld(true);
    withChar(ch, () => {
      lookAt(V(0, 1.08, 7.0), V(0, 1.0, 0), 21);
      draw(c, studio, cam);
    });
  }
}

function renderScale() {
  const c = document.querySelector('[data-tile="scale"]');
  const ch = pose(makeChar({ weapon: false }), (s) => (s.mode = 'stand'));
  ch.root.position.x = -0.3;
  ch.root.rotation.y = 0.25;
  // Silhouette de comparaison (1,80 m)
  const sil = pose(new Character({ team: state.team, classId: 'assaut', custom: { backpack: false }, weapon: false }), (s) => (s.mode = 'stand'));
  const grey = new THREE.MeshBasicMaterial({ color: 0x6b7384 });
  sil.root.traverse((o) => {
    if (o.isMesh) o.material = grey;
  });
  sil.root.scale.setScalar(0.96);
  sil.root.position.x = 0.55;
  studio.add(sil.root);
  withChar(ch, () => {
    lookAt(V(0, 0.98, 5.2), V(0, 0.93, 0), 24);
    draw(c, studio, cam, (ctx, w, h) => {
      const top = V(-0.95, 1.85, 0).project(cam);
      const bot = V(-0.95, 0, 0).project(cam);
      const x = (top.x * 0.5 + 0.5) * w;
      const y0 = (-top.y * 0.5 + 0.5) * h;
      const y1 = (-bot.y * 0.5 + 0.5) * h;
      ctx.strokeStyle = 'rgba(230,238,255,0.9)';
      ctx.lineWidth = 2 * DPR;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      for (const yy of [y0, y1]) {
        ctx.moveTo(x - 7 * DPR, yy);
        ctx.lineTo(x + 7 * DPR, yy);
      }
      ctx.stroke();
      ctx.fillStyle = '#e6eeff';
      ctx.font = `${12 * DPR}px "Barlow Condensed", sans-serif`;
      ctx.fillText('1,85 m', x + 6 * DPR, y0 + 14 * DPR);
    });
  });
  studio.remove(sil.root);
}

// ---------------------------------------------------------------- En-tête (dans le village)
let village = null;
function buildVillage() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe3f5, 60, 420);
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x7a6a50, 1.3));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.7);
  sun.position.set(40, 60, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 200 });
  sun.target.position.set(5, 0, 5);
  scene.add(sun, sun.target);
  const world = new World(scene, new Physics());
  const flag = world.makeFlag(TEAMS[state.team].flag, TEAMS[state.team].emblem);
  const fx = 17, fz = 22;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 9, 8), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.6, roughness: 0.3 }));
  pole.position.set(fx, terrainHeight(fx, fz) + 4.5, fz);
  scene.add(pole);
  flag.position.set(fx + 0.1, terrainHeight(fx, fz) + 7.8, fz);
  scene.add(flag);
  world.update(0.016, 1.3);
  village = { scene, world, flag, sun, heroYaw: Math.PI + 0.35, hero: null };
}

function renderHero() {
  const c = document.querySelector('[data-tile="hero"]');
  const v = village;
  if (v.hero) v.scene.remove(v.hero.root);
  const hx = 3, hz = -6;
  const ch = makeChar({ expression: 'confiant', custom: { backpack: true } });
  ch.anim.hold = 'relaxed';
  pose(ch, () => {});
  ch.root.position.set(hx, terrainHeight(hx, hz), hz);
  ch.root.rotation.y = v.heroYaw;
  ch.root.updateMatrixWorld(true);
  v.scene.add(ch.root);
  v.hero = ch;
  heroCamera(ch);
  draw(c, v.scene, cam);
}

function heroCamera(ch) {
  const p = ch.root.position;
  cam.fov = 30;
  cam.position.set(p.x - 0.5, p.y + 1.55, p.z - 3.6);
  cam.lookAt(V(p.x - 0.15, p.y + 1.38, p.z));
}

function renderScene() {
  const c = document.querySelector('[data-tile="scene"]');
  const v = village;
  if (v.hero) v.hero.root.visible = false;
  cam.fov = 42;
  cam.position.set(4, 3.2, 6);
  cam.lookAt(13, 9, 27);
  draw(c, v.scene, cam);
  if (v.hero) v.hero.root.visible = true;
}

// Rotation du héros à la souris
(() => {
  const c = document.querySelector('[data-tile="hero"]');
  let drag = null;
  c.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, yaw: village?.heroYaw ?? 0 };
    c.setPointerCapture(e.pointerId);
  });
  c.addEventListener('pointermove', (e) => {
    if (!drag || !village?.hero) return;
    village.heroYaw = drag.yaw + (e.clientX - drag.x) * 0.012;
    village.hero.root.rotation.y = village.heroYaw;
    village.hero.root.updateMatrixWorld(true);
    heroCamera(village.hero);
    draw(c, village.scene, cam);
  });
  c.addEventListener('pointerup', () => (drag = null));
})();

// ---------------------------------------------------------------- Textes
function renderTexts() {
  const cls = CLASSES[state.classId];
  const team = TEAMS[state.team];
  document.querySelector('.hdr-quote').innerHTML = `“${cls.quote.join('<br>')}”<span class="sig">— ${cls.name}</span>`;
  document.querySelector('.hdr-class').innerHTML = `
    <div class="cc-head">CLASSE : <span style="background:${team.ui}">${cls.name.toUpperCase()}</span></div>
    <div class="cc-tag" style="color:${state.team === 'blue' ? '#7fb0ff' : '#ff9a85'}">${cls.tagline}</div>
    <p>${cls.description}</p>
    <div class="cc-stats">${cls.stats.map((s) => `<div>${icon(s.icon, 30)}<b>${s.label}</b><span>${s.detail}</span></div>`).join('')}</div>
    <div class="cc-ab">${cls.abilities.map((a, i) => `<span>${icon(ABILITIES[a].icon, 18)} ${i + 1}. ${ABILITIES[a].name}</span>`).join('')}</div>`;
  const cols = [
    [team.shirt, 'Chemise'],
    [PALETTE.cuir, 'Cuir'],
    [PALETTE.kaki, 'Kaki'],
    [PALETTE.noir, 'Noir'],
    [team.cuff, 'Manches'],
    [team.pants, 'Pantalon'],
    [team.vest, 'Gilet'],
    [state.custom.skin, 'Peau'],
  ];
  document.querySelector('.swatches').innerHTML =
    cols.map(([c, l]) => `<div class="sw" style="background:${hex(c)}" title="${l} ${hex(c)}"><span>${hex(c).toUpperCase()}</span></div>`).join('') +
    `<div class="sw emb" style="background:${team.ui}">${emblemSVG(team.emblem, '#fff', 44)}</div>`;
  document.querySelectorAll('[data-seg]').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', state[seg.dataset.seg] === b.dataset.v)));
  document.title = `Fiche personnage — ${cls.name}`;
}

// ---------------------------------------------------------------- Orchestration
const status = document.querySelector('.tb-status');
let job = 0;
async function renderAll() {
  const id = ++job;
  renderTexts();
  const steps = [renderViews, renderFace, renderEquip, renderExpressions, renderAccessories, renderAPose, renderAnims, renderScale];
  status.textContent = 'Rendu en cours…';
  const pause = () => new Promise((r) => requestAnimationFrame(() => r()));
  if (!village) {
    await pause();
    buildVillage();
  }
  village.flag.children[0].material.color.setHex(TEAMS[state.team].flag);
  renderHero();
  renderScene();
  for (const s of steps) {
    await pause();
    if (id !== job) return;
    s();
  }
  status.textContent = '';
  window.__done = true;
}

document.querySelector('.toolbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-seg] button');
  if (!b) return;
  const key = b.closest('[data-seg]').dataset.seg;
  if (state[key] === b.dataset.v) return;
  state[key] = b.dataset.v;
  const url = new URL(location.href);
  url.searchParams.set(key === 'classId' ? 'classe' : 'equipe', b.dataset.v);
  history.replaceState(null, '', url);
  if (key === 'team' && village) {
    // l'emblème du drapeau change aussi
    village.scene.remove(village.flag);
    const f = village.world.makeFlag(TEAMS[state.team].flag, TEAMS[state.team].emblem);
    f.position.copy(village.flag.position);
    village.scene.add(f);
    village.flag = f;
    village.world.update(0.016, 1.3);
  }
  renderAll();
});

let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(renderAll, 250);
});

renderAll();
