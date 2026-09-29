import { GAME, TEAMS, CLASSES, CLASS_ORDER, ABILITIES, MODES, DIFFICULTIES, SKIN_TONES, HAIR_COLORS } from '../config.js';
import { MAP } from '../game/map.js';
import { emblemSVG } from '../character/emblems.js';
import { icon, WEAPON_ICON } from './icons.js';
import { renderPortraits } from './portraits.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

const LOGO = (cls = '') => `<div class="logo ${cls}"><span class="logo-1">FR<span class="logo-star">★</span>NTLINE</span><span class="logo-2">LEGENDS</span></div>`;

// Tous les écrans d'interface hors HUD.
export class UI {
  constructor(game, root, settings, save) {
    this.game = game;
    this.root = root;
    this.settings = settings;
    this.save = save;
    this.portraits = null;
    this.deployClass = settings.classId;
    this.deploySpawn = 'base';
    root.innerHTML = [this.menuHTML(), this.sidesHTML(), this.deployHTML(), this.scoreHTML(), this.pauseHTML(), this.endHTML()].join('');
    this.$ = (s) => root.querySelector(s);
    this.$$ = (s) => [...root.querySelectorAll(s)];
    this.bind();
    this.refreshPortraits();
    this.renderClassCard();
    this.syncControls();
    this.bindGame();
  }

  // ---------------- HTML ----------------
  menuHTML() {
    return `
    <div id="menu" class="screen">
      <div class="menu-main">
        <div class="menu-left">
          ${LOGO('big')}
          <div class="tagline">${GAME.tagline.split('. ').join('.\n')}</div>
          <div class="menu-buttons">
            <button class="btn primary" data-act="play">${icon('play', 26)} Jouer</button>
            <button class="btn" data-act="hero">${icon('user')} Héros &amp; personnalisation</button>
            <a class="btn" href="./fiche.html" target="_blank" rel="noopener" style="text-decoration:none">${icon('sheet')} Fiche personnage</a>
            <button class="btn" data-act="controls">${icon('keyboard')} Commandes</button>
            <button class="btn" data-act="settings">${icon('gear')} Paramètres</button>
          </div>
          <p class="note touch-note">Sur téléphone : joystick à gauche, glissez à droite pour viser, boutons d'action à droite. Le mode paysage est conseillé.</p>
        </div>
        <div class="menu-right">
          <div class="quote"></div>
          <div class="class-card panel"></div>
        </div>
      </div>
      <div class="menu-footer">
        ${LOGO()}
        <span class="foot-claim">Une nouvelle génération de héros.</span>
        <span class="foot-feat">${icon('globe', 20)} Bots 8v8 / 16v16</span>
        <span class="foot-feat">${icon('tank', 20)} Véhicules</span>
        <span class="foot-feat">${icon('flag', 20)} Capture de points</span>
        <span class="foot-feat">${icon('gear', 20)} Personnalisation</span>
        <span class="foot-end">Plus qu'un jeu,<br>une aventure à partager.</span>
      </div>
    </div>`;
  }

  classPicker(name) {
    return `<div class="class-picker" data-picker="${name}">${CLASS_ORDER.map(
      (id) => `<button class="class-opt" data-class="${id}"><img alt="" data-portrait="${id}"><b>${CLASSES[id].name}</b></button>`,
    ).join('')}</div>`;
  }

  sidesHTML() {
    const seg = (name, opts) => `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('')}</div>`;
    return `
    <div id="side-play" class="side panel">
      <button class="btn ghost" data-act="back">${icon('back')} Retour</button>
      <h2 class="panel-title">Nouvelle partie <small>Conquête — ${MAP.name}</small></h2>
      <div class="field"><label>Équipe</label>${seg('team', [['blue', `${emblemSVG('eagle', '#fff', 16)} ${TEAMS.blue.name}`], ['red', `${emblemSVG('star', '#fff', 16)} ${TEAMS.red.name}`]])}</div>
      <div class="field"><label>Format</label>${seg('mode', Object.keys(MODES).map((k) => [k, k]))}</div>
      <div class="field"><label>Difficulté des bots</label>${seg('difficulty', Object.entries(DIFFICULTIES).map(([k, d]) => [k, d.name]))}</div>
      <div class="field"><label>Classe de départ</label>${this.classPicker('play')}</div>
      <p class="note">Capturez et tenez les drapeaux A, B et C. L'équipe qui contrôle le moins de drapeaux perd des tickets ; chaque élimination en coûte un. Première équipe à 0 : défaite.</p>
      <button class="btn primary" data-act="start">${icon('play', 26)} Lancer la partie</button>
    </div>
    <div id="side-hero" class="side panel">
      <button class="btn ghost" data-act="back">${icon('back')} Retour</button>
      <h2 class="panel-title">Votre héros <small>aperçu en direct</small></h2>
      <div class="field"><label>Nom de soldat</label><input type="text" maxlength="16" data-input="name"></div>
      <div class="field"><label>Classe</label>${this.classPicker('hero')}</div>
      <div class="field"><label>Teint</label><div class="swatches" data-swatch="skin">${SKIN_TONES.map((c) => `<button class="swatch" data-v="${c}" style="background:${hex(c)}" aria-label="Teint"></button>`).join('')}</div></div>
      <div class="field"><label>Cheveux</label><div class="swatches" data-swatch="hair">${HAIR_COLORS.map((c) => `<button class="swatch" data-v="${c}" style="background:${hex(c)}" aria-label="Cheveux"></button>`).join('')}</div></div>
      <div class="field"><label>Accessoires</label><div class="toggles">
        ${[['backpack', 'Sac à dos'], ['cap', 'Casquette'], ['glasses', 'Lunettes'], ['bandana', 'Bandana']].map(([k, l]) => `<button class="toggle" data-toggle="${k}">${l}<i></i></button>`).join('')}
      </div></div>
      <p class="note">La casquette remplace la coiffure de l'Assaut ; l'Artilleur porte toujours son casque et le Commando son bonnet.</p>
    </div>
    <div id="side-controls" class="side panel">
      <button class="btn ghost" data-act="back">${icon('back')} Retour</button>
      <h2 class="panel-title">Commandes</h2>
      <dl class="keys">
        <dt><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd></dt><dd>Se déplacer (ou <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> en QWERTY)</dd>
        <dt>Souris</dt><dd>Viser / tourner la caméra</dd>
        <dt>Clic gauche</dt><dd>Tirer</dd>
        <dt>Clic droit</dt><dd>Viser (lunette pour le Commando)</dd>
        <dt><kbd>Maj</kbd></dt><dd>Sprinter</dd>
        <dt><kbd>Espace</kbd></dt><dd>Sauter</dd>
        <dt><kbd>C</kbd> / <kbd>Ctrl</kbd></dt><dd>S'accroupir</dd>
        <dt><kbd>R</kbd></dt><dd>Recharger</dd>
        <dt><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd></dt><dd>Compétences de classe</dd>
        <dt><kbd>E</kbd></dt><dd>Monter / descendre d'un véhicule</dd>
        <dt><kbd>Tab</kbd></dt><dd>Tableau des scores</dd>
        <dt><kbd>Échap</kbd></dt><dd>Pause</dd>
      </dl>
      <h3 class="panel-title" style="font-size:20px;margin:6px 0 0">Sur écran tactile</h3>
      <dl class="keys">
        <dt>Pouce gauche</dt><dd>Joystick : se déplacer (à fond vers l'avant pour sprinter)</dd>
        <dt>Pouce droit</dt><dd>Glisser pour viser ; le bouton de tir se glisse aussi</dd>
        <dt>Boutons</dt><dd>Tir, Viser, Saut, Accroupi, Recharger</dd>
        <dt>Icônes 1 2 3</dt><dd>Compétences (touchez l'icône)</dd>
        <dt>Invite</dt><dd>Touchez « Monter dans… » pour prendre un véhicule</dd>
      </dl>
      <p class="note">Dans le char : la souris oriente la tourelle, clic gauche pour tirer un obus. La jeep écrase les ennemis à pleine vitesse !</p>
    </div>
    <div id="side-settings" class="side panel">
      <button class="btn ghost" data-act="back">${icon('back')} Retour</button>
      <h2 class="panel-title">Paramètres</h2>
      <div class="field"><label>Sensibilité de la souris : <span data-out="sensitivity"></span></label><input type="range" min="0.2" max="3" step="0.05" data-range="sensitivity"></div>
      <div class="field"><label>Volume : <span data-out="volume"></span></label><input type="range" min="0" max="1" step="0.05" data-range="volume"></div>
      <div class="field"><label>Qualité graphique (au prochain chargement)</label>${seg('quality', [['high', 'Haute'], ['low', 'Basse']])}</div>
    </div>`;
  }

  deployHTML() {
    return `
    <div id="deploy" class="screen">
      <div class="deploy-box panel">
        <div class="deploy-head"><h2>Déploiement</h2><span class="killed-by"></span></div>
        <div class="deploy-left">
          <div class="deploy-classes">${CLASS_ORDER.map(
            (id) => `<button class="dcls" data-class="${id}"><img alt="" data-portrait="${id}"><b>${CLASSES[id].name}</b><small>${CLASSES[id].tagline}</small><span class="dab">${CLASSES[id].abilities.map((a) => icon(ABILITIES[a].icon, 20)).join('')}</span></button>`,
          ).join('')}</div>
          <div class="deploy-abilities ab-list"></div>
        </div>
        <div class="deploy-right">
          <div class="spawn-map"><canvas width="448" height="512"></canvas></div>
          <div class="deploy-go"><span class="deploy-timer"></span><button class="btn primary" data-act="deploy">Déployer</button></div>
          <p class="note"><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> bouger · <kbd>Maj</kbd> sprint · clic tirer · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> compétences · <kbd>E</kbd> véhicule</p>
        </div>
      </div>
    </div>`;
  }

  scoreHTML() {
    return `<div id="scoreboard" class="screen"><div class="sb-box panel"><div class="sb-team blue"></div><div class="sb-team red"></div></div></div>`;
  }

  pauseHTML() {
    return `
    <div id="pause" class="screen">
      <div class="pause-box panel">
        <h2 class="panel-title">Pause</h2>
        <button class="btn primary" data-act="resume">${icon('play', 24)} Reprendre</button>
        <button class="btn" data-act="pause-controls">${icon('keyboard')} Commandes</button>
        <div class="field"><label>Sensibilité : <span data-out="sensitivity"></span></label><input type="range" min="0.2" max="3" step="0.05" data-range="sensitivity"></div>
        <div class="field"><label>Volume : <span data-out="volume"></span></label><input type="range" min="0" max="1" step="0.05" data-range="volume"></div>
        <button class="btn" data-act="quit">${icon('back')} Quitter la partie</button>
      </div>
    </div>`;
  }

  endHTML() {
    return `
    <div id="end" class="screen">
      <div class="end-box panel">
        <h1 class="end-title"></h1>
        <div class="end-scores"></div>
        <div class="end-stats"></div>
        <div class="mvp"></div>
        <div class="row-btns">
          <button class="btn primary" data-act="restart">${icon('play', 24)} Rejouer</button>
          <button class="btn" data-act="menu">${icon('back')} Menu principal</button>
        </div>
      </div>
    </div>`;
  }

  // ---------------- Liaisons ----------------
  bind() {
    const s = this.settings;
    this.root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act],[data-class],[data-seg] button,[data-swatch] button,[data-toggle]');
      if (!t) return;
      this.game.audio.resume();
      this.game.audio.ui();
      if (t.dataset.act) return this.action(t.dataset.act);
      if (t.dataset.class) {
        if (t.classList.contains('dcls')) {
          this.deployClass = t.dataset.class;
          this.syncDeploy();
          return;
        }
        s.classId = t.dataset.class;
        this.onCustomChange();
        return;
      }
      const segEl = t.closest('[data-seg]');
      if (segEl) {
        s[segEl.dataset.seg] = t.dataset.v;
        if (segEl.dataset.seg === 'team') this.onCustomChange();
        this.syncControls();
        this.save();
        return;
      }
      const sw = t.closest('[data-swatch]');
      if (sw) {
        s.custom[sw.dataset.swatch] = Number(t.dataset.v);
        this.onCustomChange();
        return;
      }
      if (t.dataset.toggle) {
        s.custom[t.dataset.toggle] = !s.custom[t.dataset.toggle];
        this.onCustomChange();
      }
    });
    this.root.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.range) {
        s[t.dataset.range] = Number(t.value);
        if (t.dataset.range === 'volume') this.game.audio.setVolume(s.volume);
        this.syncControls();
        this.save();
      }
      if (t.dataset.input === 'name') {
        s.custom.name = t.value.trim().slice(0, 16) || 'Joueur';
        this.save();
      }
    });
    // Tableau des scores (Tab maintenu)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' && ['playing', 'deploy'].includes(this.game.state)) {
        e.preventDefault();
        this.renderScoreboard();
        this.$('#scoreboard').classList.add('on');
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Tab') this.$('#scoreboard').classList.remove('on');
    });
    // Clic sur le jeu pour reprendre la visée
    this.game.canvas.addEventListener('click', () => {
      if (this.game.state === 'playing' && !this.game.input.locked) this.game.input.requestLock();
    });
    this.game.input.onLockChange = (locked) => {
      const g = this.game;
      if (locked) {
        this.hide('pause');
        if (g.state === 'paused') g.setPaused(false);
      } else if (g.state === 'playing' && g.player?.alive) {
        g.setPaused(true);
        this.show('pause', false);
      }
    };
  }

  bindGame() {
    const g = this.game;
    if (g.touch) {
      g.touch.onPause = () => {
        if (g.state !== 'playing') return;
        g.setPaused(true);
        this.show('pause', false);
      };
      g.touch.onScores = () => {
        const sb = this.$('#scoreboard');
        if (!sb.classList.contains('on')) this.renderScoreboard();
        sb.classList.toggle('on');
      };
    }
    g.on('deploy', ({ first }) => this.openDeploy(first));
    g.on('deployed', () => {
      this.hide('deploy');
      g.hud.show(true);
    });
    g.on('playerDied', (killer) => {
      setTimeout(() => {
        if (g.state === 'playing' && !g.player.alive && !g.winner) {
          g.state = 'deploy';
          g.input.exitLock();
          this.openDeploy(false, killer);
        }
      }, 1800);
    });
    g.on('matchEnd', () => {
      this.hide('deploy');
      this.hide('pause');
    });
    g.on('ended', (winner) => this.openEnd(winner));
  }

  action(act) {
    const g = this.game;
    switch (act) {
      case 'play':
        return this.openSide('play');
      case 'hero':
        return this.openSide('hero');
      case 'controls':
        return this.openSide('controls');
      case 'settings':
        return this.openSide('settings');
      case 'back':
        return this.openSide(null);
      case 'start':
        this.save();
        this.openSide(null);
        this.hide('menu');
        g.startMatch();
        g.hud.setupMatch();
        return;
      case 'deploy':
        if (this.deployBlocked()) return;
        this.save();
        g.deployPlayer(this.deployClass, this.deploySpawn);
        return;
      case 'resume':
        if (g.touch?.active) {
          this.hide('pause');
          g.setPaused(false);
          return;
        }
        g.input.requestLock();
        return;
      case 'pause-controls':
        this.hide('pause');
        this.show('menu', false);
        this.$('#menu .menu-main').classList.add('hidden');
        this.$('#menu .menu-footer').classList.add('hidden');
        this.openSide('controls');
        this.returnToPause = true;
        return;
      case 'quit':
      case 'menu':
        this.hide('pause');
        this.hide('end');
        this.hide('deploy');
        g.hud.show(false);
        g.backToMenu();
        this.show('menu');
        return;
      case 'restart':
        this.hide('end');
        g.startMatch();
        g.hud.setupMatch();
        return;
      default:
    }
  }

  show(id, exclusive = true) {
    if (exclusive) this.$$('.screen').forEach((el) => el.classList.remove('on'));
    this.$('#' + id)?.classList.add('on');
    if (id === 'menu') {
      this.$('#menu .menu-main').classList.remove('hidden');
      this.$('#menu .menu-footer').classList.remove('hidden');
    }
  }

  hide(id) {
    this.$('#' + id)?.classList.remove('on');
  }

  openSide(name) {
    this.$$('.side').forEach((el) => el.classList.remove('on'));
    const left = this.$('.menu-left');
    if (name) {
      this.$('#side-' + name).classList.add('on');
      left.classList.add('hidden');
    } else {
      left.classList.remove('hidden');
      if (this.returnToPause) {
        this.returnToPause = false;
        this.hide('menu');
        this.show('pause', false);
      }
    }
    this.syncControls();
  }

  onCustomChange() {
    this.save();
    this.game.settings = this.settings;
    this.game.buildMenuHero();
    this.renderClassCard();
    this.syncControls();
    clearTimeout(this._pt);
    this._pt = setTimeout(() => this.refreshPortraits(), 150);
  }

  syncControls() {
    const s = this.settings;
    this.$$('[data-seg]').forEach((seg) => {
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(s[seg.dataset.seg] ?? '') === b.dataset.v));
      if (seg.dataset.seg === 'team') seg.classList.toggle('red', s.team === 'red');
    });
    this.$$('[data-picker] .class-opt').forEach((b) => b.classList.toggle('on', b.dataset.class === s.classId));
    this.$$('[data-swatch]').forEach((sw) => sw.querySelectorAll('.swatch').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === s.custom[sw.dataset.swatch])));
    this.$$('[data-toggle]').forEach((b) => b.classList.toggle('on', !!s.custom[b.dataset.toggle]));
    this.$$('[data-range]').forEach((r) => (r.value = s[r.dataset.range]));
    this.$$('[data-out]').forEach((o) => {
      const v = s[o.dataset.out];
      o.textContent = o.dataset.out === 'volume' ? `${Math.round(v * 100)} %` : v.toFixed(2);
    });
    const name = this.$('[data-input="name"]');
    if (name && document.activeElement !== name) name.value = s.custom.name || 'Joueur';
  }

  refreshPortraits() {
    try {
      this.portraits = renderPortraits(this.settings.team || 'blue', this.settings.custom);
    } catch (err) {
      console.warn('Portraits indisponibles', err);
      return;
    }
    this.$$('img[data-portrait]').forEach((img) => (img.src = this.portraits[img.dataset.portrait]));
  }

  renderClassCard() {
    const c = CLASSES[this.settings.classId];
    const teamColor = TEAMS[this.settings.team || 'blue'];
    this.$('.quote').innerHTML = `“${c.quote.join('<br>')}”`;
    this.$('.class-card').innerHTML = `
      <div class="class-head">CLASSE : <span class="class-name" style="background:${teamColor.ui}">${c.name.toUpperCase()}</span></div>
      <div class="class-tag">${c.tagline}</div>
      <p class="class-desc">${c.description}</p>
      <div class="stats">${c.stats
        .map((st) => `<div class="stat">${icon(st.icon, 34)}<b>${st.label}</b><span>${st.detail}</span><div class="pips">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= st.value ? 'on' : ''}"></i>`).join('')}</div></div>`)
        .join('')}</div>
      <div class="ab-list">${c.abilities.map((a) => `<div class="ab-chip">${icon(ABILITIES[a].icon, 22)}<div><b>${ABILITIES[a].name}</b>${ABILITIES[a].desc}</div></div>`).join('')}</div>`;
  }

  // ---------------- Déploiement ----------------
  openDeploy(first, killer) {
    const g = this.game;
    this.deployClass = g.player ? g.player.classId : this.settings.classId;
    this.deployOpenedAt = performance.now();
    this.deployFirst = first;
    this.deploySpawn = 'base';
    this.$('.killed-by').innerHTML = killer ? `Éliminé par <b>${esc(killer.name)}</b> (${CLASSES[killer.classId].name})` : first ? 'Choisissez votre classe et votre point de déploiement' : '';
    g.hud.show(!first);
    this.show('deploy', false);
    this.syncDeploy();
    clearInterval(this.deployTimer);
    this.deployTimer = setInterval(() => {
      if (!this.$('#deploy').classList.contains('on')) return clearInterval(this.deployTimer);
      this.syncDeploy(true);
    }, 250);
  }

  deployBlocked() {
    if (this.deployFirst) return false;
    return performance.now() - this.deployOpenedAt < 3200;
  }

  syncDeploy(timerOnly = false) {
    const btn = this.$('[data-act="deploy"]');
    const left = Math.max(0, 3.2 - (performance.now() - this.deployOpenedAt) / 1000);
    const blocked = this.deployBlocked();
    btn.disabled = blocked;
    this.$('.deploy-timer').textContent = blocked ? `Renforts dans ${Math.ceil(left)} s…` : 'Prêt au combat !';
    if (timerOnly) {
      this.drawSpawnMap();
      return;
    }
    this.$$('.dcls').forEach((b) => b.classList.toggle('on', b.dataset.class === this.deployClass));
    const c = CLASSES[this.deployClass];
    this.$('.deploy-abilities').innerHTML = c.abilities.map((a, i) => `<div class="ab-chip">${icon(ABILITIES[a].icon, 22)}<div><b>${i + 1}. ${ABILITIES[a].name}</b>${ABILITIES[a].desc}</div></div>`).join('');
    this.drawSpawnMap();
  }

  drawSpawnMap() {
    const g = this.game;
    if (!g.conquest || !g.hud) return;
    const wrap = this.$('.spawn-map');
    const cv = wrap.querySelector('canvas');
    const ctx = cv.getContext('2d');
    ctx.drawImage(g.hud.mmBase, 0, 0, cv.width, cv.height);
    // soldats alliés
    const b = MAP.bounds;
    const X = (x) => ((x - b.minX) / (b.maxX - b.minX)) * cv.width;
    const Z = (z) => ((b.maxZ - z) / (b.maxZ - b.minZ)) * cv.height;
    for (const s of g.soldiers) {
      if (!s.alive || s.team !== g.playerTeam) continue;
      ctx.fillStyle = TEAMS[s.team].ui;
      ctx.beginPath();
      ctx.arc(X(s.body.pos.x), Z(s.body.pos.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    const opts = g.conquest.spawnOptions(g.playerTeam);
    if (!opts.find((o) => o.id === this.deploySpawn)) this.deploySpawn = 'base';
    const key = opts.map((o) => o.id).join() + '|' + g.conquest.points.map((p) => p.owner).join() + this.deploySpawn;
    if (key === this.spawnKey) return;
    this.spawnKey = key;
    wrap.querySelectorAll('.spawn-pt').forEach((e) => e.remove());
    const pct = (x, z) => [((x - b.minX) / (b.maxX - b.minX)) * 100, ((b.maxZ - z) / (b.maxZ - b.minZ)) * 100];
    const add = (id, label, x, z, cls) => {
      const el = document.createElement('button');
      el.className = `spawn-pt ${cls}${id === this.deploySpawn ? ' on' : ''}`;
      const [px, pz] = pct(x, z);
      el.style.left = px + '%';
      el.style.top = pz + '%';
      el.innerHTML = label;
      el.title = id === 'base' ? 'Base' : label;
      if (!cls) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deploySpawn = id;
          this.spawnKey = null;
          this.drawSpawnMap();
          g.audio.ui();
        });
      }
      wrap.appendChild(el);
    };
    const base = MAP.bases[g.playerTeam];
    add('base', emblemSVG(TEAMS[g.playerTeam].emblem, '#fff', 22), base.x, base.z, '');
    for (const p of g.conquest.points) {
      const cls = p.owner === g.playerTeam ? '' : p.owner ? 'enemy' : 'neutral';
      add(p.id, p.id, p.pos.x, p.pos.z, cls);
    }
  }

  // ---------------- Scores / fin ----------------
  renderScoreboard() {
    const g = this.game;
    if (!g.conquest) return;
    for (const team of ['blue', 'red']) {
      const list = g.soldiers.filter((s) => s.team === team).sort((a, b) => b.stats.score - a.stats.score);
      const el = this.$(`.sb-team.${team}`);
      el.innerHTML = `<h3><span>${emblemSVG(TEAMS[team].emblem, '#fff', 22)} ${TEAMS[team].name}</span><span>${g.conquest.tickets[team]}</span></h3>
        <table><thead><tr><th>Soldat</th><th>Score</th><th>Élim.</th><th>Morts</th><th>Cap.</th></tr></thead><tbody>
        ${list.map((s) => `<tr class="${s === g.player ? 'me' : ''} ${s.alive ? '' : 'dead'}"><td>${icon(WEAPON_ICON[s.weapon.id], 16)}${esc(s.name)}</td><td>${s.stats.score}</td><td>${s.stats.kills}</td><td>${s.stats.deaths}</td><td>${s.stats.captures}</td></tr>`).join('')}
        </tbody></table>`;
    }
  }

  openEnd(winner) {
    const g = this.game;
    const win = winner === g.playerTeam;
    const t = this.$('.end-title');
    t.textContent = win ? 'Victoire !' : 'Défaite';
    t.className = `end-title ${win ? 'win' : 'lose'}`;
    this.$('.end-scores').innerHTML = ['blue', 'red'].map((team) => `<div class="t">${emblemSVG(TEAMS[team].emblem, TEAMS[team].ui, 36)}<span>${TEAMS[team].name}</span><b>${g.conquest.tickets[team]}</b></div>`).join('<span>—</span>');
    const p = g.player;
    this.$('.end-stats').innerHTML = [
      [p.stats.score, 'Score'],
      [p.stats.kills, 'Éliminations'],
      [p.stats.deaths, 'Morts'],
      [p.stats.captures, 'Captures'],
    ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
    const mvp = [...g.soldiers].sort((a, b) => b.stats.score - a.stats.score)[0];
    this.$('.mvp').innerHTML = mvp ? `Héros du match : <b style="color:${TEAMS[mvp.team].ui}">${esc(mvp.name)}</b> — ${mvp.stats.score} pts, ${mvp.stats.kills} élimination${mvp.stats.kills > 1 ? 's' : ''}` : '';
    g.hud.show(false);
    this.show('end');
  }
}
