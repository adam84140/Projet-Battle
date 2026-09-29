// Captures de référence pour comparer l'avant / après d'une phase.
// Usage : npm run shots -- <étiquette> [turn|poses|sheet|game|fx|all]
// Résultat : test-results/shots/<étiquette>/*.png
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer, launch, step, run } from './lib.mjs';

const label = process.argv[2] || 'courant';
const only = process.argv[3] || 'all';
const dir = fileURLToPath(new URL(`../test-results/shots/${label}/`, import.meta.url));
mkdirSync(dir, { recursive: true });

const { server, url } = await startServer();
const { browser, page, errors } = await launch();

if (only === 'all' || only === 'turn') {
  await page.setViewportSize({ width: 2130, height: 560 });
  for (const [cls, team] of [['assaut', 'blue'], ['assaut', 'red'], ['artilleur', 'red'], ['artilleur', 'blue'], ['commando', 'blue'], ['commando', 'red']]) {
    await page.goto(`${url}/tests/turntable.html?classe=${cls}&equipe=${team}&bake=1`);
    await page.waitForFunction(() => window.__done === true, null, { timeout: 120000 });
    await page.screenshot({ path: `${dir}turn-${cls}-${team}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
}

if (only === 'all' || only === 'poses') {
  await page.setViewportSize({ width: 1540, height: 1230 });
  for (const [cls, team] of [['assaut', 'blue'], ['artilleur', 'red']]) {
    await page.goto(`${url}/tests/poses.html?classe=${cls}&equipe=${team}`);
    await page.waitForFunction(() => window.__done === true, null, { timeout: 120000 });
    await page.screenshot({ path: `${dir}poses-${cls}-${team}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
}

if (only === 'all' || only === 'sheet') {
  await page.setViewportSize({ width: 1500, height: 1000 });
  for (const [cls, team] of [['assaut', 'blue'], ['artilleur', 'red'], ['commando', 'blue'], ['assaut', 'red']]) {
    await page.goto(`${url}/fiche.html?classe=${cls}&equipe=${team}`);
    await page.waitForFunction(() => window.__done === true, null, { timeout: 180000 });
    await (await page.$('.views')).screenshot({ path: `${dir}views-${cls}-${team}.png` });
    if (cls === 'assaut' && team === 'blue') {
      for (const s of ['hdr', 'face', 'equip', 'anim', 'expr', 'apose', 'scale', 'acc']) await (await page.$('.' + s)).screenshot({ path: `${dir}${s}.png` });
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
}

if (only === 'all' || only === 'game') {
  await page.goto(url + '/index.html?autotest');
  await page.waitForSelector('#menu.on', { timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: dir + 'menu.png' });
  await page.click('[data-act="play"]');
  await page.click('[data-act="start"]');
  await page.waitForSelector('#deploy.on');
  await page.click('[data-act="deploy"]');
  await step(page, 18);
  const place = (x, z, yaw, pitch) =>
    run(page, `const p = g.player; if (!p.alive) p.spawn(p.body.pos.clone().set(${x}, 1, ${z}), ${yaw});
      p.body.pos.set(${x}, 1, ${z}); p.body.vel.set(0, 0, 0); p.spawnProtect = 999;
      g.controller.yaw = ${yaw}; g.controller.pitch = ${pitch}; g.controller.snap = true;`);
  await place(3, -21, 0.08, -0.05);
  await step(page, 0.7);
  await page.screenshot({ path: dir + 'gameplay.png' });
  await step(page, 0.3, 'g.input.mouse.right = true');
  await page.screenshot({ path: dir + 'aim.png' });
  await step(page, 0.35, 'g.input.mouse.right = true; g.input.mouse.left = true');
  await page.screenshot({ path: dir + 'fire.png' });
  await run(page, 'g.input.mouse.right = false; g.input.mouse.left = false;');
  await place(-4, -4, 0.6, -0.12);
  await step(page, 1.2);
  await page.screenshot({ path: dir + 'capture.png' });
  await place(-52, -14, -1.35, -0.02);
  await step(page, 0.7);
  await page.screenshot({ path: dir + 'map-moulin.png' });
  await run(page, `const p = g.player; const t = g.vehicles.find(v => v.type === 'tank' && v.team === p.team);
    t.pos.set(0, 0, -60); t.yaw = 0; p.body.pos.set(3, 1, -60); t.enter(p); g.controller.yaw = 0.2; g.controller.pitch = -0.05; g.controller.snap = true;`);
  await step(page, 1.2);
  await page.screenshot({ path: dir + 'vehicle-tank.png' });
  await run(page, `const p = g.player; p.vehicle.exit(p); const j = g.vehicles.find(v => v.type === 'jeep' && v.team === p.team);
    j.pos.set(-2, 0, -40); j.yaw = 0.1; p.body.pos.set(0, 1, -40); j.enter(p); g.controller.yaw = 0.1; g.controller.pitch = -0.1; g.controller.snap = true;`);
  await step(page, 1);
  await page.screenshot({ path: dir + 'vehicle-jeep.png' });
}

if (only === 'all' || only === 'fx') {
  // Effets : tir (douilles, lueur), explosion puis fumée, capture d'un drapeau
  await page.goto(url + '/index.html?autotest');
  await page.waitForSelector('#menu.on', { timeout: 120000 });
  await page.click('[data-act="play"]');
  await page.click('[data-act="start"]');
  await page.waitForSelector('#deploy.on');
  await page.click('[data-act="deploy"]');
  await step(page, 1);
  await run(page, `const p = g.player; p.spawnProtect = 999; for (const b of g.soldiers) if (b !== p) { b.alive = false; b.char.root.visible = false; b.respawnTimer = 1e9; }
    p.body.pos.set(3, 1, -21); p.body.vel.set(0, 0, 0); g.controller.yaw = 0.08; g.controller.pitch = -0.05; g.controller.snap = true;`);
  await step(page, 0.5);
  await step(page, 0.25, 'g.input.mouse.left = true');
  await page.screenshot({ path: dir + 'fx-tir.png' });
  await run(page, 'g.input.mouse.left = false;');
  await step(page, 0.5);
  await run(page, `const p = g.player; const f = p.forward(p.body.pos.clone()); const at = p.body.pos.clone().addScaledVector(f, 12); g.combat.explode(at, 5, 0, null, {});`);
  await step(page, 0.2);
  await page.screenshot({ path: dir + 'fx-explosion.png' });
  await step(page, 1.3);
  await page.screenshot({ path: dir + 'fx-fumee.png' });
  await run(page, `const pt = g.conquest.points[1]; const p = g.player; p.body.pos.set(pt.pos.x - 6, pt.pos.y + 1, pt.pos.z - 9); g.controller.yaw = Math.atan2(6, 9); g.controller.pitch = 0.05; g.controller.snap = true;`);
  await step(page, 0.5);
  await run(page, `const pt = g.conquest.points[1]; g.effects.captureBurst(pt.pos, g.player.team);`);
  await step(page, 0.35);
  await page.screenshot({ path: dir + 'fx-capture.png' });
}

console.log(`Captures dans ${dir} — erreurs console : ${errors.length}`);
await browser.close();
await server.close();
