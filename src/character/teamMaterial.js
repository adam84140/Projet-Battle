import * as THREE from 'three';
import { TEAMS, DEFAULT_CUSTOM } from '../config.js';
import { TEAM_MASK } from './rigContract.js';
import { emblemPolygons } from './emblems.js';

// Matériau d'équipe des personnages de production (étape M3, décision D-019).
// Consomme le contrat d'asset (rigContract.js, TEAM_MASK ; docs/characters/ASSET-CONTRACT.md, § 7 et 8) :
//  - un seul asset et une seule texture pour bleu et rouge : les zones marquées dans le masque COLOR_0
//    sont teintées par des uniformes (couleur principale, secondaire, teint, cheveux) ;
//  - les emblèmes sont des décalques : texture générée depuis emblems.js (aigle / étoile), posée sur les
//    zones d'emblème par la 2ᵉ carte UV (TEXCOORD_1) ;
//  - le masque n'est JAMAIS affiché comme couleur : l'attribut `color` créé par GLTFLoader est renommé ;
//  - un matériau par (matériau source, équipe, teint, cheveux), partagé par tous les LOD, accessoires et
//    soldats qui ont le même aspect ; tous partagent le même programme de shader.
// Pas encore branché sur les soldats en jeu (intégration : M5). Le personnage procédural n'est pas concerné.

export const MASK_ATTRIBUTE = 'teamMask';
export const EMBLEM_UV_ATTRIBUTE = 'emblemUv';
const EMBLEM_COLOR = 0xffffff;
const EMBLEM_SIZE = 256;
const PROGRAM_KEY = 'frontline-team-mask-1';
// Inverse du gris de référence en linéaire : un texel au gris de référence rend exactement la teinte
const GREY_INV = 1 / new THREE.Color().setRGB(TEAM_MASK.referenceGrey / 255, 0, 0, THREE.SRGBColorSpace).r;

// ---------- Géométrie ----------
// COLOR_0 (attribut `color` après GLTFLoader) devient `teamMask` : même si un matériau active les couleurs
// de sommets, le masque ne peut plus s'afficher. TEXCOORD_1 (`uv1`) est aussi lu sous le nom `emblemUv`.
// Masque ou UV absents (asset au stade prototype, LOD simplifié) : valeurs neutres explicites.
// Idempotent d'après les attributs présents (pas de drapeau : BufferGeometry.clone() partage userData) ;
// les clones de SkeletonUtils.clone partagent la géométrie, préparée une seule fois.
export function prepareMaskGeometry(geometry) {
  const n = geometry.attributes.position.count;
  const color = geometry.getAttribute('color');
  delete geometry.morphAttributes.color; // le masque ne se déforme pas (et ne doit pas réactiver les couleurs)
  if (color) {
    geometry.setAttribute(MASK_ATTRIBUTE, color);
    geometry.deleteAttribute('color');
  } else if (!geometry.getAttribute(MASK_ATTRIBUTE)) {
    const a = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) a[i * 4 + 3] = 255; // (0, 0, 0, 1) : zone neutre
    geometry.setAttribute(MASK_ATTRIBUTE, new THREE.BufferAttribute(a, 4, true));
  }
  if (!geometry.getAttribute(EMBLEM_UV_ATTRIBUTE)) {
    const uv1 = geometry.getAttribute('uv1');
    geometry.setAttribute(EMBLEM_UV_ATTRIBUTE, uv1 || new THREE.BufferAttribute(new Uint8Array(n * 2), 2, true));
  }
  return geometry;
}

// ---------- Emblèmes ----------
// Texture de masque (blanc = emblème) générée depuis les polygones canoniques (D-011), partagée.
// Convention glTF : v = 0 en haut de l'image (flipY = false) ; le haut de l'emblème est en haut.
const emblemTextures = new Map();
export function emblemTexture(type) {
  let t = emblemTextures.get(type);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = cv.height = EMBLEM_SIZE;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, EMBLEM_SIZE, EMBLEM_SIZE);
  ctx.fillStyle = '#fff';
  for (const poly of emblemPolygons(type)) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => {
      const px = ((x + 1) / 2) * EMBLEM_SIZE;
      const py = ((1 - y) / 2) * EMBLEM_SIZE;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  }
  t = new THREE.CanvasTexture(cv);
  t.name = `embleme_${type}`;
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  emblemTextures.set(type, t);
  return t;
}

// ---------- Aspect d'un soldat ----------
// principale = chemise, secondaire = teinte sombre d'équipe (gilet, panneau du dos), teint et cheveux
// de la personnalisation (valeurs de src/config.js).
export function teamLook(teamId, custom = {}) {
  const T = TEAMS[teamId];
  const C = { ...DEFAULT_CUSTOM, ...custom };
  return { team: teamId, primary: T.shirt, secondary: T.vest, skin: C.skin, hair: C.hair, emblem: T.emblem, emblemColor: EMBLEM_COLOR };
}
const lookKey = (l) => [l.team, l.primary, l.secondary, l.skin, l.hair, l.emblem, l.emblemColor].join('|');

// ---------- Shader ----------
const VERT_DECL = /* glsl */ `
attribute vec4 ${MASK_ATTRIBUTE};
attribute vec2 ${EMBLEM_UV_ATTRIBUTE};
varying vec4 vTeamMask;
varying vec2 vEmblemUv;`;
const VERT_MAIN = /* glsl */ `
vTeamMask = ${MASK_ATTRIBUTE};
vEmblemUv = ${EMBLEM_UV_ATTRIBUTE};`;
const FRAG_DECL = /* glsl */ `
uniform vec3 uTeamPrimary;
uniform vec3 uTeamSecondary;
uniform vec3 uTeamSkin;
uniform vec3 uTeamHair;
uniform vec3 uEmblemColor;
uniform float uGreyInv;
uniform float uMaskDebug;
uniform sampler2D uEmblemMap;
varying vec4 vTeamMask;
varying vec2 vEmblemUv;
vec3 flMaskCode;`;
// Décodage identique à decodeMask() de rigContract.js : R et G seuls = équipe, R et G ensemble = peau
// (B = 0) ou cheveux (B = 1), B sans R+G = zone d'emblème.
const FRAG_MAIN = /* glsl */ `
{
  vec3 m = smoothstep(0.45, 0.55, vTeamMask.rgb);
  float both = m.r * m.g;
  float wPrim = m.r * (1.0 - m.g);
  float wSec = m.g * (1.0 - m.r);
  float wSkin = both * (1.0 - m.b);
  float wHair = both * m.b;
  float wEmblem = m.b * (1.0 - both);
  vec3 tint = uTeamPrimary * wPrim + uTeamSecondary * wSec + uTeamSkin * wSkin + uTeamHair * wHair;
  diffuseColor.rgb *= vec3(1.0 - (wPrim + wSec + wSkin + wHair)) + tint * uGreyInv;
  float print = texture2D(uEmblemMap, vEmblemUv).r * wEmblem;
  diffuseColor.rgb = mix(diffuseColor.rgb, uEmblemColor, print);
  flMaskCode = step(0.5, vTeamMask.rgb);
}`;
// Visualisation du masque : couleurs pures du contrat, sans éclairage (lisibles au pixel près)
const FRAG_DEBUG = /* glsl */ `
if (uMaskDebug > 0.5) gl_FragColor = vec4(flMaskCode, 1.0);`;

// Matériau source (celui de l'asset, souvent « M_body ») et uniformes d'un matériau d'équipe.
// Hors de userData : Material.clone() recopie userData en JSON (une texture n'y survivrait pas).
const SOURCE = new WeakMap();
const UNIFORMS = new WeakMap();
export function sourceMaterial(material) {
  return SOURCE.get(material) || material;
}
export function teamUniforms(material) {
  return UNIFORMS.get(material);
}

// Matériau d'équipe construit sur le matériau de l'asset (textures partagées, pas copiées).
// debugMask : affiche les zones du masque (couleurs pures du contrat) ; ghost : variante transparente
// (camouflage du Commando), une par soldat.
export function createTeamMaterial(source, look, { debugMask = false, ghost = false } = {}) {
  const src = source ? sourceMaterial(source) : new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const m = src.clone();
  m.name = `${src.name || 'M_body'}#${look.team}`;
  m.vertexColors = false;
  installTeamShader(m, src, look, debugMask);
  if (ghost) {
    m.transparent = true;
    m.depthWrite = false;
  }
  return m;
}

function installTeamShader(m, src, look, debugMask) {
  const uniforms = {
    uTeamPrimary: { value: new THREE.Color(look.primary) },
    uTeamSecondary: { value: new THREE.Color(look.secondary) },
    uTeamSkin: { value: new THREE.Color(look.skin) },
    uTeamHair: { value: new THREE.Color(look.hair) },
    uEmblemColor: { value: new THREE.Color(look.emblemColor) },
    uGreyInv: { value: GREY_INV },
    uMaskDebug: { value: debugMask ? 1 : 0 },
    uEmblemMap: { value: emblemTexture(look.emblem) },
  };
  m.userData.teamLook = { ...look };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>${VERT_DECL}`).replace('#include <begin_vertex>', `#include <begin_vertex>${VERT_MAIN}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>${FRAG_DECL}`).replace('#include <map_fragment>', `#include <map_fragment>${FRAG_MAIN}`).replace('#include <dithering_fragment>', `${FRAG_DEBUG}\n#include <dithering_fragment>`);
  };
  m.customProgramCacheKey = () => PROGRAM_KEY;
  // Un clone reste un matériau d'équipe (Material.clone() ne recopie pas le shader) : le camouflage
  // actuel du Commando (Character.setOpacity) clone le matériau du maillage, il garde ainsi les teintes.
  m.clone = teamClone;
  SOURCE.set(m, src);
  UNIFORMS.set(m, uniforms);
}

function teamClone() {
  const c = THREE.Material.prototype.clone.call(this); // mêmes réglages (transparence, textures…)
  installTeamShader(c, SOURCE.get(this), this.userData.teamLook, UNIFORMS.get(this).uMaskDebug.value > 0.5);
  return c;
}

// Réserve de matériaux d'équipe d'un asset : un matériau par (source, aspect), partagé.
export class TeamMaterialCache {
  constructor() {
    this.materials = new Map();
  }

  get(source, look) {
    const src = sourceMaterial(source);
    const key = `${src.uuid}|${lookKey(look)}`;
    let m = this.materials.get(key);
    if (!m) {
      m = createTeamMaterial(src, look);
      this.materials.set(key, m);
    }
    return m;
  }

  get size() {
    return this.materials.size;
  }

  dispose() {
    for (const m of this.materials.values()) m.dispose();
    this.materials.clear();
  }
}

// Applique un aspect à tous les maillages d'un personnage de production (body_LOD*, acc_*) :
// géométrie préparée, matériau d'équipe partagé (ou matériau de visualisation du masque).
export function applyTeamLook(root, look, cache, { debugMask = false } = {}) {
  const pick = (mat) => (debugMask ? createTeamMaterial(mat, look, { debugMask: true }) : cache.get(mat, look));
  root.traverse((o) => {
    if (!o.isMesh) return;
    prepareMaskGeometry(o.geometry);
    o.material = Array.isArray(o.material) ? o.material.map(pick) : pick(o.material);
  });
  return root;
}
