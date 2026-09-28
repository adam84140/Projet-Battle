import * as THREE from 'three';

// Animation 100 % procédurale : chaque pose est calculée à partir de l'état
// du soldat (vitesse, accroupi, visée, rechargement...), puis lissée.
// Les bras utilisent une cinématique inverse à deux segments pour que les
// mains restent sur la poignée et le garde-main de l'arme.

export const JOINTS = [
  'hips', 'spine', 'neck', 'head',
  'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR',
  'legL', 'legR', 'kneeL', 'kneeR', 'ankleL', 'ankleR',
];
const JI = Object.fromEntries(JOINTS.map((j, i) => [j, i * 3]));
const O_HIPSY = JOINTS.length * 3;
const O_WM = O_HIPSY + 1; // position (3) + rotation (3) du support d'arme
const O_IKL = O_WM + 6;
const O_IKR = O_IKL + 1;
const O_LH = O_IKR + 1; // décalage du poignet gauche (repère de l'arme)
const N = O_LH + 3;

export const UPPER_ARM = 0.3;
export const FOREARM = 0.28;

// Tenues de l'arme dans le repère du buste (droite du personnage = -X)
const HOLDS = {
  ready: { p: [-0.1, 0.25, 0.22], r: [0.02, 0.28, 0], twist: -0.28 },
  aim: { p: [-0.12, 0.35, 0.25], r: [0, 0.3, 0], twist: -0.3 },
  sprint: { p: [-0.02, 0.2, 0.2], r: [-0.45, 1.05, 0.25], twist: 0.05 },
  relaxed: { p: [-0.03, 0.17, 0.2], r: [-0.3, 0.95, 0.3], twist: -0.12 },
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

export function defaultAnimState() {
  return {
    mode: 'combat', // combat | apose | sit | dead
    hold: null, // force une tenue (ex. 'relaxed' pour le menu)
    speed: 0,
    moveAngle: 0,
    crouch: false,
    sprint: false,
    aim: false,
    grounded: true,
    vy: 0,
    pitch: 0,
    recoil: 0,
    reload: -1,
    action: null,
    actionT: 0,
    deadT: 0,
    deadDir: 1,
  };
}

const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _qe = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _mw = new THREE.Matrix4();
const _basis = new THREE.Matrix4();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _d = new THREE.Vector3();
const _p = new THREE.Vector3();
const _u = new THREE.Vector3();
const _w = new THREE.Vector3();
const _f = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const HAND_ROT = new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.PI / 2);

// Résout un bras à deux segments. Renvoie l'angle du coude et écrit
// l'orientation de l'épaule (repère parent) dans outQ.
function solveTwoBone(S, T, pole, a, b, outQ) {
  _d.subVectors(T, S);
  let dist = _d.length();
  dist = Math.min(Math.max(dist, Math.abs(a - b) + 1e-3), a + b - 1e-4);
  const dn = _d.normalize();
  const cosA = (a * a + dist * dist - b * b) / (2 * a * dist);
  const alpha = Math.acos(Math.min(1, Math.max(-1, cosA)));
  _p.copy(pole).addScaledVector(dn, -pole.dot(dn));
  if (_p.lengthSq() < 1e-8) _p.set(0, -1, 0).addScaledVector(dn, dn.y);
  _p.normalize();
  _u.copy(dn).multiplyScalar(Math.cos(alpha)).addScaledVector(_p, Math.sin(alpha)).normalize();
  // direction de l'avant-bras
  _f.copy(dn).multiplyScalar(dist).addScaledVector(_u, -a).normalize();
  _w.copy(_f).addScaledVector(_u, -_f.dot(_u));
  if (_w.lengthSq() < 1e-8) _w.copy(_p).negate();
  _w.normalize();
  _y.copy(_u).negate();
  _z.copy(_w).negate();
  _x.crossVectors(_y, _z);
  _basis.makeBasis(_x, _y, _z);
  outQ.setFromRotationMatrix(_basis);
  return Math.acos(Math.min(1, Math.max(-1, _u.dot(_f))));
}

export class Animator {
  constructor(character) {
    this.char = character;
    this.cur = new Float32Array(N);
    this.tgt = new Float32Array(N);
    this.state = defaultAnimState();
    this.phase = 0;
    this.time = Math.random() * 10;
    this.first = true;
    this.poles = {
      L: new THREE.Vector3(0.6, -1, -0.5),
      R: new THREE.Vector3(-0.9, -1, -0.6),
    };
  }

  update(dt, snap = false) {
    const s = this.state;
    this.time += dt;
    const backward = Math.abs(s.moveAngle) > 1.75;
    if (s.speed > 0.2) {
      const freq = s.crouch ? 1.1 : 0.75 + s.speed * 0.2;
      this.phase += dt * freq * Math.PI * 2 * (backward ? -1 : 1);
    } else {
      // retour doux vers une position de repos du cycle
      this.phase = lerp(this.phase, Math.round(this.phase / Math.PI) * Math.PI, 1 - Math.exp(-dt * 6));
    }
    this.computeTarget(backward);
    const k = snap || this.first ? 1 : 1 - Math.exp(-dt * 16);
    this.first = false;
    const c = this.cur, t = this.tgt;
    for (let i = 0; i < N; i++) c[i] += (t[i] - c[i]) * k;
    this.apply();
  }

  // Pose figée (fiche personnage) : on simule quelques instants pour stabiliser le lissage
  setStatic(fn) {
    fn(this.state, this);
    for (let i = 0; i < 40; i++) this.update(1 / 60);
    this.update(0, true);
  }

  set(j, x, y, z) {
    const o = JI[j];
    this.tgt[o] = x;
    this.tgt[o + 1] = y;
    this.tgt[o + 2] = z;
  }

  add(j, x, y, z) {
    const o = JI[j];
    this.tgt[o] += x;
    this.tgt[o + 1] += y;
    this.tgt[o + 2] += z;
  }

  computeTarget(backward) {
    const t = this.tgt;
    t.fill(0);
    const s = this.state;
    if (s.mode === 'apose') return this.poseA();
    if (s.mode === 'stand') return this.poseStand();
    if (s.mode === 'sit') return this.poseSit();
    if (s.mode === 'dead') return this.poseDead();
    this.locomotion(backward);
    this.upperBody();
  }

  poseA() {
    this.set('legL', 0, 0, 0.07);
    this.set('legR', 0, 0, -0.07);
    this.set('ankleL', 0, 0, -0.07);
    this.set('ankleR', 0, 0, 0.07);
    this.set('shoulderL', 0, 0, 0.72);
    this.set('shoulderR', 0, 0, -0.72);
    this.set('elbowL', -0.12, 0, 0);
    this.set('elbowR', -0.12, 0, 0);
    this.set('handL', 0, 0, 0.1);
    this.set('handR', 0, 0, -0.1);
    this.set('spine', Math.sin(this.time * 1.5) * 0.01, 0, 0);
  }

  // Debout, bras le long du corps (vues de référence)
  poseStand() {
    this.set('legL', 0, 0, 0.05);
    this.set('legR', 0, 0, -0.05);
    this.set('ankleL', 0, 0, -0.05);
    this.set('ankleR', 0, 0, 0.05);
    this.set('shoulderL', 0.05, 0, 0.2);
    this.set('shoulderR', 0.05, 0, -0.2);
    this.set('elbowL', -0.22, 0, 0);
    this.set('elbowR', -0.22, 0, 0);
    this.set('handL', 0, 0.2, 0.05);
    this.set('handR', 0, -0.2, -0.05);
  }

  poseSit() {
    const t = this.tgt;
    t[O_HIPSY] = -0.42;
    this.set('legL', -1.45, 0, 0.08);
    this.set('legR', -1.45, 0, -0.08);
    this.set('kneeL', 1.4, 0, 0);
    this.set('kneeR', 1.4, 0, 0);
    this.set('ankleL', 0.05, 0, 0);
    this.set('ankleR', 0.05, 0, 0);
    this.set('spine', -0.08, 0, 0);
    this.set('shoulderL', -1.05, 0, 0.18);
    this.set('shoulderR', -1.05, 0, -0.18);
    this.set('elbowL', -0.7, 0, 0);
    this.set('elbowR', -0.7, 0, 0);
    this.set('neck', -this.state.pitch * 0.4, 0, 0);
  }

  poseDead() {
    const s = this.state;
    const f = smooth(0, 0.7, s.deadT);
    const dir = s.deadDir;
    const t = this.tgt;
    t[O_HIPSY] = -0.8 * f;
    this.set('hips', -1.48 * f * dir, 0, 0.1 * f);
    this.set('legL', -0.25 * f, 0, 0.25 * f);
    this.set('legR', 0.1 * f, 0, -0.2 * f);
    this.set('kneeL', 0.5 * f, 0, 0);
    this.set('kneeR', 0.2 * f, 0, 0);
    this.set('shoulderL', -0.4 * f, 0, 1.3 * f);
    this.set('shoulderR', -0.6 * f, 0, -1.1 * f);
    this.set('elbowL', -0.5 * f, 0, 0);
    this.set('elbowR', -0.3 * f, 0, 0);
    this.set('neck', 0.35 * f * dir, 0.4 * f, 0);
  }

  locomotion(backward) {
    const s = this.state;
    const t = this.tgt;
    const ph = this.phase;
    if (!s.grounded) {
      const rising = s.vy > 0 ? 1 : 0;
      this.set('legL', -0.8, 0, 0.05);
      this.set('kneeL', 1.3, 0, 0);
      this.set('ankleL', 0.3, 0, 0);
      this.set('legR', lerp(0.1, -0.3, rising), 0, -0.05);
      this.set('kneeR', lerp(0.4, 0.9, rising), 0, 0);
      this.set('ankleR', 0.2, 0, 0);
      t[O_HIPSY] = 0.02;
      this.set('spine', 0.08, 0, 0);
      return;
    }
    let hipYaw = 0;
    if (s.speed > 0.3) {
      let a = s.moveAngle;
      if (backward) a = a - Math.PI * Math.sign(a);
      hipYaw = Math.max(-0.9, Math.min(0.9, a)) * 0.75;
    }
    const spd = s.speed;
    if (s.crouch) {
      const amp = spd > 0.3 ? 0.35 : 0;
      t[O_HIPSY] = -0.36;
      this.set('legL', -1.2 - Math.sin(ph) * amp, 0, 0.12);
      this.set('legR', -0.55 + Math.sin(ph) * amp, 0, -0.1);
      this.set('kneeL', 1.9 + Math.max(0, Math.cos(ph)) * amp, 0, 0);
      this.set('kneeR', 2.25 + Math.max(0, -Math.cos(ph)) * amp, 0, 0);
      this.set('ankleL', -0.6, 0, 0);
      this.set('ankleR', -0.75, 0, 0);
      this.set('hips', 0.05, hipYaw, 0);
      this.set('spine', 0.22, 0, 0);
      return;
    }
    if (spd < 0.3) {
      // Repos : léger déhanché + respiration
      const br = Math.sin(this.time * 1.7);
      t[O_HIPSY] = -0.01 + br * 0.004;
      this.set('legL', -0.04, 0.05, 0.07);
      this.set('legR', 0.05, -0.12, -0.08);
      this.set('kneeL', 0.08, 0, 0);
      this.set('kneeR', 0.1, 0, 0);
      this.set('ankleL', -0.04, 0, -0.07);
      this.set('ankleR', -0.05, 0, 0.08);
      this.set('hips', 0, 0.05, 0.02);
      this.set('spine', br * 0.012, 0, -0.02);
      return;
    }
    const amp = Math.min(0.95, 0.3 + spd * 0.1);
    const sL = Math.sin(ph);
    const cL = Math.cos(ph);
    const thighL = -sL * amp;
    const thighR = sL * amp;
    const kneeL = 0.12 + Math.max(0, cL) * amp * 1.55;
    const kneeR = 0.12 + Math.max(0, -cL) * amp * 1.55;
    this.set('legL', thighL, 0, 0.03);
    this.set('legR', thighR, 0, -0.03);
    this.set('kneeL', kneeL, 0, 0);
    this.set('kneeR', kneeR, 0, 0);
    this.set('ankleL', -(thighL + kneeL) * 0.55 + 0.1, 0, 0);
    this.set('ankleR', -(thighR + kneeR) * 0.55 + 0.1, 0, 0);
    t[O_HIPSY] = 0.035 * amp * Math.cos(2 * ph) - 0.04 * amp;
    this.set('hips', 0.04 * amp, hipYaw + 0.12 * sL * amp, 0);
    this.set('spine', spd * 0.022, -0.12 * sL * amp, 0.02 * Math.cos(2 * ph));
  }

  upperBody() {
    const s = this.state;
    const t = this.tgt;
    const holdName = s.hold || (s.sprint && s.speed > 1 && !s.aim ? 'sprint' : s.aim ? 'aim' : 'ready');
    const hold = HOLDS[holdName];
    const hipYaw = t[JI.hips + 1];
    // Buste de trois-quarts (épaule gauche en avant) et tête qui regarde droit devant
    this.add('spine', -s.pitch * 0.3, hold.twist - hipYaw, 0);
    this.set('neck', -s.pitch * 0.35, -hold.twist * 0.85, 0);
    this.set('head', -s.pitch * 0.15, 0, s.aim ? -0.12 : 0);
    const bob = s.speed > 0.3 && s.grounded ? Math.sin(this.phase * 2) * 0.008 * Math.min(1, s.speed / 4) : 0;
    t[O_WM] = hold.p[0];
    t[O_WM + 1] = hold.p[1] + bob + (s.aim ? s.pitch * 0.06 : 0);
    t[O_WM + 2] = hold.p[2];
    t[O_WM + 3] = hold.r[0] - (holdName === 'sprint' || holdName === 'relaxed' ? 0 : s.pitch * 0.7);
    t[O_WM + 4] = hold.r[1];
    t[O_WM + 5] = hold.r[2];
    t[O_IKL] = 1;
    t[O_IKR] = 1;

    // Rechargement : on bascule l'arme et la main gauche va chercher un chargeur
    if (s.reload >= 0) {
      const r = s.reload;
      const env = smooth(0, 0.15, r) * (1 - smooth(0.85, 1, r));
      t[O_WM + 5] += 0.55 * env;
      t[O_WM + 3] += -0.25 * env;
      t[O_WM + 1] += -0.03 * env;
      const toMag = smooth(0.05, 0.22, r) * (1 - smooth(0.82, 0.96, r));
      const toPouch = smooth(0.3, 0.42, r) * (1 - smooth(0.52, 0.66, r));
      const w = this.char.weapon;
      if (w) {
        t[O_LH] = (w.magWrist.x - w.leftWrist.x) * toMag + 0.1 * toPouch;
        t[O_LH + 1] = (w.magWrist.y - w.leftWrist.y) * toMag - 0.22 * toPouch;
        t[O_LH + 2] = (w.magWrist.z - w.leftWrist.z) * toMag - 0.12 * toPouch;
      }
      this.add('neck', 0.25 * env, 0, 0);
    }

    // Actions ponctuelles
    if (s.action === 'throw') {
      const a = s.actionT;
      t[O_IKR] = a < 0.8 ? 0 : smooth(0.8, 1, a);
      const wind = smooth(0, 0.35, a);
      const thr = smooth(0.35, 0.6, a);
      this.set('shoulderR', lerp(lerp(-0.4, -3.3, wind), -1.3, thr), 0, lerp(-0.3, -0.1, thr));
      this.set('elbowR', lerp(lerp(-0.4, -1.7, wind), -0.15, thr), 0, 0);
      this.add('spine', 0.25 * thr, -0.3 * wind + 0.5 * thr, 0);
      t[O_WM + 1] -= 0.08;
    } else if (s.action === 'knife') {
      const a = s.actionT;
      t[O_IKR] = a < 0.85 ? 0 : smooth(0.85, 1, a);
      const stab = smooth(0, 0.25, a) * (1 - smooth(0.55, 0.85, a));
      this.set('shoulderR', lerp(-0.6, -1.55, stab), 0, lerp(-0.25, -0.05, stab));
      this.set('elbowR', lerp(-1.9, -0.15, stab), 0, 0);
      this.set('handR', lerp(0, -0.4, stab), 0, 0);
      this.add('spine', 0.2 * stab, 0.35 * stab, 0);
      t[O_WM + 1] -= 0.06;
    } else if (s.action === 'heal') {
      const a = s.actionT;
      const up = smooth(0, 0.3, a) * (1 - smooth(0.7, 1, a));
      t[O_IKL] = 1 - up;
      this.set('shoulderL', -1.6 * up, 0, 0.3 * up);
      this.set('elbowL', -0.3 * up, 0, 0);
    }
  }

  apply() {
    const c = this.cur;
    const B = this.char.bones;
    for (let j = 0; j < JOINTS.length; j++) {
      const o = j * 3;
      B[JOINTS[j]].rotation.set(c[o], c[o + 1], c[o + 2]);
    }
    B.hips.position.y = this.char.hipsHeight + c[O_HIPSY];
    const wm = this.char.weaponMount;
    const w = this.char.weapon;
    const s = this.state;
    const rc = s.recoil;
    wm.position.set(c[O_WM], c[O_WM + 1] + rc * 0.01, c[O_WM + 2] - rc * 0.07);
    wm.rotation.set(c[O_WM + 3] - rc * 0.12, c[O_WM + 4], c[O_WM + 5]);
    if (!w || !w.group.visible || s.mode !== 'combat') return;
    this.solveArm('L', c[O_IKL], _v1.copy(w.leftWrist).set(w.leftWrist.x + c[O_LH], w.leftWrist.y + c[O_LH + 1], w.leftWrist.z + c[O_LH + 2]));
    this.solveArm('R', c[O_IKR], _v2.copy(w.rightWrist));
  }

  solveArm(side, weight, wristInWeapon) {
    if (weight < 0.01) return;
    const B = this.char.bones;
    const sh = B['shoulder' + side];
    const el = B['elbow' + side];
    const hand = B['hand' + side];
    const wm = this.char.weaponMount;
    const wg = this.char.weapon.group;
    wm.updateMatrix();
    wg.updateMatrix();
    _m.multiplyMatrices(wm.matrix, wg.matrix); // arme -> buste
    const target = wristInWeapon.applyMatrix4(_m);
    const bend = solveTwoBone(sh.position, target, this.poles[side], UPPER_ARM, FOREARM, _q1);
    _qe.setFromAxisAngle(X_AXIS, bend);
    // orientation désirée de la main = orientation de l'arme
    _m.decompose(_pos, _q2, _scl);
    _q2.multiply(HAND_ROT);
    _q3.copy(_q1).multiply(_qe).invert().multiply(_q2);
    if (weight >= 0.999) {
      sh.quaternion.copy(_q1);
      el.quaternion.copy(_qe);
      hand.quaternion.copy(_q3);
    } else {
      sh.quaternion.slerp(_q1, weight);
      el.quaternion.slerp(_qe, weight);
      hand.quaternion.slerp(_q3, weight);
    }
  }
}

export { HOLDS };
