// Test de régression de l'IA sur une partie simulée (logique seule, sans rendu).
// Mesure : bots bloqués (ils veulent avancer mais ne bougent pas pendant 6 s), combats, captures.
// Usage : npm run test:bots [-- <secondes>]
import { startServer, launch, step, Checks } from './lib.mjs';

const SECS = Number(process.argv[2]) || 180;
const C = new Checks('Bots');
const { server, url } = await startServer();
const { browser, page, errors } = await launch();

try {
  await page.goto(url + '/index.html?autotest');
  await page.waitForSelector('#menu.on', { timeout: 120000 });
  await page.click('[data-act="play"]');
  await page.click('[data-act="start"]');
  await page.waitForSelector('#deploy.on');
  await page.click('[data-act="deploy"]');
  await step(page, 0.5);
  const r = await page.evaluate((SECS) => {
    const g = window.__game;
    const p = g.player;
    // le joueur reste à l'écart, invulnérable, pour laisser les bots jouer entre eux
    p.spawnProtect = 1e9;
    p.body.pos.set(-100, 1, -120);
    const hist = new Map();
    let samples = 0, stuck = 0, longest = 0;
    const streak = new Map();
    const where = [];
    let total = 0, frames = 0;
    for (let t = 0; t < SECS; t += 1 / 30) {
      p.body.pos.set(-100, p.body.pos.y, -120);
      const t0 = performance.now();
      g.update(1 / 30);
      total += performance.now() - t0;
      frames++;
      g.input.endFrame();
      if (g.winner) break;
      if (frames % 30) continue;
      for (const b of g.bots) {
        const h = hist.get(b) || [];
        const br = b.brain;
        const wants = Math.abs(br.cmd.mx) + Math.abs(br.cmd.mz) > 0.3;
        h.push(b.alive && !b.vehicle && wants ? b.body.pos.clone() : null);
        if (h.length > 6) h.shift();
        hist.set(b, h);
        if (h.length < 6 || h.some((x) => !x)) {
          streak.set(b, 0);
          continue;
        }
        samples++;
        if (h[5].distanceTo(h[0]) < 1.2) {
          stuck++;
          const n = (streak.get(b) || 0) + 1;
          streak.set(b, n);
          if (n > longest) longest = n;
          if (where.length < 12) where.push([Math.round(b.body.pos.x), Math.round(b.body.pos.z)]);
        } else streak.set(b, 0);
      }
    }
    const kills = g.soldiers.reduce((a, s) => a + s.stats.kills, 0);
    const caps = g.soldiers.reduce((a, s) => a + (s.stats.captures || 0), 0);
    return { frames, avgMs: total / frames, samples, stuck, longest: longest + 5, where, kills, caps, tickets: { ...g.conquest.tickets }, winner: g.winner || null };
  }, SECS);
  const pct = r.samples ? (100 * r.stuck) / r.samples : 0;
  console.log('  ', JSON.stringify({ ...r, avgMs: +r.avgMs.toFixed(2), stuckPct: +pct.toFixed(1) }));
  C.ok('partie simulée', r.frames > 30 * 60, `${(r.frames / 30).toFixed(0)} s`);
  C.ok('les bots combattent', r.kills > 10, `${r.kills} éliminations`);
  C.ok('les bots capturent', r.caps > 0, `${r.caps} captures`);
  C.ok('bots bloqués < 3 %', pct < 3, `${pct.toFixed(1)} % (${r.stuck}/${r.samples})`);
  C.ok('aucun bot bloqué plus de 20 s', r.longest <= 20 || r.stuck === 0, `${r.stuck ? r.longest : 0} s max`);
  C.ok('coût logique par image < 8 ms', r.avgMs < 8, `${r.avgMs.toFixed(2)} ms`);
  C.ok('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (err) {
  C.ok('exécution du scénario', false, err.message);
}

await browser.close();
await server.close();
process.exit(C.summary() ? 0 : 1);
