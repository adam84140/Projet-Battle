import * as THREE from 'three';

// Effets visuels : particules (un seul objet Points), traçantes, flashs.

const MAX_PARTICLES = 3000;

const particleVS = /* glsl */ `
  attribute float size;
  attribute float alpha;
  attribute vec3 pcolor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float scale;
  void main() {
    vAlpha = alpha;
    vColor = pcolor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const particleFS = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.2, d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

class ParticleSystem {
  constructor(scene, additive) {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX_PARTICLES * 3);
    this.col = new Float32Array(MAX_PARTICLES * 3);
    this.size = new Float32Array(MAX_PARTICLES);
    this.alpha = new Float32Array(MAX_PARTICLES);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 600 } },
      vertexShader: particleVS,
      fragmentShader: particleFS,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.parts = [];
  }

  spawn(p) {
    if (this.parts.length >= MAX_PARTICLES) this.parts.shift();
    this.parts.push(p);
  }

  update(dt) {
    const list = this.parts;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vy -= (p.gravity ?? 0) * dt;
      const drag = Math.exp(-(p.drag ?? 0) * dt);
      p.vx *= drag;
      p.vy *= drag;
      p.vz *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.floor !== undefined && p.y < p.floor) {
        p.y = p.floor;
        p.vy *= -0.3;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
      list[w++] = p;
    }
    list.length = w;
    for (let i = 0; i < w; i++) {
      const p = list[i];
      const t = p.age / p.life;
      this.pos[i * 3] = p.x;
      this.pos[i * 3 + 1] = p.y;
      this.pos[i * 3 + 2] = p.z;
      const c = p.c1 && t > 0 ? lerpColor(p.c0, p.c1, Math.min(1, t * (p.cspeed ?? 1.5))) : p.c0;
      this.col[i * 3] = c.r;
      this.col[i * 3 + 1] = c.g;
      this.col[i * 3 + 2] = c.b;
      this.size[i] = p.s0 + (p.s1 - p.s0) * t;
      this.alpha[i] = p.a0 * (t < 0.1 ? t / 0.1 : 1) * (1 - Math.pow(t, p.fade ?? 1.5));
    }
    for (let i = w; i < Math.min(MAX_PARTICLES, w + 50); i++) this.alpha[i] = 0;
    this.geo.setDrawRange(0, w);
    for (const k of ['position', 'pcolor', 'size', 'alpha']) this.geo.attributes[k].needsUpdate = true;
  }
}

const _c = new THREE.Color();
function lerpColor(a, b, t) {
  _c.r = a.r + (b.r - a.r) * t;
  _c.g = a.g + (b.g - a.g) * t;
  _c.b = a.b + (b.b - a.b) * t;
  return _c;
}

const C = (hex) => new THREE.Color(hex);
const COLORS = {
  dust: C(0xcbb89a),
  dirt: C(0x9a7a55),
  spark: C(0xffe08a),
  fire: C(0xffb040),
  fire2: C(0xff5a1a),
  smoke: C(0x555555),
  smokeLight: C(0x9a9a9a),
  heal: C(0x5cff7a),
  brass: C(0xe0ae48),
  muzzle: C(0xffd27a),
  hitStar: C(0xfff4c0),
  blue: C(0x6aa8ff),
  red: C(0xff6a5a),
};

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.soft = new ParticleSystem(scene, false);
    this.glow = new ParticleSystem(scene, true);
    // Traçantes
    this.tracers = [];
    const tgeo = new THREE.BoxGeometry(0.04, 0.04, 1);
    tgeo.translate(0, 0, -0.5);
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 80; i++) {
      const m = new THREE.Mesh(tgeo, this.tracerMat);
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      this.tracers.push({ mesh: m, active: false });
    }
    // Flash lumineux unique (évite de recompiler les shaders)
    this.flash = new THREE.PointLight(0xffa850, 0, 30, 1.6);
    scene.add(this.flash);
    this.flashT = 0;
    // Sphères d'explosion
    this.blasts = [];
    const bgeo = new THREE.SphereGeometry(1, 16, 12);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(bgeo, new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.visible = false;
      scene.add(m);
      this.blasts.push({ mesh: m, t: 1, size: 1 });
    }
    // Anneaux au sol (onde de choc / soins)
    this.rings = [];
    const rgeo = new THREE.RingGeometry(0.85, 1, 40);
    rgeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(rgeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      m.visible = false;
      scene.add(m);
      this.rings.push({ mesh: m, t: 1, size: 1, dur: 0.5 });
    }
    this.shake = 0;
  }

  tracer(from, to, color, width = 1, trail = 5) {
    const t = this.tracers.find((x) => !x.active) || this.tracers[0];
    t.active = true;
    t.width = width;
    t.trail = trail;
    t.from = from.clone();
    t.to = to.clone();
    t.len = from.distanceTo(to);
    t.d = 0;
    t.speed = 420;
    t.mesh.visible = true;
    t.mesh.material = color ? this.tracerMatFor(color) : this.tracerMat;
    t.mesh.position.copy(from);
    t.mesh.lookAt(to); // +Z vers la cible : la traînée s'étire vers l'arrière
  }

  tracerMatFor(color) {
    this._tm = this._tm || {};
    if (!this._tm[color]) this._tm[color] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    return this._tm[color];
  }

  impact(p, normal, kind = 'dust') {
    const n = normal || { x: 0, y: 1, z: 0 };
    const base = kind === 'dirt' ? COLORS.dirt : COLORS.dust;
    for (let i = 0; i < 6; i++) {
      this.soft.spawn({
        x: p.x, y: p.y, z: p.z,
        vx: n.x * 2 + (Math.random() - 0.5) * 2.5,
        vy: n.y * 2 + Math.random() * 2,
        vz: n.z * 2 + (Math.random() - 0.5) * 2.5,
        gravity: 3, drag: 2.5, age: 0, life: 0.5 + Math.random() * 0.4,
        s0: 0.25, s1: 0.9, a0: 0.8, c0: base,
      });
    }
    for (let i = 0; i < 4; i++) {
      this.glow.spawn({
        x: p.x, y: p.y, z: p.z,
        vx: n.x * 4 + (Math.random() - 0.5) * 6, vy: n.y * 4 + Math.random() * 4, vz: n.z * 4 + (Math.random() - 0.5) * 6,
        gravity: 14, drag: 1, age: 0, life: 0.2 + Math.random() * 0.15, s0: 0.12, s1: 0.04, a0: 1, c0: COLORS.spark,
      });
    }
  }

  // Étoiles cartoon quand on touche un soldat
  hitSpark(p, head) {
    for (let i = 0; i < (head ? 10 : 6); i++) {
      this.glow.spawn({
        x: p.x, y: p.y, z: p.z,
        vx: (Math.random() - 0.5) * 5, vy: Math.random() * 4, vz: (Math.random() - 0.5) * 5,
        gravity: 8, drag: 2, age: 0, life: 0.3 + Math.random() * 0.2, s0: head ? 0.35 : 0.25, s1: 0.05, a0: 1, c0: COLORS.hitStar,
      });
    }
  }

  // Lueur de bouche : rend lisible, même de loin, qui est en train de tirer
  muzzleGlow(p, size = 1) {
    this.glow.spawn({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, age: 0, life: 0.06, s0: 0.55 * size, s1: 0.3 * size, a0: 1, c0: COLORS.muzzle, fade: 1 });
  }

  // Douille éjectée sur la droite de l'arme ; elle rebondit sur le sol
  casing(p, rx, rz, floor) {
    this.soft.spawn({
      x: p.x, y: p.y, z: p.z,
      vx: rx * (1.6 + Math.random()) + (Math.random() - 0.5) * 0.6, vy: 2 + Math.random() * 1.2, vz: rz * (1.6 + Math.random()) + (Math.random() - 0.5) * 0.6,
      gravity: 11, drag: 0.4, age: 0, life: 1.1, s0: 0.07, s1: 0.07, a0: 1, c0: COLORS.brass, floor, fade: 6,
    });
  }

  // Petit nuage de poussière au sol (réception, chute d'un corps)
  puff(p, n = 5, size = 1) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random();
      this.soft.spawn({
        x: p.x + Math.cos(a) * 0.3, y: p.y + 0.1, z: p.z + Math.sin(a) * 0.3,
        vx: Math.cos(a) * 1.6, vy: 0.4 + Math.random() * 0.4, vz: Math.sin(a) * 1.6,
        drag: 3, age: 0, life: 0.6 + Math.random() * 0.3, s0: 0.35 * size, s1: 1 * size, a0: 0.5, c0: COLORS.dust,
      });
    }
  }

  // Capture d'un drapeau : onde et étincelles aux couleurs de l'équipe
  captureBurst(p, team) {
    const c = team === 'red' ? COLORS.red : COLORS.blue;
    this.ring(p, 16, team === 'red' ? 0xff6a5a : 0x6aa8ff, 0.9);
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 4;
      this.glow.spawn({
        x: p.x + Math.cos(a) * r, y: p.y + 0.3, z: p.z + Math.sin(a) * r,
        vx: 0, vy: 2.5 + Math.random() * 2.5, vz: 0, drag: 0.8, age: 0, life: 1 + Math.random() * 0.4, s0: 0.35, s1: 0.08, a0: 1, c0: c,
      });
    }
  }

  muzzle(p) {
    this.flash.position.copy(p);
    this.flash.intensity = Math.max(this.flash.intensity, 6);
    this.flash.distance = 12;
    this.flashT = 0.05;
  }

  explosion(p, radius = 5) {
    this.flash.position.set(p.x, p.y + 1, p.z);
    this.flash.intensity = 60;
    this.flash.distance = radius * 8;
    this.flashT = 0.25;
    const b = this.blasts.find((x) => x.t >= 1) || this.blasts[0];
    b.t = 0;
    b.size = radius * 0.55;
    b.mesh.position.copy(p);
    b.mesh.visible = true;
    this.ring(p, radius * 1.4, 0xffd9a0, 0.45);
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      const sp = 3 + Math.random() * 7;
      this.glow.spawn({
        x: p.x, y: p.y + 0.5, z: p.z,
        vx: Math.cos(a) * sp * (1 - up * 0.5), vy: up * 8 + 2, vz: Math.sin(a) * sp * (1 - up * 0.5),
        gravity: -1, drag: 3, age: 0, life: 0.5 + Math.random() * 0.4, s0: radius * 0.7, s1: radius * 0.2, a0: 0.9,
        c0: COLORS.fire, c1: COLORS.fire2, cspeed: 2,
      });
    }
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      this.soft.spawn({
        x: p.x + Math.cos(a) * radius * 0.3, y: p.y + 0.5 + Math.random(), z: p.z + Math.sin(a) * radius * 0.3,
        vx: Math.cos(a) * sp, vy: 2 + Math.random() * 4, vz: Math.sin(a) * sp,
        gravity: -0.5, drag: 1.2, age: 0, life: 1.6 + Math.random() * 1.1, s0: radius * 0.5, s1: radius * 1.5, a0: 0.62,
        c0: COLORS.smoke, c1: COLORS.smokeLight, cspeed: 1.6, fade: 1.2,
      });
    }
    for (let i = 0; i < 14; i++) {
      this.soft.spawn({
        x: p.x, y: p.y + 0.3, z: p.z,
        vx: (Math.random() - 0.5) * 14, vy: 5 + Math.random() * 9, vz: (Math.random() - 0.5) * 14,
        gravity: 20, drag: 0.3, age: 0, life: 1.2, s0: 0.3, s1: 0.2, a0: 1, c0: COLORS.dirt, floor: p.y,
      });
    }
  }

  smokeTrail(p) {
    this.soft.spawn({
      x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.4, vy: 0.6, vz: (Math.random() - 0.5) * 0.4,
      gravity: 0, drag: 1, age: 0, life: 0.9, s0: 0.3, s1: 1.1, a0: 0.5, c0: COLORS.smokeLight,
    });
    this.glow.spawn({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, age: 0, life: 0.08, s0: 0.5, s1: 0.2, a0: 1, c0: COLORS.fire });
  }

  fireSmoke(p) {
    this.glow.spawn({ x: p.x + (Math.random() - 0.5), y: p.y, z: p.z + (Math.random() - 0.5), vx: 0, vy: 2, vz: 0, drag: 1, age: 0, life: 0.5, s0: 1, s1: 0.2, a0: 0.8, c0: COLORS.fire, c1: COLORS.fire2 });
    this.soft.spawn({ x: p.x, y: p.y + 0.5, z: p.z, vx: (Math.random() - 0.5), vy: 2.5, vz: (Math.random() - 0.5), drag: 0.5, age: 0, life: 2.5, s0: 0.8, s1: 3, a0: 0.5, c0: COLORS.smoke });
  }

  heal(p) {
    this.ring(p, 9, 0x5cff7a, 0.7);
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.2;
      this.glow.spawn({
        x: p.x + Math.cos(a) * r, y: p.y + 0.3 + Math.random() * 1.2, z: p.z + Math.sin(a) * r,
        vx: 0, vy: 1.5 + Math.random(), vz: 0, age: 0, life: 0.9, s0: 0.3, s1: 0.1, a0: 1, c0: COLORS.heal,
      });
    }
  }

  sparkle(p, team) {
    this.glow.spawn({
      x: p.x + (Math.random() - 0.5) * 0.8, y: p.y + Math.random() * 1.8, z: p.z + (Math.random() - 0.5) * 0.8,
      vx: 0, vy: 0.8, vz: 0, age: 0, life: 0.5, s0: 0.2, s1: 0.05, a0: 0.9, c0: team === 'red' ? COLORS.red : COLORS.blue,
    });
  }

  dust(p) {
    this.soft.spawn({
      x: p.x + (Math.random() - 0.5), y: p.y + 0.2, z: p.z + (Math.random() - 0.5),
      vx: (Math.random() - 0.5), vy: 0.8, vz: (Math.random() - 0.5), drag: 1.5, age: 0, life: 1, s0: 0.5, s1: 1.8, a0: 0.45, c0: COLORS.dust,
    });
  }

  ring(p, size, color, dur = 0.5) {
    const r = this.rings.find((x) => x.t >= 1) || this.rings[0];
    r.t = 0;
    r.size = size;
    r.dur = dur;
    r.mesh.material.color.setHex(color);
    r.mesh.position.set(p.x, p.y + 0.15, p.z);
    r.mesh.visible = true;
  }

  update(dt, camera) {
    this.soft.mat.uniforms.scale.value = this.glow.mat.uniforms.scale.value = window.innerHeight * 0.9;
    this.soft.update(dt);
    this.glow.update(dt);
    for (const t of this.tracers) {
      if (!t.active) continue;
      t.d += t.speed * dt;
      if (t.d >= t.len) {
        t.active = false;
        t.mesh.visible = false;
        continue;
      }
      const seg = Math.min(t.trail, t.len - t.d, t.d + 1);
      const k = Math.min(1, t.d / t.len);
      t.mesh.position.lerpVectors(t.from, t.to, k);
      t.mesh.scale.set(t.width, t.width, seg);
    }
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.flash.intensity = 0;
    }
    for (const b of this.blasts) {
      if (b.t >= 1) continue;
      b.t += dt / 0.35;
      const s = b.size * (0.4 + b.t * 1.2);
      b.mesh.scale.setScalar(s);
      b.mesh.material.opacity = Math.max(0, 1 - b.t) * 0.7;
      if (b.t >= 1) b.mesh.visible = false;
    }
    for (const r of this.rings) {
      if (r.t >= 1) continue;
      r.t += dt / r.dur;
      r.mesh.scale.setScalar(0.2 + r.size * r.t);
      r.mesh.material.opacity = Math.max(0, 1 - r.t) * 0.8;
      if (r.t >= 1) r.mesh.visible = false;
    }
    this.shake = Math.max(0, this.shake - dt * 2.5);
    void camera;
  }
}
