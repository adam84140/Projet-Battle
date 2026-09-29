// Test de régression des commandes tactiles (téléphone émulé, paysage 844×390).
// Usage : npm run test:touch
import { startServer, launch, step, get, run, Checks } from './lib.mjs';

const C = new Checks('Tactile');
const { server, url } = await startServer();
const { browser, context, page, errors } = await launch({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const cdp = await context.newCDPSession(page);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id })) });

try {
  await page.goto(url + '/index.html');
  await page.waitForSelector('#menu.on', { timeout: 120000 });
  C.ok('mode tactile détecté', await page.evaluate(() => document.body.classList.contains('touch')));
  await page.tap('[data-act="play"]');
  await page.tap('[data-act="start"]');
  await page.waitForSelector('#deploy.on');
  await page.tap('[data-act="deploy"]');
  await step(page, 0.3);
  C.ok('calque tactile visible en jeu', await get(page, "!document.getElementById('touch').classList.contains('hidden')"));
  await run(page, `const p = g.player; p.spawnProtect = 999; const s = p.team === 'blue' ? 1 : -1;
    p.body.pos.set(0, 1, -85 * s); p.body.vel.set(0, 0, 0); g.controller.yaw = s > 0 ? 0 : Math.PI;`);
  await step(page, 0.4);
  const s0 = await get(page, '({ pos: g.player.body.pos.clone(), yaw: g.controller.yaw, ammo: g.player.ammo })');

  // joystick poussé à fond + second doigt qui vise
  await touch('touchStart', [[120, 300, 1]]);
  await touch('touchMove', [[120, 250, 1]]);
  await touch('touchMove', [[120, 238, 1]]);
  await touch('touchStart', [[120, 238, 1], [560, 200, 2]]);
  await touch('touchMove', [[120, 238, 1], [600, 200, 2]]);
  await step(page, 1.5);
  const s1 = await get(page, '({ x: g.player.body.pos.x, z: g.player.body.pos.z, yaw: g.controller.yaw, sprint: g.player.sprinting })');
  C.ok('joystick : déplacement', Math.hypot(s1.x - s0.pos.x, s1.z - s0.pos.z) > 6);
  C.ok('joystick à fond : sprint', s1.sprint);
  C.ok('glisser : rotation de la caméra', Math.abs(s1.yaw - s0.yaw) > 0.05);
  await touch('touchEnd', [[120, 238, 1]]);
  await touch('touchEnd', [[600, 200, 2]]);

  // bouton de tir maintenu
  const fire = await page.evaluate(() => { const r = document.querySelector('.t-fire').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await touch('touchStart', [[fire[0], fire[1], 3]]);
  await step(page, 0.6);
  await touch('touchEnd', [[fire[0], fire[1], 3]]);
  C.ok('bouton de tir', (await get(page, 'g.player.ammo')) < s0.ammo);

  // compétence 2 (touchée dans le HUD)
  const ab = await page.evaluate(() => { const r = document.querySelectorAll('.ab')[1].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.touchscreen.tap(ab[0], ab[1]);
  await step(page, 0.2);
  C.ok('compétence au toucher', (await get(page, 'g.player.effects.adrenaline')) > 0);

  // saut
  const jump = await page.evaluate(() => { const r = document.querySelector('.t-jump').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.touchscreen.tap(jump[0], jump[1]);
  await step(page, 0.1);
  C.ok('bouton saut', !(await get(page, 'g.player.body.grounded')));
  await step(page, 1.2);

  // pause / reprise
  await page.tap('[data-act="pause"]');
  C.ok('pause', await get(page, "g.state === 'paused'"));
  await page.tap('#pause [data-act="resume"]');
  C.ok('reprise', await get(page, "g.state === 'playing'"));

  C.ok('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (err) {
  C.ok('exécution du scénario', false, err.message);
}

await browser.close();
await server.close();
process.exit(C.summary() ? 0 : 1);
