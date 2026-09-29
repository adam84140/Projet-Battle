// Clavier + souris. On utilise event.code (position physique des touches) :
// ZQSD en AZERTY et WASD en QWERTY fonctionnent donc automatiquement.

export class Input {
  constructor(element) {
    this.el = element;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { dx: 0, dy: 0, left: false, right: false, leftPressed: false, wheel: 0 };
    // ?autotest : considère le pointeur comme verrouillé (tests automatisés)
    this.forceLocked = typeof location !== 'undefined' && location.search.includes('autotest');
    this.locked = this.forceLocked;
    this.enabled = true;
    this.onLockChange = null;
    this.touchMode = false; // écran tactile : la souris et le verrouillage ne servent plus
    this.freeMouse = false; // verrouillage refusé : on vise avec la souris libre

    this._down = (e) => {
      if (!this.enabled) return;
      if (e.code === 'Escape' && this.freeMouse && this.locked) {
        this.setFreeLocked(false);
        return;
      }
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    };
    this._up = (e) => this.keys.delete(e.code);
    this._move = (e) => {
      if (!this.locked || this.touchMode) return;
      this.mouse.dx += e.movementX || 0;
      this.mouse.dy += e.movementY || 0;
    };
    this._mdown = (e) => {
      if (!this.enabled || this.touchMode) return;
      if (!this.locked) return;
      if (e.button === 0) {
        this.mouse.left = true;
        this.mouse.leftPressed = true;
      }
      if (e.button === 2) this.mouse.right = true;
    };
    this._mup = (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    };
    this._wheel = (e) => {
      this.mouse.wheel += Math.sign(e.deltaY);
    };
    this._lock = () => {
      if (document.pointerLockElement === this.el) this.freeMouse = false;
      this.locked = this.forceLocked || document.pointerLockElement === this.el;
      if (!this.locked) {
        this.mouse.left = false;
        this.mouse.right = false;
        this.keys.clear();
      }
      this.onLockChange?.(this.locked);
    };
    this._blur = () => {
      this.keys.clear();
      this.mouse.left = false;
      this.mouse.right = false;
    };
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('mousemove', this._move);
    window.addEventListener('mousedown', this._mdown);
    window.addEventListener('mouseup', this._mup);
    window.addEventListener('wheel', this._wheel, { passive: true });
    window.addEventListener('blur', this._blur);
    document.addEventListener('pointerlockchange', this._lock);
    // Verrouillage impossible (cadre restreint, navigateur) : repli sur la souris libre
    this._lockError = () => {
      if (this.touchMode || this.locked) return;
      this.freeMouse = true;
      this.setFreeLocked(true);
    };
    document.addEventListener('pointerlockerror', this._lockError);
    element.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  requestLock() {
    if (this.forceLocked || this.touchMode) return;
    if (!this.el.requestPointerLock) return this._lockError();
    try {
      const p = this.el.requestPointerLock();
      if (p && p.catch) p.catch(() => this._lockError());
    } catch {
      this._lockError();
    }
  }

  setFreeLocked(v) {
    if (this.locked === v) return;
    this.locked = v;
    if (!v) {
      this.mouse.left = false;
      this.mouse.right = false;
      this.keys.clear();
    }
    this.onLockChange?.(v);
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
    else if (this.freeMouse && this.locked) {
      this.locked = false;
      this.keys.clear();
      this.mouse.left = false;
      this.mouse.right = false;
    }
  }

  down(code) {
    return this.keys.has(code);
  }

  hit(code) {
    return this.pressed.has(code);
  }

  // À appeler en fin de frame
  endFrame() {
    this.pressed.clear();
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.mouse.leftPressed = false;
    this.mouse.wheel = 0;
  }
}
