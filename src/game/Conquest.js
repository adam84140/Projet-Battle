import * as THREE from 'three';
import { MAP, terrainHeight } from './map.js';
import { TEAMS, otherTeam } from '../config.js';
import { part, cyl, SPHERE_LOW } from '../character/parts.js';
import { emblemGeometry } from '../character/emblems.js';

// Mode Conquête : 3 drapeaux à capturer, des tickets de renfort par équipe.

const NEUTRAL = new THREE.Color(0xf2f2f2);
const BLUE = new THREE.Color(TEAMS.blue.flag);
const RED = new THREE.Color(TEAMS.red.flag);
const CAPTURE_TIME = 7; // secondes pour un soldat seul (neutre -> capturé)

export class Conquest {
  constructor(game, tickets) {
    this.game = game;
    this.tickets = { blue: tickets, red: tickets };
    this.maxTickets = tickets;
    this.bleedT = 0;
    this.points = MAP.points.map((def) => this.buildPoint(def));
    this.winner = null;
  }

  buildPoint(def) {
    const scene = this.game.scene;
    const y = terrainHeight(def.x, def.z);
    const g = new THREE.Group();
    g.position.set(def.x, y, def.z);
    scene.add(g);
    part(g, cyl(0.09, 0.12, 8, 8), 0xdddddd, { p: [0, 4, 0], metal: 0.6, rough: 0.3 });
    part(g, SPHERE_LOW, 0xd8b04a, { p: [0, 8.1, 0], s: 0.2, metal: 0.8 });
    part(g, cyl(0.7, 0.9, 0.4, 12), 0xb8aa8c, { p: [0, 0.1, 0] });
    const flagGeo = new THREE.PlaneGeometry(2.2, 1.4, 10, 5);
    flagGeo.translate(1.1, 0, 0);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9 });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.castShadow = true;
    flag.position.set(0.1, 7.2, 0);
    g.add(flag);
    const emblemMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true });
    const emblems = {};
    for (const t of ['blue', 'red']) {
      const em = new THREE.Mesh(emblemGeometry(TEAMS[t].emblem), emblemMat);
      em.scale.setScalar(0.45);
      em.position.set(1.1, 0, 0.03);
      em.visible = false;
      flag.add(em);
      emblems[t] = em;
    }
    // Anneau de zone au sol
    const ringGeo = new THREE.RingGeometry(def.radius - 0.35, def.radius, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.25;
    g.add(ring);
    const discGeo = new THREE.CircleGeometry(def.radius, 48);
    discGeo.rotateX(-Math.PI / 2);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = 0.22;
    g.add(disc);
    const base = flagGeo.attributes.position.array.slice();
    return {
      def,
      id: def.id,
      name: def.name,
      pos: new THREE.Vector3(def.x, y, def.z),
      owner: null,
      progress: 0, // -1 (Légion) ... +1 (Aigles)
      contested: false,
      counts: { blue: 0, red: 0 },
      group: g,
      flag,
      flagMat,
      flagBase: base,
      emblems,
      ringMat,
      discMat,
    };
  }

  reset() {
    for (const p of this.points) {
      p.owner = null;
      p.progress = 0;
    }
    this.tickets.blue = this.tickets.red = this.maxTickets;
    this.winner = null;
  }

  ownedCount(team) {
    return this.points.filter((p) => p.owner === team).length;
  }

  update(dt) {
    const game = this.game;
    for (const p of this.points) {
      const counts = { blue: 0, red: 0 };
      for (const s of game.soldiers) {
        if (!s.alive) continue;
        const dx = s.body.pos.x - p.pos.x;
        const dz = s.body.pos.z - p.pos.z;
        if (dx * dx + dz * dz < p.def.radius * p.def.radius && Math.abs(s.body.pos.y - p.pos.y) < 6) counts[s.team]++;
      }
      p.counts = counts;
      const diff = counts.blue - counts.red;
      p.contested = counts.blue > 0 && counts.red > 0;
      const prev = p.progress;
      if (diff !== 0) {
        // 1 soldat : 7 s ; 2 : ~4,7 s ; 3 et plus : 3,5 s
        const n = Math.min(3, Math.abs(diff));
        const rate = (1 + 0.5 * (n - 1)) / CAPTURE_TIME;
        p.progress = Math.max(-1, Math.min(1, p.progress + Math.sign(diff) * rate * dt));
      } else if (counts.blue === 0 && counts.red === 0) {
        // retour lent vers l'état du propriétaire
        const target = p.owner === 'blue' ? 1 : p.owner === 'red' ? -1 : 0;
        p.progress += Math.sign(target - p.progress) * Math.min(Math.abs(target - p.progress), dt * 0.06);
      }
      // Changements d'état
      if (p.owner === 'blue' && p.progress <= 0) this.neutralize(p, 'red');
      else if (p.owner === 'red' && p.progress >= 0) this.neutralize(p, 'blue');
      if (!p.owner && p.progress >= 1 && prev < 1) this.capture(p, 'blue');
      else if (!p.owner && p.progress <= -1 && prev > -1) this.capture(p, 'red');
      this.updateVisual(p, game.time);
    }
    // Perte de tickets pour l'équipe qui contrôle le moins de drapeaux
    this.bleedT += dt;
    if (this.bleedT >= 3) {
      this.bleedT = 0;
      const b = this.ownedCount('blue');
      const r = this.ownedCount('red');
      if (b > r) this.removeTickets('red', b - r);
      else if (r > b) this.removeTickets('blue', r - b);
    }
  }

  neutralize(p, byTeam) {
    const game = this.game;
    const lost = p.owner;
    p.owner = null;
    for (const s of game.soldiers) if (s.alive && s.team === byTeam && this.inside(s, p)) game.addScore(s, 20, 'Neutralisation');
    game.onPointEvent(p, 'neutralized', byTeam, lost);
  }

  capture(p, team) {
    const game = this.game;
    p.owner = team;
    for (const s of game.soldiers) {
      if (s.alive && s.team === team && this.inside(s, p)) {
        game.addScore(s, 50, 'Capture');
        s.stats.captures++;
      }
    }
    game.onPointEvent(p, 'captured', team);
  }

  inside(s, p) {
    const dx = s.body.pos.x - p.pos.x;
    const dz = s.body.pos.z - p.pos.z;
    return dx * dx + dz * dz < p.def.radius * p.def.radius;
  }

  removeTickets(team, n) {
    if (this.winner) return;
    this.tickets[team] = Math.max(0, this.tickets[team] - n);
    if (this.tickets[team] <= 0) {
      this.winner = otherTeam(team);
      this.game.endMatch(this.winner);
    }
  }

  updateVisual(p, time) {
    const prog = p.progress;
    const c = prog > 0 ? NEUTRAL.clone().lerp(BLUE, prog) : NEUTRAL.clone().lerp(RED, -prog);
    p.flagMat.color.copy(c);
    const ownerColor = p.owner === 'blue' ? BLUE : p.owner === 'red' ? RED : NEUTRAL;
    p.ringMat.color.copy(ownerColor);
    p.discMat.color.copy(ownerColor);
    p.ringMat.opacity = p.contested ? 0.35 + 0.35 * Math.abs(Math.sin(time * 6)) : 0.6;
    // Le drapeau monte avec la progression
    p.flag.position.y = 1.6 + Math.abs(prog) * 5.6;
    p.emblems.blue.visible = prog > 0.5;
    p.emblems.red.visible = prog < -0.5;
    const pos = p.flag.geometry.attributes.position;
    const base = p.flagBase;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      pos.setZ(i, Math.sin(x * 2.4 - time * 5 + p.def.x) * 0.1 * x * 0.5);
    }
    pos.needsUpdate = true;
    p.flag.geometry.computeVertexNormals();
  }

  // Points de déploiement disponibles pour une équipe
  spawnOptions(team) {
    const base = MAP.bases[team];
    const opts = [{ id: 'base', label: 'Base', x: base.x, z: base.z, yaw: base.yaw }];
    for (const p of this.points) {
      if (p.owner === team) opts.push({ id: p.id, label: `${p.id} — ${p.name}`, x: p.pos.x, z: p.pos.z, yaw: base.yaw, point: p });
    }
    return opts;
  }

  // Position libre autour d'un point de déploiement
  spawnPosition(opt) {
    const game = this.game;
    const isBase = opt.id === 'base';
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = isBase ? 2 + Math.random() * 7 : 5 + Math.random() * 8;
      const x = opt.x + Math.cos(a) * r;
      const z = opt.z + Math.sin(a) * r;
      if (game.nav.isBlockedWorld(x, z)) continue;
      // éviter d'apparaître sous les yeux d'un ennemi à bout portant
      let danger = false;
      for (const s of game.soldiers) {
        if (s.alive && s.team !== opt.team && Math.hypot(s.body.pos.x - x, s.body.pos.z - z) < 8) danger = true;
      }
      if (danger && i < 20) continue;
      return new THREE.Vector3(x, terrainHeight(x, z) + 0.2, z);
    }
    return new THREE.Vector3(opt.x, terrainHeight(opt.x, opt.z) + 0.5, opt.z);
  }

  dispose() {
    for (const p of this.points) this.game.scene.remove(p.group);
  }
}
