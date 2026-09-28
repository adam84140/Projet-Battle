import * as THREE from 'three';
import { TEAMS, CLASSES, DEFAULT_CUSTOM } from '../config.js';
import { part, rbox, cyl, capsule, box, SPHERE, shade, bakeHierarchy, bakedMaterial, setDetail } from './parts.js';
import { emblemGeometry } from './emblems.js';
import { Face } from './face.js';
import { buildWeapon, buildKnife } from './weapons.js';
import { buildBackpack, buildGlasses, buildBandana, buildCap, buildGrenade, buildCanteen } from './accessories.js';
import { Animator, UPPER_ARM, FOREARM } from './animation.js';

const LEATHER = 0x6b4a2e;
const LEATHER_DARK = 0x4a3322;
const GLOVE = 0x1f2124;
const BOOT = 0x6b4a2e;
const SOLE = 0x2a1f18;

// Héros stylisé construit entièrement en code (≈ 1,85 m).
// Le personnage regarde vers +Z ; sa droite est donc du côté -X.
export class Character {
  constructor({ team = 'blue', classId = 'assaut', custom = {}, weapon = true, bake = false, expression = 'determine' } = {}) {
    this.teamId = team;
    this.team = TEAMS[team];
    this.cls = CLASSES[classId];
    this.custom = { ...DEFAULT_CUSTOM, ...custom };
    this.root = new THREE.Group();
    this.root.name = 'character';
    this.bones = {};
    this.hipsHeight = 0.95;
    this.weapon = null;
    this.accessories = {};
    // Les soldats en jeu (fusionnés) utilisent une géométrie allégée
    const prevDetail = setDetail(bake ? 'low' : 'high');
    try {
      this.build();
      this.face.setExpression(expression);
      if (weapon) this.setWeapon(this.cls.weapon);
    } finally {
      setDetail(prevDetail);
    }
    this.animator = new Animator(this);
    this.animator.update(0, true);
    this.baked = false;
    if (bake) this.bake();
  }

  bone(name, parent, x, y, z) {
    const g = new THREE.Group();
    g.name = name;
    g.userData.bone = true;
    g.position.set(x, y, z);
    parent.add(g);
    this.bones[name] = g;
    return g;
  }

  build() {
    const T = this.team;
    const C = this.custom;
    const b = this.cls.look.build;
    const skin = C.skin;
    const hips = this.bone('hips', this.root, 0, this.hipsHeight, 0);

    // ---------- Bassin / ceinture ----------
    part(hips, rbox(0.34 * b, 0.2, 0.24, 0.07), T.pants, { p: [0, -0.03, 0] });
    part(hips, rbox(0.36 * b, 0.055, 0.255, 0.02), LEATHER_DARK, { p: [0, 0.05, 0] });
    part(hips, rbox(0.065, 0.045, 0.02, 0.006), 0xb8a070, { p: [0, 0.05, 0.13], metal: 0.6, rough: 0.35 });
    for (const sd of [1, -1]) {
      part(hips, rbox(0.075, 0.085, 0.05, 0.015), LEATHER, { p: [0.11 * sd * b, 0.025, 0.125] });
      part(hips, rbox(0.08, 0.03, 0.056, 0.01), shade(LEATHER, 0.85), { p: [0.11 * sd * b, 0.06, 0.127] });
      part(hips, rbox(0.05, 0.09, 0.075, 0.015), LEATHER, { p: [0.185 * sd * b, 0.02, 0.03] });
    }
    const canteen = buildCanteen();
    canteen.scale.setScalar(0.8);
    canteen.position.set(0.14 * b, -0.02, -0.14);
    hips.add(canteen);

    // ---------- Jambes ----------
    for (const sd of [1, -1]) {
      const s = sd === 1 ? 'L' : 'R';
      const leg = this.bone('leg' + s, hips, 0.1 * sd * b, -0.04, 0);
      part(leg, capsule(0.1 * Math.sqrt(b), 0.24), T.pants, { p: [0, -0.2, 0] });
      part(leg, rbox(0.05, 0.12, 0.11, 0.018), shade(T.pants, 0.9), { p: [0.095 * sd, -0.23, 0.005] });
      part(leg, rbox(0.054, 0.03, 0.115, 0.01), shade(T.pants, 0.82), { p: [0.097 * sd, -0.17, 0.005] });
      if (sd === -1) {
        // Holster sur la cuisse droite
        part(leg, rbox(0.05, 0.14, 0.09, 0.02), LEATHER_DARK, { p: [-0.1, -0.13, 0.02] });
        part(leg, rbox(0.035, 0.06, 0.03, 0.01), GLOVE, { p: [-0.1, -0.04, 0.035], r: [0.3, 0, 0] });
        part(leg, box(0.2, 0.02, 0.2), LEATHER_DARK, { p: [0, -0.2, 0] });
      }
      const knee = this.bone('knee' + s, leg, 0, -0.42, 0);
      part(knee, capsule(0.085 * Math.sqrt(b), 0.24), T.pants, { p: [0, -0.19, 0] });
      part(knee, rbox(0.11, 0.13, 0.06, 0.025), 0x2c2e30, { p: [0, -0.02, 0.078] });
      part(knee, box(0.18, 0.018, 0.17), 0x1f2124, { p: [0, -0.02, 0] });
      const ankle = this.bone('ankle' + s, knee, 0, -0.39, 0);
      part(ankle, cyl(0.08, 0.083, 0.17, 16), BOOT, { p: [0, 0.04, -0.005] });
      part(ankle, cyl(0.085, 0.085, 0.025, 16), shade(BOOT, 0.8), { p: [0, 0.12, -0.005] });
      part(ankle, rbox(0.125, 0.085, 0.26, 0.038), BOOT, { p: [0, -0.04, 0.05] });
      part(ankle, rbox(0.135, 0.03, 0.28, 0.012), SOLE, { p: [0, -0.078, 0.05] });
      for (let i = 0; i < 3; i++) part(ankle, box(0.06, 0.008, 0.012), 0x3a2a1e, { p: [0, 0.0 + i * 0.035, 0.078 - i * 0.004], r: [-0.3, 0, 0] });
    }

    // ---------- Buste ----------
    const spine = this.bone('spine', hips, 0, 0.06, 0);
    part(spine, cyl(0.245 * b, 0.185 * b, 0.44, 18), T.shirt, { p: [0, 0.22, 0], s: [1, 1, 0.62] });
    part(spine, SPHERE, T.shirt, { p: [0, 0.43, 0], s: [0.25 * b, 0.075, 0.155] });
    // Gilet tactique
    part(spine, cyl(0.258 * b, 0.203 * b, 0.3, 18), T.vest, { p: [0, 0.255, 0], s: [1, 1, 0.72] });
    for (const sd of [1, -1]) {
      part(spine, rbox(0.085, 0.05, 0.36, 0.02), T.vest, { p: [0.14 * sd * b, 0.425, 0] });
      // sangles cuir façon harnais
      part(spine, box(0.045, 0.3, 0.016), LEATHER, { p: [0.105 * sd * b, 0.29, 0.182], r: [-0.12, 0, -0.1 * sd] });
      part(spine, box(0.045, 0.3, 0.016), LEATHER, { p: [0.105 * sd * b, 0.29, -0.182], r: [0.12, 0, -0.1 * sd] });
      part(spine, box(0.05, 0.025, 0.02), 0xb8a070, { p: [0.11 * sd * b, 0.21, 0.19], metal: 0.6, rough: 0.35 });
    }
    // Poches à chargeurs
    for (let i = -1; i <= 1; i++) {
      part(spine, rbox(0.075, 0.095, 0.05, 0.015), 0x2a2c30, { p: [i * 0.085 * b, 0.16, 0.16] });
      part(spine, rbox(0.078, 0.03, 0.055, 0.01), LEATHER, { p: [i * 0.085 * b, 0.205, 0.162] });
    }
    // Col de chemise + t-shirt noir
    for (const sd of [1, -1]) {
      part(spine, rbox(0.12, 0.05, 0.09, 0.018), T.shirt, { p: [0.055 * sd, 0.475, 0.06], r: [0.35, 0.45 * sd, 0.25 * sd] });
    }
    part(spine, rbox(0.1, 0.07, 0.03, 0.012), 0x1d1f22, { p: [0, 0.45, 0.11], r: [0.2, 0, 0] });
    // Emblèmes (poitrine et dos)
    part(spine, emblemGeometry(T.emblem), 0xffffff, { p: [0, 0.335, 0.187], s: 0.072, r: [-0.05, 0, 0], shadow: false });
    part(spine, emblemGeometry(T.emblem), 0xffffff, { p: [0, 0.3, -0.188], s: 0.1, r: [0.05, Math.PI, 0], shadow: false });
    // Grenades sur le gilet
    if (this.cls.id === 'assaut') {
      for (let i = 0; i < 2; i++) {
        const g = buildGrenade();
        g.scale.setScalar(0.85);
        g.position.set(0.19 * b, 0.25 - i * 0.075, 0.1);
        spine.add(g);
      }
    }
    if (this.cls.id === 'artilleur') {
      // Bandoulière de munitions
      const ang = 0.62;
      const dx = -Math.sin(ang);
      const dy = Math.cos(ang);
      part(spine, box(0.055, 0.5, 0.02), 0x3b3a2a, { p: [0, 0.27, 0.195], r: [0, 0, ang] });
      for (let i = 0; i < 8; i++) {
        const a = -0.2 + i * 0.057;
        part(spine, cyl(0.009, 0.009, 0.05, 6), 0xc9a13a, {
          p: [a * dx, 0.27 + a * dy, 0.207],
          r: [0, 0, ang + Math.PI / 2],
          metal: 0.7,
          rough: 0.3,
        });
      }
    }

    // ---------- Bras ----------
    for (const sd of [1, -1]) {
      const s = sd === 1 ? 'L' : 'R';
      const sh = this.bone('shoulder' + s, spine, 0.25 * sd * b, 0.42, 0);
      part(sh, SPHERE, T.shirt, { p: [0.012 * sd, -0.02, 0], s: [0.098 * b, 0.1, 0.105] });
      part(sh, capsule(0.08 * Math.sqrt(b), 0.1), T.shirt, { p: [0, -0.1, 0] });
      part(sh, cyl(0.086 * Math.sqrt(b), 0.088 * Math.sqrt(b), 0.065, 16), T.cuff, { p: [0, -0.18, 0] });
      part(sh, capsule(0.064 * Math.sqrt(b), 0.1), skin, { p: [0, -0.235, 0] });
      if (sd === 1) part(sh, emblemGeometry(T.emblem), 0xffffff, { p: [0.083 * Math.sqrt(b), -0.09, 0], s: 0.042, r: [0, Math.PI / 2, 0], shadow: false });
      const el = this.bone('elbow' + s, sh, 0, -UPPER_ARM, 0);
      part(el, capsule(0.058 * Math.sqrt(b), 0.17), skin, { p: [0, -0.12, 0] });
      part(el, SPHERE, skin, { p: [0, -0.07, 0.005], s: [0.064 * Math.sqrt(b), 0.08, 0.062] });
      part(el, cyl(0.05, 0.053, 0.04, 12), GLOVE, { p: [0, -0.255, 0] });
      const hand = this.bone('hand' + s, el, 0, -FOREARM, 0);
      part(hand, rbox(0.085, 0.085, 0.08, 0.03), GLOVE, { p: [0, -0.045, 0.005] });
      part(hand, rbox(0.08, 0.035, 0.07, 0.014), skin, { p: [0, -0.095, 0.01] });
      part(hand, capsule(0.017, 0.035), skin, { p: [-0.045 * sd, -0.06, 0.03], r: [0.4, 0, 0.5 * sd] });
    }

    // ---------- Cou / tête ----------
    const neck = this.bone('neck', spine, 0, 0.47, 0.005);
    part(neck, cyl(0.06, 0.066, 0.13, 14), skin, { p: [0, 0.04, 0] });
    const head = this.bone('head', neck, 0, 0.08, 0.012);
    this.face = new Face(head, {
      skin,
      hair: C.hair,
      eyes: C.eyes,
      headgear: this.cls.look.headgear,
      cap: C.cap && this.cls.look.headgear === 'none',
      team: T,
    });

    this.weaponMount = new THREE.Group();
    this.weaponMount.name = 'weaponMount';
    spine.add(this.weaponMount);

    this.knife = buildKnife();
    this.knife.position.set(0, -0.06, 0.03);
    this.knife.rotation.set(Math.PI / 2, 0, 0);
    this.knife.visible = false;
    this.knife.userData.dynamic = true;
    this.bones.handR.add(this.knife);

    this.setAccessories(C);
  }

  setAccessories(custom) {
    for (const k of Object.keys(this.accessories)) {
      this.accessories[k].parent?.remove(this.accessories[k]);
    }
    this.accessories = {};
    const e = this.team.emblem;
    const B = this.bones;
    if (custom.backpack) {
      const bp = buildBackpack(e);
      bp.position.set(0, 0.26, -0.255);
      bp.rotation.y = Math.PI;
      if (this.cls.look.build > 1) bp.scale.setScalar(1.08);
      B.spine.add(bp);
      this.accessories.backpack = bp;
    }
    if (custom.glasses) {
      const g = buildGlasses();
      g.position.set(0, 0.15, this.face.zAt(0, 0.15) + 0.012);
      B.head.add(g);
      this.accessories.glasses = g;
    }
    if (custom.bandana) {
      const g = buildBandana(this.teamId === 'blue' ? 0x3a67c8 : 0xc0453a);
      g.position.set(0, 0.05, 0.0);
      B.neck.add(g);
      this.accessories.bandana = g;
    }
    if (custom.cap && this.cls.look.headgear === 'none') {
      const c = buildCap(e);
      c.position.set(0, 0.212, -0.004);
      c.rotation.x = -0.14;
      c.scale.setScalar(0.96);
      B.head.add(c);
      this.accessories.cap = c;
    }
  }

  setWeapon(id) {
    if (this.weapon) this.weaponMount.remove(this.weapon.group);
    this.weapon = id ? buildWeapon(id) : null;
    if (this.weapon) this.weaponMount.add(this.weapon.group);
  }

  showWeapon(v) {
    if (this.weapon) this.weapon.group.visible = v;
  }

  get anim() {
    return this.animator.state;
  }

  update(dt) {
    const s = this.animator.state;
    if (this.weapon) {
      this.weapon.group.visible = s.mode === 'combat' && !this.hideWeapon;
      const r = s.reload;
      this.weapon.mag.visible = !(r > 0.3 && r < 0.62);
    }
    this.knife.visible = s.action === 'knife' && s.actionT < 0.8;
    this.animator.update(dt);
  }

  // Fusionne les maillages (utilisé en jeu pour les performances)
  bake() {
    const hiddenKnife = this.knife.visible;
    bakeHierarchy(this.root);
    this.knife.visible = hiddenKnife;
    this.baked = true;
  }

  // Transparence (camouflage du Commando)
  setOpacity(alpha) {
    if (this._opacity === alpha) return;
    this._opacity = alpha;
    if (!this._ghostMat) {
      this._ghostMat = bakedMaterial.clone();
      this._ghostMat.transparent = true;
      this._ghostMat.depthWrite = false;
    }
    this._ghostMat.opacity = alpha;
    this.root.traverse((o) => {
      if (!o.isMesh || o.userData.fx) return;
      if (alpha < 1) {
        if (!o.userData.origMat) o.userData.origMat = o.material;
        if (o.material === bakedMaterial || o.userData.origMat === bakedMaterial) o.material = this._ghostMat;
        else {
          if (!o.userData.ghost) {
            o.userData.ghost = o.userData.origMat.clone();
            o.userData.ghost.transparent = true;
            o.userData.ghost.depthWrite = false;
          }
          o.userData.ghost.opacity = alpha;
          o.material = o.userData.ghost;
        }
        o.castShadow = false;
      } else if (o.userData.origMat) {
        o.material = o.userData.origMat;
        o.castShadow = true;
      }
    });
  }

  // Positions monde utiles (tête, bouche du canon)
  getMuzzleWorld(out) {
    if (!this.weapon) return this.bones.head.getWorldPosition(out);
    return out.copy(this.weapon.muzzle).applyMatrix4(this.weapon.group.matrixWorld);
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.isMesh && o.userData.baked) o.geometry.dispose();
    });
  }
}
