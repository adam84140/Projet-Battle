// Personnage : référence M0 et validation M1 du Master Assault.
// Compare les deux chemins de rendu des soldats (src/character/renderPath.js) :
//  - LEGACY_RENDER_PATH : doit rester identique au pixel près à la référence M0 ;
//  - M1_OPTIMIZED_RENDER_PATH : mêmes alignements, rendu équivalent, coût réduit.
// Partie de jeu 16v16 : chemin par défaut, ou imposé par RENDU=legacy|m1. Téléphone : les deux chemins.
// Usage : npm run test:character   ·   RENDU=legacy npm run test:character
// Sorties : test-results/character/ (mesures JSON, planches, différences, captures ; non versionné).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer, launch, step, run, Checks } from './lib.mjs';

const C = new Checks('Personnage (référence M0, validation M1)');
const dir = fileURLToPath(new URL('../test-results/character/', import.meta.url));
mkdirSync(dir, { recursive: true });
const baseline = (f) => JSON.parse(readFileSync(fileURLToPath(new URL(`./baselines/${f}`, import.meta.url)), 'utf8'));
const M0 = baseline('character-m0.json');
const M0_LINEUPS = baseline('character-m0-lineups.json').lineups;
const savePng = (name, dataUrl) => writeFileSync(dir + name, Buffer.from(dataUrl.split(',')[1], 'base64'));
const max = (list) => Math.max(...list);
const PATHS = ['legacy', 'm1'];

// Seuils de garde (voir docs/characters/MASTER-ASSAULT-BASELINE.md et MASTER-ASSAULT-M1.md).
// « Problème connu » = défaut du personnage mesuré en M0 : la garde empêche seulement qu'il s'aggrave.
const LIMITS = {
  triangles: 17500,
  geometryKB: 1900,
  buildMs: 400, // médiane, rendu logiciel lent : garde contre un emballement, pas une mesure fine
  handMm: 10, // poses tenues à deux mains, stables : < 1 cm
  handTransientMm: { land: 22, throw: 45 }, // problème connu : réception, lancer de grenade (main gauche)
  headUprightCm: 4, // tête droite : centre visuel / centre de la sphère de touche
  headMaxCm: 10, // problème connu : la sphère ne suit pas l'inclinaison de la tête
  headIdleCoverage: 0.8, // part de la tête dans la sphère, au repos
  weaponAimDeg: 3, // visée debout (horizontale, haut, bas)
  weaponFireDeg: 6, // recul du tir
  weaponCrouchAimDeg: 16, // problème connu : arme inclinée vers le bas en visée accroupie
  mountFromSpineM: 0.6, // support d'arme près du buste
  liveHeadMaxCm: 15, // partie réelle : garde grossière (données variables d'une partie à l'autre)
  liveHeadMeanCm: 5,
  liveAimMeanDeg: 6, // soldats debout en visée stable ; les autres états sont mesurés sans garde
  memoryGrowth: 1.05, // géométries GPU : 3e relance / 2e relance
  heapGrowthMB: 5, // mémoire JS : 3e relance - 2e relance
  // M1 contre legacy (même exécution, même machine)
  sameMm: 0.5, // mains, bouche du canon, support d'arme
  sameHeadCm: 0.05,
  sameCoverage: 0.005,
  sameDeg: 0.05,
  lineupDifferingPct: 1, // part des pixels qui changent
  lineupOver32Pct: 0.05, // part des pixels qui changent de plus de 32 niveaux sur 255
};
const BY_PATH = {
  legacy: { visibleMeshes: 18, soloCalls: 36, crowdPerSoldier: 30 },
  m1: { visibleMeshes: 3, soloCalls: 6, crowdPerSoldier: 8 },
};
const TRANSIENT = new Set(Object.keys(LIMITS.handTransientMm));
const UPRIGHT = new Set(['idle', 'aim', 'fire', 'walk', 'backward', 'strafe', 'jump', 'pivot', 'throw', 'heal', 'sit']);
const LINEUPS = [['assaut', 'blue', true], ['assaut', 'red', true], ['assaut', 'blue', false], ['artilleur', 'blue', true], ['artilleur', 'red', true], ['commando', 'blue', true], ['commando', 'red', true]];

const metrics = { date: new Date().toISOString(), limits: LIMITS, byPath: BY_PATH, static: {} };
const { server, url } = await startServer();
const { browser, page, errors } = await launch();
const probe = (fn, ...args) => page.evaluate(([fn, args]) => window.__probe[fn](...args), [fn, args]);

try {
  await page.goto(url + '/tests/character.html');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const gamePath = await page.evaluate(() => window.__probe.defaultPath());
  metrics.gamePath = gamePath;
  console.log(`   chemin de rendu pour la partie : ${gamePath}`);

  // ---------- 1. Modèle seul, pour chaque chemin ----------
  for (const path of PATHS) {
    const L = BY_PATH[path];
    const st = (metrics.static[path] = {});
    const M = await probe('measureModels', path);
    st.models = M.models;
    st.reference = M.reference;
    if (path === 'legacy') {
      const ref = M.reference.menu;
      C.ok('contrat du squelette : 16 articulations + support d\'arme', ref.joints.length === 16 && ref.joints.every((j) => ref.bonesApose[j]) && ref.hasWeaponMount, ref.joints.join(' '));
      C.ok('disposition des canaux de l\'Animator inchangée', ref.animatorChannels === (await page.evaluate(() => window.__probe.EXPECTED_CHANNELS)), ref.animatorChannels);
    }
    const game = Object.entries(M.models).filter(([k]) => k.endsWith('-jeu'));
    C.ok(`[${path}] maillages visibles par soldat ≤ ${L.visibleMeshes}`, game.every(([, s]) => s.visibleMeshes <= L.visibleMeshes), Object.fromEntries(game.map(([k, s]) => [k, `${s.visibleMeshes}/${s.meshes}, ${s.materials} mat.`])));
    C.ok(`[${path}] triangles par soldat ≤ ${LIMITS.triangles}`, game.every(([, s]) => s.triangles <= LIMITS.triangles), max(game.map(([, s]) => s.triangles)));
    C.ok(`[${path}] géométrie par soldat ≤ ${LIMITS.geometryKB} Ko`, game.every(([, s]) => s.geometryKB <= LIMITS.geometryKB), Object.fromEntries(game.map(([k, s]) => [k, s.geometryKB])));
    C.ok(`[${path}] construction d'un soldat < ${LIMITS.buildMs} ms (médiane)`, game.every(([, s]) => s.buildMsMedian < LIMITS.buildMs), Object.fromEntries(game.map(([k, s]) => [k, s.buildMsMedian])));
    C.ok(`[${path}] hauteur (sommet des cheveux) et sphère de tête au repos`, M.reference.jeu.topApose > 1.8 && M.reference.jeu.topApose < 2.05 && Math.abs(M.reference.jeu.headHitCentreIdleY - 1.72) < 0.03, `${M.reference.jeu.topApose} m ; ${M.reference.jeu.headHitCentreIdleY} m`);
    const gpu = (st.gpu = await probe('measureGpu', 'assaut', 'blue', path));
    C.ok(`[${path}] soldat seul : ≤ ${L.soloCalls} appels de rendu (couleur + ombre)`, gpu.soloDrawWithShadow.calls <= L.soloCalls, gpu.soloDrawWithShadow);
    C.ok(`[${path}] mémoire GPU : aucune géométrie ni texture perdue après libération`, gpu.cycles.every((c) => c.remainingAfterDispose === 0) && gpu.texturesAfter <= (metrics.static.legacy.gpu?.texturesAfter ?? gpu.texturesAfter), { cycles: gpu.cycles, texturesAfter: gpu.texturesAfter });
    st.heap = [await probe('measureHeap', 8, path), await probe('measureHeap', 32, path)];
    const [h8, h32] = st.heap;
    C.ok(`[${path}] mémoire JS par soldat rendue après libération (résidu 32 − 8 soldats < 1 Mo)`, h8 && h32 && h32.residualKB - h8.residualKB < 1024, `${h32.perCharacterKB} Ko par soldat ; résidu ${h8.residualKB} / ${h32.residualKB} Ko`);
  }
  const mL = metrics.static.legacy.models;
  const mM = metrics.static.m1.models;
  const gameKeys = Object.keys(mL).filter((k) => k.includes('-jeu'));
  C.ok('M1 : mêmes triangles que legacy (même géométrie)', gameKeys.every((k) => mM[k].triangles === mL[k].triangles), gameKeys.map((k) => `${k} ${mM[k].triangles}`).join(', '));
  C.ok('M1 : géométrie indexée plus légère que legacy (sinon l\'indexation est refusée)', gameKeys.every((k) => mM[k].geometryKB < mL[k].geometryKB), gameKeys.map((k) => `${k} ${mL[k].geometryKB}→${mM[k].geometryKB} Ko`).join(', '));
  C.ok('legacy : coût identique à la référence M0', gameKeys.every((k) => mL[k].visibleMeshes === M0.models[k].visibleMeshes && mL[k].triangles === M0.models[k].triangles && mL[k].geometryKB === M0.models[k].geometryKB), 'maillages, triangles, géométrie');

  // ---------- 2. Alignements par pose (3 classes), pour chaque chemin, puis M1 = legacy ----------
  const mm = (v) => (v * 1000).toFixed(1) + ' mm';
  const align = {};
  for (const path of PATHS) {
    align[path] = {};
    for (const cls of ['assaut', 'artilleur', 'commando']) {
      const rows = (align[path][cls] = await probe('measureAlignment', cls, 'blue', path));
      const tag = `[${path}] ${cls}`;
      const held = rows.filter((r) => r.handR_toGrip !== undefined && r.ikR >= 0.999 && r.ikL >= 0.999 && r.leftHandOffset < 0.001 && !TRANSIENT.has(r.pose));
      const errR = max(rows.filter((r) => r.handR_toGrip !== undefined && r.ikR >= 0.999).map((r) => r.handR_toGrip));
      const errL = max(held.map((r) => r.handL_toTarget));
      C.ok(`${tag} : mains sur la poignée et le garde-main < ${LIMITS.handMm} mm (${held.length} poses stables)`, errR * 1000 < LIMITS.handMm && errL * 1000 < LIMITS.handMm, `droite ${mm(errR)}, gauche ${mm(errL)}`);
      const trans = rows.filter((r) => TRANSIENT.has(r.pose));
      C.ok(`${tag} : problème connu, main gauche en réception / lancer ≤ ${LIMITS.handTransientMm.land} / ${LIMITS.handTransientMm.throw} mm`, trans.every((r) => r.handL_toTarget * 1000 <= LIMITS.handTransientMm[r.pose]), trans.map((r) => `${r.pose} ${mm(r.handL_toTarget)}`).join(', '));
      const heads = rows.filter((r) => r.head);
      const dUp = max(heads.filter((r) => UPRIGHT.has(r.pose)).map((r) => r.head.centreDistance)) * 100;
      const worst = heads.reduce((a, b) => (b.head.centreDistance > a.head.centreDistance ? b : a));
      const idle = rows.find((r) => r.pose === 'idle');
      C.ok(`${tag} : tête / sphère de touche, droite < ${LIMITS.headUprightCm} cm, penchée ≤ ${LIMITS.headMaxCm} cm (problème connu), couverture au repos ≥ ${LIMITS.headIdleCoverage * 100} %`, dUp < LIMITS.headUprightCm && worst.head.centreDistance * 100 <= LIMITS.headMaxCm && idle.head.coverage >= LIMITS.headIdleCoverage, `${dUp.toFixed(1)} cm ; ${(worst.head.centreDistance * 100).toFixed(1)} cm (${worst.pose}) ; ${(idle.head.coverage * 100).toFixed(0)} %`);
      const angle = (id) => rows.find((r) => r.pose === id).weaponToAimDeg;
      const stand = max(['aim', 'aim-up', 'aim-down'].map(angle));
      C.ok(`${tag} : arme / visée debout < ${LIMITS.weaponAimDeg}°, recul < ${LIMITS.weaponFireDeg}°, accroupi ≤ ${LIMITS.weaponCrouchAimDeg}° (problème connu)`, stand < LIMITS.weaponAimDeg && angle('fire') < LIMITS.weaponFireDeg && angle('crouch-aim') <= LIMITS.weaponCrouchAimDeg, `${stand.toFixed(2)}° ; ${angle('fire').toFixed(2)}° ; ${angle('crouch-aim').toFixed(2)}°`);
      const mounts = rows.filter((r) => r.mountFromSpine !== undefined);
      const aim = rows.find((r) => r.pose === 'aim');
      C.ok(`${tag} : support d'arme < ${LIMITS.mountFromSpineM} m du buste ; bouche du canon devant, à hauteur d'épaule`, max(mounts.map((r) => r.mountFromSpine)) < LIMITS.mountFromSpineM && aim.muzzle[2] > 0.5 && aim.muzzle[1] > 1.2 && aim.muzzle[1] < 1.7, `${max(mounts.map((r) => r.mountFromSpine)).toFixed(3)} m ; ${aim.muzzle}`);
    }
  }
  metrics.alignment = align;
  // M1 = legacy, pose par pose (les os sont les mêmes objets : tout écart serait un bogue)
  const d = { hand: 0, head: 0, cover: 0, deg: 0, muzzle: 0, mount: 0 };
  const dist = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : 0);
  for (const cls of ['assaut', 'artilleur', 'commando']) {
    align.legacy[cls].forEach((a, i) => {
      const b = align.m1[cls][i];
      d.hand = Math.max(d.hand, Math.abs((a.handR_toGrip ?? 0) - (b.handR_toGrip ?? 0)), Math.abs((a.handL_toTarget ?? 0) - (b.handL_toTarget ?? 0)));
      if (a.head) {
        d.head = Math.max(d.head, Math.abs(a.head.centreDistance - b.head.centreDistance), dist(a.head.visualCentre, b.head.visualCentre));
        d.cover = Math.max(d.cover, Math.abs(a.head.coverage - b.head.coverage));
      }
      d.deg = Math.max(d.deg, Math.abs((a.weaponToAimDeg ?? 0) - (b.weaponToAimDeg ?? 0)));
      d.muzzle = Math.max(d.muzzle, dist(a.muzzle, b.muzzle));
      d.mount = Math.max(d.mount, dist(a.weaponMount, b.weaponMount));
    });
  }
  metrics.m1VsLegacy = { alignment: d };
  C.ok('M1 = legacy : mains, bouche du canon, support d\'arme (25 poses × 3 classes)', d.hand * 1000 < LIMITS.sameMm && d.muzzle * 1000 < LIMITS.sameMm && d.mount * 1000 < LIMITS.sameMm, `écarts max ${mm(d.hand)}, ${mm(d.muzzle)}, ${mm(d.mount)}`);
  C.ok('M1 = legacy : tête visible / sphère de touche et couverture', d.head * 100 < LIMITS.sameHeadCm && d.cover < LIMITS.sameCoverage, `écarts max ${(d.head * 100).toFixed(3)} cm, couverture ${d.cover.toFixed(4)}`);
  C.ok('M1 = legacy : arme / visée', d.deg < LIMITS.sameDeg, `écart max ${d.deg.toFixed(3)}°`);

  // ---------- 3. Planches A/B : legacy = M0 au pixel près, M1 ≈ legacy ----------
  metrics.lineups = {};
  for (const [cls, team, bag] of LINEUPS) {
    const name = `lineup-${cls}-${team}${bag ? '' : '-sans-sac'}`;
    const legacy = await probe('renderLineup', cls, team, bag, 'legacy');
    const m1 = await probe('renderLineup', cls, team, bag, 'm1');
    const hash = await probe('pixelHash', legacy);
    const cmp = await probe('compareImages', legacy, m1);
    savePng(`${name}-legacy.png`, legacy);
    savePng(`${name}-m1.png`, m1);
    savePng(`${name}-diff.png`, cmp.diffImage);
    delete cmp.diffImage;
    metrics.lineups[name] = { legacyEqualsM0: hash === M0_LINEUPS[name], ...cmp };
  }
  const lu = Object.entries(metrics.lineups);
  C.ok('legacy : 7 planches identiques au pixel près à la référence M0', lu.every(([, v]) => v.legacyEqualsM0), lu.filter(([, v]) => !v.legacyEqualsM0).map(([k]) => k).join(', ') || '7/7');
  C.ok(`M1 ≈ legacy : ≤ ${LIMITS.lineupDifferingPct} % de pixels différents, ≤ ${LIMITS.lineupOver32Pct} % au-delà de 32 niveaux (face, 3/4, profil, dos, repos, visée, course, accroupi ; bleu, rouge ; ombres)`, lu.every(([, v]) => v.differingPct <= LIMITS.lineupDifferingPct && v.over32Pct <= LIMITS.lineupOver32Pct), lu.map(([k, v]) => `${k.replace('lineup-', '')} ${v.differingPct} % / max ${v.maxDiff}`).join(' · '));
  const h1 = await probe('pixelHash', await probe('renderLineup', 'assaut', 'blue', true, 'm1'));
  const h2 = await probe('pixelHash', await probe('renderLineup', 'assaut', 'blue', true, 'm1'));
  C.ok('M1 : planche reproductible au pixel près', h1 === h2);

  // Camouflage du Commando : état des matériaux, puis rendu comparé
  for (const path of PATHS) {
    const camo = await probe('camouflage', path);
    C.ok(`[${path}] camouflage du Commando : tout le corps transparent sans ombre, puis restauré`, camo.ghost && camo.restored, camo);
  }
  const camoL = await probe('renderLineup', 'commando', 'blue', true, 'legacy', 0.35);
  const camoM = await probe('renderLineup', 'commando', 'blue', true, 'm1', 0.35);
  const camoCmp = await probe('compareImages', camoL, camoM);
  savePng('camo-commando-legacy.png', camoL);
  savePng('camo-commando-m1.png', camoM);
  savePng('camo-commando-diff.png', camoCmp.diffImage);
  delete camoCmp.diffImage;
  metrics.camo = camoCmp;
  C.ok('camouflage rendu (opacité 0,35) : écart M1 / legacy mesuré', camoCmp.pixels > 0, `${camoCmp.differingPct} % de pixels, ${camoCmp.over32Pct} % > 32 niveaux, max ${camoCmp.maxDiff}`);

  // Bord de l'écran : aucun soldat éliminé à tort par la sphère englobante
  const cull = (metrics.culling = await probe('cullingSafety'));
  const worstCull = cull.reduce((a, b) => (b.farthest > a.farthest ? b : a));
  C.ok('M1 : tous les sommets du corps dans la sphère englobante, dans toutes les poses (morts comprises)', cull.every((r) => r.farthest < r.radius - 0.1), `${cull.length} cas ; le plus loin ${worstCull.farthest} m (${worstCull.classId}, ${worstCull.pose}) pour un rayon de ${worstCull.radius} m`);
  const edgeL = await probe('renderEdge', 'legacy');
  const edgeM = await probe('renderEdge', 'm1');
  const edgeEmpty = await probe('renderEdge', 'm1', false);
  const occL = await probe('compareImages', edgeEmpty.url, edgeL.url);
  const occM = await probe('compareImages', edgeEmpty.url, edgeM.url);
  const edge = await probe('compareImages', edgeL.url, edgeM.url);
  savePng('edge-legacy.png', edgeL.url);
  savePng('edge-m1.png', edgeM.url);
  delete edge.diffImage;
  metrics.edge = { ...edge, anchorOnScreen: edgeM.anchorOnScreen, soldierPixelsLegacy: occL.differing, soldierPixelsM1: occM.differing };
  C.ok('M1 : soldat mort coupé par le bord de l\'image (centre hors champ) affiché comme legacy', !edgeM.anchorOnScreen && occL.differing > 1000 && occM.differing === occL.differing && edge.differingPct <= LIMITS.lineupDifferingPct, `${occM.differing} pixels de soldat (legacy ${occL.differing}), ${edge.differingPct} % de pixels différents`);

  // ---------- 4. Partie 16v16 (chemin de la partie) ----------
  const L = BY_PATH[gamePath];
  await page.goto(`${url}/index.html?autotest`);
  await page.waitForSelector('#menu.on', { timeout: 120000 });
  await run(page, "g.settings.mode = '16v16'");
  await page.click('[data-act="play"]');
  await page.click('[data-act="start"]');
  await page.waitForSelector('#deploy.on');
  await step(page, 1); // remplissage de la réserve de modèles
  await page.click('[data-act="deploy"]');
  C.ok(`[${gamePath}] soldats en jeu construits avec ce chemin`, await page.evaluate((p) => window.__game.soldiers.every((s) => (s.char.renderPath === 'LEGACY_RENDER_PATH') === (p === 'legacy')), gamePath));
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
  C.ok(`[${gamePath}] 16v16 : coût logique moyen < 8 ms (60 s de partie normale)`, metrics.logic16v16.avgMs < 8, metrics.logic16v16);

  // Tête / sphère de touche et arme / visée sur les soldats réels
  const live = await page.evaluate(async () => {
    const probe = await import('/tests/character-probe.js');
    const g = window.__game;
    const heads = [];
    const aims = { standing: [], crouching: [], other: [] };
    for (let k = 0; k < 10; k++) {
      for (let i = 0; i < 15; i++) { g.update(1 / 30); g.input.endFrame(); }
      for (const s of g.soldiers) {
        if (!s.alive || s.vehicle) continue;
        s.char.root.updateMatrixWorld(true);
        const h = probe.headProbe(s.char);
        const hv = s.hitVolumes().head;
        heads.push(Math.hypot(h.visualCentre[0] - hv.x, h.visualCentre[1] - hv.y, h.visualCentre[2] - hv.z));
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
  C.ok(`[${gamePath}] partie réelle : tête / sphère de touche, moyenne < ${LIMITS.liveHeadMeanCm} cm, max ≤ ${LIMITS.liveHeadMaxCm} cm`, live.headSamples > 50 && live.headMeanCm < LIMITS.liveHeadMeanCm && live.headMaxCm <= LIMITS.liveHeadMaxCm, `${live.headMeanCm.toFixed(1)} cm moyen, ${live.headMaxCm.toFixed(1)} cm max, ${live.headSamples} échantillons`);
  const stAim = live.aimStanding;
  C.ok(`[${gamePath}] partie réelle : arme / visée, soldats debout en visée stable, moyenne < ${LIMITS.liveAimMeanDeg}°`, stAim.n >= 10 && stAim.meanDeg < LIMITS.liveAimMeanDeg, `debout ${JSON.stringify(stAim)} · accroupis ${JSON.stringify(live.aimCrouching)} · autres ${JSON.stringify(live.aimOther)}`);

  // Vue de jeu de référence (place B, 4 directions) et scène chargée (32 soldats à moins de 18 m)
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
        const active = vis.filter(Boolean).length; // soldats actifs (visibles ou hors champ)
        out.push({ yaw: +yaw.toFixed(2), soldiersActive: active, calls: all.calls, callsWithoutSoldiers: none.calls, soldierCalls: all.calls - none.calls, soldierTriangles: all.triangles - none.triangles, callsPerActiveSoldier: +((all.calls - none.calls) / Math.max(1, active)).toFixed(1) });
      }
      return out;
    }, [cluster]);
  const range = (list, k) => `${Math.min(...list.map((v) => v[k]))}–${Math.max(...list.map((v) => v[k]))}`;
  metrics.view16v16 = await measureView(false);
  C.ok(`[${gamePath}] 16v16, vue de jeu de référence (place B, 4 directions)`, metrics.view16v16.length === 4, `${range(metrics.view16v16, 'calls')} appels, dont soldats ${range(metrics.view16v16, 'soldierCalls')} (M0 : ${range(M0.view16v16, 'calls')}, soldats ${range(M0.view16v16, 'soldierCalls')})`);
  metrics.crowd16v16 = await measureView(true);
  const perSoldier = max(metrics.crowd16v16.map((v) => v.callsPerActiveSoldier));
  C.ok(`[${gamePath}] 16v16, scène chargée : ≤ ${L.crowdPerSoldier} appels par soldat`, perSoldier <= L.crowdPerSoldier, `${range(metrics.crowd16v16, 'calls')} appels, dont soldats ${range(metrics.crowd16v16, 'soldierCalls')}, ${perSoldier}/soldat (M0 : ${range(M0.crowd16v16, 'calls')}, soldats ${range(M0.crowd16v16, 'soldierCalls')})`);
  for (const [i, yaw] of [0, Math.PI / 2, Math.PI, -Math.PI / 2].entries()) {
    await run(page, `g.controller.yaw = ${yaw}; g.controller.pitch = 0; g.controller.snap = true;`);
    await step(page, 0.2);
    await page.screenshot({ path: `${dir}crowd-16v16-${gamePath}-${['nord', 'est', 'sud', 'ouest'][i]}.png`, timeout: 120000 });
  }

  // Mémoire sur 3 relances (16v16)
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
  C.ok(`[${gamePath}] mémoire GPU stable sur 3 relances (géométries ≤ ×${LIMITS.memoryGrowth}, textures stables)`, r3.geometries <= r2.geometries * LIMITS.memoryGrowth && r3.textures <= r2.textures + 2, metrics.restarts.map((r) => `${r.geometries} géo, ${r.textures} tex`).join(' → '));
  C.ok(`[${gamePath}] mémoire JS stable sur 3 relances (+${LIMITS.heapGrowthMB} Mo au plus)`, r3.heapMB - r2.heapMB <= LIMITS.heapGrowthMB, metrics.restarts.map((r) => `${r.heapMB} Mo`).join(' → '));

  // ---------- 5. Téléphone émulé (844×390, tactile) : les deux chemins ----------
  await page.goto('about:blank'); // arrête la partie 16v16 : elle occuperait le rendu logiciel partagé
  metrics.mobile = {};
  for (const path of PATHS) {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    const mp = await ctx.newPage();
    mp.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`[mobile ${path}] ${m.text()}`);
    });
    mp.on('pageerror', (e) => errors.push(`[mobile ${path}] PAGEERROR ${e.message}`));
    await mp.goto(`${url}/index.html?rendu=${path}`);
    await mp.waitForSelector('#menu.on', { timeout: 120000 });
    await mp.tap('[data-act="play"]');
    await mp.tap('[data-act="start"]');
    await mp.waitForSelector('#deploy.on');
    await step(mp, 1);
    await mp.tap('[data-act="deploy"]');
    await step(mp, 6);
    const res = await mp.evaluate(() => {
      const g = window.__game;
      const p = g.player;
      p.spawnProtect = 999;
      p.body.pos.set(3, 1, -21);
      p.body.vel.set(0, 0, 0);
      g.controller.yaw = 0.08;
      g.controller.pitch = -0.05;
      g.controller.snap = true;
      let i = 0;
      for (const b of g.bots) {
        if (!b.alive) continue;
        const a = (i++ / g.bots.length) * 1.4 - 0.7;
        b.body.pos.set(3 + Math.sin(a) * 14, 1, -21 + Math.cos(a) * 14);
      }
      for (let k = 0; k < 8; k++) { g.update(1 / 30); g.input.endFrame(); }
      for (const s of g.soldiers) if (s.char.weapon) s.char.weapon.flash.visible = false;
      const info = g.renderer.info;
      info.autoReset = false;
      info.reset();
      g.render();
      const r = { calls: info.render.calls, triangles: info.render.triangles, touch: document.body.classList.contains('touch'), path: g.soldiers[0].char.renderPath };
      info.autoReset = true;
      return r;
    });
    await mp.screenshot({ path: `${dir}mobile-${path}.png`, timeout: 120000 });
    metrics.mobile[path] = res;
    await ctx.close();
  }
  C.ok('téléphone émulé : les deux chemins s\'affichent (captures mobile-legacy / mobile-m1)', metrics.mobile.legacy.touch && metrics.mobile.m1.touch && metrics.mobile.legacy.path === 'LEGACY_RENDER_PATH' && metrics.mobile.m1.path === 'M1_OPTIMIZED_RENDER_PATH', `appels ${metrics.mobile.legacy.calls} → ${metrics.mobile.m1.calls}`);

  C.ok('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  C.ok('exécution sans exception', false, e.message);
} finally {
  metrics.errors = errors;
  writeFileSync(`${dir}metrics-${metrics.gamePath || 'inconnu'}.json`, JSON.stringify(metrics, null, 1));
  await browser.close();
  await server.close();
}
console.log(`Mesures : ${dir}metrics-${metrics.gamePath}.json`);
process.exit(C.summary() ? 0 : 1);
