// Test de régression de la caméra 3e personne : elle ne doit jamais entrer dans le décor.
// Le joueur est placé contre des façades, dans des coins et sous des arbres ; la caméra
// tourne en continu (vue normale puis visée) et chaque image est contrôlée.
// Usage : npm run test:camera
import { startServer, launch, step, Checks } from './lib.mjs';

const C = new Checks('Caméra');
const { server, url } = await startServer();
const { browser, page, errors } = await launch();

try {
  await page.goto(url + '/index.html?autotest');
  await page.waitForSelector('#menu.on', { timeout: 120000 });
  await page.click('[data-act="play"]');
  await page.click('[data-act="start"]');
  await page.waitForSelector('#deploy.on');
  await page.click('[data-act="deploy"]');
  await step(page, 1);
  const r = await page.evaluate(async () => {
    const { terrainHeight } = await import('/src/game/map.js');
    const g = window.__game;
    const p = g.player;
    const ph = g.physics;
    const c = g.controller;
    const cam = g.camera;
    p.spawnProtect = 1e9;
    // on fige les bots pour un test déterministe
    for (const b of g.soldiers) if (b !== p) { b.alive = false; b.char.root.visible = false; b.respawnTimer = 1e9; }
    const solid = ph.colliders.filter((b) => b.max.y - b.min.y > 0.5);
    const extra = ph.cameraBoxes || [];
    const inBox = (v, b, e) => v.x > b.min.x + e && v.x < b.max.x - e && v.y > b.min.y + e && v.y < b.max.y - e && v.z > b.min.z + e && v.z < b.max.z - e;
    const houses = ph.colliders.filter((b) => b.tag === 'solid' && b.max.y - b.min.y > 5 && b.max.x - b.min.x > 4 && b.max.z - b.min.z > 4).slice(0, 12);
    const trunks = ph.colliders.filter((b) => b.max.x - b.min.x < 0.7 && b.max.x - b.min.x > 0.5 && b.max.y - b.min.y > 1.8 && b.max.y - b.min.y < 3.4).slice(0, 10);
    const spots = [];
    for (const h of houses) {
      const cx = (h.min.x + h.max.x) / 2, cz = (h.min.z + h.max.z) / 2;
      spots.push([cx, h.max.z + 0.42], [cx, h.min.z - 0.42], [h.max.x + 0.42, cz], [h.min.x - 0.42, cz], [h.max.x + 0.45, h.max.z + 0.45]);
    }
    for (const t of trunks) spots.push([(t.min.x + t.max.x) / 2 + 0.9, (t.min.z + t.max.z) / 2]);
    // saut brutal = la caméra s'éloigne d'un coup du personnage (le rapprochement
    // instantané face à un obstacle est voulu : c'est lui qui évite de traverser les murs)
    let frames = 0, wall = 0, foliage = 0, ground = 0, jumps = 0, maxJump = 0, valid = 0;
    let prevD = 0;
    const head = cam.position.clone();
    for (const [x, z] of spots) {
      const y = terrainHeight(x, z);
      p.body.pos.set(x, y + 0.05, z);
      ph.moveBody(p.body, 0); // sortir d'un éventuel chevauchement
      // position artificielle impossible à atteindre en jeu (coincé entre deux obstacles) : ignorée
      const bp = p.body.pos;
      const stuck = solid.some((b) => {
        if (b.max.y <= bp.y + 0.45 || b.min.y >= bp.y + 1.8) return false;
        const dx = bp.x - Math.max(b.min.x, Math.min(bp.x, b.max.x));
        const dz = bp.z - Math.max(b.min.z, Math.min(bp.z, b.max.z));
        return dx * dx + dz * dz < 0.3 * 0.3;
      });
      if (!p.alive || stuck) continue;
      valid++;
      c.yaw = 0; c.pitch = 0; c.snap = true;
      for (let i = 0; i < 70; i++) {
        c.yaw += 0.1;
        c.pitch = Math.sin(i * 0.15) * 0.6;
        g.input.mouse.right = i >= 35;
        p.body.vel.set(0, p.body.vel.y, 0);
        g.update(1 / 30);
        g.input.endFrame();
        const v = cam.position;
        frames++;
        head.copy(p.body.pos).y += 1.6;
        const d = v.distanceTo(head);
        if (i > 0) {
          maxJump = Math.max(maxJump, d - prevD);
          if (d - prevD > 0.6) jumps++;
        }
        prevD = d;
        if (solid.some((b) => inBox(v, b, 0.02))) wall++;
        if (extra.some((b) => inBox(v, b, 0.05))) foliage++;
        if (v.y < terrainHeight(v.x, v.z) + 0.05) ground++;
      }
    }
    g.input.mouse.right = false;
    return { spots: valid, frames, wall, foliage, ground, jumps, maxJump: +maxJump.toFixed(2) };
  });
  console.log('  ', JSON.stringify(r));
  C.ok('positions testées', r.spots >= 40, r.spots);
  C.ok('caméra jamais dans un mur / objet', r.wall === 0, `${r.wall}/${r.frames} images`);
  C.ok('caméra jamais dans un feuillage', r.foliage === 0, `${r.foliage}/${r.frames} images`);
  C.ok('caméra jamais sous le sol', r.ground === 0, `${r.ground}/${r.frames} images`);
  C.ok('aucun recul brutal de la caméra', r.jumps === 0, `${r.jumps} fois, max ${r.maxJump} m/image`);
  C.ok('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (err) {
  C.ok('exécution du scénario', false, err.message);
}

await browser.close();
await server.close();
process.exit(C.summary() ? 0 : 1);
