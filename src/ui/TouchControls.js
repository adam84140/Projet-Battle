import { icon } from './icons.js';

// Commandes tactiles : joystick flottant à gauche, glisser à droite pour viser,
// boutons d'action à droite. Actives dès qu'un écran tactile est détecté.

const DEADZONE = 0.12;
const STICK_RADIUS = 56;

export class TouchControls {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this.active = false;
    this.move = { x: 0, y: 0 };
    this.sprint = false;
    this.lookDX = 0;
    this.lookDY = 0;
    this.fire = false;
    this.aim = false;
    this.crouch = false;
    this.pressed = new Set();
    this.ability = -1;
    this.onPause = null;
    this.onScores = null;
    this.stick = null;
    this.lookers = new Map();

    root.innerHTML = `
      <div class="t-zone t-move" aria-hidden="true"></div>
      <div class="t-zone t-look" aria-hidden="true"></div>
      <div class="t-stick hidden"><div class="t-knob"></div></div>
      <button class="t-btn t-fire" data-hold="fire" aria-label="Tirer">${icon('target', 34)}</button>
      <button class="t-btn t-aim" data-toggle="aim" aria-label="Viser">${icon('eye', 24)}<span>Viser</span></button>
      <button class="t-btn t-jump" data-tap="jump" aria-label="Sauter">${icon('back', 26, 't-up')}<span>Saut</span></button>
      <button class="t-btn t-crouch" data-toggle="crouch" aria-label="S'accroupir">${icon('back', 22, 't-down')}<span>Accr.</span></button>
      <button class="t-btn t-reload" data-tap="reload" aria-label="Recharger">${icon('ammo', 22)}<span>Rech.</span></button>
      <div class="t-top">
        <button class="t-mini" data-act="pause" aria-label="Pause">II</button>
        <button class="t-mini" data-act="scores" aria-label="Scores">${icon('user', 18)}</button>
      </div>
      <div class="t-rotate hidden"><p>Tournez votre téléphone en mode paysage pour mieux jouer.</p><button class="t-mini wide" data-act="rotate-ok">OK</button></div>
    `;
    this.$ = (s) => root.querySelector(s);
    this.stickEl = this.$('.t-stick');
    this.knobEl = this.$('.t-knob');
    this.bind();
    // Détection : écran tactile principal, ou premier contact tactile
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    if (coarse) this.enable();
    window.addEventListener(
      'touchstart',
      () => {
        if (!this.active) this.enable();
      },
      { passive: true },
    );
  }

  enable() {
    this.active = true;
    this.game.input.touchMode = true;
    document.body.classList.add('touch');
  }

  bind() {
    const root = this.root;
    const moveZone = this.$('.t-move');
    const lookZone = this.$('.t-look');

    // Joystick flottant
    moveZone.addEventListener('pointerdown', (e) => {
      if (this.stick) return;
      e.preventDefault();
      moveZone.setPointerCapture?.(e.pointerId);
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
      this.stickEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      this.stickEl.classList.remove('hidden');
      this.updateStick(e.clientX, e.clientY);
    });
    moveZone.addEventListener('pointermove', (e) => {
      if (!this.stick || e.pointerId !== this.stick.id) return;
      this.updateStick(e.clientX, e.clientY);
    });
    const endStick = (e) => {
      if (!this.stick || e.pointerId !== this.stick.id) return;
      this.stick = null;
      this.move.x = this.move.y = 0;
      this.sprint = false;
      this.stickEl.classList.add('hidden');
      this.knobEl.classList.remove('sprint');
    };
    moveZone.addEventListener('pointerup', endStick);
    moveZone.addEventListener('pointercancel', endStick);

    // Zone de visée (et le bouton de tir sert aussi à viser en glissant)
    const startLook = (e) => {
      this.lookers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const moveLook = (e) => {
      const l = this.lookers.get(e.pointerId);
      if (!l) return;
      this.lookDX += e.clientX - l.x;
      this.lookDY += e.clientY - l.y;
      l.x = e.clientX;
      l.y = e.clientY;
    };
    const endLook = (e) => this.lookers.delete(e.pointerId);
    lookZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      lookZone.setPointerCapture?.(e.pointerId);
      startLook(e);
    });
    lookZone.addEventListener('pointermove', moveLook);
    lookZone.addEventListener('pointerup', endLook);
    lookZone.addEventListener('pointercancel', endLook);

    // Boutons
    root.querySelectorAll('.t-btn').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.setPointerCapture?.(e.pointerId);
        b.classList.add('down');
        this.game.audio.resume();
        if (b.dataset.hold === 'fire') {
          this.fire = true;
          this.pressed.add('firePressed');
          startLook(e);
        }
        if (b.dataset.tap) this.pressed.add(b.dataset.tap);
        if (b.dataset.toggle) {
          this[b.dataset.toggle] = !this[b.dataset.toggle];
          b.classList.toggle('on', this[b.dataset.toggle]);
        }
      });
      b.addEventListener('pointermove', (e) => {
        if (b.dataset.hold === 'fire') moveLook(e);
      });
      const up = (e) => {
        b.classList.remove('down');
        if (b.dataset.hold === 'fire') {
          this.fire = false;
          endLook(e);
        }
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    root.querySelectorAll('[data-act]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.preventDefault();
        const act = b.dataset.act;
        if (act === 'pause') this.onPause?.();
        if (act === 'scores') this.onScores?.();
        if (act === 'rotate-ok') {
          this.rotateDismissed = true;
          this.$('.t-rotate').classList.add('hidden');
        }
      }),
    );

    // Compétences et invite "monter dans le véhicule" (éléments du HUD)
    const hud = document.getElementById('hud');
    hud?.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      const ab = e.target.closest('.ab');
      if (ab) {
        e.preventDefault();
        this.ability = [...ab.parentElement.children].indexOf(ab);
        return;
      }
      if (e.target.closest('.prompt')) {
        e.preventDefault();
        this.pressed.add('interact');
      }
    });
  }

  updateStick(x, y) {
    const s = this.stick;
    let dx = x - s.ox;
    let dy = y - s.oy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_RADIUS) {
      dx = (dx / d) * STICK_RADIUS;
      dy = (dy / d) * STICK_RADIUS;
    }
    this.knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    let mx = dx / STICK_RADIUS;
    let my = -dy / STICK_RADIUS;
    const m = Math.hypot(mx, my);
    if (m < DEADZONE) mx = my = 0;
    // droite du joystick = droite du personnage (-X local) -> mx négatif
    this.move.x = -mx;
    this.move.y = my;
    // pousser le joystick à fond vers l'avant = sprint
    this.sprint = m > 0.92 && my > 0.6;
    this.knobEl.classList.toggle('sprint', this.sprint);
  }

  consume(name) {
    if (!this.pressed.has(name)) return false;
    this.pressed.delete(name);
    return true;
  }

  consumeAbility() {
    const a = this.ability;
    this.ability = -1;
    return a;
  }

  endFrame() {
    this.lookDX = 0;
    this.lookDY = 0;
  }

  // Remet à zéro (mort, pause, nouvelle partie)
  reset() {
    this.move.x = this.move.y = 0;
    this.sprint = false;
    this.fire = false;
    this.aim = false;
    this.crouch = false;
    this.stick = null;
    this.lookers.clear();
    this.pressed.clear();
    this.ability = -1;
    this.stickEl.classList.add('hidden');
    this.root.querySelectorAll('.t-btn').forEach((b) => b.classList.remove('on', 'down'));
  }

  update() {
    const g = this.game;
    const show = this.active && g.state === 'playing' && g.player && g.player.alive;
    if (show !== this.shown) {
      this.shown = show;
      this.root.classList.toggle('hidden', !show);
      if (!show) this.reset();
    }
    if (show) {
      const inVehicle = !!g.player.vehicle;
      this.root.classList.toggle('in-vehicle', inVehicle);
      const portrait = window.innerHeight > window.innerWidth;
      this.$('.t-rotate').classList.toggle('hidden', !portrait || !!this.rotateDismissed);
    }
  }
}
