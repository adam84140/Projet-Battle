// Configuration générale du jeu : équipes, classes, armes, compétences.
// Tout le "game design" chiffré est ici pour être facile à équilibrer.

export const GAME = {
  title: 'FRONTLINE',
  subtitle: 'LEGENDS',
  tagline: 'Équipes. Territoires. Héros.',
  motto: 'Du fun. Pas de prise de tête. Juste du jeu.',
};

// Palette de la planche de référence
export const PALETTE = {
  bleu: 0x2f5bb7,
  cuir: 0x6b4a2e,
  kaki: 0xa8864f,
  noir: 0x1d1f22,
  grisBleu: 0x8d98a8,
  olive: 0x8a8466,
  anthracite: 0x3a3d42,
  peau: 0xf2b98c,
};

export const TEAMS = {
  blue: {
    id: 'blue',
    name: 'Les Aigles',
    short: 'AIGLES',
    emblem: 'eagle',
    ui: '#3d7bff',
    uiDark: '#1d3f8f',
    shirt: 0x2f5bb7,
    shirtDark: 0x24478f,
    cuff: 0x9aa6b8,
    pants: 0x8a8466,
    vest: 0x29344a,
    flag: 0x2f5bb7,
  },
  red: {
    id: 'red',
    name: 'La Légion',
    short: 'LÉGION',
    emblem: 'star',
    ui: '#ff5a3d',
    uiDark: '#8f2a1d',
    shirt: 0xb2382c,
    shirtDark: 0x8a2a21,
    cuff: 0xc8b49a,
    pants: 0x5a5c50,
    vest: 0x4a2c27,
    flag: 0xc0392b,
  },
};

export const otherTeam = (t) => (t === 'blue' ? 'red' : 'blue');

export const WEAPONS = {
  fusil: {
    id: 'fusil',
    name: "Fusil d'assaut FL-4",
    damage: 15,
    rpm: 540,
    mag: 30,
    reserve: 180,
    reload: 1.8,
    spread: 0.022,
    aimSpread: 0.006,
    range: 140,
    falloffStart: 35,
    falloffEnd: 90,
    falloffMin: 0.6,
    headMult: 1.6,
    auto: true,
    recoil: 0.014,
    // ressenti du recul (vue) : impulsion, part latérale, retour, part qui reste,
    // montée en tir soutenu, recul de la caméra et du modèle
    feel: { kick: 0.009, side: 0.3, recover: 7, keep: 0.35, ramp: 0.03, punch: 0.05, model: 1, tracer: 1, trail: 5 },
    zoom: 1.45,
    sound: 'rifle',
  },
  mitrailleuse: {
    id: 'mitrailleuse',
    name: 'Mitrailleuse M-60L',
    damage: 12,
    rpm: 720,
    mag: 90,
    reserve: 270,
    reload: 3.2,
    spread: 0.035,
    aimSpread: 0.016,
    range: 110,
    falloffStart: 25,
    falloffEnd: 70,
    falloffMin: 0.55,
    headMult: 1.5,
    auto: true,
    recoil: 0.01,
    feel: { kick: 0.006, side: 1.5, recover: 5, keep: 0.4, ramp: 0.07, punch: 0.035, model: 0.8, tracer: 1.25, trail: 4 },
    zoom: 1.3,
    sound: 'mg',
  },
  sniper: {
    id: 'sniper',
    name: 'Fusil de précision Faucon',
    damage: 70,
    rpm: 48,
    mag: 5,
    reserve: 35,
    reload: 2.4,
    spread: 0.05,
    aimSpread: 0.0004,
    range: 320,
    falloffStart: 400,
    falloffEnd: 500,
    falloffMin: 1,
    headMult: 2.2,
    auto: false,
    recoil: 0.05,
    feel: { kick: 0.075, side: 0.2, recover: 5, keep: 0.08, ramp: 0, punch: 0.25, model: 1.8, tracer: 2.2, trail: 12 },
    zoom: 4,
    scope: true,
    sound: 'sniper',
  },
};

// Compétences façon "barre d'actions" (touches 1, 2, 3)
export const ABILITIES = {
  grenade: {
    id: 'grenade',
    short: 'Grenade',
    name: 'Grenade',
    desc: 'Lance une grenade explosive (dégâts de zone).',
    cooldown: 12,
    icon: 'grenade',
  },
  adrenaline: {
    id: 'adrenaline',
    short: 'Adrénaline',
    name: 'Adrénaline',
    desc: '+35 % de vitesse et régénération pendant 6 s.',
    cooldown: 22,
    duration: 6,
    icon: 'bolt',
  },
  soin: {
    id: 'soin',
    short: 'Soin',
    name: 'Trousse de soin',
    desc: 'Soigne de 50 PV vous et vos alliés proches.',
    cooldown: 25,
    radius: 9,
    amount: 50,
    icon: 'cross',
  },
  roquette: {
    id: 'roquette',
    short: 'Roquette',
    name: 'Roquette',
    desc: 'Tire une roquette, idéale contre les véhicules.',
    cooldown: 9,
    icon: 'rocket',
  },
  blindage: {
    id: 'blindage',
    short: 'Blindage',
    name: 'Blindage',
    desc: 'Réduit les dégâts subis de 50 % pendant 7 s.',
    cooldown: 24,
    duration: 7,
    icon: 'shield',
  },
  fureur: {
    id: 'fureur',
    short: 'Fureur',
    name: 'Fureur',
    desc: 'Cadence +35 % sans rechargement pendant 6 s.',
    cooldown: 26,
    duration: 6,
    icon: 'flame',
  },
  camouflage: {
    id: 'camouflage',
    short: 'Camouflage',
    name: 'Camouflage',
    desc: 'Presque invisible pendant 10 s (tirer vous révèle).',
    cooldown: 22,
    duration: 10,
    icon: 'eye',
  },
  precision: {
    id: 'precision',
    short: 'Précision',
    name: 'Tir de précision',
    desc: 'La prochaine balle inflige 2,5× les dégâts.',
    cooldown: 12,
    icon: 'target',
  },
  poignard: {
    id: 'poignard',
    short: 'Poignard',
    name: 'Poignard',
    desc: 'Bond en avant et attaque au couteau (120 dégâts).',
    cooldown: 7,
    icon: 'knife',
  },
};

export const CLASSES = {
  assaut: {
    id: 'assaut',
    name: 'Assaut',
    tagline: 'Polyvalent. Efficace en toutes situations.',
    description:
      "L'Assaut est le cœur de l'équipe. Il mène l'offensive, sécurise les positions et ouvre la voie à ses alliés.",
    quote: ['Avancer.', "S'adapter.", 'Toujours plus loin.'],
    health: 100,
    speed: 5.4,
    weapon: 'fusil',
    abilities: ['grenade', 'adrenaline', 'soin'],
    stats: [
      { icon: 'plus', label: 'Attaque', detail: 'Dégâts élevés', value: 4 },
      { icon: 'shield', label: 'Mobilité', detail: 'Déplacement rapide', value: 4 },
      { icon: 'ammo', label: 'Polyvalence', detail: "S'adapte à toutes les situations", value: 5 },
    ],
    look: { build: 1, headgear: 'none' },
  },
  artilleur: {
    id: 'artilleur',
    name: 'Artilleur',
    tagline: 'Puissance de feu. Il tient la ligne.',
    description:
      "L'Artilleur encaisse et arrose. Sa mitrailleuse et ses roquettes brisent les assauts ennemis et font fondre les blindés.",
    quote: ['Tenir.', 'Arroser.', 'Ne jamais reculer.'],
    health: 150,
    speed: 4.7,
    weapon: 'mitrailleuse',
    abilities: ['roquette', 'blindage', 'fureur'],
    stats: [
      { icon: 'plus', label: 'Attaque', detail: 'Puissance de feu massive', value: 5 },
      { icon: 'shield', label: 'Résistance', detail: 'Encaisse les coups', value: 5 },
      { icon: 'ammo', label: 'Mobilité', detail: 'Lent mais inarrêtable', value: 2 },
    ],
    look: { build: 1.12, headgear: 'helmet' },
  },
  commando: {
    id: 'commando',
    name: 'Commando',
    tagline: 'Précis. Furtif. Redoutable.',
    description:
      'Le Commando frappe de loin et disparaît. Tireur d’élite hors pair, il excelle aussi au corps à corps grâce à son poignard.',
    quote: ['Observer.', 'Viser.', 'Disparaître.'],
    health: 85,
    speed: 6.0,
    weapon: 'sniper',
    abilities: ['camouflage', 'precision', 'poignard'],
    stats: [
      { icon: 'plus', label: 'Précision', detail: 'Tirs à longue portée', value: 5 },
      { icon: 'shield', label: 'Discrétion', detail: 'Camouflage actif', value: 5 },
      { icon: 'ammo', label: 'Endurance', detail: 'Fragile au contact', value: 2 },
    ],
    look: { build: 0.95, headgear: 'beanie' },
  },
};

export const CLASS_ORDER = ['assaut', 'artilleur', 'commando'];

export const MODES = {
  '8v8': { teamSize: 8, tickets: 250 },
  '16v16': { teamSize: 16, tickets: 400 },
};

export const DIFFICULTIES = {
  // tactics : propension à se mettre à couvert, se replier et contourner
  recrue: { name: 'Recrue', accuracy: 0.45, reaction: 0.75, damageMult: 0.7, tactics: 0.3 },
  veteran: { name: 'Vétéran', accuracy: 0.65, reaction: 0.5, damageMult: 0.85, tactics: 0.6 },
  legende: { name: 'Légende', accuracy: 0.85, reaction: 0.3, damageMult: 1, tactics: 0.9 },
};

// Personnalisation par défaut du héros du joueur
export const DEFAULT_CUSTOM = {
  name: 'Joueur',
  skin: 0xf2b98c,
  hair: 0x5a3a22,
  eyes: 0x5b3a1e,
  cap: false,
  glasses: false,
  bandana: false,
  backpack: true,
};

export const SKIN_TONES = [0xf6caa0, 0xf2b98c, 0xd89a6a, 0xb47a4e, 0x8a5634, 0x5e3a22];
export const HAIR_COLORS = [0x2a1d14, 0x5a3a22, 0x8a5a2e, 0xc9a25a, 0x9a3b1f, 0x8c8c8c];

const STORAGE_KEY = 'frontline-legends-settings-v1';

export function loadSettings() {
  const base = {
    mode: '8v8',
    team: 'blue',
    quality: 'high',
    difficulty: 'veteran',
    sensitivity: 1,
    volume: 0.6,
    classId: 'assaut',
    custom: { ...DEFAULT_CUSTOM },
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    return { ...base, ...saved, custom: { ...DEFAULT_CUSTOM, ...(saved.custom || {}) } };
  } catch {
    return base;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* stockage indisponible (navigation privée) : on ignore */
  }
}
