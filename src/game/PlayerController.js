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
const _base = new THREE.Vector3();
const _hit = { t: 0 };

export class PlayerController {
  constructor(game) {
    this.game = game;
    this.cmd = emptyCommand();
    this.vcmd = { throttle: 0, steer: 0, fire: false, aimYaw: 0, aimPitch: 0, aimPoint: null };
    this.yaw = 0;
    this.pitch = 0;
    // recul : décalage temporaire de la vue (revient seul) + recul de la caméra
    this.kickP = 0;
    this.kickY = 0;
    this.punch = 0;
    this.camPos = new THREE.Vector3();
    this.aimPoint = new THREE.Vector3();
    this.fov = 70;
    this.camDist = 3.3;
    this.scoped = false;
    this.deathCamT = 0;
    // état lissé de la caméra
    this.pivotS = new THREE.Vector3();
    this.shoulderCur = 0.7;
    this.distCur = 3.3;
    this.colDist = 3.3;
    this.shoulderCol = 0.7;
    this.mode = '';
  }

  attach(soldier) {
    this.s = soldier;
    this.yaw = soldier.yaw;
    this.pitch = 0;
    this.kickP = this.kickY = this.punch = 0;
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
    // Recul propre à chaque arme : impulsion vers le haut (plus latérale pour la
    // mitrailleuse), dont une petite part reste et le reste revient seul
    const feel = s.weapon.feel;
    if (s.recoilKick) {
      const up = feel.kick * s.recoilKick * (t ? 0.5 : 1) * (1 + Math.min(s.burst || 0, 10) * feel.ramp);
      this.pitch += up * feel.keep;
      this.kickP += up * (1 - feel.keep);
      this.kickY += (Math.random() - 0.5) * 2 * feel.side * up;
      this.punch = Math.min(0.35, this.punch + feel.punch);
      s.recoilKick = 0;
    }
    const rec = 1 - Math.exp(-dt * feel.recover);
    this.kickP -= this.kickP * rec;
    this.kickY -= this.kickY * rec;
    this.punch -= this.punch * (1 - Math.exp(-dt * 14));
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
    cmd.yaw = this.yaw + this.kickY;
    cmd.pitch = Math.max(-1.25, Math.min(1.25, this.pitch + this.kickP));
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
      this.kickP = this.kickY = this.punch = 0;
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
    // direction de vue = visée de base + décalage de recul
    const vp = Math.max(-1.25, Math.min(1.25, this.pitch + this.kickP));
    const vy = this.yaw + this.kickY;
    const cp = Math.cos(vp);
    _fwd.set(Math.sin(vy) * cp, Math.sin(vp), Math.cos(vy) * cp);
    _right.set(-Math.cos(vy), 0, Math.sin(vy));
    // écrans très larges (téléphones en paysage) : champ de vision un peu resserré
    const baseFov = this.game.camera.aspect > 1.9 ? 62 : 70;
    let fov = baseFov;
    let dist;
    let shoulder;
    let ignore = null;
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
      ignore = v.collider;
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
      } else if (aiming) {
        // visée : caméra plus proche, décalée et un peu relevée pour dégager le centre
        dist = 2.25;
        shoulder = 0.82;
        _pivot.y += 0.1;
        fov = baseFov / s.weapon.zoom;
      } else {
        dist = 3.3;
        shoulder = 0.7;
        // sprint : champ de vision légèrement élargi (sensation de vitesse)
        if (s.sprinting && Math.hypot(s.body.vel.x, s.body.vel.z) > 4) fov = baseFov + 6;
      }
    }
    // Changement de sujet (véhicule, mort, réapparition) : recalage du pivot
    const mode = !s.alive ? 'dead' : s.vehicle ? 'vehicle' : 'foot';
    const snap = this.snap || mode !== this.mode;
    this.mode = mode;
    this.snap = false;
    // Pivot lissé : presque rigide à l'horizontale, plus souple en hauteur (accroupi, marches, sauts)
    const ps = this.pivotS;
    if (snap || ps.distanceToSquared(_pivot) > 9) ps.copy(_pivot);
    else {
      const kh = 1 - Math.exp(-dt * 40);
      const kv = 1 - Math.exp(-dt * 16);
      ps.x += (_pivot.x - ps.x) * kh;
      ps.z += (_pivot.z - ps.z) * kh;
      ps.y += (_pivot.y - ps.y) * kv;
    }
    // Épaule et distance voulues : transitions douces (visée), lunette immédiate
    const ka = 1 - Math.exp(-dt * 12);
    if (snap || this.scoped || this.distCur < 0) {
      this.shoulderCur = shoulder;
      this.distCur = dist;
    } else {
      this.shoulderCur += (shoulder - this.shoulderCur) * ka;
      this.distCur += (dist - this.distCur) * ka;
    }
    // Collision : 1) du pivot vers l'épaule  2) de l'épaule vers l'arrière.
    // Rapprochement immédiat (jamais à travers un mur), éloignement progressif.
    let shoulderOk = this.shoulderCur;
    if (shoulderOk > 0.01) {
      const t = phys.raycastCamera(ps, _right, shoulderOk + 0.3, ignore);
      if (t !== Infinity) shoulderOk = Math.max(0, t - 0.3);
    }
    if (snap || shoulderOk < this.shoulderCol) this.shoulderCol = shoulderOk;
    else this.shoulderCol += (shoulderOk - this.shoulderCol) * (1 - Math.exp(-dt * 6));
    const base = _base.copy(ps).addScaledVector(_right, this.shoulderCol);
    const want = this.distCur;
    // recul de la caméra au tir, dans la limite de la place libre (lunette : bref dézoom)
    let punch = 0;
    if (this.scoped) fov *= 1 + this.punch * 0.6;
    if (want > 0) {
      _dir.copy(_fwd).negate();
      const t = phys.raycastCamera(base, _dir, want + this.punch + 0.3, ignore);
      const free = t === Infinity ? want + this.punch : Math.max(0, t - 0.3);
      const allowed = Math.min(want, free);
      if (snap || allowed < this.colDist) this.colDist = allowed;
      else this.colDist += (allowed - this.colDist) * (1 - Math.exp(-dt * 6));
      punch = Math.max(0, Math.min(this.punch, free - this.colDist));
    } else this.colDist = want;
    this.camPos.copy(base).addScaledVector(_fwd, -(this.colDist + punch));
    // Dernier garde-fou : jamais d'image prise depuis l'intérieur d'un mur
    if (want > 0 && phys.pointBlocked(this.camPos, 0.05)) {
      this.colDist = 0;
      if (phys.pointBlocked(base, 0.05)) {
        this.shoulderCol = 0;
        this.camPos.copy(ps);
      } else this.camPos.copy(base);
    }
    this.fov += (fov - this.fov) * (1 - Math.exp(-dt * 10));
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
    // Personnage masqué en vue lunette, ou quand un obstacle colle la caméra contre lui
    if (!s.vehicle) s.char.root.visible = s.alive ? !this.scoped && this.colDist > 0.45 : s.deadT < 7;
    // Point visé par le réticule
    this.computeAimPoint(camera.position, _fwd);
  }

  computeAimPoint(origin, dir) {
    const game = this.game;
    const s = this.s;
    // on démarre le rayon au niveau du personnage (évite les murs derrière lui)
    const skip = Math.max(0, this.camPos.distanceTo(this.pivotS) - 0.5);
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
