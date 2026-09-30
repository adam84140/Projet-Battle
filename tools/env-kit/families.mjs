// Classement des fichiers d'un kit : famille (d'après le nom) et rôle (d'après le nom ET la
// géométrie mesurée). Les tables ne décrivent pas le contenu d'un kit : ce sont des mots-clés de
// reconnaissance ; un fichier non reconnu est classé UNKNOWN et signalé pour revue humaine.
// Règles expliquées dans docs/map1/MAP1-ASSET-INVENTORY.md.

// Préfixe ou mot du nom (minuscules) → famille du kit
export const NAME_FAMILIES = {
  balcony: 'BALCONY', corner: 'CORNER', door: 'DOOR', floor: 'FLOOR', roof: 'ROOF', stairs: 'STAIRS', stair: 'STAIRS',
  prop: 'PROP', overhang: 'OVERHANG', holecover: 'HOLE_COVER', wall: 'WALL', arch: 'ARCH', window: 'WINDOW', support: 'SUPPORT',
  fence: 'FENCE', chimney: 'CHIMNEY', vine: 'VINE', wagon: 'WAGON',
};

// Mots qui précisent un accessoire (ex. Prop_…Wagon…) : ajoutés comme mots-clés
export const KEYWORDS = ['fence', 'chimney', 'vine', 'wagon', 'support', 'crate', 'barrel', 'cart', 'tree', 'bush', 'plant', 'flower', 'grass', 'ivy', 'hedge', 'rock', 'stone', 'wood', 'brick', 'plaster', 'corner', 'straight', 'round', 'small', 'large', 'half'];

// Familles de modules de bâtiment et leur rôle par défaut
const MODULE_ROLES = { WALL: 'structural', CORNER: 'structural', FLOOR: 'structural', ROOF: 'structural', OVERHANG: 'structural', BALCONY: 'structural', DOOR: 'structural', WINDOW: 'structural', SUPPORT: 'structural', ARCH: 'structural', CHIMNEY: 'structural', STAIRS: 'traversal', HOLE_COVER: 'filler' };
const VEGETATION_WORDS = ['vine', 'tree', 'bush', 'plant', 'flower', 'grass', 'ivy', 'hedge'];

// Découpe un nom de fichier en mots : « Prop_WagonLarge-2 » → prop, wagon, large, 2
export function tokens(name) {
  return name
    .replace(/\.(gltf|glb)$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
}

export function familyOf(name) {
  const t = tokens(name);
  const compact = name.replace(/\.(gltf|glb)$/i, '').split(/[_\-.\s]/)[0].toLowerCase(); // « HoleCover » → holecover
  const family = NAME_FAMILIES[compact] ?? NAME_FAMILIES[t[0]] ?? t.map((x) => NAME_FAMILIES[x]).find(Boolean) ?? 'UNKNOWN';
  const keywords = [...new Set(t.filter((x) => KEYWORDS.includes(x) || (NAME_FAMILIES[x] && NAME_FAMILIES[x] !== family)))];
  return { family, keywords };
}

// Rôle : structural, traversal, filler, cover-candidate, prop, decoration, vegetation, unknown
// size = [largeur x, hauteur y, profondeur z] en mètres
export function roleOf(family, keywords, size) {
  if (keywords.some((k) => VEGETATION_WORDS.includes(k)) || family === 'VINE') return 'vegetation';
  if (MODULE_ROLES[family]) return MODULE_ROLES[family];
  if (!size) return 'unknown';
  const [w, h, d] = size;
  const big = Math.max(w, d), small = Math.min(w, d);
  if (family === 'UNKNOWN') return 'unknown';
  // hauteur de couvert du jeu : 0,7 à 2 m, assez large pour abriter un soldat
  if (h >= 0.7 && h <= 2 && big >= 0.9 && small >= 0.3) return 'cover-candidate';
  if (h > 2 || big > 3) return 'prop';
  return 'decoration';
}

// Observations géométriques utiles au placement
export function geometryNotes(bounds) {
  const notes = [];
  if (!bounds) return notes;
  const [w, h, d] = bounds.size;
  const m = Math.max(w, h, d);
  if (m > 60) notes.push('échelle suspecte (> 60 m : centimètres ?)');
  if (m > 0 && m < 0.02) notes.push('échelle suspecte (< 2 cm)');
  const minY = bounds.min[1];
  if (Math.abs(minY) <= 0.05) notes.push('pivot au sol');
  else if (minY < -0.05 && bounds.max[1] > 0.05) notes.push('pivot au milieu en hauteur');
  else notes.push(`pivot décalé (bas à ${minY} m)`);
  const cx = (bounds.min[0] + bounds.max[0]) / 2, cz = (bounds.min[2] + bounds.max[2]) / 2;
  if (Math.abs(cx) <= 0.1 * Math.max(w, 0.1) && Math.abs(cz) <= 0.1 * Math.max(d, 0.1)) notes.push('origine au centre');
  else if (Math.abs(bounds.min[0]) <= 0.02 || Math.abs(bounds.max[0]) <= 0.02 || Math.abs(bounds.min[2]) <= 0.02 || Math.abs(bounds.max[2]) <= 0.02) notes.push('origine sur un bord');
  else notes.push('origine décalée');
  return notes;
}
