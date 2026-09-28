import * as THREE from 'three';
import { emptyCommand } from './Soldier.js';

// Intelligence artificielle des bots.

const _v = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _tp = new THREE.Vector3();
const _left = new THREE.Vector3();
const _fwd = new THREE.Vector3();

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export const BOT_NAMES = [
  'Dupont', 'Moreau', 'Lambert', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guérin', 'Muller', 'Henry', 'Roux',
  'Colin', 'Vidal', 'Caron', 'Picard', 'Roger', 'Fabre', 'Aubert', 'Lemoine', 'Renaud', 'Dumas', 'Lacroix',
  'Olivier', 'Bourgeois', 'Benoît', 'Rey', 'Leclerc', 'Payet', 'Rolland', 'Leroux', 'Marchand', 'Boyer',
  'Giraud', 'Mercier', 'Barbier', 'Arnaud', 'Chevalier', 'Perrin', 'Morel', 'Brun',
];
const RANKS = ['Sdt', 'Cpl', 'Sgt', 'Adj', 'Lt', 'Cne'];

export function botName(i) {
  return `${RANKS[i % RANKS.length]}. ${BOT_NAMES[i % BOT_NAMES.length]}`;
}

export class BotBrain {
  constructor(game, soldier) {
    this.game = game;
    this.s = soldier;
    this.cmd = emptyCommand();
    this.reset();
  }

  reset() {
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.objective = null;
    this.objPos = new THREE.Vector3();
    this.objT = 0;
    this.target = null;
    this.targetVisible = false;
    this.lastSeenPos = new THREE.Vector3();
    this.lostT = 0;
    this.reactT = 0;
    this.thinkT = Math.random() * 0.3;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = 0;
    this.burstT = 0;
    this.pauseT = 0;
    this.errYaw = 0;
    this.errPitch = 0;
    this.stuckT = 0;
    this.lastPos = new THREE.Vector3();
    this.crouchT = 0;
    this.lookAtT = 0;
    this.lookAtPos = new THREE.Vector3();
    this.role = Math.random() < 0.3 ? 'defend' : 'attack';
    this.jitter = Math.random() * 30;
    this.cmd.yaw = this.s.yaw;
    this.cmd.pitch = 0;
  }

  onSpawn() {
    this.reset();
    this.lastPos.copy(this.s.body.pos);
  }

  update(dt) {
    const s = this.s;
    const cmd = this.cmd;
    cmd.jump = false;
    cmd.fire = false;
    cmd.firePressed = false;
    cmd.reload = false;
    cmd.ability = -1;
    cmd.sprint = false;
    cmd.mx = 0;
    cmd.mz = 0;
    if (!s.alive) return cmd;
    const game = this.game;
    const diff = game.difficulty;
    cmd.spreadMult = 1 + (1 - diff.accuracy) * 2.4;
    // les tireurs d'élite bots ne sont jamais parfaitement précis
    cmd.minSpread = s.weapon.scope ? 0.022 * (1.3 - diff.accuracy) : 0;

    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.22 + Math.random() * 0.12;
      this.perceive();
      this.chooseObjective(false);
      this.useAbilities();
    }
    this.objT -= dt;
    if (this.objT <= 0) this.chooseObjective(true);

    s.eyePosition(_eye);
    const hasTarget = this.target && this.targetVisible;
    const w = s.weapon;
    let dist = Infinity;
    // ---------- Visée ----------
    let desiredYaw = s.yaw;
    let desiredPitch = 0;
    if (hasTarget) {
      this.aimPoint(this.target, _tp);
      _v.subVectors(_tp, _eye);
      dist = _v.length();
      desiredYaw = Math.atan2(_v.x, _v.z);
      desiredPitch = Math.atan2(_v.y, Math.hypot(_v.x, _v.z));
      this.errYaw *= Math.exp(-dt * (1.5 + diff.accuracy * 2.5));
      this.errPitch *= Math.exp(-dt * (1.5 + diff.accuracy * 2.5));
      this.reactT -= dt;
      cmd.throwPoint = this.target.isVehicle ? this.target.pos.clone().setY(this.target.pos.y + 1) : this.target.body.pos.clone();
    } else if (this.target && this.lostT < 3) {
      _v.subVectors(this.lastSeenPos, _eye);
      desiredYaw = Math.atan2(_v.x, _v.z);
      desiredPitch = 0;
    } else if (this.lookAtT > 0) {
      this.lookAtT -= dt;
      _v.subVectors(this.lookAtPos, _eye);
      desiredYaw = Math.atan2(_v.x, _v.z);
    } else {
      const wp = this.currentWaypoint();
      if (wp) {
        _v.subVectors(wp, s.body.pos);
        if (_v.x * _v.x + _v.z * _v.z > 0.5) desiredYaw = Math.atan2(_v.x, _v.z);
      }
      desiredPitch = 0;
      cmd.throwPoint = null;
    }
    const turn = (hasTarget ? 5 + diff.accuracy * 5 : 4) * dt;
    const dy = wrap(desiredYaw + this.errYaw - cmd.yaw);
    cmd.yaw = wrap(cmd.yaw + Math.max(-turn, Math.min(turn, dy)));
    cmd.pitch += (desiredPitch + this.errPitch - cmd.pitch) * Math.min(1, dt * 8);

    // ---------- Tir ----------
    if (hasTarget && dist < w.range) {
      const angErr = Math.abs(wrap(desiredYaw - cmd.yaw)) + Math.abs(desiredPitch - cmd.pitch);
      cmd.aim = w.scope ? true : dist > 22;
      if (this.reactT <= 0 && angErr < (w.scope ? 0.05 : 0.14)) {
        if (w.auto) {
          if (this.pauseT > 0) this.pauseT -= dt;
          else {
            cmd.fire = true;
            this.burstT += dt;
            if (this.burstT > 0.35 + Math.random() * 0.6) {
              this.burstT = 0;
              this.pauseT = 0.25 + Math.random() * 0.45 * (1.5 - diff.accuracy);
            }
          }
        } else if (s.fireCd <= -0.35 - Math.random() * 0.5) {
          cmd.firePressed = true;
          cmd.fire = true;
        }
      }
    } else {
      cmd.aim = false;
      if (s.ammo < s.weapon.mag * 0.5 && s.reserve > 0) cmd.reload = true;
    }

    // ---------- Déplacement ----------
    const moveDir = _v.set(0, 0, 0);
    const wp = this.currentWaypoint();
    const inPoint = this.objective && this.objective.def && this.insidePoint(this.objective);
    if (hasTarget && dist < this.engageRange()) {
      // combat : mitraillage latéral
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeDir = Math.random() < 0.5 ? -1 : 1;
        this.strafeT = 0.6 + Math.random() * 1.4;
        if (Math.random() < 0.15 * (0.5 + diff.accuracy)) cmd.jump = true;
      }
      _left.set(Math.cos(cmd.yaw), 0, -Math.sin(cmd.yaw));
      moveDir.addScaledVector(_left, this.strafeDir);
      if (wp && !w.scope) {
        _fwd.subVectors(wp, s.body.pos).setY(0).normalize();
        moveDir.addScaledVector(_fwd, 0.6);
      }
      if (w.scope && dist > 30) moveDir.set(0, 0, 0);
      this.crouchT -= dt;
      if (this.crouchT <= 0) {
        this.crouching = Math.random() < (w.scope ? 0.7 : 0.25);
        this.crouchT = 1.5 + Math.random() * 2;
      }
      cmd.crouch = this.crouching && moveDir.lengthSq() < 0.01 ? true : this.crouching && w.scope;
    } else {
      cmd.crouch = false;
      if (wp) {
        moveDir.subVectors(wp, s.body.pos).setY(0);
        const d = moveDir.length();
        if (d > 0.001) moveDir.divideScalar(d);
        const remaining = this.remainingPath();
        cmd.sprint = !hasTarget && remaining > 12 && !inPoint;
      }
    }
    if (moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
      _left.set(Math.cos(cmd.yaw), 0, -Math.sin(cmd.yaw));
      _fwd.set(Math.sin(cmd.yaw), 0, Math.cos(cmd.yaw));
      cmd.mx = moveDir.dot(_left);
      cmd.mz = moveDir.dot(_fwd);
      if (cmd.sprint && cmd.mz < 0.3) cmd.sprint = false;
    }
    // Avancement du chemin
    if (wp) {
      const dx = wp.x - s.body.pos.x;
      const dz = wp.z - s.body.pos.z;
      if (dx * dx + dz * dz < 1.6) this.pathIdx++;
    }
    this.repathT -= dt;
    if (this.objective && (!this.path || this.pathIdx >= this.path.length) && !inPoint) this.repathT = Math.min(this.repathT, 0);
    if (inPoint && (!this.path || this.pathIdx >= (this.path?.length ?? 0))) {
      // se déplacer un peu dans la zone
      if (Math.random() < dt * 0.4) this.pickSpotInPoint();
    }
    if (this.repathT <= 0 && game.pathBudget > 0) {
      game.pathBudget--;
      this.repathT = 3 + Math.random() * 2;
      this.path = game.nav.findPath(s.body.pos, this.objPos);
      this.pathIdx = 0;
    }
    // Anti-blocage
    this.stuckT += dt;
    if (this.stuckT > 1.2) {
      const moved = Math.hypot(s.body.pos.x - this.lastPos.x, s.body.pos.z - this.lastPos.z);
      const wantMove = Math.abs(cmd.mx) + Math.abs(cmd.mz) > 0.3;
      if (wantMove && moved < 0.5) {
        cmd.jump = true;
        this.repathT = 0;
        this.strafeDir *= -1;
        if (this.path && this.pathIdx < this.path.length - 1) this.pathIdx++;
      }
      this.stuckT = 0;
      this.lastPos.copy(s.body.pos);
    }
    return cmd;
  }

  engageRange() {
    const w = this.s.weapon;
    return w.scope ? 200 : w.id === 'mitrailleuse' ? 55 : 65;
  }

  aimPoint(t, out) {
    if (t.isVehicle) return out.copy(t.pos).setY(t.pos.y + 1.2);
    out.copy(t.body.pos);
    const head = this.game.difficulty.accuracy > 0.8 && this.s.weapon.scope;
    out.y += head ? (t.crouching ? 1.0 : 1.55) : t.crouching ? 0.8 : 1.15;
    // anticipation légère
    out.addScaledVector(t.body.vel, 0.08);
    return out;
  }

  currentWaypoint() {
    if (!this.path || this.pathIdx >= this.path.length) return null;
    return this.path[this.pathIdx];
  }

  remainingPath() {
    if (!this.path) return 0;
    let d = 0;
    let prev = this.s.body.pos;
    for (let i = this.pathIdx; i < this.path.length; i++) {
      d += Math.hypot(this.path[i].x - prev.x, this.path[i].z - prev.z);
      prev = this.path[i];
      if (d > 40) break;
    }
    return d;
  }

  insidePoint(p) {
    const dx = this.s.body.pos.x - p.pos.x;
    const dz = this.s.body.pos.z - p.pos.z;
    return dx * dx + dz * dz < (p.def.radius * 0.9) ** 2;
  }

  pickSpotInPoint() {
    const p = this.objective;
    if (!p || !p.def) return;
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * p.def.radius * 0.7;
      const x = p.pos.x + Math.cos(a) * r;
      const z = p.pos.z + Math.sin(a) * r;
      if (!this.game.nav.isBlockedWorld(x, z)) {
        this.objPos.set(x, 0, z);
        this.path = [new THREE.Vector3(x, 0, z)];
        this.pathIdx = 0;
        return;
      }
    }
  }

  // Choix du drapeau à prendre / défendre
  chooseObjective(force) {
    const s = this.s;
    const conquest = this.game.conquest;
    if (!conquest) return;
    const cur = this.objective;
    if (!force && cur && cur.def) {
      // Garde l'objectif tant qu'il n'est pas sécurisé
      const secured = cur.owner === s.team && Math.abs(cur.progress) >= 0.999 && !cur.contested;
      if (!secured) return;
      if (this.role === 'defend' && Math.random() < 0.7) return;
    }
    this.objT = 8 + Math.random() * 8;
    const pts = conquest.points;
    const enemy = s.team === 'blue' ? 'red' : 'blue';
    let best = null;
    let bestScore = Infinity;
    for (const p of pts) {
      const d = Math.hypot(p.pos.x - s.body.pos.x, p.pos.z - s.body.pos.z);
      let score = d + this.jitter * 1.5 + Math.random() * 25;
      const mine = p.owner === s.team && p.progress * (s.team === 'blue' ? 1 : -1) > 0.99;
      if (this.role === 'attack') {
        if (mine && p.counts[enemy] === 0) score += 150;
        if (!p.owner) score -= 20;
      } else {
        if (!mine) score += 30;
        if (p.counts[enemy] > 0) score -= 60;
      }
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (!best) return;
    if (best !== this.objective) {
      this.objective = best;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * best.def.radius * 0.6;
      let x = best.pos.x + Math.cos(a) * r;
      let z = best.pos.z + Math.sin(a) * r;
      if (this.game.nav.isBlockedWorld(x, z)) {
        x = best.pos.x;
        z = best.pos.z;
      }
      this.objPos.set(x, 0, z);
      this.repathT = 0;
    }
  }

  perceive() {
    const s = this.s;
    const game = this.game;
    s.eyePosition(_eye);
    const range = s.weapon.scope ? 190 : 115;
    const fwdYaw = s.yaw;
    const cands = [];
    for (const e of game.soldiers) {
      if (!e.alive || e.team === s.team) continue;
      const tx = e.body.pos.x - s.body.pos.x;
      const tz = e.body.pos.z - s.body.pos.z;
      const d = Math.hypot(tx, tz);
      if (d > range) continue;
      if (e.effects.camouflage > 0 && d > 6 && !(e.revealT > 0 && d < 25)) continue;
      const ang = Math.abs(wrap(Math.atan2(tx, tz) - fwdYaw));
      const recentlyHurtBy = s.lastAttacker === e && game.time - s.lastHurt < 2;
      if (ang > 1.9 && d > 14 && !recentlyHurtBy && !(e.revealT > 0 && d < 40)) continue;
      cands.push({ e, d: d * (e === this.target ? 0.7 : 1) * (e.vehicle ? 0.8 : 1) });
    }
    for (const v of game.vehicles) {
      if (!v.alive || !v.driver || v.team === s.team) continue;
      const d = v.pos.distanceTo(s.body.pos);
      if (d < range) cands.push({ e: v, d: d * 0.9, vehicle: true });
    }
    cands.sort((a, b) => a.d - b.d);
    let found = null;
    for (let i = 0; i < Math.min(4, cands.length); i++) {
      const c = cands[i];
      const t = c.e;
      if (c.vehicle) {
        _tp.copy(t.pos).setY(t.pos.y + 1.5);
        t.isVehicle = true;
      } else {
        if (t.vehicle) {
          // conducteur : on vise le véhicule
          const v = t.vehicle;
          if (v.type === 'tank') continue;
        }
        _tp.copy(t.body.pos);
        _tp.y += t.crouching ? 0.9 : 1.3;
      }
      if (game.physics.lineOfSight(_eye, _tp)) {
        found = t;
        break;
      }
    }
    if (found) {
      if (found !== this.target) {
        const diff = game.difficulty;
        this.reactT = diff.reaction * (0.6 + Math.random() * 0.8);
        const e = (1.2 - diff.accuracy) * 0.35;
        this.errYaw = (Math.random() - 0.5) * 2 * e;
        this.errPitch = (Math.random() - 0.5) * e * 0.6;
      }
      this.target = found;
      this.targetVisible = true;
      this.lostT = 0;
      this.lastSeenPos.copy(found.isVehicle ? found.pos : found.body.pos);
      this.lastSeenPos.y += 1.2;
    } else {
      this.targetVisible = false;
      if (this.target) {
        this.lostT += 0.25;
        if (this.lostT > 3 || (this.target.alive === false) || (this.target.isVehicle && !this.target.alive)) this.target = null;
      }
      // touché par un ennemi invisible : on se retourne
      if (s.lastAttackerPos && game.time - s.lastHurt < 0.5) {
        this.lookAtPos.copy(s.lastAttackerPos);
        this.lookAtT = 1.5;
      }
    }
  }

  useAbilities() {
    const s = this.s;
    if (s.action) return;
    const ab = s.cls.abilities;
    const ready = (i) => s.abilityCd[ab[i]] <= 0;
    const t = this.targetVisible ? this.target : null;
    const d = t ? (t.isVehicle ? t.pos.distanceTo(s.body.pos) : t.body.pos.distanceTo(s.body.pos)) : Infinity;
    const cmd = this.cmd;
    const r = Math.random();
    switch (s.classId) {
      case 'assaut':
        if (ready(2) && s.health < s.maxHealth * 0.5) cmd.ability = 2;
        else if (ready(0) && t && d > 9 && d < 30 && r < 0.3) cmd.ability = 0;
        else if (ready(1) && !t && this.remainingPath() > 30 && r < 0.2) cmd.ability = 1;
        break;
      case 'artilleur':
        if (ready(0) && t && (t.isVehicle || (d > 8 && d < 45 && r < 0.25))) cmd.ability = 0;
        else if (ready(1) && t && s.health < s.maxHealth * 0.75) cmd.ability = 1;
        else if (ready(2) && t && d < 40 && r < 0.2) cmd.ability = 2;
        break;
      case 'commando':
        if (ready(2) && t && !t.isVehicle && d < 3.2) cmd.ability = 2;
        else if (ready(1) && t && d > 20 && r < 0.4) cmd.ability = 1;
        else if (ready(0) && !t && this.remainingPath() > 25 && r < 0.2) cmd.ability = 0;
        break;
      default:
        break;
    }
  }
}

