// Catalogue sémantique des assets d'environnement de la carte 1 (D-024).
//
// Ce fichier ne connaît AUCUN fournisseur : pas de nom de fichier, pas de chemin de kit.
// Il décrit ce dont la carte a besoin (emprise, hauteur, couvert, franchissement, collision),
// et le registre (registry.js) le relie aux fichiers d'un kit (src/environment/kits/*.js).
// Remplacer un kit, ou passer à des assets propres à Frontline Legends, ne change que les
// liaisons ; ce catalogue, la disposition de la carte et le gameplay restent identiques.
//
// Les collisions du jeu viennent de ces enregistrements (ou de la disposition), jamais du
// maillage d'un fournisseur : un asset visuel doit tenir dans l'emprise déclarée.
//
// Documentation : docs/map1/MAP1-ASSET-REGISTRY.md

// Familles sémantiques (ce que l'objet EST pour la carte)
export const ENV_FAMILIES = ['HOUSE', 'TOWER', 'LANDMARK', 'WALL', 'FENCE', 'ARCH', 'STAIRS', 'ROOF', 'BALCONY', 'FLOOR', 'DOOR', 'WINDOW', 'PROP', 'COVER', 'VEGETATION', 'DECOR'];

// Rôle dans l'assemblage : « prefab » = posé par la disposition de la carte ; « module » = pièce
// d'un prefab (toit, balcon, porte…), jamais posé seul par le gameplay.
export const ENV_KINDS = ['prefab', 'module'];

// Vocabulaire des étiquettes (toute étiquette hors de cette liste est refusée par validateCatalog)
export const ENV_TAGS = [
  // nature
  'structural', 'exterior', 'interior', 'corner', 'straight', 'decorative', 'landmark', 'foliage', 'natural', 'animated', 'team', 'parametric',
  // gameplay
  'low-cover', 'high-cover', 'full-cover', 'soft-cover', 'vehicle-safe', 'infantry-only', 'verticality',
  // zones de la carte 1
  'plaza', 'village-center', 'rural', 'farm', 'mill', 'base', 'roadside', 'backdrop',
];

export const COVER_TYPES = ['none', 'low', 'high', 'full', 'soft'];
export const TRAVERSAL_TYPES = ['blocking', 'step', 'passable', 'walkable', 'climbable'];
export const HEIGHT_CATEGORIES = ['ground', 'low', 'medium', 'high', 'tall'];
export const COLLISION_SHAPES = ['box', 'boxes', 'trunk', 'none'];
export const REPLACEMENT_INTENTS = ['custom', 'kit', 'procedural'];

// Catégorie de hauteur (seuils en mètres ; STEP du jeu = 0,45 m, couvert accroupi ≤ 1,2 m)
export function heightCategory(h) {
  if (h < 0.45) return 'ground';
  if (h < 1.2) return 'low';
  if (h < 2.2) return 'medium';
  if (h < 6) return 'high';
  return 'tall';
}

// Identifiant : FAMILLE_SOUSTYPE[_…]_VARIANTE, majuscules, variante d'une lettre (ex. HOUSE_SMALL_A)
export const ID_PATTERN = /^[A-Z]+(_[A-Z0-9]+)+_[A-Z]$/;

// Enregistrements. Champs :
//   id, family, kind, subtype, tags
//   footprint { w, d } : emprise visée en mètres (w selon x, d selon z, rotation 0 ; le personnage
//                        regarde +z), heightM : hauteur visée (m)
//   coverType, traversalType : rôle de gameplay ; collision { shape, tag?, camera? } : indication
//                        pour l'assemblage (tag = étiquette de Physics.addBox : solid, cover, nobullet)
//   fallback : constructeur de World.js qui dessine l'équivalent aujourd'hui (repli si non lié)
//   map1Use : usage actuel dans la carte 1 (vérifié dans World.js) ou « prévu »
//   replacementIntent : custom (asset Frontline Legends visé), kit (le kit peut rester),
//                        procedural (reste construit par le code)
//   params : dimensions variables acceptées par un prefab paramétrique
const R = (id, family, kind, subtype, o) => ({ id, family, kind, subtype, ...o });

export const ENV_CATALOG = [
  // ---------- bâtiments ----------
  R('HOUSE_SMALL_A', 'HOUSE', 'prefab', 'small', {
    tags: ['structural', 'exterior', 'village-center', 'rural', 'full-cover', 'parametric'],
    footprint: { w: 7, d: 6 }, heightM: 6.5, params: { w: [6, 9], d: [5, 8], floors: [1, 1] },
    coverType: 'full', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'house', map1Use: 'maisons à un étage : 10 (village, moulin, ferme), 6 × 5 à 9 × 7 m', replacementIntent: 'custom',
    notes: 'Maison pleine : murs, toit à deux pans, porte, fenêtres, cheminée facultative.',
  }),
  R('HOUSE_MEDIUM_A', 'HOUSE', 'prefab', 'medium', {
    tags: ['structural', 'exterior', 'village-center', 'full-cover', 'parametric'],
    footprint: { w: 8, d: 7 }, heightM: 9.5, params: { w: [6, 9], d: [7, 9], floors: [2, 2] },
    coverType: 'full', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'house', map1Use: 'maisons à deux étages : 13 (village, ferme), 6 × 7 à 9 × 9 m', replacementIntent: 'custom',
    notes: 'Balcon au-dessus de la porte (boîte caméra), jardinières.',
  }),
  R('HOUSE_LARGE_A', 'HOUSE', 'prefab', 'large', {
    tags: ['structural', 'exterior', 'village-center', 'full-cover'],
    footprint: { w: 12, d: 8 }, heightM: 10, coverType: 'full', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'house', map1Use: 'grande maison près du clocher (19,5 ; 31)', replacementIntent: 'custom',
  }),
  R('HOUSE_TOWER_A', 'HOUSE', 'prefab', 'tower', {
    tags: ['structural', 'exterior', 'village-center', 'full-cover', 'verticality'],
    footprint: { w: 5, d: 5 }, heightM: 12, coverType: 'full', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: null, map1Use: 'prévu', replacementIntent: 'custom',
    notes: 'Maison-tour étroite (verticalité visuelle) ; intérieur ou toit praticable seulement sur décision (faiblesse « pas de verticalité »).',
  }),
  R('TOWER_BELL_A', 'TOWER', 'prefab', 'bell', {
    tags: ['structural', 'exterior', 'landmark', 'village-center', 'full-cover'],
    footprint: { w: 5, d: 5 }, heightM: 19, coverType: 'full', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'bellTower', map1Use: 'clocher du village (10 ; 30), repère de B', replacementIntent: 'custom',
    notes: 'Repère visuel à ne jamais masquer (LEVEL-DESIGN).',
  }),
  R('LANDMARK_WINDMILL_A', 'LANDMARK', 'prefab', 'windmill', {
    tags: ['structural', 'exterior', 'landmark', 'mill', 'animated', 'full-cover'],
    footprint: { w: 6, d: 6 }, heightM: 14, coverType: 'full', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'buildWindmill', map1Use: 'moulin du drapeau A (-75 ; -3), ailes animées', replacementIntent: 'custom',
    notes: 'Les ailes tournent (animation du code) : un asset doit séparer le corps et le moyeu des ailes.',
  }),
  R('LANDMARK_BARN_A', 'LANDMARK', 'prefab', 'barn', {
    tags: ['structural', 'exterior', 'landmark', 'farm', 'full-cover'],
    footprint: { w: 14, d: 9 }, heightM: 10, coverType: 'full', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'buildFarm', map1Use: 'grange du drapeau C (76 ; 20)', replacementIntent: 'custom',
  }),
  R('LANDMARK_WATER_TOWER_A', 'LANDMARK', 'prefab', 'water-tower', {
    tags: ['exterior', 'landmark', 'farm'],
    footprint: { w: 3, d: 3 }, heightM: 10, coverType: 'soft', traversalType: 'blocking', collision: { shape: 'boxes', tag: 'solid' },
    fallback: 'buildFarm', map1Use: 'château d\'eau de la ferme (58 ; -2) : 4 pieds', replacementIntent: 'kit',
  }),
  R('LANDMARK_FOUNTAIN_A', 'LANDMARK', 'prefab', 'fountain', {
    tags: ['exterior', 'landmark', 'plaza', 'village-center', 'low-cover'],
    footprint: { w: 5, d: 5 }, heightM: 2.6, coverType: 'low', traversalType: 'blocking', collision: { shape: 'boxes', tag: 'solid' },
    fallback: 'fountain', map1Use: 'fontaine au centre de B (0 ; 2) ; le mât du drapeau B est décalé à cause d\'elle', replacementIntent: 'custom',
  }),

  // ---------- modules de bâtiment (pièces des prefabs) ----------
  R('ROOF_TILE_MEDIUM_A', 'ROOF', 'module', 'gable-tile', {
    tags: ['structural', 'exterior'], footprint: { w: 8, d: 7 }, heightM: 2.6,
    coverType: 'none', traversalType: 'blocking', collision: { shape: 'none' },
    fallback: 'gableRoof', map1Use: 'toits à deux pans en tuiles des maisons', replacementIntent: 'kit',
    notes: 'La collision est celle du prefab (boîte de la maison jusqu\'au faîtage).',
  }),
  R('BALCONY_STRAIGHT_A', 'BALCONY', 'module', 'straight', {
    tags: ['exterior', 'straight', 'decorative'], footprint: { w: 1.8, d: 0.75 }, heightM: 0.9,
    coverType: 'none', traversalType: 'blocking', collision: { shape: 'none', camera: true },
    fallback: 'house', map1Use: 'balcon en fer forgé au-dessus de la porte (maisons à étage)', replacementIntent: 'kit',
    notes: 'Boîte caméra seulement (la caméra ne traverse pas le balcon).',
  }),
  R('BALCONY_CORNER_A', 'BALCONY', 'module', 'corner', {
    tags: ['exterior', 'corner', 'decorative'], footprint: { w: 1.8, d: 1.8 }, heightM: 0.9,
    coverType: 'none', traversalType: 'blocking', collision: { shape: 'none', camera: true },
    fallback: null, map1Use: 'prévu', replacementIntent: 'kit',
  }),
  R('DOOR_WOOD_A', 'DOOR', 'module', 'wood', {
    tags: ['exterior', 'decorative'], footprint: { w: 1.5, d: 0.2 }, heightM: 2.5,
    coverType: 'none', traversalType: 'blocking', collision: { shape: 'none' },
    fallback: 'house', map1Use: 'portes des maisons (fermées, décor)', replacementIntent: 'kit',
  }),
  R('WINDOW_SHUTTER_A', 'WINDOW', 'module', 'shutter', {
    tags: ['exterior', 'decorative'], footprint: { w: 1.9, d: 0.15 }, heightM: 1.3,
    coverType: 'none', traversalType: 'blocking', collision: { shape: 'none' },
    fallback: 'house', map1Use: 'fenêtres à volets des maisons', replacementIntent: 'kit',
  }),
  R('PROP_CHIMNEY_A', 'PROP', 'module', 'chimney', {
    tags: ['exterior', 'decorative'], footprint: { w: 0.9, d: 0.9 }, heightM: 1.8,
    coverType: 'none', traversalType: 'blocking', collision: { shape: 'none' },
    fallback: 'house', map1Use: 'cheminées (≈ 60 % des maisons)', replacementIntent: 'kit',
  }),
  R('FLOOR_TERRACE_A', 'FLOOR', 'module', 'terrace', {
    tags: ['structural', 'exterior', 'verticality'], footprint: { w: 4, d: 4 }, heightM: 0.3,
    coverType: 'none', traversalType: 'walkable', collision: { shape: 'box', tag: 'solid' },
    fallback: null, map1Use: 'prévu', replacementIntent: 'kit',
    notes: 'Sol praticable en hauteur : seulement avec une décision sur la verticalité (IA, caméra, navigation).',
  }),

  // ---------- murs, clôtures, passages ----------
  R('WALL_LOW_STONE_A', 'WALL', 'prefab', 'low-stone', {
    tags: ['exterior', 'straight', 'rural', 'low-cover', 'parametric'],
    footprint: { w: 2, d: 0.7 }, heightM: 0.9, params: { length: [2, 40] },
    coverType: 'low', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'stoneWall', map1Use: 'murets de pierre entre les champs et devant A et C (segments de 2 m)', replacementIntent: 'kit',
  }),
  R('WALL_HIGH_STONE_A', 'WALL', 'prefab', 'high-stone', {
    tags: ['exterior', 'straight', 'village-center', 'full-cover', 'parametric'],
    footprint: { w: 2, d: 0.6 }, heightM: 2.4, params: { length: [2, 30] },
    coverType: 'full', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: null, map1Use: 'prévu', replacementIntent: 'kit',
    notes: 'Murs de cour : coupent les lignes de vue de plus de 80 m (LEVEL-DESIGN) sans bloquer les routes.',
  }),
  R('ARCH_SMALL_A', 'ARCH', 'prefab', 'small', {
    tags: ['structural', 'exterior', 'village-center', 'infantry-only'],
    footprint: { w: 3, d: 0.8 }, heightM: 3.2, coverType: 'full', traversalType: 'passable', collision: { shape: 'boxes', tag: 'solid' },
    fallback: null, map1Use: 'prévu', replacementIntent: 'kit',
    notes: 'Passage piéton dans un mur (piliers solides, ouverture libre) : jamais sur une route de véhicules.',
  }),
  R('FENCE_WOOD_A', 'FENCE', 'prefab', 'wood', {
    tags: ['exterior', 'straight', 'farm', 'soft-cover', 'parametric'],
    footprint: { w: 2.2, d: 0.2 }, heightM: 1.2, params: { length: [2, 30] },
    coverType: 'soft', traversalType: 'blocking', collision: { shape: 'box', tag: 'nobullet' },
    fallback: 'fence', map1Use: 'clôtures de la ferme (les balles passent)', replacementIntent: 'kit',
  }),
  R('STAIRS_EXTERIOR_STRAIGHT_A', 'STAIRS', 'prefab', 'exterior-straight', {
    tags: ['structural', 'exterior', 'straight', 'infantry-only', 'verticality'],
    footprint: { w: 1.2, d: 3.5 }, heightM: 3, coverType: 'none', traversalType: 'climbable', collision: { shape: 'boxes', tag: 'solid' },
    fallback: null, map1Use: 'prévu', replacementIntent: 'kit',
    notes: 'Seulement avec une décision sur la verticalité : la physique actuelle ne gère que des marches de 0,45 m (STEP).',
  }),

  // ---------- couverts de combat ----------
  R('COVER_SANDBAG_LINE_A', 'COVER', 'prefab', 'sandbag-line', {
    tags: ['exterior', 'straight', 'low-cover', 'base', 'plaza', 'parametric'],
    footprint: { w: 4, d: 0.7 }, heightM: 0.95, params: { length: [2, 14] },
    coverType: 'low', traversalType: 'blocking', collision: { shape: 'box', tag: 'cover' },
    fallback: 'sandbags', map1Use: 'sacs de sable (place, A, C, bases) : étiquette « cover » utilisée par les bots', replacementIntent: 'custom',
  }),
  R('COVER_CRATE_A', 'COVER', 'prefab', 'crate', {
    tags: ['exterior', 'low-cover', 'base', 'plaza', 'farm'],
    footprint: { w: 1.1, d: 1.1 }, heightM: 1.1, coverType: 'low', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'crate', map1Use: 'caisses (place, moulin, ferme, bases), empilables', replacementIntent: 'kit',
  }),
  R('COVER_BARREL_A', 'COVER', 'prefab', 'barrel', {
    tags: ['exterior', 'low-cover', 'base', 'plaza', 'farm'],
    footprint: { w: 0.85, d: 0.85 }, heightM: 1.1, coverType: 'low', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'barrel', map1Use: 'tonneaux (place, ferme, bases)', replacementIntent: 'kit',
  }),
  R('COVER_HAYBALE_A', 'COVER', 'prefab', 'haybale', {
    tags: ['exterior', 'high-cover', 'farm', 'mill'],
    footprint: { w: 1.5, d: 1.3 }, heightM: 1.5, coverType: 'high', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'hayBale', map1Use: 'bottes de foin (moulin, ferme)', replacementIntent: 'kit',
  }),

  // ---------- accessoires ----------
  R('PROP_MARKET_STALL_A', 'PROP', 'prefab', 'market-stall', {
    tags: ['exterior', 'plaza', 'village-center', 'low-cover'],
    footprint: { w: 3, d: 1.2 }, heightM: 2.6, coverType: 'low', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'stall', map1Use: 'étals du marché sur la place (B), collision à 1 m', replacementIntent: 'kit',
  }),
  R('PROP_TABLE_PARASOL_A', 'PROP', 'prefab', 'table-parasol', {
    tags: ['exterior', 'plaza', 'village-center', 'decorative'],
    footprint: { w: 1, d: 1 }, heightM: 2.8, coverType: 'none', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'parasolTable', map1Use: 'tables à parasol de la place (B), collision à 0,8 m', replacementIntent: 'kit',
  }),
  R('PROP_TROUGH_A', 'PROP', 'prefab', 'trough', {
    tags: ['exterior', 'farm', 'low-cover'],
    footprint: { w: 3, d: 1 }, heightM: 0.8, coverType: 'low', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'buildFarm', map1Use: 'abreuvoir de la ferme (72 ; -2)', replacementIntent: 'kit',
  }),
  R('PROP_TENT_A', 'PROP', 'prefab', 'tent', {
    tags: ['exterior', 'base', 'team'],
    footprint: { w: 5.2, d: 5 }, heightM: 2.6, coverType: 'full', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'buildBase', map1Use: 'tentes des bases, emblème d\'équipe', replacementIntent: 'custom',
    notes: 'L\'emblème d\'équipe (D-011) reste posé par le code.',
  }),

  // ---------- végétation et décor naturel ----------
  R('VEGETATION_TREE_ROUND_A', 'VEGETATION', 'prefab', 'tree-round', {
    tags: ['natural', 'foliage', 'rural', 'soft-cover'],
    footprint: { w: 3, d: 3 }, heightM: 4, coverType: 'soft', traversalType: 'blocking', collision: { shape: 'trunk', tag: 'solid', camera: true },
    fallback: 'oliveTree', map1Use: 'oliviers (≈ 120, dispersés à graine fixe)', replacementIntent: 'kit',
    notes: 'Tronc solide de 0,6 m ; ramure = boîtes caméra seulement.',
  }),
  R('VEGETATION_TREE_TALL_A', 'VEGETATION', 'prefab', 'tree-tall', {
    tags: ['natural', 'foliage', 'roadside', 'rural'],
    footprint: { w: 2, d: 2 }, heightM: 8, coverType: 'none', traversalType: 'blocking', collision: { shape: 'trunk', tag: 'solid', camera: true },
    fallback: 'cypress', map1Use: 'cyprès (allées des routes nord et sud, dispersés)', replacementIntent: 'kit',
  }),
  R('VEGETATION_BUSH_A', 'VEGETATION', 'prefab', 'bush', {
    tags: ['natural', 'foliage', 'rural', 'vehicle-safe', 'soft-cover'],
    footprint: { w: 1.6, d: 1.6 }, heightM: 0.9, coverType: 'soft', traversalType: 'passable', collision: { shape: 'none' },
    fallback: 'bush', map1Use: 'buissons (sans collision)', replacementIntent: 'kit',
  }),
  R('VEGETATION_BACKDROP_TREE_A', 'VEGETATION', 'prefab', 'backdrop-tree', {
    tags: ['natural', 'foliage', 'backdrop'],
    footprint: { w: 7, d: 7 }, heightM: 8, coverType: 'none', traversalType: 'passable', collision: { shape: 'none' },
    fallback: 'buildScatter', map1Use: 'arbres hors limites (décor lointain)', replacementIntent: 'kit',
  }),
  R('DECOR_ROCK_A', 'DECOR', 'prefab', 'rock', {
    tags: ['natural', 'rural', 'low-cover'],
    footprint: { w: 2, d: 1.6 }, heightM: 0.8, coverType: 'low', traversalType: 'blocking', collision: { shape: 'box', tag: 'solid' },
    fallback: 'rock', map1Use: 'rochers (collision seulement au-delà d\'1 m)', replacementIntent: 'kit',
  }),
  R('DECOR_VEHICLE_PAD_A', 'DECOR', 'prefab', 'vehicle-pad', {
    tags: ['base', 'vehicle-safe', 'decorative'],
    footprint: { w: 6.8, d: 6.8 }, heightM: 0.12, coverType: 'none', traversalType: 'step', collision: { shape: 'none' },
    fallback: 'buildBase', map1Use: 'plateformes des véhicules des bases', replacementIntent: 'procedural',
  }),
];
