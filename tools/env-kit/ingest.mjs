// Ingestion d'un kit d'environnement tiers dans le projet (D-024).
//
//   node tools/env-kit/ingest.mjs --from <dossier du kit décompressé> --pack <id> [--dest <dossier>] [--license <fichier>] [--force]
//
// - Copie tous les .gltf / .glb trouvés sous --from ET chaque fichier qu'ils référencent (.bin,
//   textures), octet pour octet, avec les MÊMES chemins relatifs (rien n'est renommé ni aplati).
// - Copie le ou les fichiers de licence (obligatoire : sans licence, rien n'est copié).
// - Écrit kit-manifest.json (liste des fichiers, tailles, empreintes SHA-256, références manquantes).
// - Refuse d'écraser un paquet existant sans --force. Ne modifie jamais la source.
// Destination par défaut : public/kits/<id>/ (servi tel quel par Vite, chemins relatifs préservés).
// Procédure complète : docs/map1/MAP1-ASSET-INVENTORY.md.
import { readdirSync, statSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, relative, dirname, basename, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { gltfRefs } from './gltf-inspect.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const JUNK = /(^|[\\/])(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)([\\/]|$)/i;
const WARN_BYTES = 50 * 1024 * 1024; // GitHub avertit au-delà de 50 Mo par fichier
const MAX_BYTES = 100 * 1024 * 1024; // et refuse au-delà de 100 Mo

export const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (JUNK.test(p)) continue;
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function commonDir(paths) {
  const parts = paths.map((p) => dirname(p).split(sep));
  const first = parts[0];
  let n = first.length;
  for (const p of parts) {
    let k = 0;
    while (k < n && p[k] === first[k]) k++;
    n = k;
  }
  return first.slice(0, n).join(sep) || sep;
}

export function ingest({ from, pack, dest, license, force = false }) {
  if (!from || !existsSync(from) || !statSync(from).isDirectory()) throw new Error(`--from : dossier introuvable (${from}). Décompresser l'archive d'abord.`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(pack ?? '')) throw new Error('--pack : identifiant en minuscules et tirets attendu (ex. medieval-village-megakit)');
  dest = resolve(dest ?? join(REPO, 'public', 'kits', pack));
  const all = walk(resolve(from));
  const models = all.filter((f) => /\.(gltf|glb)$/i.test(f));
  if (!models.length) throw new Error('aucun fichier .gltf ou .glb sous --from');
  const licenses = license ? [resolve(license)] : all.filter((f) => /licen[cs]e/i.test(basename(f)) && /\.(txt|md|pdf|html?)$/i.test(f));
  if (!licenses.length || !licenses.every((f) => existsSync(f))) throw new Error('licence introuvable : fournir le fichier de licence du kit (--license <fichier>). Rien n\'a été copié.');
  // fermeture : modèles + fichiers référencés
  const needed = new Set(models);
  const missing = [];
  for (const m of models) {
    for (const r of gltfRefs(m)) {
      if (existsSync(r.abs)) needed.add(r.abs);
      else missing.push(`${relative(from, m)} → ${r.uri}`);
    }
  }
  const base = commonDir([...needed]);
  if (existsSync(dest) && readdirSync(dest).length) {
    if (!force) throw new Error(`destination non vide : ${relative(REPO, dest)} (--force pour réingérer)`);
    rmSync(dest, { recursive: true });
  }
  const files = [];
  const big = [];
  for (const src of [...needed].sort()) {
    const rel = relative(base, src);
    const out = join(dest, rel);
    mkdirSync(dirname(out), { recursive: true });
    copyFileSync(src, out);
    const bytes = statSync(out).size;
    if (bytes > WARN_BYTES) big.push(`${rel} (${(bytes / 1048576).toFixed(1)} Mo)`);
    files.push({ path: rel.split(sep).join('/'), bytes, sha256: sha256(out) });
  }
  const licenseFiles = licenses.map((f) => {
    const out = join(dest, basename(f));
    copyFileSync(f, out);
    return { file: basename(f), bytes: statSync(out).size, sha256: sha256(out) };
  });
  const unreferenced = all.filter((f) => !needed.has(f) && !licenses.includes(f) && f.startsWith(base + sep) && !/\.(fbx|obj|blend|mtl|dae|usdz?)$/i.test(f)).map((f) => relative(base, f).split(sep).join('/'));
  const manifest = {
    pack, ingestedAt: new Date().toISOString(), source: basename(resolve(from)), sourceSubfolder: relative(resolve(from), base).split(sep).join('/') || '.',
    license: licenseFiles, models: models.length, files, totals: { files: files.length, bytes: files.reduce((a, f) => a + f.bytes, 0) },
    missingReferences: missing, unreferencedNotCopied: unreferenced, largeFiles: big,
  };
  writeFileSync(join(dest, 'kit-manifest.json'), JSON.stringify(manifest, null, 1));
  if (files.some((f) => f.bytes > MAX_BYTES)) manifest.blocking = 'fichier de plus de 100 Mo : refusé par GitHub';
  return { dest, manifest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k) => {
    const i = process.argv.indexOf(k);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  try {
    const { dest, manifest } = ingest({ from: arg('--from'), pack: arg('--pack'), dest: arg('--dest'), license: arg('--license'), force: process.argv.includes('--force') });
    const mo = (manifest.totals.bytes / 1048576).toFixed(1);
    console.log(`Paquet ${manifest.pack} → ${relative(REPO, dest) || dest}`);
    console.log(`  ${manifest.models} modèles, ${manifest.totals.files} fichiers copiés (${mo} Mo), licence : ${manifest.license.map((l) => l.file).join(', ')}`);
    if (manifest.missingReferences.length) console.log(`  ⚠ références manquantes : ${manifest.missingReferences.length} (voir kit-manifest.json)`);
    if (manifest.largeFiles.length) console.log(`  ⚠ gros fichiers : ${manifest.largeFiles.join(', ')}`);
    if (manifest.unreferencedNotCopied.length) console.log(`  ${manifest.unreferencedNotCopied.length} fichier(s) non référencé(s) non copié(s) (liste dans kit-manifest.json)`);
    if (manifest.blocking) {
      console.log(`  ✘ ${manifest.blocking}`);
      process.exit(1);
    }
    console.log('Étape suivante : lire la licence, puis node tools/env-kit/inventory.mjs --pack ' + manifest.pack);
  } catch (e) {
    console.error('✘ ' + e.message);
    process.exit(2);
  }
}
