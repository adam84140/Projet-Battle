import * as THREE from 'three';
import { raySphere } from './physics.js';
import { terrainHeight } from './map.js';
import { buildGrenade } from '../character/accessories.js';
import { buildRocket } from '../character/weapons.js';

const _hit = { t: 0, box: null, terrain: false };
const _p = new THREE.Vector3();
const _d = new THREE.Vector3();
const _o = new THREE.Vector3();

// Rayon / capsule verticale
export function rayCapsuleV(o, d, cx, cz, y0, y1, r) {
  const ox = o.x - cx;
  const oz = o.z - cz;
  const a = d.x * d.x + d.z * d.z;
  if (a < 1e-8) {
    if (ox * ox + oz * oz > r * r) return -1;
    const t = d.y < 0 ? (y1 - o.y) / d.y : (y0 - o.y) / d.y;
    return t >= 0 ? t : -1;
  }
  const b = ox * d.x + oz * d.z;
  const c = ox * ox + oz * oz - r * r;
  const disc = b * b - a * c;
  if (disc < 0) return -1;
  const sq = Math.sqrt(disc);
  let tIn = (-b - sq) / a;
  const tOut = (-b + sq) / a;
  if (tOut < 0) return -1;
  tIn = Math.max(tIn, 0);
  const yIn = o.y + d.y * tIn;
  if (yIn >= y0 && yIn <= y1) return tIn;
  if (Math.abs(d.y) > 1e-6) {
    for (const yy of [y0, y1]) {
      const t = (yy - o.y) / d.y;
      if (t >= tIn && t <= tOut) return t;
    }
  }
  return -1;
}

export function falloff(w, dist) {
  if (dist <= w.falloffStart) return 1;
  if (dist >= w.falloffEnd) return w.falloffMin;
  const t = (dist - w.falloffStart) / (w.falloffEnd - w.falloffStart);
  return 1 + (w.falloffMin - 1) * t;
}

export class Combat {
  constructor(game) {
    this.game = game;
    this.projectiles = [];
  }

  // Tir instantané. Renvoie { point, victim, head, t }
  hitscan(shooter, origin, dir, range, damage, w) {
    const game = this.game;
    let best = game.physics.raycast(origin, dir, range, _hit);
    if (best === Infinity) best = range;
    const worldBox = _hit.box;
    const worldTerrain = _hit.terrain;
    let victim = null;
    let head = false;
    for (const s of game.soldiers) {
      if (s === shooter || !s.alive || s.team === shooter.team) continue;
      if (s.vehicle && s.vehicle.type === 'tank') continue;
      const hv = s.hitVolumes();
      // rejet rapide
      _p.set(hv.x - origin.x, 0, hv.z - origin.z);
      const along = _p.x * dir.x + _p.z * dir.z;
      if (along < -2 || along > best + 2) continue;
      const th = raySphere(origin, dir, hv.head, hv.headR);
      if (th >= 0 && th < best) {
        best = th;
        victim = s;
        head = true;
      }
      const tb = rayCapsuleV(origin, dir, hv.x, hv.z, hv.y0, hv.y1, hv.r);
      if (tb >= 0 && tb < best - 0.05) {
        best = tb;
        victim = s;
        head = false;
      }
    }
    const point = origin.clone().addScaledVector(dir, best);
    if (victim) {
      let dmg = damage * falloff(w, best) * (head ? w.headMult : 1);
      const dealt = victim.takeDamage(dmg, shooter, { weapon: w.id, head });
      game.effects.hitSpark(point, head);
      if (dealt > 0) game.onDamageDealt(shooter, victim, dealt, head, point);
      return { point, victim, head, t: best };
    }
    if (worldBox && worldBox.vehicle) {
      const v = worldBox.vehicle;
      if (v.team !== shooter.team) v.takeDamage(damage * (v.type === 'tank' ? 0.08 : 0.35), shooter);
      game.effects.impact(point, null, 'dust');
      game.audio.impact(point);
    } else if (best < range) {
      game.effects.impact(point, worldTerrain ? { x: -dir.x * 0.3, y: 1, z: -dir.z * 0.3 } : { x: -dir.x, y: 0.3, z: -dir.z }, worldTerrain ? 'dirt' : 'dust');
      game.audio.impact(point);
    }
    return { point, victim: null, head: false, t: best };
  }

  aimTarget(shooter, cmd, out) {
    if (cmd && cmd.throwPoint) return out.copy(cmd.throwPoint);
    if (cmd && cmd.aimPoint) return out.copy(cmd.aimPoint);
    shooter.eyePosition(_o);
    shooter.aimDirection(_d);
    if (cmd && cmd.aimDir) _d.copy(cmd.aimDir);
    return out.copy(_o).addScaledVector(_d, 60);
  }

  throwGrenade(shooter, cmd) {
    const from = shooter.char.bones.handR.getWorldPosition(new THREE.Vector3());
    from.y = Math.max(from.y, shooter.body.pos.y + 1.4);
    const target = this.aimTarget(shooter, cmd, new THREE.Vector3());
    _d.subVectors(target, from);
    const dist = Math.min(35, _d.length());
    _d.normalize();
    const speed = 11 + dist * 0.45;
    const vel = new THREE.Vector3(_d.x * speed, _d.y * speed + 4 + dist * 0.06, _d.z * speed);
    const mesh = buildGrenade();
    mesh.scale.setScalar(1.6);
    this.spawnProjectile({ type: 'grenade', pos: from, vel, owner: shooter, mesh, fuse: 2.2, radius: 6.5, damage: 110, gravity: 20 });
  }

  fireRocket(shooter, cmd) {
    const from = shooter.char.getMuzzleWorld(new THREE.Vector3());
    const target = this.aimTarget(shooter, cmd, new THREE.Vector3());
    _d.subVectors(target, from).normalize();
    const vel = _d.clone().multiplyScalar(48);
    const mesh = buildRocket();
    this.spawnProjectile({ type: 'rocket', pos: from, vel, owner: shooter, mesh, fuse: 5, radius: 5, damage: 95, gravity: 1.5, vehicleMult: 3.2 });
    this.game.audio.shot('tank', shooter.isPlayer ? null : shooter.body.pos);
  }

  fireShell(vehicle, from, dir) {
    const mesh = buildRocket();
    mesh.scale.setScalar(1.3);
    this.spawnProjectile({ type: 'shell', pos: from.clone(), vel: dir.clone().multiplyScalar(95), owner: vehicle.driver, vehicle, mesh, fuse: 5, radius: 6, damage: 140, gravity: 4, vehicleMult: 2.5 });
    this.game.audio.shot('tank', vehicle.driver && vehicle.driver.isPlayer ? null : from);
    this.game.effects.muzzle(from);
    for (let i = 0; i < 6; i++) this.game.effects.dust(from);
  }

  spawnProjectile(p) {
    p.mesh.position.copy(p.pos);
    p.mesh.traverse((o) => (o.castShadow = true));
    this.game.scene.add(p.mesh);
    p.age = 0;
    p.team = p.owner ? p.owner.team : p.vehicle?.team;
    this.projectiles.push(p);
  }

  knife(shooter) {
    const fwd = shooter.forward(new THREE.Vector3());
    let best = null;
    let bestD = 2.8;
    for (const s of this.game.soldiers) {
      if (!s.alive || s.team === shooter.team || s.vehicle) continue;
      _p.subVectors(s.body.pos, shooter.body.pos);
      _p.y = 0;
      const d = _p.length();
      if (d > bestD) continue;
      if (d > 0.3 && _p.normalize().dot(fwd) < 0.4) continue;
      best = s;
      bestD = d;
    }
    if (best) {
      const dealt = best.takeDamage(120, shooter, { weapon: 'knife' });
      const p = best.body.pos.clone();
      p.y += 1.2;
      this.game.effects.hitSpark(p, true);
      if (dealt > 0) this.game.onDamageDealt(shooter, best, dealt, false, p);
    }
  }

  explode(pos, radius, damage, owner, opts = {}) {
    const game = this.game;
    game.effects.explosion(pos, radius * 0.7);
    game.audio.explosion(pos);
    if (game.player) {
      const d = game.player.body.pos.distanceTo(pos);
      game.effects.shake = Math.max(game.effects.shake, Math.max(0, 1 - d / 35) * 1.2);
    }
    const team = owner ? owner.team : opts.team;
    const top = _o.copy(pos);
    top.y += 0.6;
    for (const s of game.soldiers) {
      if (!s.alive || (s.team === team && s !== owner)) continue;
      if (s === owner) continue;
      if (s.vehicle && s.vehicle.type === 'tank') continue;
      _p.copy(s.body.pos);
      _p.y += 1;
      const d = _p.distanceTo(pos);
      if (d > radius) continue;
      if (!game.physics.lineOfSight(top, _p)) continue;
      const f = Math.max(0.2, Math.pow(1 - d / radius, 0.7));
      const dealt = s.takeDamage(damage * f, owner, { weapon: opts.weapon || 'explosion' });
      if (dealt > 0 && owner) game.onDamageDealt(owner, s, dealt, false, _p.clone());
      // projection
      _d.subVectors(s.body.pos, pos).setY(0).normalize();
      s.body.vel.addScaledVector(_d, 6 * f);
      s.body.vel.y += 4 * f;
      s.body.grounded = false;
    }
    for (const v of game.vehicles) {
      if (!v.alive || v === opts.sourceVehicle) continue;
      if (v.team === team && v.driver) continue;
      const d = v.pos.distanceTo(pos);
      if (d > radius + v.radius) continue;
      const f = Math.max(0.3, 1 - Math.max(0, d - v.radius) / radius);
      v.takeDamage(damage * f * (opts.vehicleMult || 1), owner);
    }
  }

  update(dt) {
    const game = this.game;
    const list = this.projectiles;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dt;
      p.vel.y -= p.gravity * dt;
      const step = p.vel.length() * dt;
      _d.copy(p.vel).normalize();
      let exploded = false;
      if (p.type === 'grenade') {
        const t = game.physics.raycast(p.pos, _d, step + 0.1, _hit);
        if (t !== Infinity) {
          // rebond
          p.pos.addScaledVector(_d, Math.max(0, t - 0.1));
          if (_hit.terrain) {
            p.vel.y = Math.abs(p.vel.y) * 0.35;
            p.vel.x *= 0.55;
            p.vel.z *= 0.55;
          } else {
            p.vel.x *= -0.4;
            p.vel.z *= -0.4;
            p.vel.y *= 0.4;
          }
        } else p.pos.addScaledVector(p.vel, dt);
        const g = terrainHeight(p.pos.x, p.pos.z) + 0.08;
        if (p.pos.y < g) {
          p.pos.y = g;
          p.vel.y = Math.abs(p.vel.y) * 0.3;
          p.vel.x *= 0.7;
          p.vel.z *= 0.7;
        }
        p.mesh.rotation.x += dt * 8;
        p.mesh.rotation.z += dt * 5;
        if (p.age >= p.fuse) exploded = true;
      } else {
        // roquette / obus : collision décor, soldats, véhicules
        let t = game.physics.raycast(p.pos, _d, step, _hit, p.vehicle ? p.vehicle.collider : null);
        for (const s of game.soldiers) {
          if (!s.alive || s.team === p.team) continue;
          const hv = s.hitVolumes();
          const tb = rayCapsuleV(p.pos, _d, hv.x, hv.z, hv.y0, hv.y1 + 0.3, hv.r + 0.25);
          if (tb >= 0 && tb < step && tb < t) t = tb;
        }
        if (t !== Infinity && t <= step) {
          p.pos.addScaledVector(_d, t);
          exploded = true;
        } else p.pos.addScaledVector(p.vel, dt);
        if (p.age > 0.03) game.effects.smokeTrail(p.pos);
        p.mesh.lookAt(_p.copy(p.pos).add(p.vel));
        if (p.age >= p.fuse) exploded = true;
      }
      p.mesh.position.copy(p.pos);
      if (exploded) {
        this.explode(p.pos.clone(), p.radius, p.damage, p.owner || null, {
          weapon: p.type,
          vehicleMult: p.vehicleMult,
          team: p.team,
          sourceVehicle: p.vehicle,
        });
        game.scene.remove(p.mesh);
        list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const p of this.projectiles) this.game.scene.remove(p.mesh);
    this.projectiles.length = 0;
  }
}
