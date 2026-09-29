// Étape M2 : contrat du squelette de production, adaptateur, validateur GLB.
// Squelette synthétique (donnée de test générée, rien de binaire versionné) :
//  - « orientation » : mêmes proportions, repères d'os différents → doit reproduire M1 ;
//  - « proportions » : Master Assault simulé à 1,85 m, exporté en GLB, validé, rechargé, essayé.
// Usage : npm run test:rig      Sorties : test-results/rig/ (GLB, planches, mesures).
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer, launch, step, run, Checks } from './lib.mjs';
import { parseAsset, validateAsset, trs, mul } from './check-glb.mjs';
import { REQUIRED_BONES, OPTIONAL_BONES, SOCKETS, runtimeName } from '../src/character/rigContract.js';

const C = new Checks('Squelette de production (M2)');
const dir = fileURLToPath(new URL('../test-results/rig/', import.meta.url));
mkdirSync(dir, { recursive: true });
const savePng = (name, dataUrl) => writeFileSync(dir + name, Buffer.from(dataUrl.split(',')[1], 'base64'));
const max = (l) => Math.max(...l);
const metrics = { date: new Date().toISOString() };

// ---------- 1. Contrat (sans navigateur) ----------
{
  const all = [...REQUIRED_BONES, ...OPTIONAL_BONES, ...SOCKETS];
  const names = all.map((b) => runtimeName(b.name));
  const set = new Set(REQUIRED_BONES.map((b) => b.name));
  C.ok('contrat : noms uniques après chargement Three.js', new Set(names).size === names.length, `${REQUIRED_BONES.length} os requis, ${OPTIONAL_BONES.length} facultatifs, ${SOCKETS.length} points d'attache`);
  C.ok('contrat : chaque os requis a un parent requis (hiérarchie complète)', REQUIRED_BONES.every((b) => !b.parent || set.has(b.parent)));
  C.ok('contrat : paires gauche / droite symétriques', REQUIRED_BONES.filter((b) => b.side === 'L').every((b) => {
    const r = REQUIRED_BONES.find((x) => x.name === b.name.replace('.L', '.R'));
    return r && (!b.target || (r.target[0] === -b.target[0] && r.target[1] === b.target[1]));
  }));
}

const { server, url } = await startServer();
const { browser, page, errors } = await launch();
const rig = (fn, ...args) => page.evaluate(([fn, args]) => window.__rig[fn](...args), [fn, args]);
const probe = (fn, ...args) => page.evaluate(([fn, args]) => window.__probe[fn](...args), [fn, args]);

try {
  await page.goto(url + '/tests/rig.html');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });

  // ---------- 2. Adaptateur, variante « orientation » (3 classes) ----------
  const fd = (metrics.frames = await rig('frameDifference', 'assaut'));
  C.ok('squelette synthétique : repères d\'os différents du gameplay (A-pose, rolls, racine couchée)', fd.meanDeg > 45 && fd.aPoseArmDeg.every((a) => a > 30 && a < 60), `écart moyen ${fd.meanDeg}° (max ${fd.maxDeg}°), bras à ${fd.aPoseArmDeg.join(' / ')}° de la verticale`);
  metrics.orientation = {};
  for (const cls of ['assaut', 'artilleur', 'commando']) {
    const m = (metrics.orientation[cls] = await rig('measureRig', cls, 'blue', { variant: 'orientation' }));
    const rows = m.rows;
    C.ok(`[orientation] ${cls} : ${rows.length} états d'animation exécutés (locomotion, visée, actions, morts, assis, poses de référence)`, rows.length === 32 && rows.every((r) => r.nan === 0));
    C.ok(`[orientation] ${cls} : squelette de gameplay jamais modifié (matrices et hitbox identiques)`, rows.every((r) => r.untouched));
    C.ok(`[orientation] ${cls} : articulations de production sur celles du gameplay (< 0,5 mm)`, max(rows.map((r) => r.jointMaxMm)) < 0.5, `${max(rows.map((r) => r.jointMaxMm))} mm`);
    const held = rows.filter((r) => r.steady);
    C.ok(`[orientation] ${cls} : mains sur l'arme dans les poses stables (< 10 mm, = gameplay)`, max(held.map((r) => Math.max(r.handLMm, r.handRMm))) < 10, `${held.length} poses, ${max(held.map((r) => Math.max(r.handLMm, r.handRMm)))} mm`);
  }
  metrics.adapterMs = metrics.orientation.assaut.adapterMsPerUpdate;
  C.ok('adaptateur : coût mesuré par soldat et par image', metrics.adapterMs > 0, `${metrics.adapterMs} ms (rendu logiciel, conteneur)`);
  // Rendu : le squelette « orientation » reproduit M1
  metrics.lineups = {};
  for (const [cls, team] of [['assaut', 'blue'], ['assaut', 'red'], ['artilleur', 'red'], ['commando', 'blue']]) {
    const m1 = await probe('renderLineup', cls, team, true, 'm1');
    const fx = await page.evaluate(([c, t]) => window.__rig.renderRigLineup(c, t, { variant: 'orientation' }), [cls, team]);
    const cmp = await probe('compareImages', m1, fx);
    savePng(`lineup-orientation-${cls}-${team}.png`, fx);
    savePng(`lineup-orientation-${cls}-${team}-diff.png`, cmp.diffImage);
    delete cmp.diffImage;
    metrics.lineups[`${cls}-${team}`] = cmp;
  }
  const lu = Object.entries(metrics.lineups);
  C.ok('[orientation] rendu = M1 (≤ 1 % de pixels différents, ≤ 0,05 % au-delà de 32 niveaux ; bleu, rouge, 3 classes)', lu.every(([, v]) => v.differingPct <= 1 && v.over32Pct <= 0.05), lu.map(([k, v]) => `${k} ${v.differingPct} %`).join(' · '));

  // ---------- 3. Variante « proportions » : export GLB, validation, rechargement, essai ----------
  metrics.proportions = {};
  for (const team of ['blue', 'red']) {
    const ex = await rig('exportFixture', 'assaut', team, 'proportions');
    const bytes = Buffer.from(ex.base64, 'base64');
    writeFileSync(`${dir}fixture-assaut-${team}.glb`, bytes);
    const asset = parseAsset(bytes);
    const proto = validateAsset(asset, { stage: 'prototype', fileBytes: bytes.length });
    const prod = validateAsset(asset, { stage: 'production', fileBytes: bytes.length });
    const prodCodes = [...new Set(prod.errors.map((e) => e.code))].sort();
    metrics.proportions[team] = { bytes: bytes.length, headScale: ex.headScale, proto: proto.errors, prodCodes, info: proto.info };
    C.ok(`[GLB ${team}] export conforme au contrat au stade prototype (0 erreur)`, proto.errors.length === 0, proto.errors.map((e) => e.code).join(', ') || `hauteur ${proto.info.heightM} m, ${proto.info.bones} os, LOD0 ${proto.info.lods.body_LOD0} triangles, ${proto.info.materials} matériau`);
    C.ok(`[GLB ${team}] au stade production, refusé seulement pour ce qu'une donnée de test ne contient pas (LOD, expressions, clips)`, prodCodes.join() === ['CLIP_MANQUANT', 'EXPRESSIONS', 'LOD_MANQUANT'].sort().join(), prodCodes.join(', '));
    if (team === 'blue') {
      const m = (metrics.proportions.fit = await rig('measureRig', 'assaut', 'blue', { glb: ex.base64 }));
      const rows = m.rows;
      const held = rows.filter((r) => r.steady);
      const upright = rows.filter((r) => ['idle', 'aim', 'walk', 'jump', 'pivot', 'stand'].includes(r.pose));
      const idle = rows.find((r) => r.pose === 'idle');
      C.ok('[GLB rechargé] noms Blender « .L / .R » convertis, adaptateur branché, 32 états exécutés sans sommet invalide', rows.length === 32 && rows.every((r) => r.nan === 0), `proportions ${JSON.stringify(idle.proportions)}`);
      C.ok('[GLB rechargé] gameplay intact dans toutes les poses (hitbox, support d\'arme, bouche du canon)', rows.every((r) => r.untouched));
      C.ok('[GLB rechargé] mains sur l\'arme avec les bras de production (+5 %) dans les poses stables (< 10 mm)', max(held.map((r) => Math.max(r.handLMm, r.handRMm))) < 10, `${held.length} poses, ${max(held.map((r) => Math.max(r.handLMm, r.handRMm)))} mm`);
      C.ok('[GLB rechargé] tête de production dans sa zone de touche, debout (centre < 6 cm, couverture ≥ 80 %)', max(upright.map((r) => r.headCm)) < 6 && Math.min(...upright.map((r) => r.headCoverage)) >= 0.8, `${max(upright.map((r) => r.headCm))} cm, ${Math.min(...upright.map((r) => r.headCoverage))}`);
      C.ok('[GLB rechargé] pieds au sol au repos (± 3 cm) et corps dans la sphère englobante de M1 (toutes poses)', Math.abs(idle.minY) < 0.03 && max(rows.map((r) => r.farthest)) < 2.1, `sol ${idle.minY} m, sommet le plus loin ${max(rows.map((r) => r.farthest))} m`);
    }
    savePng(`lineup-proportions-${team}.png`, await page.evaluate(([t, b]) => window.__rig.renderRigLineup('assaut', t, { glb: b, backpack: false }), [team, ex.base64]));
    savePng(`lineup-proportions-${team}-masque.png`, await page.evaluate(([t, b]) => window.__rig.renderRigLineup('assaut', t, { glb: b, backpack: false, showMask: true }), [team, ex.base64]));
  }

  // ---------- 4. Validateur : fichiers volontairement fautifs ----------
  const good = parseAsset(Buffer.from((await rig('exportFixture', 'assaut', 'blue', 'proportions')).base64, 'base64'));
  const cloneAsset = () => ({ json: structuredClone(good.json), buffers: good.buffers.map((b) => Buffer.from(b)) });
  const nodeIdx = (a, name) => a.json.nodes.findIndex((n) => runtimeName(n.name) === runtimeName(name));
  const skinJ = (a, name) => a.json.skins[0].joints.indexOf(nodeIdx(a, name));
  const bodyPrim = (a) => a.json.meshes[a.json.nodes.find((n) => n.name === 'body_LOD0').mesh].primitives[0];
  const writeAcc = (a, accIndex, fn) => {
    const acc = a.json.accessors[accIndex];
    const view = a.json.bufferViews[acc.bufferView];
    const buf = a.buffers[view.buffer];
    const base = (view.byteOffset || 0) + (acc.byteOffset || 0);
    fn(new DataView(buf.buffer, buf.byteOffset + base, view.byteLength - (acc.byteOffset || 0)), acc, view);
  };
  // transformations des nœuds (matrice ou TRS selon l'exportateur), en repère monde
  const parentOf = (a, i) => a.json.nodes.findIndex((n) => (n.children || []).includes(i));
  const worldM = (a, i) => (i < 0 ? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] : mul(worldM(a, parentOf(a, i)), trs(a.json.nodes[i])));
  // déplace l'articulation `name` (repère monde) en ne changeant que sa translation locale
  const moveWorld = (a, name, delta) => {
    const i = nodeIdx(a, name);
    const n = a.json.nodes[i];
    const pm = worldM(a, parentOf(a, i));
    const d = [0, 1, 2].map((r) => pm[r * 4] * delta[0] + pm[r * 4 + 1] * delta[1] + pm[r * 4 + 2] * delta[2]); // Rᵀ·delta
    const m = trs(n);
    m[12] += d[0];
    m[13] += d[1];
    m[14] += d[2];
    delete n.translation;
    delete n.rotation;
    delete n.scale;
    n.matrix = m;
  };
  const posW = (a, name) => worldM(a, nodeIdx(a, name)).slice(12, 15);
  const quatMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  const cases = [
    ['os renommé (UpperArm_L)', 'OS_MANQUANTS', (a) => (a.json.nodes[nodeIdx(a, 'upperArm.L')].name = 'UpperArm_L')],
    ['os Rigify exporté (DEF-spine)', 'OS_DE_CONTROLE', (a) => (a.json.nodes[nodeIdx(a, 'spine')].name = 'DEF-spine')],
    ['point d\'attache absent (socket_back)', 'POINT_ATTACHE', (a) => (a.json.nodes[nodeIdx(a, 'socket_back')].name = 'dos')],
    ['mauvais parent (hand.L sous upperArm.L)', 'HIERARCHIE', (a) => {
      const h = nodeIdx(a, 'hand.L');
      for (const n of a.json.nodes) if (n.children) n.children = n.children.filter((c) => c !== h);
      a.json.nodes[nodeIdx(a, 'upperArm.L')].children.push(h);
    }],
    ['personnage tourné de 180° (regarde −Z)', 'ORIENTATION', (a) => {
      const top = a.json.scenes[0].nodes[0];
      a.json.nodes[top].rotation = quatMul([0, 1, 0, 0], a.json.nodes[top].rotation || [0, 0, 0, 1]);
    }],
    ['unités en centimètres', 'UNITES', (a) => {
      const acc = a.json.accessors[bodyPrim(a).attributes.POSITION];
      acc.min = acc.min.map((x) => x * 100);
      acc.max = acc.max.map((x) => x * 100);
    }],
    ['épaule trop haute (+10 cm)', 'PROPORTIONS', (a) => moveWorld(a, 'clavicle.L', [0, 0.1, 0])],
    ['T-pose (bras à l\'horizontale)', 'POSE_A', (a) => {
      // coude et poignet gauches ramenés à l'horizontale de l'épaule
      const s = posW(a, 'upperArm.L');
      const e = posW(a, 'lowerArm.L');
      const len = Math.hypot(e[0] - s[0], e[1] - s[1], e[2] - s[2]);
      moveWorld(a, 'lowerArm.L', [s[0] + len - e[0], s[1] - e[1], s[2] - e[2]]);
      const e2 = posW(a, 'lowerArm.L');
      const h = posW(a, 'hand.L');
      moveWorld(a, 'hand.L', [e2[0] + 0.3 - h[0], e2[1] - h[1], e2[2] - h[2]]);
    }],
    ['trois matériaux', 'MATERIAUX', (a) => {
      a.json.materials.push({ name: 'M_extra1' }, { name: 'M_extra2' });
      const p = bodyPrim(a);
      a.json.meshes.push({ name: 'acc_cap_LOD0', primitives: [{ ...p, material: 1 }, { ...p, material: 2 }] });
      a.json.nodes.push({ name: 'acc_cap_LOD0', mesh: a.json.meshes.length - 1, skin: 0 });
      a.json.scenes[0].nodes.push(a.json.nodes.length - 1);
    }],
    ['poids non normalisés', 'POIDS_NORMALISES', (a) => writeAcc(a, bodyPrim(a).attributes.WEIGHTS_0, (dv, acc) => {
      for (let i = 0; i < 100; i++) dv.setFloat32(i * 16, 0.5, true);
    })],
    ['sommets pondérés sur un point d\'attache', 'POIDS_POINT_ATTACHE', (a) => writeAcc(a, bodyPrim(a).attributes.JOINTS_0, (dv) => dv.setUint16(0, skinJ(a, 'socket_back'), true))],
    ['plus de 4 influences', 'INFLUENCES', (a) => (bodyPrim(a).attributes.JOINTS_1 = bodyPrim(a).attributes.JOINTS_0)],
    ['déplacement de la racine dans un clip', 'MOUVEMENT_RACINE', (a) => {
      a.json.accessors.push({ componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1.8] }, { componentType: 5126, count: 2, type: 'VEC3' });
      const i = a.json.accessors.length;
      a.json.animations = [{ name: 'reload_rifle', samplers: [{ input: i - 2, output: i - 1 }], channels: [{ sampler: 0, target: { node: nodeIdx(a, 'root'), path: 'translation' } }] }];
    }],
  ];
  const res = [];
  for (const [label, code, mutate] of cases) {
    const a = cloneAsset();
    mutate(a);
    const r = validateAsset(a, { stage: 'prototype' });
    const codes = r.errors.map((e) => e.code);
    res.push({ label, expected: code, got: [...new Set(codes)], ok: codes.includes(code), hint: r.errors.find((e) => e.code === code) });
  }
  metrics.validatorCases = res;
  C.ok(`validateur : ${cases.length} fichiers fautifs refusés pour la bonne raison, avec une consigne de correction`, res.every((r) => r.ok && r.hint?.fix), res.filter((r) => !r.ok).map((r) => `${r.label} → ${r.got.join(',')}`).join(' | ') || res.map((r) => r.expected).join(', '));
  C.ok('validateur : le fichier conforme reste accepté (stade prototype)', validateAsset(cloneAsset(), { stage: 'prototype' }).errors.length === 0);

  // ---------- 5. En partie (8v8) : tous les soldats habillés du squelette synthétique ----------
  await page.goto(url + '/index.html?autotest');
  await page.waitForSelector('#menu.on', { timeout: 120000 });
  await page.click('[data-act="play"]');
  await page.click('[data-act="start"]');
  await page.waitForSelector('#deploy.on');
  await step(page, 1);
  await page.click('[data-act="deploy"]');
  await step(page, 2);
  const live = await page.evaluate(async () => {
    const R = await import('/tests/rig-probe.js');
    const g = window.__game;
    const adapters = new Map();
    const keys = { upperArmL: 'shoulderL', upperArmR: 'shoulderR', lowerArmL: 'elbowL', lowerArmR: 'elbowR', handL: 'handL', handR: 'handR', thighL: 'legL', thighR: 'legR', calfL: 'kneeL', calfR: 'kneeR', footL: 'ankleL', footR: 'ankleR', hips: 'hips', head: 'head' };
    let worst = 0, samples = 0, vehicleSamples = 0, deadSamples = 0, rebuilds = 0, exceptions = 0;
    const tmp = [];
    const p = g.player;
    const jeep = g.vehicles.find((v) => v.type === 'jeep' && v.team === p.team);
    const tank = g.vehicles.find((v) => v.type === 'tank' && v.team === p.team);
    for (let f = 0; f < 900; f++) {
      if (f === 150) { p.body.pos.copy(jeep.pos); jeep.enter(p); }
      if (f === 300) { jeep.exit(p); p.body.pos.copy(tank.pos); tank.enter(p); }
      if (f === 450) tank.exit(p);
      g.update(1 / 30);
      g.input.endFrame();
      for (const s of g.soldiers) {
        if (!s.char.skinnedBody) continue;
        let ad = adapters.get(s.char);
        if (!ad) {
          const fx = R.buildFixture(s.char, 'orientation');
          ad = R.attachRig(s.char, fx.rig);
          ad.nodes = new Map();
          fx.rig.traverse((o) => ad.nodes.set(o.name.replace(/\./g, ''), o));
          adapters.set(s.char, ad);
          rebuilds++;
        }
        try {
          s.char.root.updateMatrixWorld(true);
          ad.update();
        } catch (e) {
          exceptions++;
        }
        if (f % 15 === 0 && s.char.root.visible) {
          for (const [rn, gn] of Object.entries(keys)) {
            const a = ad.nodes.get(rn).getWorldPosition(tmp[0] || (tmp[0] = s.char.root.position.clone()));
            const b = s.char.bones[gn].getWorldPosition(tmp[1] || (tmp[1] = s.char.root.position.clone()));
            const d = a.distanceTo(b);
            if (d > worst) worst = d;
          }
          samples++;
          if (s.vehicle) vehicleSamples++;
          if (!s.alive) deadSamples++;
        }
      }
    }
    return { worstMm: worst * 1000, samples, vehicleSamples, deadSamples, rigs: rebuilds, exceptions };
  });
  metrics.live = live;
  C.ok('en partie 8v8 (30 s, bots, jeep, char, morts, réapparitions) : squelette de production collé au gameplay (< 0,5 mm), sans exception', live.exceptions === 0 && live.worstMm < 0.5 && live.samples > 100 && live.vehicleSamples > 0 && live.deadSamples > 0, live);
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
