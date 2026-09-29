// Contrat du squelette et de l'asset de production du Master Assault (étape M2).
// Source unique lue par l'adaptateur (rigAdapter.js), le validateur (tests/check-glb.mjs)
// et la documentation (docs/characters/ASSET-CONTRACT.md). Pas de dépendance : importable par Node.
// NON GELÉ (D-003) : il le sera après la validation GOLD du vrai Master Assault (M7).
// Repère : Y en haut, personnage face à +Z, sa gauche = +X (droite = −X), 1 unité = 1 m.

export const RIG_CONTRACT_VERSION = 'M2-0.1';

// Nom vu par Three.js après chargement glTF (PropertyBinding.sanitizeNodeName) :
// « upperArm.L » (nom Blender, compatible miroir) devient « upperArmL ».
export function runtimeName(name) {
  return String(name).replace(/\s/g, '_').replace(/[[\].:/]/g, '');
}

// Os requis. `gameplay` : articulation du squelette de gameplay qu'il suit (src/character/Character.js).
// `limb` : direction calibrée (bras, jambes). `chain` : chaîne de colonne répartie sur l'os `spine` du gameplay.
// `target` : position de repos attendue (A-pose), `tol` : tolérance par axe (m), issues du squelette de gameplay.
// `length` : [longueur attendue depuis le parent, tolérance] (m).
const L = [
  { name: 'root', parent: null, target: [0, 0, 0], tol: [0.01, 0.01, 0.01] },
  { name: 'hips', parent: 'root', gameplay: 'hips', target: [0, 0.95, 0], tol: [0.02, 0.05, 0.04] },
  { name: 'spine', parent: 'hips', gameplay: 'spine', chain: 0, target: [0, 1.01, 0], tol: [0.02, 0.05, 0.05] },
  { name: 'spine1', parent: 'spine', chain: 1, target: [0, 1.17, 0], tol: [0.02, 0.06, 0.06] },
  { name: 'chest', parent: 'spine1', chain: 2, target: [0, 1.33, 0], tol: [0.02, 0.06, 0.06] },
  { name: 'neck', parent: 'chest', gameplay: 'neck', target: [0, 1.48, 0.005], tol: [0.02, 0.04, 0.04] },
  { name: 'head', parent: 'neck', gameplay: 'head', target: [0, 1.56, 0.017], tol: [0.02, 0.04, 0.04] },
];
const SIDE = [
  { name: 'clavicle', parent: 'chest', target: [0.06, 1.41, 0], tol: [0.05, 0.05, 0.05] },
  { name: 'upperArm', parent: 'clavicle', gameplay: 'shoulder', limb: true, target: [0.25, 1.43, 0], tol: [0.03, 0.04, 0.04] },
  { name: 'lowerArm', parent: 'upperArm', gameplay: 'elbow', limb: true, length: [0.3, 0.03] },
  { name: 'hand', parent: 'lowerArm', gameplay: 'hand', limb: true, length: [0.3, 0.03] },
  { name: 'thigh', parent: 'hips', gameplay: 'leg', limb: true, target: [0.1, 0.91, 0], tol: [0.03, 0.05, 0.04] },
  { name: 'calf', parent: 'thigh', gameplay: 'knee', limb: true, length: [0.42, 0.04] },
  { name: 'foot', parent: 'calf', gameplay: 'ankle', length: [0.39, 0.04] },
  { name: 'toe', parent: 'foot' },
];
const mirror = (v, s) => (v ? [v[0] * s, v[1], v[2]] : undefined);
export const REQUIRED_BONES = [
  ...L,
  ...['L', 'R'].flatMap((sd) =>
    SIDE.map((b) => ({
      ...b,
      name: `${b.name}.${sd}`,
      parent: b.parent === 'chest' || b.parent === 'hips' ? b.parent : `${b.parent}.${sd}`,
      gameplay: b.gameplay ? b.gameplay + sd : undefined,
      target: mirror(b.target, sd === 'L' ? 1 : -1),
      side: sd,
    })),
  ),
];

// Os facultatifs acceptés (ignorés par l'adaptateur : ils gardent leur pose de repos ou suivent un clip)
export const OPTIONAL_BONES = [
  ...['L', 'R'].flatMap((sd) => [
    ...[1, 2, 3].map((i) => ({ name: `thumb${i}.${sd}`, parent: i === 1 ? `hand.${sd}` : `thumb${i - 1}.${sd}` })),
    ...[1, 2, 3].map((i) => ({ name: `index${i}.${sd}`, parent: i === 1 ? `hand.${sd}` : `index${i - 1}.${sd}` })),
    ...[1, 2, 3].map((i) => ({ name: `fingers${i}.${sd}`, parent: i === 1 ? `hand.${sd}` : `fingers${i - 1}.${sd}` })),
    { name: `eye.${sd}`, parent: 'head' },
    { name: `brow.${sd}`, parent: 'head' },
  ]),
  { name: 'jaw', parent: 'head' },
];

// Points d'attache : os NON déformants (aucun sommet pondéré), enfants de l'os indiqué
export const SOCKETS = [
  { name: 'socket_hand.R', parent: 'hand.R', required: true, use: 'objet tenu main droite (grenade lancée, poignard, trousse)' },
  { name: 'socket_hand.L', parent: 'hand.L', required: true, use: 'objet tenu main gauche (chargeur au rechargement)' },
  { name: 'socket_back', parent: 'chest', required: true, use: 'sac à dos (accessoire facultatif, D-010), arme en bandoulière' },
  { name: 'socket_head', parent: 'head', required: true, use: 'coiffe : casquette, casque, bonnet' },
  { name: 'socket_face', parent: 'head', required: true, use: 'lunettes' },
  { name: 'socket_hip.L', parent: 'hips', required: true, use: 'gourde, sacoche' },
  { name: 'socket_hip.R', parent: 'hips', required: true, use: 'étui, sacoche' },
  { name: 'socket_grenade', parent: 'hips', required: true, use: 'grenades de ceinture (accessoire)' },
  { name: 'socket_weapon', parent: 'chest', required: false, use: 'aperçu Blender du support d’arme (le jeu garde son support animé par le code)' },
];

// Géométrie et budgets
export const ASSET = {
  heightM: 1.85, // sommet des cheveux, pieds au sol (images 01 et 02)
  heightTolM: 0.04,
  originTolM: 0.02, // pieds posés sur y = 0, centré en x et z
  aPoseArmFromVerticalDeg: [30, 60], // bras tendus vers le bas et l'extérieur (≈ 45°)
  maxElbowBendDeg: 20,
  lods: [
    { name: 'body_LOD0', minTris: 12000, maxTris: 18000, required: 'prototype' },
    { name: 'body_LOD1', minTris: 3000, maxTris: 6000, required: 'production' },
    { name: 'body_LOD2', minTris: 800, maxTris: 2000, required: 'production' },
  ],
  accessoryPattern: /^acc_[a-z0-9]+_LOD[0-2]$/,
  maxMaterials: 1, // un matériau pour le corps et les accessoires (l'arme est un asset séparé)
  maxMaterialsHard: 2,
  textureSizes: [256, 512, 1024, 2048],
  maxTextureSize: 2048,
  maxInfluences: 4,
  // Masque d'équipe (contrat remis à M3) : COLOR_0 du corps, R = couleur d'équipe principale,
  // G = couleur d'équipe secondaire, B = zone d'emblème (UV dans TEXCOORD_1)
  teamMask: { attribute: 'COLOR_0', emblemUv: 'TEXCOORD_1' },
};

// Clips (noms glTF). `code` : animé par le code (aucun clip requis) ; `clip` : fourni par Blender.
// Durées alignées sur src/config.js et src/game/Soldier.js (30 images/s).
export const ANIMATION_CONTRACT = [
  { state: 'repos, repos combat', source: 'code' },
  { state: 'marche, course, sprint, déplacements directionnels, pivot', source: 'code' },
  { state: 'début de saut, en l’air, réception', source: 'code' },
  { state: 'accroupi (immobile, marche)', source: 'code' },
  { state: 'visée, tir, recul', source: 'code' },
  { state: 'réactions aux impacts', source: 'code' },
  { clip: 'reload_rifle', seconds: 1.8, mask: 'haut du corps', required: true, events: 'chargeur retiré de 30 % à 62 % du clip' },
  { clip: 'throw_grenade', seconds: 0.7, mask: 'haut du corps', required: true, events: 'lâcher à 45 %' },
  { clip: 'buff', seconds: 0.45, mask: 'haut du corps', required: true, events: 'adrénaline et autres compétences de geste' },
  { clip: 'heal', seconds: 0.6, mask: 'haut du corps', required: true },
  { clip: 'knife', seconds: 0.55, mask: 'haut du corps', required: false, events: 'coup à 30 %' },
  { clip: 'death_back', seconds: 1.0, mask: 'corps entier', required: true, events: 'dernière image tenue au sol' },
  { clip: 'death_front', seconds: 1.0, mask: 'corps entier', required: true, events: 'dernière image tenue au sol' },
  { clip: 'death_spin', seconds: 1.0, mask: 'corps entier', required: true, events: 'dernière image tenue au sol' },
  { clip: 'sit_jeep', seconds: 0, mask: 'corps entier', required: true, events: 'pose (1 image)' },
  { clip: 'hand_grip.R', seconds: 0, mask: 'doigts', required: false, events: 'pose des doigts sur la poignée (si os de doigts)' },
  { clip: 'hand_grip.L', seconds: 0, mask: 'doigts', required: false, events: 'pose des doigts sur le garde-main (si os de doigts)' },
];
export const FPS = 30;

// Expressions (morph targets / shape keys) sur body_LOD0 : pilotées par le code selon l'état
export const MORPH_TARGETS = ['blink', 'expr_determined', 'expr_confident', 'expr_angry', 'expr_surprised', 'expr_smile', 'expr_focus', 'expr_pain', 'expr_ko'];
