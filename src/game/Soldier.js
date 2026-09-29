import * as THREE from 'three';
import { CLASSES, WEAPONS, ABILITIES, SKIN_TONES, HAIR_COLORS } from '../config.js';
import { Character } from '../character/Character.js';

// Un soldat (joueur ou bot). Il reçoit à chaque image une "commande"
// (déplacement, visée, tir...) produite par le clavier/souris ou par l'IA.

const _fwd = new THREE.Vector3();
const _left = new THREE.Vector3();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();

export function emptyCommand() {
  return {
    mx: 0, mz: 0, yaw: 0, pitch: 0,
    jump: false, crouch: false, sprint: false,
    fire: false, firePressed: false, aim: false, reload: false,
    ability: -1, aimPoint: null, aimDir: null,
  };
}

export function randomCustom(rand = Math.random) {
  const pick = (l) => l[Math.floor(rand() * l.length)];
  return {
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_COLORS),
    eyes: pick([0x5b3a1e, 0x3a5a7a, 0x4a6a3a, 0x2a1d14]),
    cap: rand() < 0.25,
    glasses: rand() < 0.2,
    bandana: rand() < 0.3,
    backpack: rand() < 0.6,
  };
}

export class Soldier {
  constructor(game, { name, team, classId, isPlayer = false, custom = null }) {
    this.game = game;
    this.id = game.nextId++;
    this.name = name;
    this.team = team;
    this.isPlayer = isPlayer;
    this.custom = custom || randomCustom();
    this.body = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), radius: 0.38, height: 1.8, grounded: false };
    this.yaw = 0;
    this.pitch = 0;
    this.alive = false;
    this.health = 100;
    this.maxHealth = 100;
    this.stats = { kills: 0, deaths: 0, score: 0, captures: 0, assists: 0 };
    this.vehicle = null;
    this.effects = {};
    this.abilityCd = {};
    this.deadT = 0;
    this.respawnTimer = 0;
    this.killStreak = [];
    this.headPos = new THREE.Vector3();
    this.setClass(classId);
  }

  setClass(classId) {
    const game = this.game;
    const prevClass = this.classId;
    this.classId = classId;
    this.cls = CLASSES[classId];
    this.weapon = WEAPONS[this.cls.weapon];
    // Bots : le modèle quitté retourne dans la réserve, le nouveau en sort déjà construit
    // (évite ~40 ms de construction en pleine partie)
    const pooled = !this.isPlayer && game.charPool;
    if (this.char) {
      if (pooled) game.returnPooledChar(this.team, prevClass, this.char);
      else {
        game.scene.remove(this.char.root);
        this.char.dispose();
      }
    }
    const reuse = pooled ? game.takePooledChar(this.team, classId) : null;
    this.char = reuse || Soldier.buildChar(game, this.team, classId, this.custom);
    this.char.root.visible = false;
    this.char.root.traverse((o) => {
      if (o.isMesh) o.userData.soldier = this;
    });
  }

  static buildChar(game, team, classId, custom = randomCustom()) {
    const c = new Character({ team, classId, custom, bake: true, expression: 'determine' });
    c.root.visible = false;
    game.scene.add(c.root);
    return c;
  }

  spawn(pos, yaw) {
    this.alive = true;
    this.hasSpawned = true;
    this.maxHealth = this.cls.health;
    this.health = this.maxHealth;
    this.body.pos.copy(pos);
    this.body.vel.set(0, 0, 0);
    this.body.grounded = false;
    this.yaw = yaw;
    this.pitch = 0;
    this.ammo = this.weapon.mag;
    this.reserve = this.weapon.reserve;
    this.reloadT = -1;
    this.fireCd = 0;
    this.bloom = 0;
    this.abilityCd = {};
    for (const a of this.cls.abilities) this.abilityCd[a] = 0;
    this.effects = {};
    this.precisionArmed = false;
    this.spawnProtect = 2;
    this.lastHurt = -99;
    this.damageLog = new Map();
    this.action = null;
    this.actionT = 0;
    this.deadT = 0;
    this.flashT = 0;
    this.crouching = false;
    this.aiming = false;
    this.sprinting = false;
    this.lastShotTime = -99;
    this.revealT = 0;
    this.airT = 0;
    this.jumpBuf = 0;
    this.jumped = false;
    this.stepDist = 0;
    const a = this.char.anim;
    a.mode = 'combat';
    a.reload = -1;
    a.action = null;
    this.char.root.visible = true;
    this.char.setOpacity(1);
    this.char.root.position.copy(pos);
    this.char.root.rotation.y = yaw;
    this.char.animator.first = true;
  }

  get eyeHeight() {
    return this.crouching ? 1.2 : 1.62;
  }

  forward(out = _fwd) {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  aimDirection(out) {
    const cp = Math.cos(this.pitch);
    return out.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
  }

  eyePosition(out) {
    // épaule droite, hauteur des yeux
    return out.set(
      this.body.pos.x - Math.cos(this.yaw) * 0.18,
      this.body.pos.y + this.eyeHeight,
      this.body.pos.z + Math.sin(this.yaw) * 0.18,
    );
  }

  isVisibleTo() {
    return !(this.effects.camouflage > 0);
  }

  update(dt, cmd) {
    const game = this.game;
    const a = this.char.anim;
    if (!this.alive) {
      // le corps touche le sol : petit nuage de poussière
      if (this.deadT < 0.7 && this.deadT + dt >= 0.7 && !this.vehicle) game.effects.puff(this.body.pos, 6, 1.1);
      this.deadT += dt;
      a.deadT = this.deadT;
      if (this.deadT > 7) this.char.root.visible = false;
      else this.char.update(dt);
      return;
    }
    if (this.vehicle) {
      this.updateTimers(dt);
      this.vehicle.placeDriver(this);
      a.mode = this.vehicle.type === 'jeep' ? 'sit' : 'combat';
      a.pitch = 0;
      this.char.root.visible = this.vehicle.type === 'jeep';
      this.char.update(dt);
      this.char.root.updateMatrixWorld(true);
      return;
    }
    this.updateTimers(dt);
    const w = this.weapon;
    const body = this.body;

    // --- Orientation
    const prevYaw = this.yaw;
    this.yaw = cmd.yaw;
    this.pitch = Math.max(-1.25, Math.min(1.25, cmd.pitch));

    // --- Déplacement
    const busy = this.action === 'knife';
    this.crouching = cmd.crouch && body.grounded && !busy;
    this.aiming = cmd.aim && this.reloadT < 0 && !busy;
    const firing = cmd.fire && this.ammo > 0 && this.reloadT < 0;
    this.sprinting = cmd.sprint && cmd.mz > 0.3 && !this.aiming && !this.crouching && !firing;
    let speed = this.cls.speed;
    if (this.sprinting) speed *= 1.5;
    if (this.crouching) speed *= 0.5;
    if (this.aiming) speed *= w.scope ? 0.45 : 0.62;
    if (this.effects.adrenaline > 0) speed *= 1.35;
    const fwd = this.forward();
    _left.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const ml = Math.hypot(cmd.mx, cmd.mz);
    _v.set(0, 0, 0);
    if (ml > 0.01) {
      _v.addScaledVector(_left, cmd.mx / Math.max(1, ml)).addScaledVector(fwd, cmd.mz / Math.max(1, ml));
      _v.multiplyScalar(speed);
    }
    if (busy && this.actionT < 0.35) _v.addScaledVector(fwd, 9);
    // au sol : départ franc, arrêt encore plus net ; en l'air : contrôle réduit
    const accel = body.grounded ? (ml > 0.01 ? 12 : 16) : 2.5;
    const k = 1 - Math.exp(-accel * dt);
    body.vel.x += (_v.x - body.vel.x) * k;
    body.vel.z += (_v.z - body.vel.z) * k;
    // Saut : appui mémorisé un court instant avant l'atterrissage, et tolérance
    // juste après avoir quitté un rebord
    if (body.grounded) {
      this.airT = 0;
      this.jumped = false;
    } else this.airT += dt;
    this.jumpBuf = cmd.jump ? 0.14 : Math.max(0, this.jumpBuf - dt);
    const canJump = body.grounded || (this.airT < 0.12 && !this.jumped && body.vel.y <= 0);
    if (this.jumpBuf > 0 && canJump && !this.crouching) {
      body.vel.y = 8.2;
      body.grounded = false;
      this.jumpBuf = 0;
      this.jumped = true;
      if (this.isPlayer) game.audio.jump();
    }
    body.height = this.crouching ? 1.25 : 1.8;
    body.landSpeed = 0;
    game.physics.moveBody(body, dt);
    if (body.landSpeed > 5) {
      // réception : amortie proportionnellement à la vitesse de chute
      a.landT = 1;
      a.landAmt = Math.min(1, (body.landSpeed - 4) / 8);
      if (body.landSpeed > 8.5) game.effects.puff(body.pos, 4, 0.8);
      game.audio.land(this.isPlayer ? null : body.pos, a.landAmt);
    }
    // Pas (plus espacés en sprint, discrets accroupi)
    const hvNow = Math.hypot(body.vel.x, body.vel.z);
    if (body.grounded && hvNow > 1) {
      this.stepDist += hvNow * dt;
      const stride = this.sprinting ? 2.4 : this.crouching ? 1.3 : 1.8;
      if (this.stepDist >= stride) {
        this.stepDist = 0;
        const loud = this.sprinting ? 1.2 : this.crouching ? 0.4 : 0.8;
        game.audio.footstep(this.isPlayer ? null : body.pos, loud);
      }
    }

    // --- Arme
    this.fireCd -= dt;
    this.bloom = Math.max(0, this.bloom - dt * (this.aiming ? 0.25 : 0.12));
    if (this.reloadT >= 0) {
      this.reloadT += dt / w.reload;
      if (this.reloadT >= 1) this.finishReload();
    }
    if (this.effects.fureur > 0 && this.ammo < w.mag) {
      this.ammo = w.mag;
      this.reloadT = -1;
    }
    if (cmd.reload) this.startReload();
    const trigger = w.auto ? cmd.fire : cmd.firePressed;
    if (trigger && !busy && this.action !== 'throw') {
      if (this.reloadT < 0 && this.fireCd <= 0) {
        if (this.ammo > 0) this.fire(cmd);
        else if (this.reserve > 0) this.startReload();
        else if (this.isPlayer && cmd.firePressed) game.audio.empty();
      }
    }
    if (this.ammo === 0 && this.reserve > 0 && this.reloadT < 0 && this.fireCd <= -0.25) this.startReload();

    // --- Compétences
    if (cmd.ability >= 0) this.useAbility(cmd.ability, cmd);
    if (this.action) {
      this.actionT += dt / this.actionDur;
      if (this.action === 'throw' && !this.thrown && this.actionT > 0.45) {
        this.thrown = true;
        game.combat.throwGrenade(this, cmd);
      }
      if (this.action === 'knife' && !this.stabbed && this.actionT > 0.3) {
        this.stabbed = true;
        game.combat.knife(this);
      }
      if (this.actionT >= 1) {
        this.action = null;
        this.actionT = 0;
      }
    }

    // --- Régénération
    const since = game.time - this.lastHurt;
    if (since > 5 && this.health < this.maxHealth) this.health = Math.min(this.maxHealth, this.health + dt * 9);
    if (this.effects.adrenaline > 0) this.health = Math.min(this.maxHealth, this.health + dt * 12);

    // --- Animation
    const hv = Math.hypot(body.vel.x, body.vel.z);
    a.speed = hv;
    if (hv > 0.2) {
      const lx = body.vel.x * _left.x + body.vel.z * _left.z;
      const lz = body.vel.x * fwd.x + body.vel.z * fwd.z;
      a.moveAngle = Math.atan2(lx, lz);
    }
    a.crouch = this.crouching;
    a.sprint = this.sprinting;
    a.aim = this.aiming || (game.time - this.lastShotTime < 0.6 && !this.sprinting);
    a.grounded = body.grounded;
    a.vy = body.vel.y;
    a.pitch = this.pitch;
    a.reload = this.reloadT;
    a.action = this.action;
    a.actionT = this.actionT;
    a.recoil = Math.max(0, a.recoil - dt * 9);
    let dy = this.yaw - prevYaw;
    dy -= Math.round(dy / (Math.PI * 2)) * Math.PI * 2;
    a.turnRate += ((dt > 0 ? dy / dt : 0) - a.turnRate) * Math.min(1, dt * 12);
    this.char.root.position.copy(body.pos);
    this.char.root.rotation.y = this.yaw;
    const cam = this.effects.camouflage > 0;
    this.char.setOpacity(cam ? (this.team === game.playerTeam ? 0.35 : 0.1) : 1);
    if (this.char.weapon) {
      const f = this.char.weapon.flash;
      this.flashT -= dt;
      f.visible = this.flashT > 0;
      if (f.visible) f.rotation.z = Math.random() * Math.PI;
    }
    this.char.update(dt);
    this.char.root.updateMatrixWorld(true);
    this.char.bones.head.getWorldPosition(this.headPos);
    this.headPos.y += this.char.headOffset;
  }

  updateTimers(dt) {
    this.spawnProtect = Math.max(0, this.spawnProtect - dt);
    for (const k of Object.keys(this.effects)) {
      if (typeof this.effects[k] === 'number') this.effects[k] = Math.max(0, this.effects[k] - dt);
    }
    for (const k of Object.keys(this.abilityCd)) this.abilityCd[k] = Math.max(0, this.abilityCd[k] - dt);
    this.revealT = Math.max(0, this.revealT - dt);
  }

  startReload() {
    if (this.reloadT >= 0 || this.ammo >= this.weapon.mag || this.reserve <= 0 || this.effects.fureur > 0) return;
    this.reloadT = 0;
    this.game.audio.reload(this.body.pos);
  }

  finishReload() {
    const need = this.weapon.mag - this.ammo;
    const take = Math.min(need, this.reserve);
    this.ammo += take;
    this.reserve -= take;
    this.reloadT = -1;
  }

  fire(cmd) {
    const game = this.game;
    const w = this.weapon;
    this.ammo--;
    this.fireCd = 60 / (w.rpm * (this.effects.fureur > 0 ? 1.35 : 1));
    // tirs rapprochés = rafale (le recul monte en tir soutenu)
    this.burst = game.time - this.lastShotTime < 0.25 ? (this.burst || 0) + 1 : 0;
    this.lastShotTime = game.time;
    this.revealT = 2.5;
    if (this.effects.camouflage > 0) this.effects.camouflage = 0;
    const origin = this.eyePosition(_v2);
    if (cmd.aimPoint) _dir.subVectors(cmd.aimPoint, origin).normalize();
    else if (cmd.aimDir) _dir.copy(cmd.aimDir);
    else this.aimDirection(_dir);
    // Dispersion
    const hv = Math.hypot(this.body.vel.x, this.body.vel.z);
    let spread = (this.aiming ? w.aimSpread : w.spread) + this.bloom;
    spread += Math.min(1, hv / 6) * w.spread * 0.6;
    if (!this.body.grounded) spread += 0.04;
    if (this.crouching) spread *= 0.7;
    if (cmd.spreadMult) spread *= cmd.spreadMult;
    if (cmd.minSpread) spread = Math.max(spread, cmd.minSpread);
    randomCone(_dir, spread);
    let dmg = w.damage;
    if (this.precisionArmed) {
      dmg *= 2.5;
      this.precisionArmed = false;
    }
    const res = game.combat.hitscan(this, origin, _dir, w.range, dmg, w);
    this.nearMiss(origin, res);
    this.bloom = Math.min(0.08, this.bloom + w.recoil * (this.aiming ? 0.35 : 0.8));
    this.char.anim.recoil = w.feel.model;
    this.flashT = 0.05;
    this.recoilKick = (this.recoilKick || 0) + (this.aiming ? 0.65 : 1) * (this.crouching ? 0.8 : 1);
    // Traçante depuis la bouche du canon
    const muzzle = this.char.getMuzzleWorld(new THREE.Vector3());
    if (this.isPlayer || Math.random() < 0.5) game.effects.tracer(muzzle, res.point, this.team === 'blue' ? 0xbfe0ff : 0xffe0a0, w.feel.tracer, w.feel.trail);
    if (this.isPlayer || game.player?.body.pos.distanceToSquared(this.body.pos) < 900) game.effects.muzzle(muzzle);
    game.effects.muzzleGlow(muzzle, w.feel.tracer);
    if (this.isPlayer || game.player?.body.pos.distanceToSquared(this.body.pos) < 400) {
      game.effects.casing(muzzle.addScaledVector(this.forward(_v2), -0.35), -Math.cos(this.yaw), Math.sin(this.yaw), this.body.pos.y + 0.03);
    }
    game.audio.shot(w.sound, this.isPlayer ? null : this.body.pos);
  }

  // Balle ennemie qui frôle le joueur sans le toucher : sifflement orienté
  nearMiss(origin, res) {
    const game = this.game;
    const pl = game.player;
    if (this.isPlayer || !pl || !pl.alive || pl.team === this.team || res.victim === pl) return;
    const L = game.audio.listener;
    const dx = res.point.x - origin.x, dy = res.point.y - origin.y, dz = res.point.z - origin.z;
    const len2 = dx * dx + dy * dy + dz * dz;
    if (len2 < 1) return;
    const t = ((L.x - origin.x) * dx + (L.y - origin.y) * dy + (L.z - origin.z) * dz) / len2;
    if (t < 0.05 || t > 0.98) return;
    const cx = origin.x + dx * t - L.x, cy = origin.y + dy * t - L.y, cz = origin.z + dz * t - L.z;
    const d = Math.hypot(cx, cy, cz);
    if (d > 2.2 || game.time - (pl.lastWhizz || -9) < 0.12) return;
    pl.lastWhizz = game.time;
    const side = (cx * -Math.cos(L.yaw) + cz * Math.sin(L.yaw)) / Math.max(0.01, Math.hypot(cx, cz));
    game.audio.whizz(Math.max(-1, Math.min(1, side)));
  }

  useAbility(index, cmd) {
    const id = this.cls.abilities[index];
    if (!id || this.abilityCd[id] > 0 || this.action) return false;
    const game = this.game;
    const def = ABILITIES[id];
    switch (id) {
      case 'grenade':
        this.startAction('throw', 0.7);
        this.thrown = false;
        game.audio.ability('throw');
        break;
      case 'adrenaline':
        this.effects.adrenaline = def.duration;
        this.startAction('buff', 0.45);
        game.audio.ability('boost');
        break;
      case 'soin': {
        this.startAction('heal', 0.6);
        game.effects.heal(this.body.pos);
        game.audio.ability('heal');
        for (const s of game.soldiers) {
          if (!s.alive || s.team !== this.team) continue;
          if (s.body.pos.distanceTo(this.body.pos) > def.radius) continue;
          const before = s.health;
          s.health = Math.min(s.maxHealth, s.health + def.amount);
          if (s !== this && s.health > before) game.addScore(this, Math.round((s.health - before) / 5), 'Soin allié');
        }
        break;
      }
      case 'roquette':
        game.combat.fireRocket(this, cmd);
        break;
      case 'blindage':
        this.effects.blindage = def.duration;
        this.startAction('buff', 0.45);
        game.audio.ability('boost');
        break;
      case 'fureur':
        this.effects.fureur = def.duration;
        this.reloadT = -1;
        this.ammo = this.weapon.mag;
        this.startAction('buff', 0.45);
        game.audio.ability('boost');
        break;
      case 'camouflage':
        this.effects.camouflage = def.duration;
        this.startAction('buff', 0.45);
        game.audio.ability('boost');
        break;
      case 'precision':
        this.precisionArmed = true;
        this.startAction('buff', 0.45);
        game.audio.ability('boost');
        break;
      case 'poignard':
        this.startAction('knife', 0.55);
        this.stabbed = false;
        game.audio.ability('throw');
        break;
      default:
        return false;
    }
    this.abilityCd[id] = def.cooldown;
    return true;
  }

  startAction(name, dur) {
    this.action = name;
    this.actionT = 0;
    this.actionDur = dur;
    if (this.reloadT >= 0 && name !== 'heal' && name !== 'buff') this.reloadT = -1;
  }

  takeDamage(amount, attacker, info = {}) {
    if (!this.alive || this.spawnProtect > 0) return 0;
    if (this.effects.blindage > 0) amount *= 0.5;
    if (attacker && !attacker.isPlayer && this.isPlayer) amount *= this.game.difficulty.damageMult;
    amount = Math.min(amount, this.health);
    this.health -= amount;
    this.lastHurt = this.game.time;
    if (attacker) {
      this.damageLog.set(attacker, (this.damageLog.get(attacker) || 0) + amount);
      this.lastAttacker = attacker;
      this.lastAttackerPos = attacker.body.pos.clone();
    }
    if (this.effects.camouflage > 0) this.effects.camouflage = 0;
    this.flinch(amount, attacker);
    if (this.isPlayer) this.game.onPlayerHurt(amount, attacker, info);
    if (this.health <= 0.01) this.die(attacker, info);
    return amount;
  }

  // Réaction à l'impact, orientée selon la provenance du tir (repère local du soldat)
  flinch(amount, attacker) {
    const a = this.char.anim;
    let hx = Math.random() * 2 - 1;
    let hz = 1;
    if (attacker && attacker !== this) {
      const dx = attacker.body.pos.x - this.body.pos.x;
      const dz = attacker.body.pos.z - this.body.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      hz = (dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) / d >= 0 ? 1 : -1;
      hx = (dx * Math.cos(this.yaw) - dz * Math.sin(this.yaw)) / d;
    }
    a.hitT = 1;
    a.hitX = hx;
    a.hitZ = hz;
    a.hitAmt = Math.min(1, 0.4 + amount / 40);
  }

  die(attacker, info = {}) {
    if (!this.alive) return;
    this.alive = false;
    this.health = 0;
    this.deadT = 0;
    this.respawnTimer = 5;
    this.stats.deaths++;
    if (this.vehicle) this.vehicle.exit(this, true);
    const a = this.char.anim;
    a.mode = 'dead';
    a.deadT = 0;
    a.reload = -1;
    a.action = null;
    let dir = Math.random() < 0.5 ? 1 : -1;
    if (attacker && attacker !== this) {
      // tomber dans le sens de l'impact
      const dx = this.body.pos.x - attacker.body.pos.x;
      const dz = this.body.pos.z - attacker.body.pos.z;
      const f = dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw);
      dir = f > 0 ? -1 : 1;
    }
    a.deadDir = dir;
    a.deadVar = Math.floor(Math.random() * 3);
    this.game.audio.death(this.isPlayer ? null : this.body.pos);
    this.char.setOpacity(1);
    if (this.char.weapon) this.char.weapon.flash.visible = false;
    this.game.onKill(attacker, this, info);
  }

  hitVolumes() {
    const p = this.body.pos;
    return {
      head: this.headPos,
      headR: 0.17,
      x: p.x,
      z: p.z,
      y0: p.y + 0.1,
      y1: p.y + (this.crouching ? 1.08 : 1.45),
      r: 0.36,
    };
  }

  remove() {
    this.game.scene.remove(this.char.root);
    this.char.dispose();
  }
}

// Perturbe une direction dans un cône d'angle "spread" (radians)
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
export function randomCone(dir, spread) {
  if (spread <= 0) return dir;
  const up = Math.abs(dir.y) < 0.95 ? _a.set(0, 1, 0) : _a.set(1, 0, 0);
  _b.crossVectors(dir, up).normalize();
  up.crossVectors(_b, dir).normalize();
  const r = spread * Math.sqrt(Math.random());
  const t = Math.random() * Math.PI * 2;
  dir.addScaledVector(_b, Math.cos(t) * r).addScaledVector(up, Math.sin(t) * r).normalize();
  return dir;
}
