import * as THREE from 'three';
import { TEAMS, ABILITIES, CLASSES } from '../config.js';
import { MAP } from '../game/map.js';
import { emblemSVG } from '../character/emblems.js';
import { icon, WEAPON_ICON } from './icons.js';

// Interface en jeu (DOM superposé au canvas).

const _v = new THREE.Vector3();

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export class HUD {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    root.innerHTML = `
      <div class="hud-top">
        <div class="tk tk-blue"><span class="tk-emb">${emblemSVG('eagle', '#fff', 22)}</span><div class="tk-body"><b class="tk-num">0</b><div class="tk-bar"><i></i></div></div></div>
        <div class="flags"></div>
        <div class="tk tk-red"><div class="tk-body"><b class="tk-num">0</b><div class="tk-bar"><i></i></div></div><span class="tk-emb">${emblemSVG('star', '#fff', 22)}</span></div>
      </div>
      <div class="minimap"><canvas width="360" height="360"></canvas><span class="mm-n">N</span></div>
      <div class="killfeed"></div>
      <div class="banners"></div>
      <div class="markers"></div>
      <div class="dmgnums"></div>
      <div class="vignette"></div>
      <div class="dmgdir"></div>
      <div class="scope"><div class="scope-cross"></div></div>
      <div class="crosshair"><i class="ch-t"></i><i class="ch-b"></i><i class="ch-l"></i><i class="ch-r"></i><b class="ch-dot"></b><b class="ch-reload"></b><div class="hitmarker"><i></i><i></i><i></i><i></i></div></div>
      <div class="aim-name"></div>
      <div class="popups"></div>
      <div class="capture"><div class="cap-label"></div><div class="cap-bar"><i></i></div></div>
      <div class="prompt"></div>
      <div class="hud-bl">
        <div class="class-badge"></div>
        <div class="hp-wrap"><div class="hp-name"></div><div class="hp-bar"><i class="hp-fill"></i><i class="hp-ghost"></i></div><div class="hp-num"></div></div>
        <div class="fx-list"></div>
      </div>
      <div class="abilities"></div>
      <div class="hud-br"><div class="w-name"></div><div class="w-ammo"><b class="w-mag">0</b><span class="w-res">/ 0</span></div><div class="w-hint"></div></div>
    `;
    const $ = (s) => root.querySelector(s);
    this.el = {
      tkBlue: $('.tk-blue .tk-num'), tkBlueBar: $('.tk-blue .tk-bar i'),
      tkRed: $('.tk-red .tk-num'), tkRedBar: $('.tk-red .tk-bar i'),
      flags: $('.flags'), killfeed: $('.killfeed'), banners: $('.banners'), markers: $('.markers'),
      dmgnums: $('.dmgnums'), vignette: $('.vignette'), dmgdir: $('.dmgdir'), scope: $('.scope'),
      crosshair: $('.crosshair'), hit: $('.hitmarker'), chReload: $('.ch-reload'), aimName: $('.aim-name'), popups: $('.popups'),
      capture: $('.capture'), capLabel: $('.cap-label'), capBar: $('.cap-bar i'), prompt: $('.prompt'),
      badge: $('.class-badge'), hpName: $('.hp-name'), hpFill: $('.hp-fill'), hpGhost: $('.hp-ghost'), hpNum: $('.hp-num'),
      fx: $('.fx-list'), abilities: $('.abilities'), wName: $('.w-name'), wMag: $('.w-mag'), wRes: $('.w-res'), wHint: $('.w-hint'),
      mm: $('.minimap canvas'), chT: $('.ch-t'), chB: $('.ch-b'), chL: $('.ch-l'), chR: $('.ch-r'),
    };
    this.mmCtx = this.el.mm.getContext('2d');
    this.hurtT = 0;
    this.hitT = 0;
    this.ghostHp = 1;
    this.dmgNums = [];
    this.pointMarkers = {};
    this.nameTags = new Map();
    this.buildMinimapBase();
    this.lastClass = null;
  }

  show(v) {
    this.root.classList.toggle('hidden', !v);
  }

  // ---------- Initialisation d'une partie ----------
  setupMatch() {
    const cq = this.game.conquest;
    this.el.flags.innerHTML = cq.points
      .map((p) => `<div class="flag" data-id="${p.id}"><svg viewBox="0 0 40 40"><circle class="fl-bg" cx="20" cy="20" r="17"/><circle class="fl-prog" cx="20" cy="20" r="17" pathLength="100"/></svg><span>${p.id}</span></div>`)
      .join('');
    this.flagEls = {};
    this.el.flags.querySelectorAll('.flag').forEach((f) => (this.flagEls[f.dataset.id] = f));
    this.el.markers.innerHTML = '';
    this.pointMarkers = {};
    for (const p of cq.points) {
      const m = document.createElement('div');
      m.className = 'pmark';
      m.innerHTML = `<span class="pm-l">${p.id}</span><small class="pm-d"></small>`;
      this.el.markers.appendChild(m);
      this.pointMarkers[p.id] = m;
    }
    for (const [, tag] of this.nameTags) tag.remove();
    this.nameTags.clear();
    this.el.killfeed.innerHTML = '';
    this.el.banners.innerHTML = '';
    this.el.popups.innerHTML = '';
    this.lastClass = null;
  }

  // ---------- Événements ----------
  feed(attacker, victim, weapon, customVictim, head) {
    const row = document.createElement('div');
    row.className = 'kf-row';
    const me = this.game.player;
    const name = (s) => (s ? `<span class="kf-n ${s.team}${s === me ? ' me' : ''}">${esc(s.name)}</span>` : '');
    const vic = victim ? name(victim) : `<span class="kf-n">${esc(customVictim || '')}</span>`;
    const ico = icon(WEAPON_ICON[weapon] || 'skull', 18);
    row.innerHTML = `${attacker && attacker !== victim ? name(attacker) : ''}<span class="kf-w">${ico}${head ? icon('target', 14, 'kf-head') : ''}</span>${vic}`;
    if ((attacker && attacker === me) || victim === me) row.classList.add('mine');
    this.el.killfeed.prepend(row);
    while (this.el.killfeed.children.length > 6) this.el.killfeed.lastChild.remove();
    setTimeout(() => row.classList.add('out'), 6000);
    setTimeout(() => row.remove(), 6600);
  }

  banner(text, kind = 'good') {
    if (!text) return;
    const b = document.createElement('div');
    b.className = `banner ${kind}`;
    b.textContent = text;
    this.el.banners.appendChild(b);
    while (this.el.banners.children.length > 3) this.el.banners.firstChild.remove();
    setTimeout(() => b.classList.add('out'), 2600);
    setTimeout(() => b.remove(), 3200);
  }

  scorePopup(pts, label) {
    const p = document.createElement('div');
    p.className = 'popup';
    p.innerHTML = `<b>+${pts}</b> ${esc(label || '')}`;
    this.el.popups.prepend(p);
    while (this.el.popups.children.length > 4) this.el.popups.lastChild.remove();
    setTimeout(() => p.classList.add('out'), 1600);
    setTimeout(() => p.remove(), 2100);
  }

  hitMarker(kill, head) {
    this.hitT = kill ? 0.45 : 0.18;
    const h = this.el.hit;
    h.className = 'hitmarker';
    void h.offsetWidth; // relance l'animation d'apparition à chaque touche
    h.className = `hitmarker on${kill ? ' kill' : ''}${head ? ' head' : ''}`;
  }

  damageNumber(point, dmg, head, kill) {
    const d = document.createElement('div');
    d.className = `dnum${head ? ' head' : ''}${kill ? ' kill' : ''}`;
    d.textContent = Math.max(1, Math.round(dmg));
    this.el.dmgnums.appendChild(d);
    this.dmgNums.push({ el: d, pos: point.clone(), t: 0, dx: (Math.random() - 0.5) * 30 });
    if (this.dmgNums.length > 24) this.dmgNums.shift().el.remove();
  }

  hurt(amount, attacker) {
    this.hurtT = Math.min(1, this.hurtT + amount / 40);
    if (!attacker) return;
    const p = this.game.player;
    const ang = Math.atan2(attacker.body.pos.x - p.body.pos.x, attacker.body.pos.z - p.body.pos.z) - this.game.controller.yaw;
    const d = document.createElement('div');
    d.className = 'dd';
    d.style.transform = `translate(-50%, -50%) rotate(${-ang}rad)`;
    this.el.dmgdir.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }

  // ---------- Mise à jour par image ----------
  update(dt) {
    const game = this.game;
    const p = game.player;
    const cq = game.conquest;
    if (!p || !cq) return;
    const el = this.el;
    // Tickets
    const mt = cq.maxTickets;
    el.tkBlue.textContent = cq.tickets.blue;
    el.tkRed.textContent = cq.tickets.red;
    el.tkBlueBar.style.width = `${(cq.tickets.blue / mt) * 100}%`;
    el.tkRedBar.style.width = `${(cq.tickets.red / mt) * 100}%`;
    // Drapeaux
    for (const pt of cq.points) {
      const f = this.flagEls[pt.id];
      if (!f) continue;
      f.dataset.owner = pt.owner || 'none';
      f.dataset.dir = pt.progress >= 0 ? 'blue' : 'red';
      f.classList.toggle('contested', pt.contested);
      f.style.setProperty('--prog', Math.abs(pt.progress) * 100);
    }
    this.updateMarkers();
    this.updateNameTags();
    this.updateDamageNumbers(dt);
    this.drawMinimap();

    // Vie / classe
    const v = p.vehicle;
    if (this.lastClass !== p.classId + (v ? v.type : '')) {
      this.lastClass = p.classId + (v ? v.type : '');
      el.badge.innerHTML = v ? icon(v.type, 30) : icon(WEAPON_ICON[p.weapon.id], 30);
      el.badge.dataset.team = p.team;
      this.buildAbilities();
      el.abilities.classList.toggle('hidden-v', !!v);
    }
    el.hpName.textContent = v ? v.name : `${p.name} · ${CLASSES[p.classId].name}`;
    const hp = v ? v.health / v.cfg.health : p.health / p.maxHealth;
    this.ghostHp = Math.max(hp, this.ghostHp - dt * 0.5);
    el.hpFill.style.width = `${Math.max(0, hp) * 100}%`;
    el.hpGhost.style.width = `${Math.max(0, this.ghostHp) * 100}%`;
    el.hpFill.classList.toggle('low', hp < 0.35);
    el.hpNum.textContent = Math.ceil(v ? v.health : p.health);
    // Effets actifs
    const fx = [];
    const eff = p.effects;
    if (eff.adrenaline > 0) fx.push(['bolt', eff.adrenaline]);
    if (eff.blindage > 0) fx.push(['shield', eff.blindage]);
    if (eff.fureur > 0) fx.push(['flame', eff.fureur]);
    if (eff.camouflage > 0) fx.push(['eye', eff.camouflage]);
    if (p.precisionArmed) fx.push(['target', 0]);
    if (p.spawnProtect > 0) fx.push(['shield', p.spawnProtect]);
    const fxKey = fx.map((f) => f[0] + Math.ceil(f[1])).join();
    if (fxKey !== this.fxKey) {
      this.fxKey = fxKey;
      el.fx.innerHTML = fx.map(([i, t]) => `<span class="fx">${icon(i, 16)}${t > 0 ? Math.ceil(t) : ''}</span>`).join('');
    }
    // Compétences
    if (this.abEls) {
      const ab = p.cls.abilities;
      ab.forEach((id, i) => {
        const cd = p.abilityCd[id] || 0;
        const max = ABILITIES[id].cooldown;
        const e = this.abEls[i];
        e.style.setProperty('--cd', v ? 1 : cd / max);
        e.classList.toggle('ready', cd <= 0 && !v);
        e.querySelector('.ab-t').textContent = cd > 0 ? Math.ceil(cd) : '';
      });
    }
    // Munitions
    if (v) {
      el.wName.textContent = v.type === 'tank' ? 'Canon 105 mm' : 'Pare-chocs renforcé';
      el.wMag.textContent = v.type === 'tank' ? (v.fireCd > 0 ? '…' : '1') : '∞';
      el.wRes.textContent = '';
      el.wHint.textContent = v.type === 'tank' && v.fireCd > 0 ? 'Rechargement' : '';
    } else {
      el.wName.textContent = p.weapon.name;
      el.wMag.textContent = p.ammo;
      el.wRes.textContent = `/ ${p.reserve}`;
      el.wMag.classList.toggle('low', p.ammo <= p.weapon.mag * 0.25);
      el.wHint.textContent = p.reloadT >= 0 ? 'Rechargement…' : p.ammo === 0 && p.reserve === 0 ? 'Plus de munitions' : p.ammo <= p.weapon.mag * 0.25 ? 'R — Recharger' : '';
    }
    // Réticule
    const ctl = game.controller;
    const scoped = ctl.scoped;
    el.scope.classList.toggle('on', scoped);
    el.crosshair.classList.toggle('hidden', scoped || !p.alive);
    const spread = v ? 0.01 : (p.aiming ? p.weapon.aimSpread : p.weapon.spread) + p.bloom + Math.min(1, Math.hypot(p.body.vel.x, p.body.vel.z) / 6) * p.weapon.spread * 0.6;
    const px = Math.max(3, (spread / Math.tan((game.camera.fov * Math.PI) / 360)) * (window.innerHeight / 2));
    el.chT.style.transform = `translate(-50%, ${-px - 9}px)`;
    el.chB.style.transform = `translate(-50%, ${px}px)`;
    el.chL.style.transform = `translate(${-px - 9}px, -50%)`;
    el.chR.style.transform = `translate(${px}px, -50%)`;
    // anneau de rechargement autour du réticule
    const reloading = !v && p.alive && p.reloadT >= 0;
    if (reloading !== this.reloadOn) {
      this.reloadOn = reloading;
      el.chReload.classList.toggle('on', reloading);
    }
    if (reloading) el.chReload.style.setProperty('--p', `${Math.round(p.reloadT * 360)}deg`);
    const tgt = ctl.aimTarget;
    el.crosshair.classList.toggle('enemy', !!(tgt && tgt.team !== p.team));
    el.crosshair.classList.toggle('friend', !!(tgt && tgt.team === p.team));
    if (tgt && tgt.alive && ctl.aimDist < 90 && (tgt.team === p.team || tgt.isVisibleTo())) {
      el.aimName.textContent = tgt.name;
      el.aimName.className = `aim-name on ${tgt.team}`;
    } else el.aimName.className = 'aim-name';
    if (this.hitT > 0) {
      this.hitT -= dt;
      if (this.hitT <= 0) el.hit.className = 'hitmarker';
    }
    // Dégâts subis
    this.hurtT = Math.max(0, this.hurtT - dt * 0.8);
    const lowHp = p.alive && !v ? Math.max(0, 0.4 - p.health / p.maxHealth) * 1.5 : 0;
    el.vignette.style.opacity = Math.min(1, this.hurtT + lowHp);
    // Capture
    let inPoint = null;
    if (p.alive) for (const pt of cq.points) if (cq.inside(p, pt)) inPoint = pt;
    if (inPoint) {
      el.capture.classList.add('on');
      const mine = inPoint.owner === p.team;
      const full = Math.abs(inPoint.progress) > 0.999 && mine;
      el.capLabel.textContent = inPoint.contested ? `${inPoint.id} — ZONE DISPUTÉE` : full ? `${inPoint.id} — ${inPoint.name} (sécurisé)` : `CAPTURE DE ${inPoint.id} — ${inPoint.name}`;
      el.capBar.style.width = `${Math.abs(inPoint.progress) * 100}%`;
      el.capBar.dataset.team = inPoint.progress >= 0 ? 'blue' : 'red';
    } else el.capture.classList.remove('on');
    // Invite d'interaction
    const nv = ctl.nearbyVehicle();
    if (p.vehicle) el.prompt.innerHTML = `<kbd>E</kbd> Sortir du véhicule${p.vehicle.type === 'tank' ? ' · <kbd>Clic</kbd> Tirer' : ''}`;
    else if (nv) el.prompt.innerHTML = `<kbd>E</kbd> Monter dans : ${nv.name}`;
    else el.prompt.innerHTML = '';
    el.prompt.classList.toggle('on', !!(p.vehicle || nv));
  }

  buildAbilities() {
    const p = this.game.player;
    this.el.abilities.innerHTML = p.cls.abilities
      .map((id, i) => {
        const a = ABILITIES[id];
        return `<div class="ab" title="${esc(a.name)} — ${esc(a.desc)}"><div class="ab-ico">${icon(a.icon, 28)}</div><div class="ab-cd"></div><span class="ab-k">${i + 1}</span><span class="ab-t"></span><span class="ab-n">${esc(a.short || a.name)}</span></div>`;
      })
      .join('');
    this.abEls = [...this.el.abilities.querySelectorAll('.ab')];
  }

  project(pos, out) {
    _v.copy(pos).project(this.game.camera);
    const behind = _v.z > 1;
    out.x = (_v.x * 0.5 + 0.5) * window.innerWidth;
    out.y = (-_v.y * 0.5 + 0.5) * window.innerHeight;
    out.behind = behind;
    return out;
  }

  updateMarkers() {
    const game = this.game;
    const p = game.player;
    const s = {};
    for (const pt of game.conquest.points) {
      const m = this.pointMarkers[pt.id];
      _v.copy(pt.pos);
      _v.y += 9;
      this.project(_v, s);
      const d = p.body.pos.distanceTo(pt.pos);
      const inside = game.conquest.inside(p, pt);
      if (s.behind || inside) {
        m.style.display = 'none';
        continue;
      }
      m.style.display = '';
      const x = Math.max(30, Math.min(window.innerWidth - 30, s.x));
      // pas sous la mini-carte (coin haut droit)
      const minY = x > window.innerWidth - 215 ? 215 : 80;
      const y = Math.max(minY, Math.min(window.innerHeight - 150, s.y));
      m.style.transform = `translate(${x}px, ${y}px)`;
      m.dataset.owner = pt.owner || 'none';
      m.classList.toggle('contested', pt.contested);
      m.querySelector('.pm-d').textContent = `${Math.round(d)} m`;
    }
  }

  updateNameTags() {
    const game = this.game;
    const p = game.player;
    const seen = new Set();
    const s = {};
    for (const o of game.soldiers) {
      if (o === p || !o.alive || o.team !== p.team) continue;
      const d = o.body.pos.distanceTo(game.camera.position);
      if (d > 45) continue;
      _v.copy(o.body.pos);
      _v.y += 2.25;
      this.project(_v, s);
      if (s.behind) continue;
      let tag = this.nameTags.get(o);
      if (!tag) {
        tag = document.createElement('div');
        tag.className = 'ntag';
        this.el.markers.appendChild(tag);
        this.nameTags.set(o, tag);
      }
      tag.textContent = o.name;
      tag.style.transform = `translate(${s.x}px, ${s.y}px)`;
      tag.style.opacity = Math.min(1, (45 - d) / 10);
      seen.add(o);
    }
    for (const [o, tag] of this.nameTags) {
      if (!seen.has(o)) {
        tag.remove();
        this.nameTags.delete(o);
      }
    }
  }

  updateDamageNumbers(dt) {
    const s = {};
    for (let i = this.dmgNums.length - 1; i >= 0; i--) {
      const d = this.dmgNums[i];
      d.t += dt;
      if (d.t > 0.9) {
        d.el.remove();
        this.dmgNums.splice(i, 1);
        continue;
      }
      this.project(d.pos, s);
      if (s.behind) {
        d.el.style.opacity = 0;
        continue;
      }
      const rise = d.t * 60;
      d.el.style.transform = `translate(${s.x + d.dx * d.t}px, ${s.y - 30 - rise}px) scale(${1 + Math.max(0, 0.3 - d.t) * 2})`;
      d.el.style.opacity = Math.min(1, (0.9 - d.t) * 3);
    }
  }

  // ---------- Mini-carte ----------
  buildMinimapBase() {
    const scale = 2; // px par mètre
    const b = MAP.bounds;
    const w = (b.maxX - b.minX) * scale;
    const h = (b.maxZ - b.minZ) * scale;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#6f8f4a';
    g.fillRect(0, 0, w, h);
    const X = (x) => (x - b.minX) * scale;
    const Z = (z) => (b.maxZ - z) * scale; // nord (+z) en haut
    g.strokeStyle = '#c9ad7c';
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const r of MAP.roads) {
      g.beginPath();
      r.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
      g.stroke();
    }
    g.fillStyle = '#d8c7a4';
    g.beginPath();
    g.arc(X(0), Z(2), 15 * scale, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#c86a42';
    for (const c2 of this.game.physics.colliders) {
      if (c2.max.y - c2.min.y < 4 || c2.max.x - c2.min.x < 3) continue;
      g.fillRect(X(c2.min.x), Z(c2.max.z), (c2.max.x - c2.min.x) * scale, (c2.max.z - c2.min.z) * scale);
    }
    this.mmBase = c;
    this.mmScale = scale;
  }

  drawMinimap() {
    const game = this.game;
    const g = this.mmCtx;
    const p = game.player;
    const W = 360;
    const R = W / 2;
    const zoom = 1.9; // px canvas par mètre
    const b = MAP.bounds;
    const ctlYaw = game.controller.yaw;
    const center = p.alive || !p.hasSpawned ? p.body.pos : p.body.pos;
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#2d3b2a';
    g.fillRect(0, 0, W, W);
    // carte tournée : l'avant du joueur vers le haut
    g.translate(R, R);
    g.rotate(ctlYaw - Math.PI);
    g.scale(-1, 1);
    const k = zoom / this.mmScale;
    g.drawImage(this.mmBase, -(center.x - b.minX) * zoom, -(b.maxZ - center.z) * zoom, this.mmBase.width * k, this.mmBase.height * k);
    const toMap = (x, z) => [-(center.x - x) * zoom, (center.z - z) * zoom];
    // points
    g.font = 'bold 22px "Barlow Condensed", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const pt of game.conquest.points) {
      const [x, y] = toMap(pt.pos.x, pt.pos.z);
      g.fillStyle = pt.owner ? TEAMS[pt.owner].ui : '#e8e8e8';
      g.beginPath();
      g.arc(x, y, 15, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.translate(x, y);
      g.scale(-1, 1);
      g.rotate(-(ctlYaw - Math.PI));
      g.fillStyle = '#111';
      g.fillText(pt.id, 0, 1);
      g.restore();
    }
    // véhicules
    for (const v of game.vehicles) {
      if (!v.alive) continue;
      if (v.team !== p.team && !v.driver) continue;
      const [x, y] = toMap(v.pos.x, v.pos.z);
      g.fillStyle = TEAMS[v.team].ui;
      g.fillRect(x - 7, y - 7, 14, 14);
    }
    // soldats
    for (const s of game.soldiers) {
      if (!s.alive || s === p) continue;
      const ally = s.team === p.team;
      if (!ally && !(s.revealT > 0 && s.effects.camouflage <= 0)) continue;
      const [x, y] = toMap(s.body.pos.x, s.body.pos.z);
      g.fillStyle = ally ? TEAMS[s.team].ui : '#ff4a3a';
      g.beginPath();
      g.arc(x, y, ally ? 6 : 7, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    // joueur (flèche au centre)
    g.fillStyle = '#ffd23a';
    g.strokeStyle = '#111';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(R, R - 16);
    g.lineTo(R + 11, R + 12);
    g.lineTo(R, R + 6);
    g.lineTo(R - 11, R + 12);
    g.closePath();
    g.fill();
    g.stroke();
    // bord
    g.strokeStyle = 'rgba(255,255,255,0.65)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(R, R, R - 3, 0, Math.PI * 2);
    g.stroke();
  }
}
