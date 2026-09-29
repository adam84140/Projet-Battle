// Référence M0 du Master Assault : coût et alignements du personnage actuel,
// scène 16v16 chargée, mémoire sur relances, planches A/B. Lecture seule sur le jeu.
// Usage : npm run test:character
// Sorties : test-results/character/metrics.json et captures PNG (non versionnées).
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer, launch, step, run, Checks } from './lib.mjs';

const C = new Checks('Personnage (référence M0)');
const dir = fileURLToPath(new URL('../test-results/character/', import.meta.url));
mkdirSync(dir, { recursive: true });
const savePng = (name, dataUrl) => writeFileSync(dir + name, Buffer.from(dataUrl.split(',')[1], 'base64'));
const max = (list) => Math.max(...list);

// Seuils de garde : valeurs mesurées au commit de référence + marge (voir docs/characters/MASTER-ASSAULT-BASELINE.md)
// « Problème connu » = défaut du personnage actuel mesuré en M0 : la garde empêche seulement qu'il s'aggrave.
const LIMITS = {
  visibleMeshes: 18, // par soldat fusionné (jeu)
  triangles: 17500,
  geometryKB: 1900,
  buildMs: 400, // médiane, rendu logiciel lent : garde contre un emballement, pas une mesure fine
  handMm: 10, // poses tenues à deux mains, stables : < 1 cm
  handTransientMm: { land: 22, throw: 45 }, // problème connu : réception, lancer de grenade (main gauche)
  headUprightCm: 4, // tête droite : centre visuel / centre de la sphère de touche
  headMaxCm: 10, // problème connu : la sphère ne suit pas l'inclinaison de la tête
  headIdleCoverage: 0.8, // part des sommets de la tête dans la sphère, au repos
  weaponAimDeg: 3, // visée debout (horizontale, haut, bas)
  weaponFireDeg: 6, // recul du tir
  weaponCrouchAimDeg: 16, // problème connu : arme inclinée vers le bas en visée accroupie
  mountFromSpineM: 0.6, // support d'arme près du buste
  liveHeadMaxCm: 15, // partie réelle : garde grossière (données variables d'une partie à l'autre)
  liveHeadMeanCm: 5,
  liveAimMeanDeg: 6, // soldats debout en visée stable ; les autres états sont mesurés sans garde
  soldierCallsPerVisible: 30, // scène 16v16 chargée (couleur + ombre, éclairs cachés) : ~22 à 25 mesurés
  memoryGrowth: 1.05, // géométries GPU : 3e relance / 2e relance
  heapGrowthMB: 5, // mémoire JS : 3e relance - 2e relance
};
const TRANSIENT = new Set(Object.keys(LIMITS.handTransientMm));
const UPRIGHT = new Set(['idle', 'aim', 'fire', 'walk', 'backward', 'strafe', 'jump', 'pivot', 'throw', 'heal', 'sit']);

const metrics = { date: new Date().toISOString(), limits: LIMITS };
const { server, url } = await startServer();
const { browser, page, errors } = await launch();

try {
  // ---------- 1. Modèle seul ----------
  await page.goto(url + '/tests/character.html');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const M = await page.evaluate(() => window.__probe.measureModels());
  metrics.models = M.models;
  metrics.reference = M.reference;
  const ref = M.reference.menu;
  C.ok('contrat du squelette : 16 articulations + support d\'arme', ref.joints.length === 16 && ref.joints.every((j) => ref.bonesApose[j]) && ref.hasWeaponMount, ref.joints.join(' '));
  C.ok('disposition des canaux de l\'Animator inchangée', ref.animatorChannels === (await page.evaluate(() => window.__probe.EXPECTED_CHANNELS)), ref.animatorChannels);
  const game = Object.entries(M.models).filter(([k]) => k.endsWith('-jeu'));
  C.ok(`maillages visibles par soldat ≤ ${LIMITS.visibleMeshes}`, game.every(([, s]) => s.visibleMeshes <= LIMITS.visibleMeshes), Object.fromEntries(game.map(([k, s]) => [k, `${s.visibleMeshes}/${s.meshes}`])));
  C.ok(`triangles par soldat ≤ ${LIMITS.triangles}`, game.every(([, s]) => s.triangles <= LIMITS.triangles), max(game.map(([, s]) => s.triangles)));
  C.ok(`géométrie par soldat ≤ ${LIMITS.geometryKB} Ko`, game.every(([, s]) => s.geometryKB <= LIMITS.geometryKB), max(game.map(([, s]) => s.geometryKB)) + ' Ko');
  C.ok(`construction d'un soldat < ${LIMITS.buildMs} ms (médiane)`, game.every(([, s]) => s.buildMsMedian < LIMITS.buildMs), Object.fromEntries(game.map(([k, s]) => [k, s.buildMsMedian])));
  C.ok('hauteur actuelle mesurée (sommet des cheveux, jeu)', M.reference.jeu.topApose > 1.8 && M.reference.jeu.topApose < 2.05, M.reference.jeu.topApose + ' m');
  C.ok('centre de la sphère de tête au repos', Math.abs(M.reference.jeu.headHitCentreIdleY - 1.72) < 0.03, M.reference.jeu.headHitCentreIdleY + ' m');

  const gpu = await page.evaluate(() => window.__probe.measureGpu());
  metrics.gpu = gpu;
  C.ok('soldat seul : appels de rendu (couleur + ombre)', gpu.soloDrawWithShadow.calls > 0, gpu.soloDrawWithShadow);
  C.ok('mémoire GPU : aucune géométrie perdue après libération', gpu.cycles[1].remainingAfterDispose === gpu.cycles[0].remainingAfterDispose, gpu.cycles);
  // Fuite par soldat = résidu qui grandit avec le nombre de soldats construits puis libérés
  metrics.heap = [await page.evaluate(() => window.__probe.measureHeap(8)), await page.evaluate(() => window.__probe.measureHeap(32))];
  const [h8, h32] = metrics.heap;
  C.ok('mémoire JS par soldat rendue après libération (résidu 32 soldats − 8 soldats < 1 Mo)', h8 && h32 && h32.residualKB - h8.residualKB < 1024, `${h32.perCharacterKB} Ko par soldat ; résidu ${h8.residualKB} Ko (8) / ${h32.residualKB} Ko (32)`);

  // ---------- 2. Alignements par pose (3 classes) ----------
  metrics.alignment = {};
  for (const cls of ['assaut', 'artilleur', 'commando']) {
    const rows = await page.evaluate((cls) => window.__probe.measureAlignment(cls, 'blue'), cls);
    metrics.alignment[cls] = rows;
    const mm = (v) => (v * 1000).toFixed(1) + ' mm';
    const held = rows.filter((r) => r.handR_toGrip !== undefined && r.ikR >= 0.999 && r.ikL >= 0.999 && r.leftHandOffset < 0.001 && !TRANSIENT.has(r.pose));
    const errR = max(rows.filter((r) => r.handR_toGrip !== undefined && r.ikR >= 0.999).map((r) => r.handR_toGrip));
    const errL = max(held.map((r) => r.handL_toTarget));
    C.ok(`${cls} : main droite sur la poignée < ${LIMITS.handMm} mm (toutes poses tenues)`, errR * 1000 < LIMITS.handMm, mm(errR));
    C.ok(`${cls} : main gauche sur le garde-main < ${LIMITS.handMm} mm (${held.length} poses stables à deux mains)`, errL * 1000 < LIMITS.handMm, mm(errL));
    const trans = rows.filter((r) => TRANSIENT.has(r.pose));
    C.ok(`${cls} : problème connu, main gauche en réception / lancer ≤ ${LIMITS.handTransientMm.land} / ${LIMITS.handTransientMm.throw} mm`, trans.every((r) => r.handL_toTarget * 1000 <= LIMITS.handTransientMm[r.pose]), trans.map((r) => `${r.pose} ${mm(r.handL_toTarget)}`).join(', '));
    const heads = rows.filter((r) => r.head);
    const up = heads.filter((r) => UPRIGHT.has(r.pose));
    const dUp = max(up.map((r) => r.head.centreDistance)) * 100;
    const dAll = max(heads.map((r) => r.head.centreDistance)) * 100;
    const worst = heads.reduce((a, b) => (b.head.centreDistance > a.head.centreDistance ? b : a));
    C.ok(`${cls} : tête droite / sphère de touche < ${LIMITS.headUprightCm} cm (${up.length} poses)`, dUp < LIMITS.headUprightCm, dUp.toFixed(1) + ' cm');
    C.ok(`${cls} : problème connu, tête inclinée / sphère ≤ ${LIMITS.headMaxCm} cm (${heads.length} poses)`, dAll <= LIMITS.headMaxCm, `${dAll.toFixed(1)} cm (${worst.pose})`);
    const idle = rows.find((r) => r.pose === 'idle');
    C.ok(`${cls} : tête couverte par la sphère au repos ≥ ${LIMITS.headIdleCoverage * 100} %`, idle.head.coverage >= LIMITS.headIdleCoverage, (idle.head.coverage * 100).toFixed(0) + ' %');
    const angle = (id) => rows.find((r) => r.pose === id).weaponToAimDeg;
    const stand = max(['aim', 'aim-up', 'aim-down'].map(angle));
    C.ok(`${cls} : arme alignée sur la visée debout < ${LIMITS.weaponAimDeg}°`, stand < LIMITS.weaponAimDeg, stand.toFixed(2) + '°');
    C.ok(`${cls} : arme pendant le recul < ${LIMITS.weaponFireDeg}°`, angle('fire') < LIMITS.weaponFireDeg, angle('fire').toFixed(2) + '°');
    C.ok(`${cls} : problème connu, arme en visée accroupie ≤ ${LIMITS.weaponCrouchAimDeg}°`, angle('crouch-aim') <= LIMITS.weaponCrouchAimDeg, angle('crouch-aim').toFixed(2) + '°');
    const mounts = rows.filter((r) => r.mountFromSpine !== undefined);
    C.ok(`${cls} : support d'arme à moins de ${LIMITS.mountFromSpineM} m du buste (${mounts.length} poses)`, max(mounts.map((r) => r.mountFromSpine)) < LIMITS.mountFromSpineM, max(mounts.map((r) => r.mountFromSpine)).toFixed(3) + ' m');
    const aim = rows.find((r) => r.pose === 'aim');
    C.ok(`${cls} : bouche du canon devant le personnage, à hauteur d'épaule (visée)`, aim.muzzle[2] > 0.5 && aim.muzzle[1] > 1.2 && aim.muzzle[1] < 1.7, aim.muzzle);
  }

  // ---------- 3. Planches A/B déterministes ----------
  const a1 = await page.evaluate(() => window.__probe.renderLineup('assaut', 'blue'));
  const a2 = await page.evaluate(() => window.__probe.renderLineup('assaut', 'blue'));
  C.ok('planche reproductible au pixel près (base des comparaisons A/B)', a1 === a2);
  savePng('lineup-assaut-blue.png', a1);
  for (const [cls, team, bag] of [['assaut', 'red', true], ['assaut', 'blue', false], ['artilleur', 'blue', true], ['artilleur', 'red', true], ['commando', 'blue', true], ['commando', 'red', true]]) {
    savePng(`lineup-${cls}-${team}${bag ? '' : '-sans-sac'}.png`, await page.evaluate(([c, t, b]) => window.__probe.renderLineup(c, t, b), [cls, team, bag]));
  }

  // ---------- 4. Partie 16v16 ----------
  await page.goto(url + '/index.html?autotest');
  await page.waitForSelector('#menu.on', { timeout: 120000 });
  await run(page, "g.settings.mode = '16v16'");
  await page.click('[data-act="play"]');
  await page.click('[data-act="start"]');
  await page.waitForSelector('#deploy.on');
  await step(page, 1); // remplissage de la réserve de modèles
  await page.click('[data-act="deploy"]');
  await step(page, 10);
  // Coût logique image par image sur 60 s de partie normale (moyenne, p99, max, images > 16 ms)
  metrics.logic16v16 = await page.evaluate(() => {
    const g = window.__game;
    const t = [];
    for (let i = 0; i < 1800; i++) {
      const t0 = performance.now();
      g.update(1 / 30);
      t.push(performance.now() - t0);
      g.input.endFrame();
    }
    g.render();
    t.sort((a, b) => a - b);
    return { frames: t.length, avgMs: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(2), p99Ms: +t[Math.floor(t.length * 0.99)].toFixed(2), maxMs: +t[t.length - 1].toFixed(2), over16: t.filter((x) => x > 16).length };
  });
  C.ok('16v16 : coût logique moyen < 8 ms (60 s de partie normale)', metrics.logic16v16.avgMs < 8, metrics.logic16v16);

  // Tête / sphère de touche et arme / visée sur les soldats réels
  const live = await page.evaluate(() => {
    const g = window.__game;
    const heads = [];
    const aims = { standing: [], crouching: [], other: [] };
    for (let k = 0; k < 10; k++) {
      for (let i = 0; i < 15; i++) { g.update(1 / 30); g.input.endFrame(); }
      for (const s of g.soldiers) {
        if (!s.alive || s.vehicle) continue;
        const head = s.char.bones.head;
        const mesh = head.children.find((o) => o.isMesh && o.userData.baked);
        mesh.geometry.computeBoundingBox();
        const c = mesh.geometry.boundingBox.getCenter(head.position.clone()).applyMatrix4(mesh.matrixWorld);
        heads.push(c.distanceTo(s.hitVolumes().head));
        const w = s.char.weapon;
        if (s.aiming && w && w.group.visible) {
          const f = w.muzzle.clone().set(0, 0, 1).transformDirection(w.group.matrixWorld);
          const deg = (f.angleTo(s.aimDirection(w.muzzle.clone())) * 180) / Math.PI;
          const steady = s.body.grounded && !s.sprinting && s.reloadT < 0 && !s.action;
          aims[!steady ? 'other' : s.crouching ? 'crouching' : 'standing'].push(deg);
        }
      }
    }
    const stat = (l) => (l.length ? { n: l.length, meanDeg: +(l.reduce((a, b) => a + b, 0) / l.length).toFixed(2), maxDeg: +Math.max(...l).toFixed(2) } : { n: 0 });
    return { headSamples: heads.length, headMaxCm: Math.max(...heads) * 100, headMeanCm: (heads.reduce((a, b) => a + b, 0) / heads.length) * 100, aimStanding: stat(aims.standing), aimCrouching: stat(aims.crouching), aimOther: stat(aims.other) };
  });
  metrics.live = live;
  C.ok(`partie réelle : tête / sphère de touche, moyenne < ${LIMITS.liveHeadMeanCm} cm, max ≤ ${LIMITS.liveHeadMaxCm} cm`, live.headSamples > 50 && live.headMeanCm < LIMITS.liveHeadMeanCm && live.headMaxCm <= LIMITS.liveHeadMaxCm, `${live.headMeanCm.toFixed(1)} cm moyen, ${live.headMaxCm.toFixed(1)} cm max, ${live.headSamples} échantillons`);
  const st = live.aimStanding;
  C.ok(`partie réelle : arme / visée, soldats debout en visée stable, moyenne < ${LIMITS.liveAimMeanDeg}°`, st.n >= 10 && st.meanDeg < LIMITS.liveAimMeanDeg, `debout ${JSON.stringify(st)} · accroupis ${JSON.stringify(live.aimCrouching)} · autres (course, rechargement, action, saut) ${JSON.stringify(live.aimOther)}`);

  // Vue de jeu de référence (place B, 4 directions, soldats là où la partie les a menés)
  const measureView = (cluster) =>
    page.evaluate(([cluster]) => {
      const g = window.__game;
      const out = [];
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const p = g.player;
        p.spawnProtect = 999;
        p.body.pos.set(0, 1, 2);
        p.body.vel.set(0, 0, 0);
        if (cluster) {
          let i = 0;
          for (const b of g.bots) {
            if (!b.alive) continue;
            const a = (i++ / g.bots.length) * Math.PI * 2;
            b.body.pos.set(Math.sin(a) * 18, 1, 2 + Math.cos(a) * 18);
          }
        }
        g.controller.yaw = yaw;
        g.controller.pitch = 0;
        g.controller.snap = true;
        for (let k = 0; k < 10; k++) { g.update(1 / 30); g.input.endFrame(); }
        // éclairs de bouche cachés : ils dépendent de l'instant du tir et rendraient la mesure instable
        for (const s of g.soldiers) if (s.char.weapon) s.char.weapon.flash.visible = false;
        const info = g.renderer.info;
        info.autoReset = false;
        info.reset();
        g.render();
        const all = { calls: info.render.calls, triangles: info.render.triangles };
        const vis = g.soldiers.map((s) => s.char.root.visible);
        g.soldiers.forEach((s) => (s.char.root.visible = false));
        info.reset();
        g.render();
        const none = { calls: info.render.calls, triangles: info.render.triangles };
        g.soldiers.forEach((s, j) => (s.char.root.visible = vis[j]));
        info.autoReset = true;
        g.render();
        const shown = vis.filter(Boolean).length; // soldats actifs (visibles ou hors champ)
        out.push({ yaw: +yaw.toFixed(2), soldiersActive: shown, calls: all.calls, callsWithoutSoldiers: none.calls, soldierCalls: all.calls - none.calls, soldierTriangles: all.triangles - none.triangles, callsPerActiveSoldier: +((all.calls - none.calls) / Math.max(1, shown)).toFixed(1) });
      }
      return out;
    }, [cluster]);
  metrics.view16v16 = await measureView(false);
  C.ok('16v16, vue de jeu de référence (place B, 4 directions) mesurée', metrics.view16v16.length === 4, metrics.view16v16.map((v) => `${v.calls} (soldats ${v.soldierCalls})`).join(' · '));
  metrics.crowd16v16 = await measureView(true);
  const perSoldier = max(metrics.crowd16v16.map((v) => v.callsPerActiveSoldier));
  C.ok(`16v16, scène chargée (32 soldats à moins de 18 m) : ≤ ${LIMITS.soldierCallsPerVisible} appels par soldat`, perSoldier <= LIMITS.soldierCallsPerVisible, metrics.crowd16v16.map((v) => `${v.calls} (soldats ${v.soldierCalls})`).join(' · ') + ` · ${perSoldier}/soldat`);
  // captures de la scène chargée (4 directions) pour la comparaison A/B
  for (const [i, yaw] of [0, Math.PI / 2, Math.PI, -Math.PI / 2].entries()) {
    await run(page, `g.controller.yaw = ${yaw}; g.controller.pitch = 0; g.controller.snap = true;`);
    await step(page, 0.2);
    await page.screenshot({ path: `${dir}crowd-16v16-${['nord', 'est', 'sud', 'ouest'][i]}.png` });
  }

  // ---------- 5. Mémoire sur 3 relances (16v16) ----------
  metrics.restarts = [];
  for (let k = 0; k < 3; k++) {
    await run(page, 'g.startMatch()');
    await page.waitForSelector('#deploy.on');
    await step(page, 1);
    await page.click('[data-act="deploy"]');
    await step(page, 5);
    metrics.restarts.push(
      await page.evaluate(async () => {
        const g = window.__game;
        for (let i = 0; i < 3; i++) {
          window.gc?.();
          await new Promise((r) => setTimeout(r, 150));
        }
        return { geometries: g.renderer.info.memory.geometries, textures: g.renderer.info.memory.textures, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null };
      }),
    );
  }
  const [, r2, r3] = metrics.restarts;
  C.ok(`mémoire GPU stable sur 3 relances (≤ ×${LIMITS.memoryGrowth})`, r3.geometries <= r2.geometries * LIMITS.memoryGrowth, metrics.restarts.map((r) => `${r.geometries} géo`).join(' → '));
  C.ok(`mémoire JS stable sur 3 relances (+${LIMITS.heapGrowthMB} Mo au plus)`, r3.heapMB - r2.heapMB <= LIMITS.heapGrowthMB, metrics.restarts.map((r) => `${r.heapMB} Mo`).join(' → '));

  C.ok('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  C.ok('exécution sans exception', false, e.message);
} finally {
  metrics.errors = errors;
  writeFileSync(dir + 'metrics.json', JSON.stringify(metrics, null, 1));
  await browser.close();
  await server.close();
}
console.log(`Mesures : ${dir}metrics.json`);
process.exit(C.summary() ? 0 : 1);
