// Sonde de l'étape M3 : matériau d'équipe des personnages de production (src/character/teamMaterial.js).
// Chargée par tests/material.html. Toutes les données sont synthétiques et générées ici (rien de versionné).
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { TEAMS, SKIN_TONES, HAIR_COLORS } from '/src/config.js';
import { TEAM_MASK, decodeMask } from '/src/character/rigContract.js';
import { emblemPolygons } from '/src/character/emblems.js';
import { applyTeamLook, createTeamMaterial, prepareMaskGeometry, teamLook, teamUniforms, sourceMaterial, TeamMaterialCache, MASK_ATTRIBUTE, EMBLEM_UV_ATTRIBUTE } from '/src/character/teamMaterial.js';
import { renderRigLineup, attachRig } from '/tests/rig-probe.js';

const code = (zone) => TEAM_MASK.codes.find((c) => c.zone === zone).rgb;
const GREY = TEAM_MASK.referenceGrey;

// ---------- Banc de rendu : caméra orthographique, lumière fixe, pas de rendu des tons ----------
function bench(w, h) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(0.3, 0.6, 1);
  scene.add(sun);
  const cam = new THREE.OrthographicCamera(0, w, h, 0, -10, 10);
  const gl = renderer.getContext();
  const px = (x, y) => {
    const out = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return [out[0], out[1], out[2]];
  };
  return { renderer, scene, cam, px, render: () => renderer.render(scene, cam), dispose: () => renderer.dispose() };
}

// Atlas uni (texture de couleur de base de l'asset) : 4 × 4 texels à la valeur donnée, sRGB
function flatAtlas(v) {
  const data = new Uint8Array(4 * 4 * 4);
  for (let i = 0; i < 16; i++) data.set([v, v, v, 255], i * 4);
  const t = new THREE.DataTexture(data, 4, 4);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const sourceMat = (atlas) => new THREE.MeshStandardMaterial({ name: 'M_body', map: atlas, roughness: 1, metalness: 0 });

// Carré de size px au point (x, y) avec un code de masque et des UV d'emblème constants
function swatchGeometry(size, rgb, emblemUv = [0, 0], { mask = true } = {}) {
  const g = new THREE.PlaneGeometry(size, size);
  if (mask) {
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    const u = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      c.set(rgb, i * 3);
      u.set(emblemUv, i * 2);
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); // comme COLOR_0 après GLTFLoader
    g.setAttribute('uv1', new THREE.BufferAttribute(u, 2)); // comme TEXCOORD_1
  }
  return g;
}

// ---------- 1. Couleurs exactes de chaque zone ----------
// Rangée du haut : matériau d'équipe sur l'atlas gris ; rangée du bas : matériau standard de la couleur
// attendue (même lumière, même rugosité). Les deux doivent être identiques au niveau près.
export function swatches(team = 'blue', custom = {}) {
  const look = teamLook(team, custom);
  const lin = (hex) => new THREE.Color(hex);
  const white = look.emblemColor;
  const S = 24;
  const cases = [
    ['neutre', code('neutre'), [0, 0], GREY, lin(0xcccccc)],
    ['principale', code('principale'), [0, 0], GREY, lin(look.primary)],
    ['secondaire', code('secondaire'), [0, 0], GREY, lin(look.secondary)],
    ['peau', code('peau'), [0, 0], GREY, lin(look.skin)],
    ['cheveux', code('cheveux'), [0, 0], GREY, lin(look.hair)],
    ['emblème (dedans)', code('embleme'), [0.5, 0.5], GREY, lin(white)],
    ['emblème (dehors)', code('embleme'), [0.02, 0.02], GREY, lin(0xcccccc)],
    ['emblème / principale (dedans)', code('embleme_principale'), [0.5, 0.5], GREY, lin(white)],
    ['emblème / principale (dehors)', code('embleme_principale'), [0.02, 0.02], GREY, lin(look.primary)],
    ['emblème / secondaire (dedans)', code('embleme_secondaire'), [0.5, 0.5], GREY, lin(white)],
    ['emblème / secondaire (dehors)', code('embleme_secondaire'), [0.02, 0.02], GREY, lin(look.secondary)],
    // gris plus sombre que la référence : la teinte est assombrie dans le même rapport (plis, usure)
    ['principale, gris sombre (102)', code('principale'), [0, 0], 102, (() => {
      const k = new THREE.Color().setRGB(102 / 255, 0, 0, THREE.SRGBColorSpace).r / new THREE.Color().setRGB(GREY / 255, 0, 0, THREE.SRGBColorSpace).r;
      return lin(look.primary).multiplyScalar(k);
    })()],
  ];
  const b = bench(cases.length * S, 2 * S);
  const atlases = new Map();
  const cache = new TeamMaterialCache();
  cases.forEach(([, rgb, uv, grey, want], i) => {
    if (!atlases.has(grey)) atlases.set(grey, sourceMat(flatAtlas(grey)));
    const top = new THREE.Mesh(swatchGeometry(S, rgb, uv), atlases.get(grey));
    applyTeamLook(top, look, cache);
    top.position.set(i * S + S / 2, 1.5 * S, 0);
    const ref = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ color: want, roughness: 1, metalness: 0 }));
    ref.position.set(i * S + S / 2, 0.5 * S, 0);
    b.scene.add(top, ref);
  });
  b.render();
  const rows = cases.map(([name, rgb], i) => {
    const got = b.px(i * S + S / 2, Math.round(1.5 * S));
    const want = b.px(i * S + S / 2, Math.round(0.5 * S));
    return { name, zone: decodeMask(...rgb).zone, got, want, diff: Math.max(...got.map((v, k) => Math.abs(v - want[k]))) };
  });
  const programs = b.renderer.info.programs.length;
  b.dispose();
  cache.dispose();
  return { team, rows, programs };
}

// ---------- 2. Le masque n'est jamais affiché comme couleur ----------
// Un GLB dont COLOR_0 vaut (0, 0, 0) (zone neutre) : chargé tel quel, GLTFLoader active les couleurs de
// sommets et le rend noir ; préparé par le matériau d'équipe, il montre la couleur de l'atlas.
export async function colorLeak() {
  const src = new THREE.Mesh(swatchGeometry(1, code('neutre'), [0, 0]), sourceMat(flatAtlas(GREY)));
  src.geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(src.geometry.attributes.position.count * 2).fill(0.5), 2));
  src.name = 'body_LOD0';
  const glb = await new GLTFExporter().parseAsync(src, { binary: true });
  const gltf = await new GLTFLoader().parseAsync(glb, '');
  let mesh = null;
  gltf.scene.traverse((o) => o.isMesh && (mesh = o));
  const raw = { vertexColors: mesh.material.vertexColors, hasColor: !!mesh.geometry.getAttribute('color') };
  const S = 24;
  const b = bench(3 * S, S);
  const put = (m, i) => {
    m.position.set(i * S + S / 2, S / 2, 0);
    m.scale.setScalar(S);
    b.scene.add(m);
  };
  const rawMesh = new THREE.Mesh(mesh.geometry.clone(), mesh.material.clone());
  put(rawMesh, 0);
  const team = mesh.clone();
  applyTeamLook(team, teamLook('red'), new TeamMaterialCache());
  put(team, 1);
  put(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 1, metalness: 0 })), 2);
  b.render();
  const out = {
    raw,
    rawPixel: b.px(S / 2, S / 2),
    teamPixel: b.px(S + S / 2, S / 2),
    atlasPixel: b.px(2 * S + S / 2, S / 2),
    prepared: { vertexColors: team.material.vertexColors, hasColor: !!team.geometry.getAttribute('color'), hasMask: !!team.geometry.getAttribute(MASK_ATTRIBUTE), hasEmblemUv: !!team.geometry.getAttribute(EMBLEM_UV_ATTRIBUTE) },
  };
  b.dispose();
  return out;
}

// ---------- 3. Asset sans masque (stade prototype, LOD simplifié) : zone neutre explicite ----------
export function missingMask() {
  const S = 24;
  const b = bench(2 * S, S);
  const m = new THREE.Mesh(swatchGeometry(S, null, null, { mask: false }), sourceMat(flatAtlas(GREY)));
  applyTeamLook(m, teamLook('blue'), new TeamMaterialCache());
  m.position.set(S / 2, S / 2, 0);
  const ref = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 1, metalness: 0 }));
  ref.position.set(S + S / 2, S / 2, 0);
  b.scene.add(m, ref);
  b.render();
  const a = m.geometry.getAttribute(MASK_ATTRIBUTE);
  const out = { got: b.px(S / 2, S / 2), want: b.px(S + S / 2, S / 2), mask: [a.getX(0), a.getY(0), a.getZ(0), a.getW(0)], emblemUv: !!m.geometry.getAttribute(EMBLEM_UV_ATTRIBUTE) };
  b.dispose();
  return out;
}

// ---------- 4. Emblèmes : même zone, aigle pour les Aigles, étoile pour la Légion, à l'endroit ----------
function raster(type, size, flip = false) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  for (const poly of emblemPolygons(type)) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => {
      const px = ((x + 1) / 2) * size;
      const py = (((flip ? y : -y) + 1) / 2) * size;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  }
  const d = ctx.getImageData(0, 0, size, size).data;
  const out = new Uint8Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] > 127 ? 1 : 0;
  return out;
}
const iou = (a, b) => {
  let inter = 0, uni = 0;
  for (let i = 0; i < a.length; i++) {
    inter += a[i] & b[i];
    uni += a[i] | b[i];
  }
  return uni ? inter / uni : 0;
};
export function emblemShapes() {
  const S = 128;
  const res = {};
  for (const team of ['blue', 'red']) {
    const b = bench(S, S);
    // zone d'emblème carrée sur la teinte sombre d'équipe, UV (0,0) en haut à gauche comme dans le contrat
    const g = new THREE.PlaneGeometry(S, S);
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    const u = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      c.set(code('embleme_secondaire'), i * 3);
      const x = g.attributes.position.getX(i) / (S / 2);
      const y = g.attributes.position.getY(i) / (S / 2);
      u.set([(x + 1) / 2, (1 - y) / 2], i * 2);
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.setAttribute('uv1', new THREE.BufferAttribute(u, 2));
    const m = new THREE.Mesh(g, sourceMat(flatAtlas(GREY)));
    applyTeamLook(m, teamLook(team), new TeamMaterialCache());
    m.position.set(S / 2, S / 2, 0);
    b.scene.add(m);
    b.render();
    const gl = b.renderer.getContext();
    const buf = new Uint8Array(S * S * 4);
    gl.readPixels(0, 0, S, S, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const shot = new Uint8Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = ((S - 1 - y) * S + x) * 4; // readPixels part du bas
      shot[y * S + x] = buf[i] > 128 && buf[i + 1] > 128 && buf[i + 2] > 128 ? 1 : 0;
    }
    b.dispose();
    const own = TEAMS[team].emblem;
    const other = own === 'eagle' ? 'star' : 'eagle';
    res[team] = { emblem: own, iou: +iou(shot, raster(own, S)).toFixed(3), iouFlipped: +iou(shot, raster(own, S, true)).toFixed(3), iouOther: +iou(shot, raster(other, S)).toFixed(3) };
  }
  return res;
}

// ---------- 5. Partage : un asset, un matériau par aspect, un programme de shader ----------
export async function sharing(b64) {
  const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer, '');
  const template = gltf.scene;
  let srcMesh = null;
  template.traverse((o) => o.isSkinnedMesh && (srcMesh = o));
  const srcMaterial = srcMesh.material;
  const b = bench(64, 64);
  b.cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  b.cam.position.set(0, 1.2, 9);
  const cache = new TeamMaterialCache();
  const soldiers = [];
  const spawn = (team, custom) => {
    const s = cloneSkinned(template);
    applyTeamLook(s, teamLook(team, custom), cache);
    s.position.x = soldiers.length * 0.4 - 3;
    b.scene.add(s);
    soldiers.push({ team, s });
  };
  const render = () => b.renderer.render(b.scene, b.cam);
  // 4 bleus et 4 rouges à la personnalisation par défaut
  for (let i = 0; i < 8; i++) spawn(i < 4 ? 'blue' : 'red', {});
  render();
  const programsBase = b.renderer.info.programs.length;
  const materialsBase = cache.size;
  // 8 de plus avec teints et cheveux variés (comme les bots)
  for (let i = 0; i < 8; i++) spawn(i % 2 ? 'blue' : 'red', { skin: SKIN_TONES[i % SKIN_TONES.length], hair: HAIR_COLORS[(i * 5) % HAIR_COLORS.length] });
  render();
  const meshes = soldiers.map(({ s }) => {
    let m = null;
    s.traverse((o) => o.isSkinnedMesh && (m = o));
    return m;
  });
  const looks = new Set(meshes.map((m) => JSON.stringify(m.material.userData.teamLook)));
  const out = {
    soldiers: soldiers.length,
    materialsDefault: materialsBase,
    materials: cache.size,
    distinctLooks: looks.size,
    programsBase,
    programsAfter: b.renderer.info.programs.length,
    sharedGeometry: meshes.every((m) => m.geometry === srcMesh.geometry),
    sharedAtlas: meshes.every((m) => m.material.map === srcMaterial.map),
    sourceKept: meshes.every((m) => sourceMaterial(m.material) === srcMaterial),
    emblemTextures: new Set(meshes.map((m) => teamUniforms(m.material).uEmblemMap.value.uuid)).size,
    teamColorsOk: meshes.every((m, i) => teamUniforms(m.material).uTeamPrimary.value.getHex() === new THREE.Color(TEAMS[soldiers[i].team].shirt).getHex()),
    vertexColorsOff: meshes.every((m) => m.material.vertexColors === false && !m.geometry.getAttribute('color')),
    textures: b.renderer.info.memory.textures,
  };
  b.dispose();
  cache.dispose();
  return out;
}

// ---------- 6. Niveaux de détail et accessoires : un seul matériau partagé ----------
export function lods() {
  const S = 24;
  const b = bench(5 * S, S);
  const source = sourceMat(flatAtlas(GREY));
  const root = new THREE.Group();
  const lod0 = new THREE.Mesh(swatchGeometry(S, code('principale')), source);
  lod0.name = 'body_LOD0';
  const lod1 = new THREE.Mesh(lod0.geometry.clone(), source);
  lod1.name = 'body_LOD1';
  const lod2 = new THREE.Mesh(new THREE.PlaneGeometry(S, S), source); // LOD le plus simple : sans masque ni UV d'emblème
  lod2.name = 'body_LOD2';
  const acc = new THREE.Mesh(swatchGeometry(S, code('secondaire')), source);
  acc.name = 'acc_cap_LOD0';
  root.add(lod0, lod1, lod2, acc);
  const look = teamLook('red');
  const cache = new TeamMaterialCache();
  applyTeamLook(root, look, cache);
  [lod0, lod1, lod2, acc].forEach((m, i) => m.position.set(i * S + S / 2, S / 2, 0));
  const refPrimary = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ color: look.primary, roughness: 1, metalness: 0 }));
  refPrimary.position.set(4 * S + S / 2, S / 2, 0);
  b.scene.add(root, refPrimary);
  b.render();
  const out = {
    materials: cache.size,
    sameMaterial: [lod1, lod2, acc].every((m) => m.material === lod0.material),
    lod2Prepared: !!lod2.geometry.getAttribute(MASK_ATTRIBUTE) && !!lod2.geometry.getAttribute(EMBLEM_UV_ATTRIBUTE),
    lod0: b.px(S / 2, S / 2),
    lod1: b.px(S + S / 2, S / 2),
    lod2: b.px(2 * S + S / 2, S / 2),
    acc: b.px(3 * S + S / 2, S / 2),
    primaryRef: b.px(4 * S + S / 2, S / 2),
  };
  b.dispose();
  cache.dispose();
  return out;
}

// ---------- 7. Variante transparente (camouflage du Commando) ----------
export function ghost() {
  const S = 24;
  const b = bench(3 * S, S);
  const source = sourceMat(flatAtlas(GREY));
  const look = teamLook('blue');
  const opaque = new THREE.Mesh(swatchGeometry(S, code('principale')), source);
  applyTeamLook(opaque, look, new TeamMaterialCache());
  const g = createTeamMaterial(opaque.material, look, { ghost: true });
  g.opacity = 0.4;
  const ghostMesh = new THREE.Mesh(opaque.geometry, g);
  opaque.position.set(S / 2, S / 2, 0);
  ghostMesh.position.set(S + S / 2, S / 2, 0);
  b.scene.add(opaque, ghostMesh);
  // camouflage actuel du jeu (Character.setOpacity) : clone du matériau du maillage, rendu transparent
  const cl = opaque.material.clone();
  cl.transparent = true;
  cl.depthWrite = false;
  cl.opacity = 0.4;
  const clMesh = new THREE.Mesh(opaque.geometry, cl);
  clMesh.position.set(2 * S + S / 2, S / 2, 0);
  b.scene.add(clMesh);
  b.render();
  const out = {
    opaque: b.px(S / 2, S / 2),
    ghost: b.px(S + S / 2, S / 2),
    clone: b.px(2 * S + S / 2, S / 2),
    transparent: g.transparent && !g.depthWrite,
    sameSource: sourceMaterial(g) === source && sourceMaterial(cl) === source,
    uniforms: !!teamUniforms(g) && !!teamUniforms(cl),
  };
  b.dispose();
  return out;
}

// ---------- 8. Sur le personnage : ce qui change entre deux aspects reste dans les bonnes zones ----------
async function pixelsOf(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}
// Zone lue sur la planche du masque (couleurs pures, sans éclairage) ; null hors du personnage ou sur un bord
function zoneAt(M, i) {
  const v = [M.data[i * 4], M.data[i * 4 + 1], M.data[i * 4 + 2]];
  if (!v.every((x) => x <= 8 || x >= 247)) return null;
  return decodeMask(...v.map((x) => x / 255)).zone;
}
export async function zoneChanges(b64) {
  const base = { skin: SKIN_TONES[1], hair: HAIR_COLORS[1] };
  const other = { skin: SKIN_TONES[4], hair: HAIR_COLORS[3] };
  const render = (team, custom, showMask = false) => renderRigLineup('assaut', team, { glb: b64, backpack: false, custom, showMask });
  const urls = { blue: await render('blue', base), red: await render('red', base), custom: await render('blue', other), mask: await render('blue', base, true) };
  const [A, R, P, M] = await Promise.all([urls.blue, urls.red, urls.custom, urls.mask].map(pixelsOf));
  const W = A.width, H = A.height;
  const check = (X, allowed) => {
    let changed = 0, outside = 0;
    const view = new ImageData(W, H); // pixels changés hors des zones permises, en rouge
    for (let i = 0; i < W * H; i++) view.data.set([A.data[i * 4] >> 2, A.data[i * 4 + 1] >> 2, A.data[i * 4 + 2] >> 2, 255], i * 4);
    // tolérance de 2 pixels autour des bords (anticrénelage : un pixel de bord mélange deux zones)
    const near = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) near.push(dy * W + dx);
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = y * W + x;
      let d = 0;
      for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(A.data[i * 4 + k] - X.data[i * 4 + k]));
      if (d <= 12) continue;
      changed++;
      const ok = near.some((o) => allowed.includes(zoneAt(M, i + o)));
      if (!ok) {
        outside++;
        view.data.set([255, 0, 0, 255], i * 4);
      }
    }
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    cv.getContext('2d').putImageData(view, 0, 0);
    return { changed, changedPct: +((100 * changed) / (W * H)).toFixed(2), outside, outsidePct: +((100 * outside) / Math.max(1, changed)).toFixed(3), image: cv.toDataURL('image/png') };
  };
  const team = check(R, ['principale', 'secondaire', 'embleme', 'embleme_principale', 'embleme_secondaire']);
  const custom = check(P, ['peau', 'cheveux']);
  const images = { ...urls, 'hors-zone-equipe': team.image, 'hors-zone-perso': custom.image };
  delete team.image;
  delete custom.image;
  return { team, custom, images };
}

// ---------- 9. En partie : chaque soldat habillé d'un clone de l'asset, à l'aspect de son équipe ----------
// (préfigure l'intégration M5 ; seulement pour le test : le jeu livré n'est pas modifié)
export async function dressGame(g, b64, frames = 600) {
  const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  const template = (await new GLTFLoader().parseAsync(bytes.buffer, '')).scene;
  const cache = new TeamMaterialCache();
  const dressed = new Map();
  let exceptions = 0, wrongTeam = 0, renders = 0, camouflaged = 0;
  const programs = [];
  for (let f = 0; f < frames; f++) {
    // camouflage du Commando forcé sur un soldat habillé : le code actuel du jeu clone son matériau
    if (f === 300) {
      const s = [g.player, ...g.soldiers].find((x) => x && x.alive && dressed.has(x.char)); // le joueur ne tire pas ici
      if (s) s.effects.camouflage = 4;
    }
    g.update(1 / 30);
    g.input.endFrame();
    for (const s of g.soldiers) {
      if (!s.char.skinnedBody) continue;
      let d = dressed.get(s.char);
      if (!d) {
        const rig = cloneSkinned(template);
        applyTeamLook(rig, teamLook(s.team, s.custom), cache);
        d = { rig, adapter: attachRig(s.char, rig) };
        rig.traverse((o) => o.isSkinnedMesh && (d.mesh = o));
        dressed.set(s.char, d);
      }
      try {
        s.char.root.updateMatrixWorld(true);
        d.adapter.update();
      } catch (e) {
        exceptions++;
      }
      const u = teamUniforms(d.mesh.material); // matériau partagé, ou clone transparent du camouflage
      if (d.mesh.material.transparent) camouflaged++;
      if (!u || u.uTeamPrimary.value.getHex() !== new THREE.Color(TEAMS[s.team].shirt).getHex()) wrongTeam++;
    }
    if (f % 60 === 59) {
      g.render();
      renders++;
      programs.push(g.renderer.info.programs.length);
    }
  }
  g.render();
  const looks = new Set([...dressed.values()].map((d) => JSON.stringify(d.mesh.material.userData.teamLook)));
  return { soldiers: dressed.size, materials: cache.size, distinctLooks: looks.size, renders, programsFirst: programs[0], programsLast: programs[programs.length - 1], exceptions, wrongTeam, camouflagedFrames: camouflaged };
}
