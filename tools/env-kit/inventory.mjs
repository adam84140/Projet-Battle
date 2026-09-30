// Inventaire d'un kit d'environnement ingéré (D-024) : chaque modèle mesuré et classé.
//
//   node tools/env-kit/inventory.mjs --pack <id> [--kit <dossier>] [--out <dossier>]
//
// Lit public/kits/<id>/ (ou --kit), inspecte chaque .gltf / .glb (tools/env-kit/gltf-inspect.mjs),
// classe par famille (nom) et par rôle (nom + dimensions mesurées : structure, franchissement,
// bouche-trou, couvert possible, accessoire, décoration, végétation, inconnu), puis écrit :
//   <out>/<id>.json  données complètes (lues par les outils et les tests)
//   <out>/<id>.md    inventaire lisible, groupé par rôle puis famille
// Sortie par défaut : docs/map1/inventories/. Règles : docs/map1/MAP1-ASSET-INVENTORY.md.
import { readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectGltf } from './gltf-inspect.mjs';
import { familyOf, roleOf, geometryNotes } from './families.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
export const ROLES = ['structural', 'traversal', 'filler', 'cover-candidate', 'prop', 'decoration', 'vegetation', 'unknown'];
const ROLE_LABELS = {
  structural: 'Modules de structure (bâtiments)', traversal: 'Éléments de franchissement', filler: 'Bouche-trous', 'cover-candidate': 'Couverts possibles (0,7 à 2 m)',
  prop: 'Grands accessoires', decoration: 'Petite décoration', vegetation: 'Végétation', unknown: 'Non reconnus (revue humaine)',
};

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(gltf|glb)$/i.test(e.name)) out.push(p);
  }
  return out;
}

export function inventory({ pack, kit }) {
  kit = resolve(kit ?? join(REPO, 'public', 'kits', pack));
  if (!existsSync(kit)) throw new Error(`kit introuvable : ${kit} (ingérer d'abord : tools/env-kit/ingest.mjs)`);
  const manifestFile = join(kit, 'kit-manifest.json');
  const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : null;
  const assets = walk(kit)
    .sort()
    .map((f) => {
      const info = inspectGltf(f, kit);
      const { family, keywords } = familyOf(basename(f));
      const size = info.bounds?.size ?? null;
      return { ...info, name: basename(f).replace(/\.(gltf|glb)$/i, ''), family, keywords, role: roleOf(family, keywords, size), notes: geometryNotes(info.bounds) };
    });
  const count = (key) => assets.reduce((a, x) => ((a[x[key]] = (a[x[key]] || 0) + 1), a), {});
  // grille probable des modules : dimension horizontale la plus fréquente (arrondie à 5 cm)
  const grid = {};
  for (const a of assets.filter((x) => x.role === 'structural' && x.bounds)) {
    for (const v of [a.bounds.size[0], a.bounds.size[2]]) {
      const k = (Math.round(v * 20) / 20).toFixed(2);
      if (+k >= 0.5) grid[k] = (grid[k] || 0) + 1;
    }
  }
  const gridTop = Object.entries(grid).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} m (${n})`);
  const textures = new Map();
  for (const a of assets) for (const im of a.images) textures.set(im.path, [...(textures.get(im.path) ?? []), a.name]);
  return {
    pack, generatedAt: new Date().toISOString(), kit: relative(REPO, kit).split('\\').join('/') || kit, license: manifest?.license ?? null,
    summary: {
      assets: assets.length, triangles: assets.reduce((a, x) => a + x.triangles, 0), bytes: manifest?.totals?.bytes ?? null,
      families: count('family'), roles: count('role'), textures: textures.size, gridCandidates: gridTop,
      withWarnings: assets.filter((a) => a.warnings.length).length, unknown: assets.filter((a) => a.family === 'UNKNOWN').map((a) => a.name),
    },
    textures: [...textures].map(([path, users]) => ({ path, users: users.length })),
    assets,
  };
}

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const dims = (a) => (a.bounds ? a.bounds.size.map((v) => v.toFixed(2).replace('.', ',')).join(' × ') : '—');

export function inventoryMarkdown(inv) {
  const s = inv.summary;
  const L = [];
  L.push(`# Inventaire du kit « ${inv.pack} » (généré)`, '');
  L.push(`> Généré par \`tools/env-kit/inventory.mjs\` le ${inv.generatedAt.slice(0, 10)} depuis \`${inv.kit}\`. **Ne pas modifier à la main** : relancer l'outil. Règles de classement : [MAP1-ASSET-INVENTORY](../MAP1-ASSET-INVENTORY.md).`, '');
  L.push('## Résumé', '');
  L.push(`| | |`, `| --- | --- |`);
  L.push(`| Modèles | ${s.assets} |`, `| Triangles (total) | ${fmt(s.triangles)} |`);
  if (s.bytes) L.push(`| Taille des fichiers | ${(s.bytes / 1048576).toFixed(1).replace('.', ',')} Mo |`);
  L.push(`| Textures distinctes | ${s.textures} |`);
  L.push(`| Licence | ${inv.license ? inv.license.map((l) => '`' + l.file + '`').join(', ') : 'manifeste absent'} |`);
  L.push(`| Grille probable des modules | ${s.gridCandidates.join(', ') || '—'} |`);
  L.push(`| Familles | ${Object.entries(s.families).map(([k, n]) => `${k} ${n}`).join(' · ')} |`);
  L.push(`| Rôles | ${Object.entries(s.roles).map(([k, n]) => `${k} ${n}`).join(' · ')} |`);
  L.push(`| Avec avertissement | ${s.withWarnings} |`, '');
  for (const role of ROLES) {
    const list = inv.assets.filter((a) => a.role === role);
    if (!list.length) continue;
    L.push(`## ${ROLE_LABELS[role]} (${list.length})`, '');
    L.push('| Fichier | Famille | Mots-clés | L × H × P (m) | Triangles | Placement | Avertissements |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const a of list.sort((x, y) => x.family.localeCompare(y.family) || x.name.localeCompare(y.name))) {
      L.push(`| \`${a.file}\` | ${a.family} | ${a.keywords.join(', ') || '—'} | ${dims(a)} | ${fmt(a.triangles)} | ${a.notes.join(', ')} | ${a.warnings.join(' ; ') || '—'} |`);
    }
    L.push('');
  }
  return L.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k) => {
    const i = process.argv.indexOf(k);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  try {
    const pack = arg('--pack');
    const inv = inventory({ pack, kit: arg('--kit') });
    const out = resolve(arg('--out') ?? join(REPO, 'docs', 'map1', 'inventories'));
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, `${pack}.json`), JSON.stringify(inv, null, 1));
    writeFileSync(join(out, `${pack}.md`), inventoryMarkdown(inv));
    const s = inv.summary;
    console.log(`Inventaire ${pack} : ${s.assets} modèles, ${fmt(s.triangles)} triangles, ${s.textures} textures`);
    console.log(`  rôles : ${Object.entries(s.roles).map(([k, n]) => `${k} ${n}`).join(', ')}`);
    if (s.unknown.length) console.log(`  non reconnus : ${s.unknown.length} (revue humaine)`);
    console.log(`  → ${relative(REPO, join(out, pack + '.md'))}`);
  } catch (e) {
    console.error('✘ ' + e.message);
    process.exit(2);
  }
}
