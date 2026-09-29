import * as THREE from 'three';
import { emptyCommand } from './Soldier.js';
import { raySphere } from './physics.js';
import { rayCapsuleV } from './Combat.js';

// Transforme clavier + souris en commandes, et gère la caméra 3e personne.

const _pivot = new THREE.Vector3();
const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _want = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _hit = { t: 0 };

export class PlayerController {
  constructor(game) {
    this.game = game;
    this.cmd = emptyCommand();
    this.vcmd = { throttle: 0, steer: 0, fire: false, aimYaw: 0, aimPitch: 0, aimPoint: null };
    this.yaw = 0;
    this.pitch = 0;
    this.camPos = new THREE.Vector3();
    this.aimPoint = new THREE.Vector3();
    this.fov = 70;
    this.camDist = 3.3;
    this.scoped = false;
    this.deathCamT = 0;
  }

  attach(soldier) {
    this.s = soldier;
    this.yaw = soldier.yaw;
    this.pitch = 0;
    this.cmd.yaw = this.yaw;
    this.cmd.pitch = 0;
    this.snap = true;
  }

  // Lecture des entrées -> commande du soldat
  update(dt) {
    const game = this.game;
    const input = game.input;
    const s = this.s;
    const cmd = this.cmd;
    const t = game.touch && game.touch.active ? game.touch : null;
    const locked = input.locked;
    const zoom = this.scoped ? 0.3 : s.aiming ? 0.7 : 1;
    const sens = 0.0022 * game.settings.sensitivity * zoom;
    if (locked) {
      this.yaw -= input.mouse.dx * sens;
      this.pitch -= input.mouse.dy * sens;
    }
    if (t) {
      const ts = 0.0048 * game.settings.sensitivity * zoom;
      this.yaw -= t.lookDX * ts;
      this.pitch -= t.lookDY * ts;
    }
    // recul de l'arme
    if (s.recoilKick) {
      this.pitch += s.recoilKick * (t ? 0.3 : 0.6);
      this.yaw += (Math.random() - 0.5) * s.recoilKick * 0.4;
      s.recoilKick = 0;
    }
    const k = (c) => locked && input.down(c);
    cmd.mz = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
    cmd.mx = (k('KeyA') || k('ArrowLeft') ? 1 : 0) - (k('KeyD') || k('ArrowRight') ? 1 : 0);
    cmd.jump = locked && input.hit('Space');
    cmd.crouch = k('KeyC') || k('ControlLeft');
    cmd.sprint = k('ShiftLeft') || k('ShiftRight');
    cmd.fire = locked && input.mouse.left;
    cmd.firePressed = locked && input.mouse.leftPressed;
    cmd.aim = locked && input.mouse.right;
    cmd.reload = locked && input.hit('KeyR');
    cmd.ability = -1;
    if (locked) {
      if (input.hit('Digit1') || input.hit('Numpad1')) cmd.ability = 0;
      if (input.hit('Digit2') || input.hit('Numpad2')) cmd.ability = 1;
      if (input.hit('Digit3') || input.hit('Numpad3')) cmd.ability = 2;
    }
    let interact = locked && input.hit('KeyE');
    if (t) {
      cmd.mx = Math.max(-1, Math.min(1, cmd.mx + t.move.x));
      cmd.mz = Math.max(-1, Math.min(1, cmd.mz + t.move.y));
      cmd.sprint = cmd.sprint || t.sprint;
      cmd.jump = cmd.jump || t.consume('jump');
      cmd.crouch = cmd.crouch || t.crouch;
      cmd.fire = cmd.fire || t.fire;
      cmd.firePressed = cmd.firePressed || t.consume('firePressed');
      cmd.aim = cmd.aim || t.aim;
      cmd.reload = cmd.reload || t.consume('reload');
      const ab = t.consumeAbility();
      if (ab >= 0) cmd.ability = ab;
      interact = interact || t.consume('interact');
      if (cmd.fire || cmd.aim) this.aimAssist(dt);
      t.endFrame();
    }
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
    cmd.yaw = this.yaw;
    cmd.pitch = this.pitch;
    cmd.aimPoint = this.aimPoint;
    cmd.throwPoint = null;

    // Véhicule
    const v = s.vehicle;
    if (v) {
      const vc = this.vcmd;
      vc.throttle = cmd.mz;
      vc.steer = cmd.mx;
      vc.fire = cmd.fire;
      vc.aimYaw = this.yaw;
      vc.aimPitch = this.pitch;
      vc.aimPoint = this.aimPoint;
    }
    if (interact && s.alive) this.interact();
    return cmd;
  }

  // Aide à la visée (tactile) : attire doucement le réticule vers un ennemi proche du centre
  aimAssist(dt) {
    const game = this.game;
    const s = this.s;
    if (!s.alive || s.vehicle) return;
    const cam = game.camera.position;
    let best = null;
    let bestAng = 0.09;
    let by = 0;
    let bp = 0;
    for (const e of game.soldiers) {
      if (!e.alive || e.team === s.team || !e.isVisibleTo()) continue;
      _dir.copy(e.body.pos);
      _dir.y += e.crouching ? 0.9 : 1.25;
      _dir.sub(cam);
      const d = _dir.length();
      if (d > 70 || d < 1) continue;
      const yaw = Math.atan2(_dir.x, _dir.z);
      const pitch = Math.atan2(_dir.y, Math.hypot(_dir.x, _dir.z));
      const dy = Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw));
      const dp = pitch - this.pitch;
      const ang = Math.hypot(dy, dp);
      if (ang < bestAng) {
        bestAng = ang;
        best = e;
        by = dy;
        bp = dp;
      }
    }
    if (!best) return;
    _want.copy(best.body.pos);
    _want.y += 1.2;
    if (!game.physics.lineOfSight(cam, _want)) return;
    const k = Math.min(1, dt * 4);
    this.yaw += by * k;
    this.pitch += bp * k * 0.6;
  }


  interact() {
    const s = this.s;
    const game = this.game;
    if (s.vehicle) {
      s.vehicle.exit(s);
      this.yaw = s.yaw;
      return;
    }
    const v = this.nearbyVehicle();
    if (v) {
      v.enter(s);
      game.audio.ui();
    }
  }

  nearbyVehicle() {
    const s = this.s;
    if (!s.alive || s.vehicle) return null;
    return this.game.vehicles.find((v) => v.canEnter(s)) || null;
  }

  // Caméra (appelée après la mise à jour des soldats)
  updateCamera(dt, camera) {
    const game = this.game;
    const s = this.s;
    const phys = game.physics;
    const cp = Math.cos(this.pitch);
    _fwd.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    _right.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    // écrans très larges (téléphones en paysage) : champ de vision un peu resserré
    const baseFov = this.game.camera.aspect > 1.9 ? 62 : 70;
    let fov = baseFov;
    let dist;
    let shoulder;
    this.scoped = false;
    if (!s.alive) {
      // caméra de mort : on recule doucement au-dessus du corps
      this.deathCamT += dt;
      _pivot.copy(s.body.pos);
      _pivot.y += 1.2;
      dist = 4 + Math.min(3, this.deathCamT * 1.5);
      shoulder = 0;
      this.pitch += (-0.45 - this.pitch) * Math.min(1, dt * 2);
      this.yaw += dt * 0.25;
    } else if (s.vehicle) {
      this.deathCamT = 0;
      const v = s.vehicle;
      _pivot.copy(v.pos);
      _pivot.y += v.type === 'tank' ? 3.2 : 2.3;
      dist = v.type === 'tank' ? 9 : 7;
      shoulder = 0;
      fov = 72;
    } else {
      this.deathCamT = 0;
      _pivot.copy(s.body.pos);
      _pivot.y += s.crouching ? 1.25 : 1.65;
      const aiming = s.aiming;
      if (aiming && s.weapon.scope) {
        // lunette : vue à la 1re personne
        this.scoped = true;
        dist = -0.1;
        shoulder = 0;
        fov = baseFov / s.weapon.zoom;
      } else {
        dist = aiming ? 1.8 : 3.3;
        shoulder = aiming ? 0.62 : 0.7;
        fov = aiming ? baseFov / s.weapon.zoom : baseFov;
      }
    }
    // Position voulue + collision caméra
    const base = _want.copy(_pivot).addScaledVector(_right, shoulder);
    const camTarget = this._camTarget || (this._camTarget = new THREE.Vector3());
    camTarget.copy(base).addScaledVector(_fwd, -dist);
    if (dist > 0) {
      _dir.subVectors(camTarget, _pivot);
      const len = _dir.length();
      _dir.divideScalar(len);
      const t = phys.raycast(_pivot, _dir, len + 0.3, _hit);
      if (t !== Infinity) camTarget.copy(_pivot).addScaledVector(_dir, Math.max(0.3, t - 0.3));
    }
    if (this.snap) {
      this.camPos.copy(camTarget);
      this.snap = false;
    } else this.camPos.lerp(camTarget, 1 - Math.exp(-dt * (this.scoped ? 60 : 25)));
    this.fov += (fov - this.fov) * (1 - Math.exp(-dt * 14));
    camera.fov = this.fov;
    camera.updateProjectionMatrix();
    camera.position.copy(this.camPos);
    // tremblement
    const sh = game.effects.shake;
    if (sh > 0) {
      camera.position.x += (Math.random() - 0.5) * sh * 0.25;
      camera.position.y += (Math.random() - 0.5) * sh * 0.25;
    }
    camera.lookAt(_want.copy(camera.position).add(_fwd));
    // Personnage masqué en vue lunette
    if (!s.vehicle) s.char.root.visible = s.alive ? !this.scoped : s.deadT < 7;
    // Point visé par le réticule
    this.computeAimPoint(camera.position, _fwd);
  }

  computeAimPoint(origin, dir) {
    const game = this.game;
    const s = this.s;
    // on démarre le rayon au niveau du personnage (évite les murs derrière lui)
    const skip = Math.max(0, this.camPos.distanceTo(_pivot) - 0.5);
    const o = this._o || (this._o = new THREE.Vector3());
    o.copy(origin).addScaledVector(dir, skip);
    let best = game.physics.raycast(o, dir, 400, _hit, s.vehicle ? s.vehicle.collider : null);
    if (best === Infinity) best = 400;
    this.aimTarget = null;
    for (const e of game.soldiers) {
      if (e === s || !e.alive) continue;
      const hv = e.hitVolumes();
      let t = raySphere(o, dir, hv.head, hv.headR);
      const tb = rayCapsuleV(o, dir, hv.x, hv.z, hv.y0, hv.y1, hv.r);
      if (tb >= 0 && (t < 0 || tb < t)) t = tb;
      if (t >= 0 && t < best) {
        best = t;
        this.aimTarget = e;
      }
    }
    this.aimPoint.copy(o).addScaledVector(dir, best);
    this.aimDist = best + skip;
  }
}
