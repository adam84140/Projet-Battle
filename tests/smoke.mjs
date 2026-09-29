// Test de régression du parcours de jeu complet (desktop, clavier + souris).
// Usage : npm run test:smoke
import { startServer, launch, step, get, run, Checks } from './lib.mjs';

const C = new Checks('Smoke desktop');
const { server, url } = await startServer();
const { browser, page, errors } = await launch();

// Bot ennemi figé devant le joueur, utilisé comme cible
const FREEZE_TARGET = `
  const p = g.player;
  let t = g.bots.find((b) => b.team !== p.team && b.alive) || g.bots.find((b) => b.team !== p.team);
  if (!t.alive) g.respawnBot(t);
  const f = p.forward(p.body.pos.clone());
  t.body.pos.set(p.body.pos.x + f.x * 10, p.body.pos.y + 0.2, p.body.pos.z + f.z * 10);
  t.body.vel.set(0, 0, 0);
  t.spawnProtect = 0;
  t.health = t.maxHealth;
  const orig = t.takeDamage.bind(t);
  t.takeDamage = (a, att, info) => (att === p ? orig(a, att, info) : 0); // seuls les tirs du joueur comptent
  t.brain.update = function () { const c = this.cmd; c.mx = c.mz = 0; c.fire = c.firePressed = c.jump = c.aim = c.reload = c.sprint = false; c.ability = -1; c.yaw = t.yaw; c.pitch = 0; return c; };
  window.__target = t;
`;
// À chaque image : le réticule vise le torse de la cible depuis la caméra
const AIM_AT_TARGET = `
  const t = window.__target, cam = g.camera.position;
  const dx = t.body.pos.x - cam.x, dz = t.body.pos.z - cam.z, dy = t.body.pos.y + 1.15 - cam.y;
  g.controller.yaw = Math.atan2(dx, dz);
  g.controller.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  g.input.mouse.right = true;
  g.input.mouse.left = true;
`;

try {
  // ---------- Menu ----------
  await page.goto(url + '/index.html?autotest');
  await page.waitForSelector('#menu.on', { timeout: 120000 });
  C.ok('menu principal affiché', true);

  // ---------- Démarrage via l'interface ----------
  await page.click('[data-act="play"]');
  await page.click('[data-act="start"]');
  await page.waitForSelector('#deploy.on');
  C.ok('écran de déploiement', true);
  await page.click('[data-act="deploy"]');
  C.ok('joueur déployé', await get(page, "g.state === 'playing' && g.player.alive"));
  C.ok('bots présents dans les deux équipes', await get(page, "g.bots.some(b => b.team === 'blue') && g.bots.some(b => b.team === 'red')"));
  await step(page, 3); // laisser tomber au sol + bots apparaître
  C.ok('bots apparus', await get(page, 'g.bots.filter(b => b.alive).length'), await get(page, 'g.bots.filter(b => b.alive).length'));

  // ---------- Déplacements ----------
  // Route dégagée au nord de la base (toujours du côté du joueur)
  await run(page, `const p = g.player; p.spawnProtect = 999; const s = p.team === 'blue' ? 1 : -1;
    p.body.pos.set(0, 1, -85 * s); p.body.vel.set(0, 0, 0); g.controller.yaw = s > 0 ? 0 : Math.PI; g.controller.pitch = 0;`);
  await step(page, 0.5);
  await run(page, 'window.__p0 = g.player.body.pos.clone();');
  await page.keyboard.down('KeyW');
  await step(page, 1.5);
  const walked = await get(page, 'g.player.body.pos.distanceTo(window.__p0)');
  C.ok('marche (Z/W)', walked > 5, walked.toFixed(1) + ' m');
  await page.keyboard.down('ShiftLeft');
  await step(page, 0.8);
  const sprintSpeed = await get(page, 'Math.hypot(g.player.body.vel.x, g.player.body.vel.z)');
  C.ok('sprint', sprintSpeed > (await get(page, 'g.player.cls.speed')) * 1.3, sprintSpeed.toFixed(1) + ' m/s');
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  await step(page, 0.5);
  await page.keyboard.press('Space');
  await step(page, 0.15);
  C.ok('saut (décolle)', !(await get(page, 'g.player.body.grounded')));
  await step(page, 1.2);
  C.ok('saut (retombe)', await get(page, 'g.player.body.grounded'));
  // saut mémorisé : appui juste avant l'atterrissage -> nouveau saut dès le contact
  await page.keyboard.press('Space');
  await step(page, 0.6);
  await page.keyboard.press('Space');
  await step(page, 0.2);
  C.ok('saut mémorisé avant atterrissage', await get(page, '!g.player.body.grounded && g.player.body.vel.y > 0'));
  await step(page, 1.2);
  await page.keyboard.down('KeyC');
  await step(page, 0.3);
  C.ok('accroupi', await get(page, 'g.player.crouching && g.player.body.height < 1.5'));
  await page.keyboard.up('KeyC');
  await step(page, 0.3);
  C.ok('se relève', await get(page, '!g.player.crouching'));

  // ---------- Visée, tir, dégâts, élimination ----------
  await run(page, FREEZE_TARGET);
  await step(page, 0.3, AIM_AT_TARGET);
  C.ok('visée (zoom caméra)', await get(page, 'g.player.aiming && g.camera.fov < 65'), await get(page, 'g.camera.fov.toFixed(1)'));
  const ammo0 = await get(page, 'g.player.ammo');
  const kills0 = await get(page, 'g.player.stats.kills');
  // on tire jusqu'à l'élimination (6 s max), en rechargeant si besoin
  for (let i = 0; i < 12 && (await get(page, 'window.__target.alive')); i++) {
    await step(page, 0.5, AIM_AT_TARGET);
    if ((await get(page, 'g.player.ammo')) === 0) await step(page, 2.2);
  }
  await run(page, 'g.input.mouse.left = false; g.input.mouse.right = false;');
  const ammo1 = await get(page, 'g.player.ammo');
  C.ok('tir consomme des munitions', ammo1 < ammo0, `${ammo0} → ${ammo1}`);
  C.ok('impacts et dégâts sur la cible', await get(page, '!window.__target.alive || window.__target.health < window.__target.maxHealth'));
  C.ok('élimination comptée', (await get(page, 'g.player.stats.kills')) > kills0, `PV cible : ${Math.round(await get(page, 'window.__target.health'))}`);
  // recul : la vue monte pendant la rafale puis revient d'elle-même
  const rc = await page.evaluate(() => {
    const g = window.__game, c = g.controller;
    c.pitch = 0; c.kickP = 0;
    let peak = 0;
    for (let i = 0; i < 10; i++) { g.input.mouse.left = true; g.update(1 / 30); g.input.endFrame(); peak = Math.max(peak, c.kickP); }
    g.input.mouse.left = false;
    for (let i = 0; i < 30; i++) { g.update(1 / 30); g.input.endFrame(); }
    return { peak, rest: c.kickP, climb: c.pitch };
  });
  C.ok('recul : la vue monte en rafale puis revient', rc.peak > 0.005 && rc.rest < rc.peak * 0.1 && rc.climb > 0, `pic ${(rc.peak * 57.3).toFixed(2)}°, reste ${(rc.rest * 57.3).toFixed(2)}°`);
  await page.keyboard.press('KeyR');
  await step(page, 0.3);
  C.ok('anneau de rechargement au réticule', await page.evaluate(() => document.querySelector('.ch-reload').classList.contains('on')));
  await step(page, 1.9);
  C.ok('rechargement', (await get(page, 'g.player.ammo')) === (await get(page, 'g.player.weapon.mag')), `${await get(page, 'g.player.ammo')} balles`);

  // ---------- Compétences ----------
  await page.keyboard.press('Digit1');
  await step(page, 1);
  C.ok('compétence 1 (grenade) en recharge', (await get(page, 'g.player.abilityCd.grenade')) > 0);
  await page.keyboard.press('Digit2');
  await step(page, 0.2);
  C.ok('compétence 2 (adrénaline) active', (await get(page, 'g.player.effects.adrenaline')) > 0);

  // ---------- Tableau des scores ----------
  await page.keyboard.down('Tab');
  await page.waitForTimeout(150);
  C.ok('tableau des scores (Tab)', await page.isVisible('#scoreboard.on'));
  await page.keyboard.up('Tab');

  // ---------- HUD : marqueurs d'objectifs lisibles ----------
  const hudCheck = await page.evaluate(() => {
    const g = window.__game;
    const bs = g.bots;
    for (let i = 0; i < 5; i++) g.hud.feed(bs[i], bs[(i + 3) % bs.length], 'fusil', null, false);
    const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const mm = document.querySelector('.minimap').getBoundingClientRect();
    const kf = document.querySelector('.killfeed').getBoundingClientRect();
    let overlaps = 0, shown = 0;
    for (let k = 0; k < 16; k++) {
      g.controller.yaw += Math.PI / 8;
      g.update(1 / 30);
      g.input.endFrame();
      for (const m of document.querySelectorAll('.pmark')) {
        if (m.style.display === 'none') continue;
        shown++;
        const r = m.getBoundingClientRect();
        if (inter(r, mm) > 4 || inter(r, kf) > 4) overlaps++;
      }
    }
    return { overlaps, shown };
  });
  C.ok('HUD : objectifs toujours indiqués, hors mini-carte et fil des éliminations', hudCheck.overlaps === 0 && hudCheck.shown >= 16 * 2, hudCheck);

  // ---------- Pause ----------
  await run(page, 'g.input.onLockChange(false);');
  C.ok('pause', (await get(page, "g.state === 'paused'")) && (await page.isVisible('#pause.on')));
  await run(page, 'g.input.onLockChange(true);');
  C.ok('reprise', (await get(page, "g.state === 'playing'")) && !(await page.isVisible('#pause.on')));

  // ---------- Mort, respawn, choix de classe ----------
  await run(page, 'g.player.spawnProtect = 0; g.player.takeDamage(9999, null);');
  C.ok('mort du joueur', !(await get(page, 'g.player.alive')));
  await page.waitForSelector('#deploy.on', { timeout: 30000 });
  await page.click('.dcls[data-class="artilleur"]');
  await page.waitForFunction(() => !document.querySelector('[data-act="deploy"]').disabled, null, { timeout: 30000 });
  await page.click('[data-act="deploy"]');
  C.ok('respawn', await get(page, 'g.player.alive'));
  C.ok('changement de classe (Artilleur)', await get(page, "g.player.classId === 'artilleur' && g.player.weapon.id === 'mitrailleuse'"));

  // ---------- Véhicules ----------
  await run(page, `
    const p = g.player; p.spawnProtect = 999;
    const j = g.vehicles.find(v => v.type === 'jeep' && v.team === p.team);
    p.body.pos.set(j.pos.x + 2.6, j.pos.y + 0.3, j.pos.z); p.body.vel.set(0,0,0);
    window.__j0 = j.pos.clone();`);
  await step(page, 0.3);
  await page.keyboard.press('KeyE');
  await step(page, 0.1);
  C.ok('entrer dans la jeep (E)', await get(page, "g.player.vehicle && g.player.vehicle.type === 'jeep'"));
  await page.keyboard.down('KeyW');
  await step(page, 2);
  await page.keyboard.up('KeyW');
  const drove = await get(page, 'g.player.vehicle ? g.player.vehicle.pos.distanceTo(window.__j0) : 0');
  C.ok('conduite de la jeep', drove > 5, drove.toFixed(1) + ' m');
  await step(page, 1);
  await page.keyboard.press('KeyE');
  await step(page, 0.3);
  C.ok('sortir de la jeep', await get(page, '!g.player.vehicle && g.player.alive'));
  C.ok('pas coincé dans un décor après sortie', await get(page, `(() => { const p = g.player.body.pos; return g.physics.query(p.x - 0.3, p.z - 0.3, p.x + 0.3, p.z + 0.3, []).filter(c => c.max.y > p.y + 0.5 && c.min.y < p.y + 1.7 && p.x > c.min.x && p.x < c.max.x && p.z > c.min.z && p.z < c.max.z).length === 0; })()`));
  await run(page, 'window.__p1 = g.player.body.pos.clone();');
  await page.keyboard.down('KeyS');
  await step(page, 1);
  await page.keyboard.up('KeyS');
  C.ok('peut se déplacer après la sortie', (await get(page, 'g.player.body.pos.distanceTo(window.__p1)')) > 1.5);
  await run(page, `
    const p = g.player; const t = g.vehicles.find(v => v.type === 'tank' && v.team === p.team);
    p.body.pos.set(t.pos.x + 3.6, t.pos.y + 0.3, t.pos.z); p.body.vel.set(0,0,0);`);
  await step(page, 0.3);
  await page.keyboard.press('KeyE');
  await step(page, 0.1);
  C.ok('entrer dans le char', await get(page, "g.player.vehicle && g.player.vehicle.type === 'tank'"));
  await step(page, 0.2, 'g.input.mouse.left = true;');
  await run(page, 'g.input.mouse.left = false;');
  C.ok('tir du canon', (await get(page, 'g.player.vehicle.fireCd')) > 1);
  await page.keyboard.press('KeyE');
  await step(page, 0.3);
  C.ok('sortir du char', await get(page, '!g.player.vehicle'));

  // ---------- Partie simulée ----------
  const k0 = await get(page, 'g.soldiers.reduce((a, s) => a + s.stats.kills, 0)');
  const avgMs = await step(page, 60);
  const sim = await get(page, `({ kills: g.soldiers.reduce((a, s) => a + s.stats.kills, 0), alive: g.bots.filter(b => b.alive).length, owned: g.conquest.points.filter(p => p.owner).length, tickets: g.conquest.tickets.blue + g.conquest.tickets.red, max: g.conquest.maxTickets * 2 })`);
  C.ok('les bots combattent (éliminations)', sim.kills > k0, `${sim.kills - k0} en 60 s`);
  C.ok('les bots capturent des drapeaux', sim.owned > 0, `${sim.owned} drapeau(x) contrôlé(s)`);
  C.ok('les tickets diminuent', sim.tickets < sim.max, `${sim.tickets}/${sim.max}`);
  C.ok('bots vivants', sim.alive > 0);
  C.ok('coût logique par image < 8 ms', avgMs < 8, avgMs.toFixed(2) + ' ms');

  // ---------- Victoire, redémarrage, défaite ----------
  await run(page, 'g.conquest.removeTickets(g.player.team === "blue" ? "red" : "blue", 9999);');
  await step(page, 3);
  await page.waitForSelector('#end.on', { timeout: 15000 });
  C.ok('écran de victoire', (await page.textContent('.end-title')).includes('Victoire'));
  await page.click('[data-act="restart"]');
  await page.waitForSelector('#deploy.on');
  C.ok('redémarrage de partie', await get(page, "g.conquest.tickets.blue === g.conquest.maxTickets && g.conquest.points.every(p => !p.owner)"));
  await page.click('[data-act="deploy"]');
  await step(page, 0.5);
  await run(page, 'g.conquest.removeTickets(g.player.team, 9999);');
  await step(page, 3);
  await page.waitForSelector('#end.on', { timeout: 15000 });
  C.ok('écran de défaite', (await page.textContent('.end-title')).includes('Défaite'));
  await page.click('[data-act="menu"]');
  await page.waitForSelector('#menu.on');
  C.ok('retour au menu', await get(page, "g.state === 'menu'"));

  C.ok('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (err) {
  C.ok('exécution du scénario', false, err.message);
}

await browser.close();
await server.close();
process.exit(C.summary() ? 0 : 1);
