import * as THREE from 'three';
import { MODES, DIFFICULTIES, otherTeam, CLASS_ORDER } from '../config.js';
import { Physics } from './physics.js';
import { World } from './World.js';
import { NavGrid } from './nav.js';
import { Effects } from './Effects.js';
import { Audio } from './Audio.js';
import { Input } from './Input.js';
import { Combat } from './Combat.js';
import { Soldier } from './Soldier.js';
import { BotBrain, botName } from './BotBrain.js';
import { PlayerController } from './PlayerController.js';
import { Conquest } from './Conquest.js';
import { Vehicle } from './Vehicle.js';
import { MAP, terrainHeight } from './map.js';
import { Character } from '../character/Character.js';

export class Game {
  constructor(container, settings) {
    this.container = container;
    this.settings = settings;
    this.nextId = 1;
    this.time = 0;
    this.state = 'menu';
    this.soldiers = [];
    this.bots = [];
    this.vehicles = [];
    this.player = null;
    this.playerTeam = 'blue';
    this.difficulty = DIFFICULTIES[settings.difficulty] || DIFFICULTIES.veteran;
    this.pathBudget = 2;
    this.timeScale = 1;
    this.hud = null;
    this.listeners = {};

    // Rendu
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    // Mobiles : résolution et ombres réduites pour rester fluide
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    this.mobile = coarse;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.quality === 'low' ? 1 : coarse ? 1.25 : 1.5));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = settings.quality !== 'low';
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // rendu des tons « neutre » : garde les couleurs franches du style cartoon
    // (ACES ternissait les couleurs d'équipe et le ciel)
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;
    this.canvas = renderer.domElement;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xcfe3f5, 90, 520);
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.08, 1500);

    scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x7a6a50, 1.4));
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    const sc = sun.shadow.camera;
    sc.left = -48;
    sc.right = 48;
    sc.top = 48;
    sc.bottom = -48;
    sc.near = 1;
    sc.far = 260;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    this.sun = sun;
    this.sunOffset = new THREE.Vector3(55, 95, 35);
    // au menu, le soleil vient du côté de la caméra : le héros est éclairé de face
    this.menuSunOffset = new THREE.Vector3(-35, 90, -60);

    // Monde
    this.physics = new Physics();
    this.world = new World(scene, this.physics);
    this.nav = new NavGrid(this.physics);
    this.effects = new Effects(scene);
    this.audio = new Audio();
    this.audio.setVolume(settings.volume);
    this.input = new Input(this.canvas);
    this.combat = new Combat(this);
    this.controller = new PlayerController(this);

    this.menuHero = null;
    this.menuAngle = 0;
    this.buildMenuHero();

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
  }

  emit(event, ...args) {
    for (const fn of this.listeners[event] || []) fn(...args);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------------- Menu ----------------
  buildMenuHero() {
    if (this.menuHero) {
      this.scene.remove(this.menuHero.root);
      this.menuHero.dispose();
    }
    const s = this.settings;
    const hero = new Character({ team: s.team || 'blue', classId: s.classId, custom: s.custom, expression: 'confiant' });
    const x = 3.2, z = -6.5;
    hero.root.position.set(x, terrainHeight(x, z), z);
    hero.root.rotation.y = Math.PI + 0.25;
    hero.anim.hold = 'relaxed';
    this.scene.add(hero.root);
    this.menuHero = hero;
  }

  // ---------------- Partie ----------------
  startMatch() {
    this.clearMatch();
    const s = this.settings;
    const mode = MODES[s.mode] || MODES['8v8'];
    this.difficulty = DIFFICULTIES[s.difficulty] || DIFFICULTIES.veteran;
    this.playerTeam = s.team || 'blue';
    this.time = 0;
    this.timeScale = 1;
    this.endT = 0;
    this.winner = null;
    this.conquest = new Conquest(this, mode.tickets);
    for (const def of MAP.vehicles) this.vehicles.push(new Vehicle(this, def));
    // Joueur
    this.player = new Soldier(this, { name: s.custom.name || 'Joueur', team: this.playerTeam, classId: s.classId, isPlayer: true, custom: s.custom });
    this.soldiers.push(this.player);
    this.controller.attach(this.player);
    // Bots
    let n = 0;
    for (const team of ['blue', 'red']) {
      const count = team === this.playerTeam ? mode.teamSize - 1 : mode.teamSize;
      for (let i = 0; i < count; i++) {
        const classId = CLASS_ORDER[(i + (team === 'red' ? 1 : 0)) % 3];
        const bot = new Soldier(this, { name: botName(n++), team, classId });
        bot.brain = new BotBrain(this, bot);
        bot.respawnTimer = 0.2 + Math.random() * 2.5;
        this.soldiers.push(bot);
        this.bots.push(bot);
      }
    }
    if (this.menuHero) this.menuHero.root.visible = false;
    this.state = 'deploy';
    this.emit('deploy', { first: true });
  }

  clearMatch() {
    for (const s of this.soldiers) s.remove();
    this.soldiers = [];
    this.bots = [];
    for (const v of this.vehicles) v.dispose();
    this.vehicles = [];
    this.combat.clear();
    if (this.conquest) this.conquest.dispose();
    this.conquest = null;
    this.player = null;
    this.audio.setEngine(false);
  }

  backToMenu() {
    this.clearMatch();
    this.state = 'menu';
    this.input.exitLock();
    this.buildMenuHero();
    this.menuHero.root.visible = true;
  }

  deployPlayer(classId, spawnId) {
    const p = this.player;
    if (!p) return;
    if (classId !== p.classId) p.setClass(classId);
    this.settings.classId = classId;
    const opts = this.conquest.spawnOptions(p.team);
    const opt = opts.find((o) => o.id === spawnId) || opts[0];
    opt.team = p.team;
    const pos = this.conquest.spawnPosition(opt);
    const yaw = this.facingYaw(pos, p.team);
    p.spawn(pos, yaw);
    this.controller.attach(p);
    this.state = 'playing';
    this.audio.resume();
    this.input.requestLock();
    this.emit('deployed');
  }

  // Orientation de départ : vers le drapeau non contrôlé le plus proche
  facingYaw(pos, team) {
    let best = null;
    let bd = Infinity;
    for (const p of this.conquest.points) {
      if (p.owner === team) continue;
      const d = p.pos.distanceTo(pos);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    const target = best ? best.pos : new THREE.Vector3(0, 0, 0);
    return Math.atan2(target.x - pos.x, target.z - pos.z);
  }

  respawnBot(bot) {
    const opts = this.conquest.spawnOptions(bot.team);
    // point le plus proche de la ligne de front
    let opt = opts[0];
    if (opts.length > 1 && Math.random() < 0.8) {
      const enemyBase = MAP.bases[otherTeam(bot.team)];
      opt = opts.slice(1).sort((a, b) => Math.hypot(a.x - enemyBase.x, a.z - enemyBase.z) - Math.hypot(b.x - enemyBase.x, b.z - enemyBase.z))[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * (opts.length - 1))];
    }
    opt.team = bot.team;
    // de temps en temps un bot change de classe
    if (Math.random() < 0.2) bot.setClass(CLASS_ORDER[Math.floor(Math.random() * 3)]);
    const pos = this.conquest.spawnPosition(opt);
    bot.spawn(pos, this.facingYaw(pos, bot.team));
    bot.brain.onSpawn();
  }

  endMatch(winner) {
    if (this.state === 'ended' || this.winner) return;
    this.winner = winner;
    this.endT = 0;
    this.timeScale = 0.35;
    this.audio.capture(winner === this.playerTeam);
    this.emit('matchEnd', winner);
  }

  // Véhicules à l'arrêt (garés, épaves) : obstacles pour les chemins des bots
  updateNavObstacles(dt) {
    this.navDynT = (this.navDynT || 0) - dt;
    if (this.navDynT > 0) return;
    this.navDynT = 0.5;
    let key = '';
    const boxes = [];
    for (const v of this.vehicles) {
      if (!v.collider.active || v.driver || Math.abs(v.speed) > 0.3) continue;
      key += `${Math.round(v.pos.x)},${Math.round(v.pos.z)},${v.yaw.toFixed(1)};`;
      boxes.push(v.collider);
    }
    if (key === this.navDynKey) return;
    this.navDynKey = key;
    this.nav.setDynamic(boxes);
  }

  // ---------------- Événements de jeu ----------------
  addScore(soldier, pts, label) {
    if (!soldier || pts <= 0) return;
    soldier.stats.score += pts;
    if (soldier.isPlayer) this.hud?.scorePopup(pts, label);
  }

  onDamageDealt(attacker, victim, dealt, head, point) {
    if (!attacker || !attacker.isPlayer) return;
    const kill = !victim.alive;
    this.hud?.hitMarker(kill, head);
    this.hud?.damageNumber(point, dealt, head, kill);
    this.audio.hit(kill, head);
  }

  onKill(attacker, victim, info) {
    const cq = this.conquest;
    if (cq && !this.winner) cq.removeTickets(victim.team, 1);
    if (attacker && attacker !== victim && attacker.team !== victim.team) {
      attacker.stats.kills++;
      let pts = 100;
      if (info.head) pts += 20;
      this.addScore(attacker, pts, info.head ? 'Élimination (tête)' : 'Élimination');
      if (attacker.isPlayer) {
        const now = this.time;
        attacker.killStreak = attacker.killStreak.filter((t) => now - t < 4);
        attacker.killStreak.push(now);
        const n = attacker.killStreak.length;
        if (n >= 2) this.hud?.banner(['', '', 'Double élimination !', 'Triple élimination !', 'Carnage !'][Math.min(4, n)], 'gold');
      }
    }
    // Assistances
    for (const [s, dmg] of victim.damageLog || []) {
      if (s === attacker || s.team === victim.team || dmg < 30) continue;
      s.stats.assists++;
      this.addScore(s, 50, 'Assistance');
    }
    this.hud?.feed(attacker, victim, info.weapon, null, info.head);
    if (victim.isPlayer) {
      this.controller.deathCamT = 0;
      this.deathT = 0;
      this.killer = attacker && attacker !== victim ? attacker : null;
      this.emit('playerDied', this.killer);
    }
  }

  onPlayerHurt(amount, attacker) {
    this.hud?.hurt(amount, attacker);
    this.audio.hurt();
  }

  onPointEvent(p, type, team, lost) {
    const mine = this.playerTeam;
    if (type === 'captured') {
      this.hud?.banner(`${team === mine ? 'Nous avons capturé' : "L'ennemi a capturé"} ${p.id} — ${p.name}`, team === mine ? 'good' : 'bad');
      this.effects.captureBurst(p.pos, team);
      this.audio.capture(team === mine);
    } else if (type === 'neutralized') {
      this.hud?.banner(`${p.id} neutralisé${lost === mine ? ' — contre-attaquez !' : ''}`, lost === mine ? 'bad' : 'good');
    }
  }

  // ---------------- Boucle ----------------
  loop(now) {
    requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) dt = 1 / 60;
    dt = Math.min(dt, 0.05);
    try {
      this.update(dt);
    } catch (err) {
      console.error(err);
    }
    this.render();
    this.input.endFrame();
  }

  update(realDt) {
    const dt = realDt * this.timeScale;
    this.touch?.update();
    this.world.update(dt, this.time);
    if (this.state === 'menu') {
      this.menuAngle += realDt * 0.08;
      const hero = this.menuHero;
      if (hero) {
        hero.update(realDt);
        const c = hero.root.position;
        const a = Math.PI + 0.15 + Math.sin(this.menuAngle) * 0.35;
        this.camera.position.set(c.x + Math.sin(a) * 3.7, c.y + 1.45, c.z + Math.cos(a) * 3.7);
        this.camera.lookAt(c.x, c.y + 1.02, c.z);
        this.camera.fov = 45;
        this.camera.updateProjectionMatrix();
      }
      this.effects.update(realDt, this.camera);
      this.followSun(this.menuHero ? this.menuHero.root.position : this.camera.position, this.menuSunOffset);
      return;
    }
    if (this.state === 'paused') return;
    this.time += dt;
    this.pathBudget = 3;
    const p = this.player;
    // Joueur
    if (p) {
      const cmd = this.state === 'playing' ? this.controller.update(dt) : null;
      if (p.alive && cmd) p.update(dt, cmd);
      else if (!p.alive) p.update(dt, null);
    }
    // Bots
    for (const b of this.bots) {
      if (!b.alive) {
        if (this.state !== 'ended' && !this.winner) {
          b.respawnTimer -= dt;
          if (b.respawnTimer <= 0 && b.deadT > 1) this.respawnBot(b);
        }
        if (!b.alive) {
          b.update(dt, null);
          continue;
        }
      }
      const cmd = b.brain.update(dt);
      b.update(dt, cmd);
    }
    // Séparation entre soldats
    this.separate();
    // Véhicules
    for (const v of this.vehicles) {
      const drv = v.driver;
      const cmd = drv && drv.isPlayer ? this.controller.vcmd : null;
      v.update(dt, cmd);
    }
    this.updateNavObstacles(dt);
    if (p && p.vehicle && p.alive) {
      const v = p.vehicle;
      this.audio.setEngine(true, Math.min(1, Math.abs(v.speed) / v.cfg.maxSpeed), v.type === 'tank');
    } else this.audio.setEngine(false);
    this.combat.update(dt);
    if (this.conquest && !this.winner) this.conquest.update(dt);
    else if (this.conquest) this.conquest.points.forEach((pt) => this.conquest.updateVisual(pt, this.time));
    // Effets particuliers
    for (const s of this.soldiers) {
      if (s.alive && s.effects.adrenaline > 0 && Math.random() < dt * 10) this.effects.sparkle(s.body.pos, s.team);
    }
    // Caméra
    if (p && p.hasSpawned) this.controller.updateCamera(realDt, this.camera);
    else if (p) this.overviewCamera(realDt);
    const lp = this.camera.position;
    this.audio.setListener(lp.x, lp.y, lp.z, this.controller.yaw);
    this.effects.update(dt, this.camera);
    this.followSun(p ? p.body.pos : this.camera.position);
    if (this.state === 'deploy' && p && !p.alive) this.deathT = (this.deathT || 0) + realDt;
    if (this.winner) {
      this.endT += realDt;
      if (this.endT > 2.2 && this.state !== 'ended') {
        this.state = 'ended';
        this.timeScale = 1;
        this.input.exitLock();
        this.emit('ended', this.winner);
      }
    }
    this.hud?.update(realDt);
  }

  // Vue d'ensemble pendant le premier déploiement
  overviewCamera(dt) {
    this.overviewT = (this.overviewT || 0) + dt;
    const base = MAP.bases[this.playerTeam];
    const s = base.z > 0 ? -1 : 1;
    const a = this.overviewT * 0.05;
    this.camera.position.set(base.x + Math.sin(a) * 30, 38, base.z - s * 25);
    this.camera.lookAt(Math.sin(a) * 10, 0, base.z + s * 70);
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
  }

  separate() {
    const list = this.soldiers;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.alive || a.vehicle) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.alive || b.vehicle) continue;
        const dx = b.body.pos.x - a.body.pos.x;
        const dz = b.body.pos.z - a.body.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > 0.6 || d2 < 1e-6 || Math.abs(a.body.pos.y - b.body.pos.y) > 1.5) continue;
        const d = Math.sqrt(d2);
        const push = (0.78 - d) * 0.5;
        if (push <= 0) continue;
        const nx = dx / d;
        const nz = dz / d;
        a.body.pos.x -= nx * push;
        a.body.pos.z -= nz * push;
        b.body.pos.x += nx * push;
        b.body.pos.z += nz * push;
      }
    }
  }

  followSun(target, offset = this.sunOffset) {
    const s = this.sun;
    // on aligne sur la grille de texels pour éviter le scintillement des ombres
    const step = 96 / 2048;
    const tx = Math.round(target.x / step) * step;
    const tz = Math.round(target.z / step) * step;
    s.target.position.set(tx, 0, tz);
    s.position.set(tx + offset.x, offset.y, tz + offset.z);
    s.target.updateMatrixWorld();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  setPaused(p) {
    if (p && this.state === 'playing') {
      this.state = 'paused';
      this.input.exitLock();
    } else if (!p && this.state === 'paused') {
      this.state = 'playing';
      this.input.requestLock();
    }
  }
}
