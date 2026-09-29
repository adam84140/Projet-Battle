// Étape M3 : matériau d'équipe des personnages de production (src/character/teamMaterial.js).
// Masque d'équipe du contrat (8 codes), bleu / rouge depuis un seul asset, emblèmes en décalque,
// COLOR_0 jamais affiché, LOD et accessoires, transparence, puis essai en partie.
// Données synthétiques générées à l'exécution (rien de binaire versionné).
// Usage : npm run test:material      Sorties : test-results/material/ (planches, capture, mesures).
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer, launch, step, Checks } from './lib.mjs';
import { parseAsset, validateAsset } from './check-glb.mjs';
import { TEAM_MASK, decodeMask, RIG_CONTRACT_VERSION } from '../src/character/rigContract.js';

const C = new Checks('Matériau d\'équipe (M3)');
const dir = fileURLToPath(new URL('../test-results/material/', import.meta.url));
mkdirSync(dir, { recursive: true });
const savePng = (name, dataUrl) => writeFileSync(dir + name, Buffer.from(dataUrl.split(',')[1], 'base64'));
const metrics = { date: new Date().toISOString(), contract: RIG_CONTRACT_VERSION };
const close = (a, b, tol = 2) => a.every((v, k) => Math.abs(v - b[k]) <= tol);

// ---------- 1. Contrat (sans navigateur) ----------
{
  const combos = TEAM_MASK.codes.map((c) => c.rgb.join(''));
  C.ok('contrat : 8 codes de masque, un par combinaison de 0 et 1, sans doublon', combos.length === 8 && new Set(combos).size === 8 && TEAM_MASK.codes.every((c) => c.rgb.every((v) => v === 0 || v === 1)), TEAM_MASK.codes.map((c) => `${c.paint}=${c.zone}`).join(', '));
  C.ok('contrat : décodage stable (valeurs arrondies à 0,5)', TEAM_MASK.codes.every((c) => decodeMask(...c.rgb.map((v) => (v ? 0.8 : 0.2))).zone === c.zone));
  C.ok('contrat : gris de référence de l\'atlas défini (sRGB)', TEAM_MASK.referenceGrey === 204, `#${TEAM_MASK.referenceGrey.toString(16).repeat(3).toUpperCase()}`);
}

const { server, url } = await startServer();
const { browser, page, errors } = await launch();
const mat = (fn, ...args) => page.evaluate(([fn, args]) => window.__mat[fn](...args), [fn, args]);

try {
  await page.goto(url + '/tests/material.html');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });

  // ---------- 2. Couleurs exactes de chaque zone ----------
  metrics.swatches = {};
  for (const [label, team, custom] of [['bleu', 'blue', {}], ['rouge', 'red', {}], ['rouge, teint et cheveux choisis', 'red', { skin: 0x8a5634, hair: 0xc9a25a }]]) {
    const r = (metrics.swatches[label] = await mat('swatches', team, custom));
    const worst = Math.max(...r.rows.map((x) => x.diff));
    C.ok(`[${label}] chaque zone rend exactement sa couleur (12 cas : neutre, principale, secondaire, peau, cheveux, 3 emblèmes dedans / dehors, gris sombre)`, worst <= 2, `écart max ${worst} niveau(x) ; ${r.rows.filter((x) => x.diff > 2).map((x) => `${x.name} ${x.got}/${x.want}`).join(' | ') || 'tous identiques au matériau de référence'}`);
  }

  // ---------- 3. COLOR_0 jamais affiché ----------
  const leak = (metrics.colorLeak = await mat('colorLeak'));
  C.ok('COLOR_0 : chargé tel quel, GLTFLoader l\'affiche comme couleur (danger reproduit)', leak.raw.vertexColors === true && leak.raw.hasColor && Math.max(...leak.rawPixel) < 20, `pixel ${leak.rawPixel}`);
  C.ok('COLOR_0 : avec le matériau d\'équipe, renommé en masque et jamais affiché (couleur de l\'atlas)', close(leak.teamPixel, leak.atlasPixel) && !leak.prepared.vertexColors && !leak.prepared.hasColor && leak.prepared.hasMask && leak.prepared.hasEmblemUv, `pixel ${leak.teamPixel}, atlas ${leak.atlasPixel}`);
  const miss = (metrics.missingMask = await mat('missingMask'));
  C.ok('asset sans masque (stade prototype, LOD simple) : zone neutre explicite, couleur de l\'atlas', close(miss.got, miss.want) && miss.mask.join() === '0,0,0,1' && miss.emblemUv, `pixel ${miss.got}, masque ${miss.mask}`);

  // ---------- 4. Emblèmes ----------
  const em = (metrics.emblems = await mat('emblemShapes'));
  C.ok('emblèmes : même zone, aigle pour les Aigles, étoile pour la Légion (D-011), à l\'endroit', ['blue', 'red'].every((t) => em[t].iou >= 0.85 && em[t].iou - em[t].iouFlipped >= 0.1 && em[t].iou - em[t].iouOther >= 0.1), JSON.stringify(em));

  // ---------- 5. LOD, accessoires, transparence ----------
  const lod = (metrics.lods = await mat('lods'));
  C.ok('LOD0, LOD1, LOD2 et accessoire : un seul matériau partagé, LOD sans masque préparé en zone neutre', lod.sameMaterial && lod.materials === 1 && lod.lod2Prepared && close(lod.lod0, lod.primaryRef) && close(lod.lod1, lod.primaryRef) && !close(lod.lod2, lod.primaryRef, 20) && !close(lod.acc, lod.primaryRef, 20), JSON.stringify(lod));
  const gh = (metrics.ghost = await mat('ghost'));
  C.ok('variante transparente et clone du camouflage actuel (Character.setOpacity) : teinte conservée, transparence active', gh.transparent && gh.sameSource && gh.uniforms && [gh.ghost, gh.clone].every((p) => p[2] < gh.opaque[2] && p[2] > 20 && p[2] > p[0]) && close(gh.clone, gh.ghost), JSON.stringify(gh));

  // ---------- 6. Asset synthétique complet (GLB exporté puis rechargé) ----------
  // a) proportions du gameplay : bleu comparé au personnage actuel (M1)
  const exO = await page.evaluate(() => window.__rig.exportFixture('assaut', 'blue', 'orientation'));
  const aO = parseAsset(Buffer.from(exO.base64, 'base64'));
  const vO = validateAsset(aO, { stage: 'prototype' });
  const m1 = await page.evaluate(() => window.__probe.renderLineup('assaut', 'blue', false, 'm1'));
  const m3 = await page.evaluate((b) => window.__rig.renderRigLineup('assaut', 'blue', { glb: b, backpack: false }), exO.base64);
  const cmp = await page.evaluate(([a, b]) => window.__probe.compareImages(a, b), [m1, m3]);
  savePng('bleu-m1.png', m1);
  savePng('bleu-m3.png', m3);
  savePng('bleu-m1-m3-diff.png', cmp.diffImage);
  delete cmp.diffImage;
  metrics.m1Parity = cmp;
  // (ce squelette garde la hauteur actuelle de 1,94 m : le validateur ne refuse que la taille)
  C.ok('[GLB, un fichier] bleu = personnage actuel (M1) : atlas gris × teinte = couleurs d\'origine (écarts limités aux emblèmes en décalque)', vO.errors.every((e) => e.code === 'TAILLE') && cmp.differingPct <= 1 && cmp.over32Pct <= 0.2, `${cmp.differingPct} % de pixels différents, ${cmp.over32Pct} % au-delà de 32 niveaux`);

  // b) Master Assault simulé (1,85 m) : partage et zones
  const ex = await page.evaluate(() => window.__rig.exportFixture('assaut', 'blue', 'proportions'));
  writeFileSync(`${dir}fixture-assaut.glb`, Buffer.from(ex.base64, 'base64'));
  const sh = (metrics.sharing = await mat('sharing', ex.base64));
  C.ok('un asset pour 16 soldats bleus et rouges : géométrie et atlas partagés, un matériau par aspect, aucun programme de shader en plus', sh.sharedGeometry && sh.sharedAtlas && sh.sourceKept && sh.materialsDefault === 2 && sh.materials === sh.distinctLooks && sh.programsAfter === sh.programsBase && sh.emblemTextures === 2 && sh.teamColorsOk && sh.vertexColorsOff, JSON.stringify(sh));
  const zc = await mat('zoneChanges', ex.base64);
  for (const [k, v] of Object.entries(zc.images)) savePng(`zones-${k}.png`, v);
  delete zc.images;
  metrics.zoneChanges = zc;
  C.ok('bleu → rouge : seules les zones d\'équipe changent (chemise, teinte sombre, emblèmes)', zc.team.changedPct > 1 && zc.team.outsidePct <= 0.2, JSON.stringify(zc.team));
  C.ok('teint et cheveux : seules les zones de peau et de cheveux changent', zc.custom.changedPct > 0.5 && zc.custom.outsidePct <= 0.2, JSON.stringify(zc.custom));

  // ---------- 7. En partie : tous les soldats habillés de l'asset synthétique ----------
  await page.goto(url + '/index.html?autotest');
  await page.waitForSelector('#menu.on', { timeout: 120000 });
  await page.click('[data-act="play"]');
  await page.click('[data-act="start"]');
  await page.waitForSelector('#deploy.on');
  await step(page, 1);
  await page.click('[data-act="deploy"]');
  await step(page, 2);
  const live = await page.evaluate(async (b64) => (await import('/tests/material-probe.js')).dressGame(window.__game, b64, 600), ex.base64);
  metrics.live = live;
  await page.screenshot({ path: `${dir}partie.png` });
  C.ok('en partie 8v8 (20 s) : chaque soldat habillé de l\'asset à la couleur de son équipe (camouflage compris), un matériau partagé par aspect, sans exception', live.exceptions === 0 && live.wrongTeam === 0 && live.soldiers >= 16 && live.materials === live.distinctLooks && live.camouflagedFrames > 0, JSON.stringify(live));
  C.ok('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  C.ok('exécution sans exception', false, e.message);
} finally {
  writeFileSync(dir + 'metrics.json', JSON.stringify(metrics, null, 1));
  await browser.close();
  await server.close();
}
console.log(`Mesures : ${dir}metrics.json`);
process.exit(C.summary() ? 0 : 1);
