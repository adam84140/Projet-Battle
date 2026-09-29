import * as THREE from 'three';
import { part, rbox, box, cyl, shade } from '../character/parts.js';
import { emblemGeometry } from '../character/emblems.js';
import { TEAMS } from '../config.js';
import { terrainHeight, MAP } from './map.js';

// Véhicules : Jeep (rapide, écrase les ennemis) et Char (canon explosif).

const TYPES = {
  jeep: { name: 'Jeep', health: 450, radius: 1.7, maxSpeed: 23, maxReverse: 8, accel: 13, half: [1.0, 1.25, 2.0] },
  tank: { name: 'Char Lourd', health: 1400, radius: 2.7, maxSpeed: 9.5, maxReverse: 5, accel: 6, half: [1.95, 1.9, 3.0] },
};

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

export class Vehicle {
  constructor(game, def) {
    this.game = game;
    this.type = def.type;
    this.isVehicle = true;
    this.cfg = TYPES[def.type];
    this.team = def.team;
    this.spawnDef = def;
    this.name = this.cfg.name;
    this.radius = this.cfg.radius;
    this.root = new THREE.Group();
    this.model = new THREE.Group();
    this.root.add(this.model);
    this.wheels = [];
    if (this.type === 'jeep') this.buildJeep();
    else this.buildTank();
    this.model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.userData.origMat = o.material;
      }
    });
    game.scene.add(this.root);
    this.collider = { min: new THREE.Vector3(), max: new THREE.Vector3(), vehicle: this, active: true, tag: 'vehicle' };
    game.physics.dynamic.push(this.collider);
    this.pos = new THREE.Vector3();
    this.respawn();
  }

  respawn() {
    const d = this.spawnDef;
    this.alive = true;
    this.health = this.cfg.health;
    this.pos.set(d.x, terrainHeight(d.x, d.z), d.z);
    this.yaw = d.yaw;
    this.speed = 0;
    this.steer = 0;
    this.driver = null;
    this.turretYaw = 0;
    this.barrelPitch = 0;
    this.fireCd = 0;
    this.wreckT = 0;
    this.lastDamager = null;
    this.root.visible = true;
    this.collider.active = true;
    this.model.traverse((o) => {
      if (o.isMesh && o.userData.origMat) o.material = o.userData.origMat;
    });
    this.syncTransform(1);
  }

  buildJeep() {
    const m = this.model;
    const body = 0x5f6b45;
    const dark = 0x2a2c30;
    const team = TEAMS[this.team];
    part(m, rbox(1.75, 0.5, 3.7, 0.08), body, { p: [0, 0.78, 0] });
    part(m, rbox(1.55, 0.36, 1.3, 0.08), shade(body, 1.05), { p: [0, 1.12, 1.15] });
    part(m, box(1.4, 0.36, 0.08), dark, { p: [0, 0.95, 1.86] });
    for (let i = 0; i < 7; i++) part(m, box(0.06, 0.3, 0.1), 0x3a3d42, { p: [-0.5 + i * 0.165, 0.95, 1.9] });
    for (const sx of [-0.55, 0.55]) part(m, cyl(0.1, 0.1, 0.06, 12), 0xfff2c0, { p: [sx, 1.1, 1.9], r: [Math.PI / 2, 0, 0], emissive: 0x333322 });
    // Garde-boue
    for (const sx of [-1, 1]) for (const sz of [-1.25, 1.25]) part(m, rbox(0.42, 0.14, 1.0, 0.05), shade(body, 0.9), { p: [sx * 0.86, 1.06, sz] });
    // Pare-brise
    part(m, box(1.6, 0.07, 0.07), dark, { p: [0, 1.95, 0.45] });
    for (const sx of [-0.78, 0.78]) part(m, box(0.07, 0.7, 0.07), dark, { p: [sx, 1.62, 0.45] });
    part(m, box(1.5, 0.6, 0.03), 0x9ec4d8, { p: [0, 1.62, 0.45], rough: 0.1, metal: 0.3 });
    // Sièges + volant (conduite à gauche = +X)
    for (const sx of [-0.42, 0.42]) {
      part(m, rbox(0.5, 0.18, 0.5, 0.05), 0x4a3322, { p: [sx, 1.05, -0.15] });
      part(m, rbox(0.5, 0.55, 0.14, 0.05), 0x4a3322, { p: [sx, 1.35, -0.43] });
    }
    part(m, rbox(1.4, 0.18, 0.55, 0.05), 0x4a3322, { p: [0, 1.05, -1.2] });
    part(m, new THREE.TorusGeometry(0.19, 0.03, 8, 20), dark, { p: [0.42, 1.45, 0.25], r: [-0.9, 0, 0] });
    part(m, cyl(0.025, 0.025, 0.4, 6), dark, { p: [0.42, 1.3, 0.35], r: [-0.9, 0, 0] });
    // Roue de secours + jerrican
    part(m, cyl(0.4, 0.4, 0.25, 16), dark, { p: [0, 1.2, -1.95], r: [Math.PI / 2, 0, 0] });
    part(m, rbox(0.3, 0.45, 0.18, 0.04), 0x55603c, { p: [0.65, 1.2, -1.9] });
    // Emblème sur le capot + fanion
    part(m, emblemGeometry(team.emblem), 0xffffff, { p: [0, 1.305, 1.15], s: 0.42, r: [-Math.PI / 2, 0, 0], shadow: false });
    part(m, cyl(0.015, 0.015, 1.8, 4), dark, { p: [-0.8, 1.9, -1.7] });
    part(m, box(0.02, 0.3, 0.45), team.flag, { p: [-0.8, 2.6, -1.93] });
    // Roues
    for (const [sx, sz] of [[-0.88, 1.25], [0.88, 1.25], [-0.88, -1.25], [0.88, -1.25]]) {
      const w = new THREE.Group();
      w.position.set(sx, 0.43, sz);
      const spin = new THREE.Group();
      w.add(spin);
      part(spin, cyl(0.43, 0.43, 0.32, 16), 0x1e1f21, { r: [0, 0, Math.PI / 2] });
      part(spin, cyl(0.22, 0.22, 0.34, 10), 0x6a6d62, { r: [0, 0, Math.PI / 2], metal: 0.4 });
      part(spin, box(0.35, 0.08, 0.5), 0x2a2c30, { p: [0, 0, 0] });
      m.add(w);
      this.wheels.push({ group: w, spin, front: sz > 0 });
    }
    this.seat = new THREE.Vector3(0.42, 0.62, -0.12);
  }

  buildTank() {
    const m = this.model;
    const team = TEAMS[this.team];
    const body = this.team === 'blue' ? 0x566146 : 0x6a5f45;
    const dark = 0x2b2b2b;
    part(m, rbox(3.1, 1.0, 5.4, 0.12), body, { p: [0, 1.15, 0] });
    part(m, rbox(3.0, 0.5, 1.2, 0.1), shade(body, 0.95), { p: [0, 1.1, 2.75], r: [0.5, 0, 0] });
    for (const sx of [-1, 1]) {
      part(m, rbox(0.75, 0.95, 5.9, 0.25), dark, { p: [sx * 1.75, 0.55, 0] });
      for (let i = 0; i < 6; i++) part(m, cyl(0.36, 0.36, 0.78, 14), 0x4a4a48, { p: [sx * 1.75, 0.45, -2.3 + i * 0.92], r: [0, 0, Math.PI / 2] });
      part(m, rbox(0.85, 0.12, 5.7, 0.04), shade(body, 0.9), { p: [sx * 1.75, 1.08, 0] });
      part(m, emblemGeometry(team.emblem), 0xffffff, { p: [sx * 1.56, 1.2, -0.8], s: 0.4, r: [0, sx * Math.PI / 2, 0], shadow: false });
    }
    // Tourelle
    this.turret = new THREE.Group();
    this.turret.position.set(0, 1.65, -0.3);
    m.add(this.turret);
    part(this.turret, rbox(2.3, 0.85, 2.7, 0.3), shade(body, 1.05), { p: [0, 0.4, 0] });
    part(this.turret, cyl(0.45, 0.45, 0.18, 16), shade(body, 0.9), { p: [0.45, 0.9, -0.35] });
    part(this.turret, rbox(0.6, 0.35, 0.5, 0.08), dark, { p: [-0.6, 0.95, -0.3] });
    part(this.turret, emblemGeometry(team.emblem), 0xffffff, { p: [0, 0.45, -1.36], s: 0.45, r: [0, Math.PI, 0], shadow: false });
    part(this.turret, box(0.5, 0.08, 0.3), team.flag, { p: [-0.9, 0.84, 1.05] });
    this.barrel = new THREE.Group();
    this.barrel.position.set(0, 0.45, 1.3);
    this.turret.add(this.barrel);
    part(this.barrel, cyl(0.16, 0.2, 0.5, 14), shade(body, 0.95), { p: [0, 0, 0.2], r: [Math.PI / 2, 0, 0] });
    part(this.barrel, cyl(0.11, 0.12, 3.0, 12), shade(body, 0.9), { p: [0, 0, 1.8], r: [Math.PI / 2, 0, 0] });
    part(this.barrel, cyl(0.17, 0.17, 0.4, 12), dark, { p: [0, 0, 3.3], r: [Math.PI / 2, 0, 0] });
    this.muzzleLocal = new THREE.Vector3(0, 0, 3.6);
    this.seat = new THREE.Vector3(0, 1.4, -0.3);
  }

  get label() {
    return this.name;
  }

  canEnter(s) {
    return this.alive && !this.driver && s.team === this.team && s.body.pos.distanceTo(this.pos) < this.radius + 2.2;
  }

  enter(s) {
    this.driver = s;
    s.vehicle = this;
    s.body.vel.set(0, 0, 0);
    s.reloadT = -1;
    s.char.anim.reload = -1;
    s.char.showWeapon(false);
  }

  exit(s, dead = false) {
    if (this.driver !== s) return;
    this.driver = null;
    s.vehicle = null;
    s.char.anim.mode = s.alive ? 'combat' : 'dead';
    s.char.root.visible = true;
    s.char.showWeapon(true);
    if (dead) {
      s.body.pos.copy(this.pos);
      s.body.pos.y = terrainHeight(this.pos.x, this.pos.z);
      return;
    }
    // Sortie à gauche, sinon ailleurs
    const left = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const tries = [left, left.clone().negate(), fwd.clone().negate(), fwd];
    for (const d of tries) {
      const p = this.pos.clone().addScaledVector(d, this.radius + 1.2);
      if (!this.game.nav.isBlockedWorld(p.x, p.z)) {
        s.body.pos.set(p.x, terrainHeight(p.x, p.z) + 0.3, p.z);
        break;
      }
    }
    s.body.vel.set(0, 3.2, 0); // petit saut de sortie
    s.body.grounded = false;
    s.yaw = this.yaw;
  }

  placeDriver(s) {
    const w = this.seat.clone().applyMatrix4(this.root.matrixWorld);
    s.body.pos.copy(w);
    s.char.root.position.copy(w);
    s.char.root.quaternion.copy(this.root.quaternion);
    s.yaw = this.yaw;
  }

  takeDamage(amount, attacker) {
    if (!this.alive) return;
    this.health -= amount;
    if (attacker) this.lastDamager = attacker;
    if (attacker && attacker.isPlayer) this.game.hud?.hitMarker(false);
    if (this.health <= 0) this.destroy(attacker);
  }

  destroy(attacker) {
    this.alive = false;
    this.health = 0;
    this.wreckT = 0;
    this.speed = 0;
    const game = this.game;
    game.combat.explode(this.pos.clone().setY(this.pos.y + 1), this.radius + 3, 80, attacker, { weapon: 'explosion', team: attacker?.team, sourceVehicle: this });
    game.effects.explosion(this.pos.clone().setY(this.pos.y + 1.5), 6);
    const d = this.driver;
    if (d) d.die(attacker || this.lastDamager, { weapon: 'explosion' });
    this.driver = null;
    if (attacker && attacker.team !== this.team) game.addScore(attacker, 150, `${this.name} détruit`);
    const burnt = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 1 });
    this.model.traverse((o) => {
      if (o.isMesh) o.material = burnt;
    });
    game.hud?.feed(attacker, null, 'explosion', this.name + (this.team === 'blue' ? ' (Aigles)' : ' (Légion)'));
  }

  // Commande du conducteur : { throttle, steer, aimYaw, aimPitch, fire, aimPoint }
  update(dt, cmd) {
    const game = this.game;
    if (!this.alive) {
      this.wreckT += dt;
      if (this.wreckT < 10 && Math.random() < dt * 12) game.effects.fireSmoke(this.pos.clone().setY(this.pos.y + 1.4));
      if (this.wreckT > 10) {
        this.root.visible = false;
        this.collider.active = false;
      }
      if (this.wreckT > 25) this.respawn();
      return;
    }
    const cfg = this.cfg;
    const throttle = cmd ? cmd.throttle : 0;
    const steerIn = cmd ? cmd.steer : 0;
    // Accélération
    if (throttle > 0) this.speed += cfg.accel * throttle * dt * (this.speed < 0 ? 2 : 1);
    else if (throttle < 0) this.speed += cfg.accel * throttle * dt * (this.speed > 0 ? 2 : 0.7);
    else this.speed *= Math.exp(-dt * (this.type === 'tank' ? 2.5 : 0.9));
    this.speed = Math.max(-cfg.maxReverse, Math.min(cfg.maxSpeed, this.speed));
    if (this.type === 'jeep') {
      this.steer += (steerIn * 0.55 - this.steer) * (1 - Math.exp(-dt * 8));
      const eff = this.steer / (1 + Math.abs(this.speed) * 0.05);
      this.yaw += (this.speed / 2.5) * Math.tan(eff) * dt;
    } else {
      this.yaw += steerIn * 1.1 * dt * (this.speed < -0.5 ? -1 : 1);
    }
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const prev = this.pos.clone();
    this.pos.x += fx * this.speed * dt;
    this.pos.z += fz * this.speed * dt;
    // Collisions décor (cercle)
    const r = this.radius * 0.85;
    const list = game.physics.query(this.pos.x - r, this.pos.z - r, this.pos.x + r, this.pos.z + r, []);
    let bumped = false;
    for (const c of list) {
      if (c.max.y - this.pos.y < 0.7 || c.min.y > this.pos.y + 2) continue;
      const cx = Math.max(c.min.x, Math.min(this.pos.x, c.max.x));
      const cz = Math.max(c.min.z, Math.min(this.pos.z, c.max.z));
      let dx = this.pos.x - cx;
      let dz = this.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      const d = Math.sqrt(d2) || 0.001;
      if (d2 < 1e-6) {
        dx = this.pos.x - prev.x || 1;
        dz = this.pos.z - prev.z;
      }
      this.pos.x += (dx / d) * (r - d);
      this.pos.z += (dz / d) * (r - d);
      bumped = true;
    }
    for (const v of game.vehicles) {
      if (v === this || !v.alive) continue;
      _v.subVectors(this.pos, v.pos).setY(0);
      const d = _v.length();
      const min = this.radius * 0.85 + v.radius * 0.85;
      if (d < min && d > 0.001) {
        this.pos.addScaledVector(_v.normalize(), min - d);
        bumped = true;
      }
    }
    if (bumped && Math.abs(this.speed) > 4) {
      if (Math.abs(this.speed) > 12) this.takeDamage(Math.abs(this.speed) * 1.5, null);
      this.speed *= -0.25;
    }
    const b = MAP.bounds;
    this.pos.x = Math.max(b.minX + 2, Math.min(b.maxX - 2, this.pos.x));
    this.pos.z = Math.max(b.minZ + 2, Math.min(b.maxZ - 2, this.pos.z));
    this.pos.y = terrainHeight(this.pos.x, this.pos.z);
    // Écrasement des ennemis / on pousse les alliés
    for (const s of game.soldiers) {
      if (!s.alive || s.vehicle) continue;
      _v.subVectors(s.body.pos, this.pos).setY(0);
      const d = _v.length();
      if (d > this.radius + 0.4) continue;
      if (s.team !== this.team && Math.abs(this.speed) > 4.5 && this.driver) {
        s.takeDamage(250, this.driver, { weapon: 'roadkill' });
        if (!s.alive) game.onDamageDealt(this.driver, s, 1, false, s.body.pos.clone());
      }
      if (d > 0.001) {
        _v.normalize();
        s.body.pos.addScaledVector(_v, this.radius + 0.45 - d);
        s.body.vel.addScaledVector(_v, 3);
      }
    }
    // Tourelle du char
    if (this.type === 'tank') {
      this.fireCd -= dt;
      if (cmd && cmd.aimYaw !== undefined) {
        let target = cmd.aimYaw - this.yaw;
        target = Math.atan2(Math.sin(target), Math.cos(target));
        let diff = target - this.turretYaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const maxStep = 1.5 * dt;
        this.turretYaw += Math.max(-maxStep, Math.min(maxStep, diff));
        this.barrelPitch += (Math.max(-0.12, Math.min(0.35, cmd.aimPitch)) - this.barrelPitch) * Math.min(1, dt * 6);
      }
      if (cmd && cmd.fire && this.fireCd <= 0) {
        this.fireCd = 2.4;
        this.root.updateMatrixWorld(true);
        const muzzle = this.muzzleLocal.clone().applyMatrix4(this.barrel.matrixWorld);
        const dir = cmd.aimPoint ? cmd.aimPoint.clone().sub(muzzle).normalize() : new THREE.Vector3(0, 0, 1).transformDirection(this.barrel.matrixWorld);
        game.combat.fireShell(this, muzzle, dir);
        this.recoil = 1;
        if (this.driver?.isPlayer) game.effects.shake = Math.max(game.effects.shake, 0.4);
      }
      this.recoil = Math.max(0, (this.recoil || 0) - dt * 4);
    }
    // Poussière
    if (Math.abs(this.speed) > 6 && Math.random() < dt * 20) game.effects.dust(this.pos.clone().addScaledVector(new THREE.Vector3(fx, 0, fz), -this.radius));
    this.syncTransform(dt);
  }

  syncTransform(dt) {
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const L = this.type === 'tank' ? 2.4 : 1.4;
    const W = this.type === 'tank' ? 1.5 : 0.9;
    const hf = terrainHeight(this.pos.x + fx * L, this.pos.z + fz * L);
    const hb = terrainHeight(this.pos.x - fx * L, this.pos.z - fz * L);
    const hl = terrainHeight(this.pos.x + fz * W, this.pos.z - fx * W);
    const hr = terrainHeight(this.pos.x - fz * W, this.pos.z + fx * W);
    const pitch = Math.atan2(hb - hf, 2 * L);
    const roll = Math.atan2(hl - hr, 2 * W);
    this.root.position.set(this.pos.x, (hf + hb + hl + hr) / 4, this.pos.z);
    _e.set(pitch, this.yaw, roll, 'YXZ');
    _q.setFromEuler(_e);
    this.root.quaternion.slerp(_q, Math.min(1, dt * 10));
    if (this.type === 'jeep') {
      for (const w of this.wheels) {
        w.spin.rotation.x += (this.speed * dt) / 0.43;
        if (w.front) w.group.rotation.y = this.steer;
      }
      this.model.rotation.x = -Math.min(0.04, Math.max(-0.04, this.speed * 0.002));
    } else {
      this.turret.rotation.y = this.turretYaw;
      this.barrel.rotation.x = -this.barrelPitch;
      this.barrel.position.z = 1.3 - (this.recoil || 0) * 0.35;
    }
    // Collision dynamique (boîte englobante)
    const h = this.cfg.half;
    const ex = Math.abs(fx) * h[2] + Math.abs(fz) * h[0];
    const ez = Math.abs(fz) * h[2] + Math.abs(fx) * h[0];
    this.collider.min.set(this.pos.x - ex * 0.9, this.pos.y, this.pos.z - ez * 0.9);
    this.collider.max.set(this.pos.x + ex * 0.9, this.pos.y + h[1], this.pos.z + ez * 0.9);
  }

  dispose() {
    this.game.scene.remove(this.root);
    const i = this.game.physics.dynamic.indexOf(this.collider);
    if (i >= 0) this.game.physics.dynamic.splice(i, 1);
  }
}

export { TYPES as VEHICLE_TYPES };
