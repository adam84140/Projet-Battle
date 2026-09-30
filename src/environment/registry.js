// Registre des assets d'environnement : identifiant sémantique → enregistrement du catalogue →
// fichier du paquet d'assets actuel (D-024). Le jeu ne demande jamais un fichier : il demande un
// identifiant (ex. HOUSE_SMALL_A) ; le registre dit quel fichier le représente aujourd'hui.
//
// Un paquet (src/environment/kits/*.js) décrit un kit et ses liaisons :
//   { id, name, root, priority, status, license, bindings: { ID: liaison } }
// liaison : { path: chemin du modèle glTF / GLB relatif à la racine, scale?, rotY?, offset?: [x, y, z] }
//        ou { parts: [{ id: 'ID_DE_MODULE', p?: [x, y, z], rotY? }] } (assemblage de modules)
// Les chemins sont relatifs à la racine du paquet (`root`, elle-même relative à la base du site).
// Plusieurs paquets peuvent coexister : la priorité la plus haute gagne (un futur paquet
// d'assets Frontline Legends remplacera ainsi le kit tiers, identifiant par identifiant).
//
// Documentation : docs/map1/MAP1-ASSET-REGISTRY.md
import {
  ENV_CATALOG, ENV_FAMILIES, ENV_KINDS, ENV_TAGS, COVER_TYPES, TRAVERSAL_TYPES, COLLISION_SHAPES, REPLACEMENT_INTENTS, ID_PATTERN, heightCategory,
} from './catalog.js';

// Contrôle du catalogue : liste d'erreurs lisibles (vide = valide)
export function validateCatalog(catalog = ENV_CATALOG) {
  const errors = [];
  const seen = new Set();
  const inList = (v, list, what, id) => list.includes(v) || errors.push(`${id} : ${what} inconnu « ${v} »`);
  for (const r of catalog) {
    const id = r.id ?? '(sans id)';
    if (!ID_PATTERN.test(id)) errors.push(`${id} : identifiant hors convention (FAMILLE_SOUSTYPE_VARIANTE, ex. HOUSE_SMALL_A)`);
    if (seen.has(id)) errors.push(`${id} : identifiant en double`);
    seen.add(id);
    inList(r.family, ENV_FAMILIES, 'famille', id);
    if (r.family && !id.startsWith(r.family + '_')) errors.push(`${id} : l'identifiant doit commencer par sa famille (${r.family}_)`);
    inList(r.kind, ENV_KINDS, 'rôle (kind)', id);
    for (const t of r.tags ?? []) inList(t, ENV_TAGS, 'étiquette', id);
    if (!(r.footprint?.w > 0 && r.footprint?.d > 0)) errors.push(`${id} : emprise (footprint { w, d }) manquante`);
    if (!(r.heightM > 0)) errors.push(`${id} : hauteur (heightM) manquante`);
    inList(r.coverType, COVER_TYPES, 'type de couvert', id);
    inList(r.traversalType, TRAVERSAL_TYPES, 'franchissement', id);
    inList(r.collision?.shape, COLLISION_SHAPES, 'forme de collision', id);
    if (r.collision?.shape !== 'none' && !['solid', 'cover', 'nobullet'].includes(r.collision?.tag)) errors.push(`${id} : étiquette de collision attendue (solid, cover, nobullet)`);
    inList(r.replacementIntent, REPLACEMENT_INTENTS, 'intention de remplacement', id);
    if (!r.map1Use) errors.push(`${id} : usage dans la carte 1 (map1Use) manquant`);
    if (r.fallback === undefined) errors.push(`${id} : repli (fallback) non renseigné (null si aucun)`);
  }
  return errors;
}

// Un chemin de paquet : relatif, sans remontée, sans adresse externe
function relativeProblem(path) {
  if (typeof path !== 'string' || !path) return 'chemin vide';
  if (/^([a-z]+:)?\/\//i.test(path) || path.startsWith('/') || /^[a-z]:/i.test(path)) return 'chemin absolu ou externe interdit';
  if (path.split(/[\\/]/).includes('..')) return 'remontée « .. » interdite';
  return null;
}

// Fichier de modèle d'une liaison : chemin relatif vers un glTF ou un GLB
function badPath(path) {
  return relativeProblem(path) ?? (/\.(gltf|glb)$/i.test(path) ? null : 'modèle glTF ou GLB attendu');
}

// Contrôle d'un paquet par rapport au catalogue
export function validatePack(pack, catalog = ENV_CATALOG) {
  const errors = [];
  const byId = new Map(catalog.map((r) => [r.id, r]));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(pack.id ?? '')) errors.push(`paquet « ${pack.id} » : identifiant en minuscules et tirets attendu`);
  if (relativeProblem(pack.root)) errors.push(`paquet ${pack.id} : racine relative attendue (${relativeProblem(pack.root)})`);
  if (!pack.root?.endsWith('/')) errors.push(`paquet ${pack.id} : la racine doit finir par « / »`);
  if (!pack.license?.file) errors.push(`paquet ${pack.id} : fichier de licence non renseigné`);
  if (!Number.isFinite(pack.priority)) errors.push(`paquet ${pack.id} : priorité numérique attendue`);
  for (const [id, b] of Object.entries(pack.bindings ?? {})) {
    const rec = byId.get(id);
    if (!rec) {
      errors.push(`paquet ${pack.id} : liaison pour un identifiant absent du catalogue « ${id} »`);
      continue;
    }
    if (b.parts) {
      if (!Array.isArray(b.parts) || !b.parts.length) errors.push(`${id} (${pack.id}) : assemblage vide`);
      for (const part of b.parts ?? []) {
        const m = byId.get(part.id);
        if (!m) errors.push(`${id} (${pack.id}) : pièce inconnue « ${part.id} »`);
        else if (m.kind !== 'module') errors.push(`${id} (${pack.id}) : la pièce ${part.id} doit être un module`);
        else if (!pack.bindings[part.id]) errors.push(`${id} (${pack.id}) : la pièce ${part.id} n'est pas liée dans ce paquet`);
      }
    } else {
      const why = badPath(b.path);
      if (why) errors.push(`${id} (${pack.id}) : ${why} (${b.path})`);
    }
    if (b.scale !== undefined && !(b.scale > 0)) errors.push(`${id} (${pack.id}) : échelle positive attendue`);
  }
  return errors;
}

export function createRegistry(catalog = ENV_CATALOG, packs = []) {
  const byId = new Map(catalog.map((r) => [r.id, r]));
  const ordered = [...packs].sort((a, b) => b.priority - a.priority);

  // Paquet qui fournit l'identifiant (priorité la plus haute), ou null
  function binding(id) {
    for (const pack of ordered) {
      const b = pack.bindings?.[id];
      if (b) return { pack, b };
    }
    return null;
  }

  function resolve(id) {
    const rec = byId.get(id);
    if (!rec) throw new Error(`Asset d'environnement inconnu : ${id}`);
    const found = binding(id);
    let source = null;
    if (found) {
      const { pack, b } = found;
      source = b.parts
        ? { pack: pack.id, parts: b.parts.map((p) => ({ id: p.id, p: p.p ?? [0, 0, 0], rotY: p.rotY ?? 0 })) }
        : { pack: pack.id, url: pack.root + b.path, scale: b.scale ?? 1, rotY: b.rotY ?? 0, offset: b.offset ?? [0, 0, 0] };
    }
    return { ...rec, heightCategory: heightCategory(rec.heightM), status: source ? 'bound' : 'unbound', source };
  }

  return {
    catalog,
    packs: ordered,
    has: (id) => byId.has(id),
    get: (id) => byId.get(id) ?? null,
    resolve,
    // Filtre : { family, kind, tag, status }
    list(filter = {}) {
      return catalog
        .filter((r) => (!filter.family || r.family === filter.family) && (!filter.kind || r.kind === filter.kind) && (!filter.tag || r.tags.includes(filter.tag)))
        .map((r) => resolve(r.id))
        .filter((r) => !filter.status || r.status === filter.status);
    },
    validate() {
      return [...validateCatalog(catalog), ...packs.flatMap((p) => validatePack(p, catalog))];
    },
  };
}
