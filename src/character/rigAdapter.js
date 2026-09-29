import * as THREE from 'three';
import { REQUIRED_BONES, runtimeName } from './rigContract.js';
import { IK_CHANNELS } from './animation.js';

// Adaptateur de squelette de production (étape M2, décision D-015).
// Un squelette Blender standard (A-pose, noms canoniques de rigContract.js) SUIT le squelette de
// gameplay existant (les 16 groupes animés par l'Animator) sans jamais le modifier :
//  - hitboxes, support d'arme, bouche du canon et IK du gameplay restent calculés comme aujourd'hui ;
//  - le squelette de production n'est qu'une peau visuelle.
// Principe :
//  1. calibration une fois, gameplay en pose de repos (rotations nulles) et squelette de production
//     dans sa pose de liaison : pour chaque os suivi, un décalage K tel que rotation_prod = rotation_gameplay × K.
//     Pour les membres, K aligne d'abord la direction de repos du gameplay (bras et jambes vers le bas)
//     sur celle de l'os de production (A-pose), quelle que soit l'orientation locale (roll) de l'os ;
//  2. à chaque image : recopie des rotations (repère du personnage), colonne répartie sur spine/spine1/chest,
//     hauteur du bassin mise à l'échelle des jambes ;
//  3. IK des mains résolue sur les VRAIES longueurs de bras du squelette de production, vers les points
//     de prise de l'arme (ou la main du gameplay quand elle lâche l'arme), coude orienté comme le gameplay.
// Aucun effet sur le gameplay : l'adaptateur ne fait que lire le squelette de gameplay.

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _qr = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _t = new THREE.Vector3();
const _e = new THREE.Vector3();
const _d = new THREE.Vector3();
const _p = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

// Enfant utilisé pour la direction d'un os de membre (production → gameplay)
const LIMB_CHILD = { upperArm: ['lowerArm', 'elbow'], lowerArm: ['hand', 'hand'], hand: [null, null], thigh: ['calf', 'knee'], calf: ['foot', 'ankle'] };

export function findRigNodes(rig) {
  const nodes = new Map();
  rig.traverse((o) => {
    if (!o.isMesh && o.name) nodes.set(runtimeName(o.name), o);
  });
  return nodes;
}

export function missingBones(rig) {
  const nodes = findRigNodes(rig);
  return REQUIRED_BONES.filter((b) => !nodes.has(runtimeName(b.name))).map((b) => b.name);
}

export class RigAdapter {
  // character : Character du jeu (squelette de gameplay) ; rig : racine du squelette de production,
  // enfant direct de character.root. spineWeights : part de la rotation du `spine` du gameplay portée par
  // spine / spine1 / chest ([1, 0, 0] = buste rigide comme le personnage actuel).
  constructor(character, rig, { spineWeights = [1, 0, 0] } = {}) {
    this.char = character;
    this.rig = rig;
    const missing = missingBones(rig);
    if (missing.length) throw new Error(`Squelette de production incomplet, os manquants : ${missing.join(', ')}`);
    const nodes = findRigNodes(rig);
    this.bone = (name) => nodes.get(runtimeName(name));
    const total = spineWeights.reduce((a, b) => a + b, 0);
    let acc = 0;
    this.chainT = spineWeights.map((w) => (acc += w / total));
    this.order = [];
    rig.traverse((o) => {
      if (!o.isMesh) this.order.push(o);
    });
    this.cache = new Map();
    this._charInv = new THREE.Matrix4();
    this.calibrate();
  }

  // Rotation d'un objet dans le repère du personnage (décomposition de la matrice monde)
  charQuat(obj, charInv, out) {
    _mat.multiplyMatrices(charInv, obj.matrixWorld).decompose(_pos, out, _scl);
    return out;
  }

  charPos(obj, charInv, out) {
    return out.setFromMatrixPosition(_mat.multiplyMatrices(charInv, obj.matrixWorld));
  }

  calibrate() {
    const c = this.char;
    const G = c.bones;
    // Gameplay en pose de repos (rotations nulles, bassin à sa hauteur), comme la liaison M1
    const saved = Object.values(G).map((b) => [b, b.quaternion.clone(), b.position.clone()]);
    for (const b of Object.values(G)) b.quaternion.identity();
    G.hips.position.y = c.hipsHeight;
    c.root.updateMatrixWorld(true);
    this.rig.updateMatrixWorld(true);
    const charInv = new THREE.Matrix4().copy(c.root.matrixWorld).invert();

    this.rest = new Map();
    for (const o of this.order) this.rest.set(o, { q: o.quaternion.clone(), p: o.position.clone() });
    const restQ = (o) => this.charQuat(o, charInv, new THREE.Quaternion());
    const restP = (o) => this.charPos(o, charInv, new THREE.Vector3());
    const gP = (name) => this.charPos(G[name], charInv, new THREE.Vector3());

    this.entries = new Map();
    for (const spec of REQUIRED_BONES) {
      const bone = this.bone(spec.name);
      const rq = restQ(bone);
      if (spec.chain !== undefined) {
        this.entries.set(bone, { kind: 'chain', t: this.chainT[spec.chain], K: rq });
        continue;
      }
      if (!spec.gameplay) continue;
      let K;
      if (spec.limb) {
        const base = spec.name.split('.')[0];
        const sd = spec.side;
        const [rigChild, gChild] = LIMB_CHILD[base];
        // direction de repos du gameplay : vers l'articulation enfant (la main prolonge l'avant-bras)
        const gName = spec.gameplay;
        const Dg = base === 'hand' ? gP(gName).sub(gP('elbow' + sd)).normalize() : gP(gChild + sd).sub(gP(gName)).normalize();
        // direction de repos de l'os de production : vers l'os enfant, ou axe +Y local (convention Blender)
        let Dr;
        const fingers = this.bone(`fingers1.${sd}`) || this.bone(`index1.${sd}`);
        if (rigChild) Dr = restP(this.bone(`${rigChild}.${sd}`)).sub(restP(bone)).normalize();
        else if (fingers) Dr = restP(fingers).sub(restP(bone)).normalize();
        else Dr = Y.clone().applyQuaternion(rq).normalize();
        const A = new THREE.Quaternion().setFromUnitVectors(Dg, Dr);
        K = A.invert().multiply(rq);
      } else {
        K = this.charQuat(G[spec.gameplay], charInv, new THREE.Quaternion()).invert().multiply(rq);
      }
      this.entries.set(bone, { kind: 'map', g: G[spec.gameplay], K });
    }

    // Proportions : jambes (hauteur du bassin), bras (IK)
    const len = (a, b) => restP(this.bone(a)).distanceTo(restP(this.bone(b)));
    const legRig = len('thigh.L', 'calf.L') + len('calf.L', 'foot.L');
    const legGame = gP('legL').distanceTo(gP('kneeL')) + gP('kneeL').distanceTo(gP('ankleL'));
    this.legRatio = legRig / legGame;
    this.hips = this.bone('hips');
    this.arms = {};
    for (const sd of ['L', 'R']) {
      this.arms[sd] = {
        upper: this.bone(`upperArm.${sd}`),
        lower: this.bone(`lowerArm.${sd}`),
        hand: this.bone(`hand.${sd}`),
        a: len(`upperArm.${sd}`, `lowerArm.${sd}`),
        b: len(`lowerArm.${sd}`, `hand.${sd}`),
      };
    }
    this.proportions = { legRatio: this.legRatio, armL: this.arms.L.a + this.arms.L.b, armR: this.arms.R.a + this.arms.R.b };

    for (const [b, q, p] of saved) {
      b.quaternion.copy(q);
      b.position.copy(p);
    }
    c.root.updateMatrixWorld(true);
  }

  // À appeler après Character.update() et la mise à jour des matrices du personnage
  update() {
    const c = this.char;
    const G = c.bones;
    const charInv = this._charInv.copy(c.root.matrixWorld).invert();
    const gq = new Map();
    const gameQ = (g) => {
      let q = gq.get(g);
      if (!q) gq.set(g, (q = this.charQuat(g, charInv, new THREE.Quaternion())));
      return q;
    };
    const cache = this.cache;
    cache.clear();
    for (const o of this.order) {
      const parentQ = o === this.rig ? null : cache.get(o.parent);
      const e = this.entries.get(o);
      let target = null;
      if (e?.kind === 'map') target = _q.copy(gameQ(e.g)).multiply(e.K);
      else if (e?.kind === 'chain') target = _q.copy(gameQ(G.hips)).slerp(gameQ(G.spine), e.t).multiply(e.K);
      if (target && parentQ) {
        o.quaternion.copy(parentQ).invert().multiply(target);
        cache.set(o, target.clone());
      } else {
        cache.set(o, parentQ ? parentQ.clone().multiply(o.quaternion) : o.quaternion.clone());
      }
      if (o === this.hips) {
        // bassin : même mouvement vertical que le gameplay, à l'échelle des jambes de production
        const dy = (G.hips.position.y - c.hipsHeight) * this.legRatio;
        _v.set(0, dy, 0).applyQuaternion(_q2.copy(parentQ).invert());
        o.position.copy(this.rest.get(o).p).add(_v);
      }
    }
    this.rig.updateMatrixWorld(true);
    const w = c.weapon;
    if (c.anim.mode === 'combat' && w && w.group.visible) {
      this.solveArm('L');
      this.solveArm('R');
    }
  }

  solveArm(sd) {
    const c = this.char;
    const cur = c.animator.cur;
    const weight = cur[sd === 'L' ? IK_CHANNELS.left : IK_CHANNELS.right];
    if (weight < 0.01) return;
    const arm = this.arms[sd];
    const w = c.weapon;
    // cible : point de prise de l'arme quand le gameplay tient l'arme, sinon la main du gameplay
    // (matrices déjà à jour : pas de recalcul des parents)
    if (weight >= 0.999) {
      if (sd === 'R') _t.copy(w.rightWrist);
      else {
        const o = IK_CHANNELS.leftOffset;
        _t.set(w.leftWrist.x + cur[o], w.leftWrist.y + cur[o + 1], w.leftWrist.z + cur[o + 2]);
      }
      _t.applyMatrix4(w.group.matrixWorld);
    } else _t.setFromMatrixPosition(c.bones['hand' + sd].matrixWorld);
    _s.setFromMatrixPosition(arm.upper.matrixWorld);
    const { a, b } = arm;
    _d.subVectors(_t, _s);
    // arme tenue : mêmes bornes que l'IK du gameplay (solveTwoBone) ; transition (cible = main du gameplay,
    // toujours atteignable à proportions égales) : bornes exactes, sans marge qui plierait un bras presque tendu
    const held = weight >= 0.999;
    const dist = Math.min(Math.max(_d.length(), Math.abs(a - b) + (held ? 1e-3 : 1e-6)), a + b - (held ? 1e-4 : 0));
    _d.normalize();
    // plan du coude : celui du bras du gameplay
    _p.setFromMatrixPosition(c.bones['elbow' + sd].matrixWorld).sub(_a.setFromMatrixPosition(c.bones['shoulder' + sd].matrixWorld));
    _p.addScaledVector(_d, -_p.dot(_d));
    if (_p.lengthSq() < 1e-8) _p.set(0, -1, 0).addScaledVector(_d, -_d.y);
    _p.normalize();
    const cosA = Math.min(1, Math.max(-1, (a * a + dist * dist - b * b) / (2 * a * dist)));
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    _e.copy(_s).addScaledVector(_d, a * cosA).addScaledVector(_p, a * sinA);
    _t.copy(_s).addScaledVector(_d, dist);
    // bras : tourner vers le coude, puis l'avant-bras vers la cible
    this.aim(arm.upper, arm.lower, _e);
    this.aim(arm.lower, arm.hand, _t);
    // main : orientation recopiée du gameplay (déjà alignée sur l'arme par l'IK du gameplay)
    const target = this.cache.get(arm.hand);
    arm.hand.parent.matrixWorld.decompose(_pos, _q2, _scl);
    c.root.matrixWorld.decompose(_pos, _q, _scl);
    arm.hand.quaternion.copy(_q2.invert()).multiply(_q.multiply(target));
    arm.hand.updateMatrixWorld(true);
  }

  // Fait pivoter `bone` pour que son enfant `child` vise `point` (plus petite rotation : le roll est conservé)
  aim(bone, child, point) {
    _a.setFromMatrixPosition(bone.matrixWorld);
    const from = _b.setFromMatrixPosition(child.matrixWorld).sub(_a).normalize();
    const to = _v.subVectors(point, _a).normalize();
    _qr.setFromUnitVectors(from, to);
    bone.matrixWorld.decompose(_pos, _q, _scl);
    bone.parent.matrixWorld.decompose(_pos, _q2, _scl);
    bone.quaternion.copy(_q2.invert()).multiply(_qr.multiply(_q));
    bone.updateMatrixWorld(true);
  }
}
