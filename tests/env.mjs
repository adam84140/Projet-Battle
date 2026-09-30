// Environnement de la carte 1 (D-024) : registre sémantique, garde contre les chemins de
// fournisseur, outils d'ingestion et d'inventaire, empreinte des ancres de gameplay, chargeur.
// Le kit tiers réel n'est pas nécessaire : un KIT D'ESSAI SYNTHÉTIQUE (boîtes, noms « Fixture »)
// est généré à chaque exécution dans test-results/env/ (donnée de test, rien de versionné).
// Usage : npm run test:env [-- --update-baseline]
//   --update-baseline : réécrit tests/baselines/map1-anchors.json (seulement pour un changement
//   VOULU des collisions ou de la navigation, décrit dans docs/ et DECISIONS.md)
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { startServer, launch, Checks } from './lib.mjs';
import { ENV_CATALOG } from '../src/environment/catalog.js';
import { createRegistry, validateCatalog, validatePack } from '../src/environment/registry.js';
import { ENV_PACKS } from '../src/environment/kits/index.js';
import { ingest, sha256 } from '../tools/env-kit/ingest.mjs';
import { inventory, inventoryMarkdown } from '../tools/env-kit/inventory.mjs';

const C = new Checks('Environnement carte 1');
const REPO = fileURLToPath(new URL('..', import.meta.url));
const dir = join(REPO, 'test-results', 'env');
const baselineFile = join(REPO, 'tests', 'baselines', 'map1-anchors.json');
const UPDATE = process.argv.includes('--update-baseline');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const metrics = { date: new Date().toISOString() };

// ---------- kit d'essai synthétique (imite une archive : glTF/, Textures/, FBX/, licence) ----------
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
function fixtureModel(file, [w, h, d], { translate = [0, 0, 0], texture = null, missingBin = false } = {}) {
  const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0).toNonIndexed();
  const pos = new Float32Array(g.attributes.position.array);
  const bin = Buffer.from(pos.buffer);
  const base = file.replace(/\.gltf$/, '');
  const box = new THREE.Box3().setFromBufferAttribute(g.attributes.position);
  const json = {
    asset: { version: '2.0', generator: 'Frontline Legends — kit d\'essai synthétique (tests/env.mjs)' },
    scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ name: 'fixture', mesh: 0, ...(translate.some(Boolean) ? { translation: translate } : {}) }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, ...(texture ? { material: 0 } : {}) }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: box.min.toArray(), max: box.max.toArray() }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.length }],
    buffers: [{ uri: missingBin ? `${basename(base)}_missing.bin` : `${basename(base)}.bin`, byteLength: bin.length }],
  };
  if (texture) {
    json.materials = [{ name: 'M_fixture', pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }];
    json.textures = [{ source: 0 }];
    json.images = [{ uri: texture }];
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(json));
  if (!missingBin) writeFileSync(base + '.bin', bin);
}
const basename = (p) => p.split(/[\\/]/).pop();
const src = join(dir, 'source', 'FixtureKit');
const G = join(src, 'glTF');
fixtureModel(join(G, 'Floor_FixtureTile.gltf'), [4, 0.2, 4]);
fixtureModel(join(G, 'Prop_FixtureCrate.gltf'), [1, 1, 1], { texture: '../Textures/fixture_atlas.png' });
fixtureModel(join(G, 'Stairs_FixtureStraight.gltf'), [1.2, 2, 3]);
fixtureModel(join(G, 'Roof_FixtureGable.gltf'), [4, 2, 4], { translate: [0, 3, 0] });
fixtureModel(join(G, 'HoleCover_FixturePatch.gltf'), [1, 1, 0.1]);
fixtureModel(join(G, 'Prop_FixtureWagonLarge.gltf'), [2, 2.5, 4], { texture: '../Textures/fixture_atlas.png' });
fixtureModel(join(G, 'Mystery_Fixture.gltf'), [1, 1, 1]);
fixtureModel(join(G, 'Prop_FixtureBroken.gltf'), [1, 1, 1], { missingBin: true });
fixtureModel(join(G, 'Prop_FixtureCentimeters.gltf'), [100, 100, 100]);
mkdirSync(join(src, 'Textures'), { recursive: true });
writeFileSync(join(src, 'Textures', 'fixture_atlas.png'), Buffer.from(PNG_1PX, 'base64'));
mkdirSync(join(src, 'FBX'), { recursive: true });
writeFileSync(join(src, 'FBX', 'Prop_FixtureCrate.fbx'), 'non copié');
mkdirSync(join(src, '__MACOSX'), { recursive: true });
writeFileSync(join(src, '__MACOSX', 'junk'), 'ignoré');
writeFileSync(join(src, 'License_Fixture.txt'), 'Licence du kit d\'essai synthétique (test seulement).');

// ---------- 1. Catalogue et registre (sans navigateur) ----------
{
  const errors = validateCatalog();
  const families = [...new Set(ENV_CATALOG.map((r) => r.family))];
  C.ok('catalogue sémantique valide (identifiants, familles, étiquettes, emprise, hauteur, couvert, franchissement, collision, usage)', errors.length === 0, errors.length ? errors.slice(0, 4).join(' | ') : `${ENV_CATALOG.length} identifiants, ${families.length} familles`);
  const world = readFileSync(join(REPO, 'src', 'game', 'World.js'), 'utf8');
  const builders = new Set([...world.matchAll(/^ {2}([a-zA-Z]+)\(/gm)].map((m) => m[1]));
  const missing = ENV_CATALOG.filter((r) => r.fallback && !builders.has(r.fallback)).map((r) => `${r.id}→${r.fallback}`);
  const noFallback = ENV_CATALOG.filter((r) => !r.fallback && r.map1Use !== 'prévu').map((r) => r.id);
  C.ok('chaque identifiant utilisé par la carte 1 désigne son constructeur actuel dans World.js (repli)', missing.length === 0 && noFallback.length === 0, missing.concat(noFallback).join(', ') || `${ENV_CATALOG.filter((r) => r.fallback).length} liés à un constructeur, ${ENV_CATALOG.filter((r) => r.map1Use === 'prévu').length} prévus`);
  const reg = createRegistry(ENV_CATALOG, ENV_PACKS);
  const packErrors = reg.validate();
  const kit = ENV_PACKS.find((p) => p.id === 'medieval-village-megakit');
  C.ok('paquet du kit village déclaré, licence attendue, aucune liaison tant que le kit n\'est pas livré', !!kit && packErrors.length === 0 && kit.license.file && Object.keys(kit.bindings).length === 0 && reg.list({ status: 'bound' }).length === 0, `${kit?.status} ; ${reg.list({ status: 'unbound' }).length} identifiants non liés`);
  // cas refusés
  const neg = [
    ['identifiant hors convention', validateCatalog([{ ...ENV_CATALOG[0], id: 'maison' }])],
    ['identifiant en double', validateCatalog([ENV_CATALOG[0], ENV_CATALOG[0]])],
    ['étiquette hors vocabulaire', validateCatalog([{ ...ENV_CATALOG[0], tags: ['joli'] }])],
    ['emprise manquante', validateCatalog([{ ...ENV_CATALOG[0], footprint: null }])],
    ['liaison vers un identifiant inconnu', validatePack({ ...kit, bindings: { MAISON_X_A: { path: 'a.gltf' } } })],
    ['chemin absolu', validatePack({ ...kit, bindings: { COVER_CRATE_A: { path: '/tmp/a.gltf' } } })],
    ['adresse externe', validatePack({ ...kit, bindings: { COVER_CRATE_A: { path: 'https://x.test/a.gltf' } } })],
    ['remontée « .. »', validatePack({ ...kit, bindings: { COVER_CRATE_A: { path: '../a.gltf' } } })],
    ['fichier qui n\'est pas un modèle', validatePack({ ...kit, bindings: { COVER_CRATE_A: { path: 'a.png' } } })],
    ['assemblage d\'une pièce non liée', validatePack({ ...kit, bindings: { HOUSE_SMALL_A: { parts: [{ id: 'ROOF_TILE_MEDIUM_A' }] } } })],
    ['assemblage d\'un prefab au lieu d\'un module', validatePack({ ...kit, bindings: { HOUSE_SMALL_A: { parts: [{ id: 'COVER_CRATE_A' }] }, COVER_CRATE_A: { path: 'a.gltf' } } })],
    ['paquet sans licence', validatePack({ ...kit, license: {} })],
  ];
  const notCaught = neg.filter(([, e]) => e.length === 0).map(([n]) => n);
  C.ok(`registre : ${neg.length} erreurs de catalogue ou de liaison refusées`, notCaught.length === 0, notCaught.join(', ') || neg.map(([n]) => n).join(', '));
  // priorité : un futur paquet Frontline Legends remplace le kit, identifiant par identifiant
  const fl = { id: 'frontline-legends', root: 'models/env/', priority: 100, license: { file: 'LICENSE' }, bindings: { COVER_CRATE_A: { path: 'crate.glb' } } };
  const tp = { ...kit, bindings: { COVER_CRATE_A: { path: 'glTF/a.gltf' }, COVER_BARREL_A: { path: 'glTF/b.gltf' } } };
  const r2 = createRegistry(ENV_CATALOG, [tp, fl]);
  const crate = r2.resolve('COVER_CRATE_A'), barrel = r2.resolve('COVER_BARREL_A'), house = r2.resolve('HOUSE_SMALL_A');
  C.ok('remplacement : le paquet de priorité haute gagne pour ses identifiants, le kit garde les autres, les données de gameplay ne changent pas', crate.source.pack === 'frontline-legends' && crate.source.url === 'models/env/crate.glb' && barrel.source.pack === tp.id && house.status === 'unbound' && crate.collision === ENV_CATALOG.find((r) => r.id === 'COVER_CRATE_A').collision && r2.validate().length === 0, `${crate.id}→${crate.source.pack}, ${barrel.id}→${barrel.source.pack}, ${house.id}→${house.status}`);
}

// ---------- 2. Garde : aucun chemin de fournisseur hors des paquets ----------
{
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|mjs)$/.test(e.name)) files.push(p);
    }
  };
  walk(join(REPO, 'src'));
  // code du jeu (gameplay, interface) : ni fichier de modèle, ni chemin de paquet, ni import d'un paquet ;
  // module d'environnement (registre, chargeur) : générique, aucun nom de fichier. Seuls les paquets
  // (src/environment/kits/) nomment des fichiers ; le personnage a son propre contrat (docs/characters/).
  const envDir = join(REPO, 'src', 'environment');
  const kitsDir = join(envDir, 'kits');
  const guarded = files.filter((f) => !f.startsWith(kitsDir) && !f.startsWith(join(REPO, 'src', 'character')));
  const boundPaths = ENV_PACKS.flatMap((p) => Object.values(p.bindings).filter((b) => b.path).map((b) => b.path));
  const offenders = [];
  for (const f of guarded) {
    const t = readFileSync(f, 'utf8');
    const rel = relative(REPO, f);
    const gameplay = !f.startsWith(envDir);
    if (/['"`][^'"`\n]*\.(gltf|glb)['"`]/i.test(t)) offenders.push(`${rel} : nom de fichier .gltf / .glb`);
    if (gameplay && /['"`][^'"`\n]*kits\/[^'"`\n]*['"`]/.test(t)) offenders.push(`${rel} : chemin de paquet « kits/ »`);
    if (gameplay && /environment\/kits/.test(t)) offenders.push(`${rel} : importe un paquet directement`);
    for (const bp of boundPaths) if (t.includes(bp)) offenders.push(`${rel} : chemin lié ${bp}`);
  }
  C.ok('garde D-024 : aucun nom de fichier ni chemin de kit dans le code du jeu (hors src/environment/kits/)', offenders.length === 0, offenders.slice(0, 4).join(' | ') || `${guarded.length} fichiers contrôlés`);
}

// ---------- 3. Ingestion et inventaire (kit d'essai) ----------
const kitDest = join(dir, 'public', 'kits', 'fixture-pack');
{
  const { manifest } = ingest({ from: src, pack: 'fixture-pack', dest: kitDest });
  const copied = manifest.files.map((f) => f.path);
  const identical = manifest.files.every((f) => {
    const orig = join(src, f.path);
    return existsSync(orig) && sha256(orig) === f.sha256 && statSync(join(kitDest, f.path)).size === f.bytes;
  });
  metrics.ingest = { files: manifest.totals.files, models: manifest.models, missing: manifest.missingReferences, unreferenced: manifest.unreferencedNotCopied };
  C.ok('ingestion : modèles et fichiers référencés copiés octet pour octet, chemins relatifs intacts (glTF/ et ../Textures/)', manifest.models === 9 && copied.length === 18 && identical && copied.includes('glTF/Prop_FixtureCrate.gltf') && copied.includes('glTF/Prop_FixtureCrate.bin') && copied.includes('Textures/fixture_atlas.png'), `${manifest.models} modèles, ${copied.length} fichiers`);
  C.ok('ingestion : licence copiée et empreinte notée ; FBX et fichiers parasites non copiés ; référence manquante signalée', manifest.license.length === 1 && manifest.license[0].file === 'License_Fixture.txt' && existsSync(join(kitDest, 'License_Fixture.txt')) && !existsSync(join(kitDest, 'FBX')) && !copied.some((p) => p.includes('MACOSX')) && manifest.missingReferences.length === 1, JSON.stringify({ licence: manifest.license.map((l) => l.file), manquantes: manifest.missingReferences }));
  let refusedOverwrite = false, refusedNoLicense = false;
  try {
    ingest({ from: src, pack: 'fixture-pack', dest: kitDest });
  } catch {
    refusedOverwrite = true;
  }
  const noLic = join(dir, 'source', 'SansLicence', 'glTF');
  mkdirSync(noLic, { recursive: true });
  fixtureModel(join(noLic, 'Floor_FixtureTile.gltf'), [4, 0.2, 4]);
  try {
    ingest({ from: dirname(noLic), pack: 'sans-licence', dest: join(dir, 'public', 'kits', 'sans-licence') });
  } catch {
    refusedNoLicense = !existsSync(join(dir, 'public', 'kits', 'sans-licence'));
  }
  C.ok('ingestion : refuse d\'écraser un paquet existant et refuse un kit sans licence (rien copié)', refusedOverwrite && refusedNoLicense);

  const inv = inventory({ pack: 'fixture-pack', kit: kitDest });
  const by = Object.fromEntries(inv.assets.map((a) => [a.name, a]));
  metrics.inventory = inv.summary;
  const roles = { Floor_FixtureTile: 'structural', Prop_FixtureCrate: 'cover-candidate', Stairs_FixtureStraight: 'traversal', Roof_FixtureGable: 'structural', HoleCover_FixturePatch: 'filler', Prop_FixtureWagonLarge: 'prop', Mystery_Fixture: 'unknown' };
  const wrong = Object.entries(roles).filter(([n, r]) => by[n]?.role !== r).map(([n, r]) => `${n}: ${by[n]?.role} ≠ ${r}`);
  C.ok('inventaire : familles (nom) et rôles (nom + dimensions) : structure, franchissement, bouche-trou, couvert possible, accessoire, inconnu', inv.summary.assets === 9 && wrong.length === 0 && by.HoleCover_FixturePatch.family === 'HOLE_COVER' && by.Prop_FixtureWagonLarge.keywords.includes('wagon') && by.Mystery_Fixture.family === 'UNKNOWN', wrong.join(', ') || JSON.stringify(inv.summary.roles));
  const crate = by.Prop_FixtureCrate, roof = by.Roof_FixtureGable;
  C.ok('inventaire : dimensions mesurées (transformations des nœuds comprises), triangles, pivot, textures partagées', crate.bounds.size.every((v) => Math.abs(v - 1) < 0.001) && crate.triangles === 12 && roof.bounds.min[1] === 3 && roof.notes.some((n) => n.startsWith('pivot décalé')) && crate.notes.includes('pivot au sol') && inv.summary.textures === 1 && inv.textures[0].users === 2, `caisse ${crate.bounds.size.join('×')} m, ${crate.triangles} triangles ; toit bas à ${roof.bounds.min[1]} m`);
  C.ok('inventaire : avertissements (fichier manquant, échelle suspecte) et rapport lisible', by.Prop_FixtureBroken.warnings.some((w) => w.includes('manquant')) && by.Prop_FixtureCentimeters.notes.some((n) => n.includes('échelle suspecte')) && /## Couverts possibles/.test(inventoryMarkdown(inv)));
  writeFileSync(join(dir, 'inventaire-essai.md'), inventoryMarkdown(inv));
}

// ---------- 4 et 5. Navigateur : empreinte de la carte 1, vue de dessus, chargeur ----------
const { server, url } = await startServer();
const { browser, page, errors } = await launch();
try {
  await page.goto(url + '/tests/env.html');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const fp = await page.evaluate(() => window.__env.map1Fingerprint());
  metrics.fingerprint = fp;
  const keys = ['anchors', 'relief', 'colliders', 'cameraBoxes', 'nav'];
  if (UPDATE || !existsSync(baselineFile)) {
    const base = { note: 'Empreinte de la carte 1 (tests/env.mjs). Ne se met à jour que pour un changement VOULU de collisions ou de navigation, avec une décision (docs/DECISIONS.md).', date: metrics.date.slice(0, 10) };
    for (const k of keys) base[k] = { hash: fp[k].hash, ...(fp[k].count !== undefined ? { count: fp[k].count } : {}), ...(fp[k].blocked !== undefined ? { blocked: fp[k].blocked } : {}), ...(fp[k].tags ? { tags: fp[k].tags } : {}) };
    const { buildMs, navMs, ...decor } = fp.decor; // durées : variables selon la machine, hors référence
    base.decor = decor;
    writeFileSync(baselineFile, JSON.stringify(base, null, 1) + '\n');
    console.log(`Référence écrite : ${relative(REPO, baselineFile)}`);
  }
  const base = JSON.parse(readFileSync(baselineFile, 'utf8'));
  C.ok('ancres de gameplay inchangées : bases, drapeaux A / B / C (position, rayon, mât), véhicules, routes, limites', fp.anchors.hash === base.anchors.hash, fp.anchors.points.join(' · '));
  C.ok('relief inchangé (hauteurs échantillonnées tous les 8 m)', fp.relief.hash === base.relief.hash, `${fp.relief.samples} échantillons`);
  C.ok('collisions du décor inchangées (boîtes et étiquettes solid / cover / nobullet)', fp.colliders.hash === base.colliders.hash, `${fp.colliders.count} boîtes ${JSON.stringify(fp.colliders.tags)} (référence ${base.colliders.count})`);
  C.ok('boîtes « caméra seule » inchangées (feuillages, balcons)', fp.cameraBoxes.hash === base.cameraBoxes.hash, `${fp.cameraBoxes.count} boîtes`);
  C.ok('grille de navigation des bots inchangée (cases bloquées)', fp.nav.hash === base.nav.hash, `${fp.nav.blocked} cases bloquées sur ${fp.nav.size} (${fp.nav.cell} m)`);
  const top = await page.evaluate(() => window.__env.topView(1024));
  writeFileSync(join(dir, 'map1-top.png'), Buffer.from(top.png.split(',')[1], 'base64'));
  writeFileSync(join(dir, 'map1-top.webp'), Buffer.from(top.webp.split(',')[1], 'base64'));
  metrics.topView = { calls: top.calls, size: `${top.width}x${top.height}` };
  C.ok('vue de dessus de la carte 1 rendue (ancres annotées)', top.calls > 0, `${top.width}×${top.height}, ${top.calls} appels de rendu`);

  // chargeur : paquet d'essai lié à des identifiants du catalogue
  const testPack = {
    id: 'fixture-pack', root: 'kits/fixture-pack/', priority: 10, license: { file: 'License_Fixture.txt' },
    bindings: {
      COVER_CRATE_A: { path: 'glTF/Prop_FixtureCrate.gltf', scale: 1.1 },
      ROOF_TILE_MEDIUM_A: { path: 'glTF/Roof_FixtureGable.gltf' },
      FLOOR_TERRACE_A: { path: 'glTF/Floor_FixtureTile.gltf' },
      HOUSE_SMALL_A: { parts: [{ id: 'FLOOR_TERRACE_A' }, { id: 'ROOF_TILE_MEDIUM_A', p: [0, 0.2, 0] }] },
    },
  };
  const lt = await page.evaluate(([cat, pack, base]) => window.__env.loaderTrial(cat, [pack], base, { single: 'COVER_CRATE_A', assembly: 'HOUSE_SMALL_A', unbound: 'COVER_BARREL_A' }), [ENV_CATALOG, testPack, '/test-results/env/public/']);
  metrics.loader = lt;
  C.ok('chargeur : identifiant → registre → glTF (tampon et texture externes), échelle de la liaison appliquée, géométrie partagée entre instances', lt.validate.length === 0 && lt.single.size.every((v) => Math.abs(v - 1.1) < 0.01) && lt.single.minY === 0 && lt.single.sharedGeometry && lt.single.textured && lt.single.env.id === 'COVER_CRATE_A', JSON.stringify(lt.single));
  C.ok('chargeur : assemblage de modules (prefab = pièces liées), identifiant non lié → null (décor actuel gardé), identifiant inconnu → erreur', lt.assembly.parts === 2 && lt.assembly.size[1] === 5.2 && lt.unboundResult === null && lt.unknownThrows, JSON.stringify({ assemblage: lt.assembly, nonLie: lt.unboundResult, inconnu: lt.unknownThrows }));
  C.ok('chargeur : fichiers chargés une fois, tout libéré par dispose()', lt.stats.before.files === 3 && lt.stats.after.files === 0, JSON.stringify(lt.stats));
  C.ok('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  C.ok('exécution sans exception', false, e.message);
} finally {
  writeFileSync(join(dir, 'metrics.json'), JSON.stringify(metrics, null, 1));
  await browser.close();
  await server.close();
}
console.log(`Mesures : ${relative(REPO, dir)}/metrics.json · vue de dessus : ${relative(REPO, dir)}/map1-top.png`);
process.exit(C.summary() ? 0 : 1);
