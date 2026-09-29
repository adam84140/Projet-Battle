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
const HEAD_SCALE = 1.13;

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
    // Centre du crâne au-dessus de l'os de la tête (zone de touche "tête")
    this.headOffset = 0.145 * HEAD_SCALE;
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

    // ---------- Bassin / ceinture (taille resserrée) ----------
    part(hips, rbox(0.3 * b, 0.2, 0.23, 0.07), T.pants, { p: [0, -0.03, 0] });
    part(hips, rbox(0.32 * b, 0.06, 0.245, 0.022), LEATHER_DARK, { p: [0, 0.05, 0] });
    part(hips, rbox(0.07, 0.05, 0.022, 0.007), 0xb8a070, { p: [0, 0.05, 0.126], metal: 0.6, rough: 0.35 });
    for (const sd of [1, -1]) {
      part(hips, rbox(0.075, 0.085, 0.05, 0.015), LEATHER, { p: [0.1 * sd * b, 0.025, 0.122] });
      part(hips, rbox(0.08, 0.03, 0.056, 0.01), shade(LEATHER, 0.85), { p: [0.1 * sd * b, 0.06, 0.124] });
      part(hips, rbox(0.05, 0.09, 0.075, 0.015), LEATHER, { p: [0.168 * sd * b, 0.02, 0.03] });
    }
    const canteen = buildCanteen();
    canteen.scale.setScalar(0.8);
    canteen.position.set(0.13 * b, -0.02, -0.14);
    hips.add(canteen);

    // ---------- Jambes (cargo amples, tibias affinés, grosses bottes) ----------
    for (const sd of [1, -1]) {
      const s = sd === 1 ? 'L' : 'R';
      const leg = this.bone('leg' + s, hips, 0.1 * sd * b, -0.04, 0);
      part(leg, capsule(0.112 * Math.sqrt(b), 0.24), T.pants, { p: [0, -0.2, 0] });
      part(leg, rbox(0.056, 0.13, 0.12, 0.02), shade(T.pants, 0.9), { p: [0.1 * sd, -0.23, 0.005] });
      part(leg, rbox(0.06, 0.032, 0.125, 0.01), shade(T.pants, 0.82), { p: [0.102 * sd, -0.165, 0.005] });
      if (sd === -1) {
        // Holster sur la cuisse droite
        part(leg, rbox(0.05, 0.14, 0.09, 0.02), LEATHER_DARK, { p: [-0.105, -0.13, 0.02] });
        part(leg, rbox(0.035, 0.06, 0.03, 0.01), GLOVE, { p: [-0.105, -0.04, 0.035], r: [0.3, 0, 0] });
        part(leg, box(0.22, 0.02, 0.2), shade(T.pants, 0.7), { p: [0, -0.2, 0] });
      }
      const knee = this.bone('knee' + s, leg, 0, -0.42, 0);
      part(knee, capsule(0.09 * Math.sqrt(b), 0.24), T.pants, { p: [0, -0.19, 0] });
      part(knee, rbox(0.13, 0.145, 0.07, 0.03), 0x2c2e30, { p: [0, -0.02, 0.083] });
      part(knee, box(0.19, 0.02, 0.18), shade(T.pants, 0.7), { p: [0, -0.02, 0] });
      // pantalon bouffant rentré dans les bottes
      part(knee, cyl(0.1 * Math.sqrt(b), 0.094, 0.07, 14), shade(T.pants, 0.94), { p: [0, -0.325, 0] });
      const ankle = this.bone('ankle' + s, knee, 0, -0.39, 0);
      part(ankle, cyl(0.09, 0.095, 0.19, 16), BOOT, { p: [0, 0.045, -0.005] });
      part(ankle, cyl(0.098, 0.098, 0.032, 16), shade(BOOT, 0.8), { p: [0, 0.135, -0.005] });
      part(ankle, rbox(0.15, 0.1, 0.29, 0.045), BOOT, { p: [0, -0.035, 0.055] });
      part(ankle, SPHERE, shade(BOOT, 1.06), { p: [0, -0.04, 0.165], s: [0.074, 0.05, 0.07] }); // bout arrondi
      part(ankle, rbox(0.16, 0.036, 0.31, 0.012), SOLE, { p: [0, -0.08, 0.055] });
      for (let i = 0; i < 3; i++) part(ankle, box(0.07, 0.009, 0.013), 0x3a2a1e, { p: [0, 0.005 + i * 0.036, 0.09 - i * 0.004], r: [-0.3, 0, 0] });
    }

    // ---------- Buste en V (épaules larges, taille fine) ----------
    const spine = this.bone('spine', hips, 0, 0.06, 0);
    part(spine, cyl(0.268 * b, 0.168 * b, 0.44, 18), T.shirt, { p: [0, 0.22, 0], s: [1, 1, 0.6] });
    part(spine, SPHERE, T.shirt, { p: [0, 0.43, 0], s: [0.28 * b, 0.085, 0.16] });
    part(spine, SPHERE, T.shirt, { p: [0, 0.465, -0.012], s: [0.17 * b, 0.075, 0.12] }); // trapèzes
    // Gilet tactique
    part(spine, cyl(0.275 * b, 0.19 * b, 0.3, 18), T.vest, { p: [0, 0.255, 0], s: [1, 1, 0.72] });
    for (const sd of [1, -1]) {
      part(spine, rbox(0.095, 0.06, 0.37, 0.022), T.vest, { p: [0.15 * sd * b, 0.43, 0] });
      // sangles cuir façon harnais
      part(spine, box(0.05, 0.3, 0.018), LEATHER, { p: [0.11 * sd * b, 0.29, 0.186], r: [-0.12, 0, -0.1 * sd] });
      part(spine, box(0.05, 0.3, 0.018), LEATHER, { p: [0.11 * sd * b, 0.29, -0.186], r: [0.12, 0, -0.1 * sd] });
      part(spine, box(0.055, 0.028, 0.022), 0xb8a070, { p: [0.115 * sd * b, 0.21, 0.194], metal: 0.6, rough: 0.35 });
    }
    // Poches à chargeurs
    for (let i = -1; i <= 1; i++) {
      part(spine, rbox(0.078, 0.1, 0.052, 0.016), 0x2a2c30, { p: [i * 0.088 * b, 0.16, 0.162] });
      part(spine, rbox(0.082, 0.032, 0.057, 0.01), LEATHER, { p: [i * 0.088 * b, 0.207, 0.164] });
    }
    // Col de chemise + t-shirt noir
    for (const sd of [1, -1]) {
      part(spine, rbox(0.12, 0.05, 0.09, 0.018), T.shirt, { p: [0.058 * sd, 0.48, 0.06], r: [0.35, 0.45 * sd, 0.25 * sd] });
    }
    part(spine, rbox(0.1, 0.07, 0.03, 0.012), 0x1d1f22, { p: [0, 0.455, 0.112], r: [0.2, 0, 0] });
    // Emblèmes (poitrine et dos)
    part(spine, emblemGeometry(T.emblem), 0xffffff, { p: [0, 0.335, 0.193], s: 0.076, r: [-0.05, 0, 0], shadow: false });
    part(spine, emblemGeometry(T.emblem), 0xffffff, { p: [0, 0.3, -0.194], s: 0.105, r: [0.05, Math.PI, 0], shadow: false });
    // Équipement propre à chaque classe (silhouette reconnaissable)
    if (this.cls.id === 'assaut') {
      for (let i = 0; i < 2; i++) {
        const g = buildGrenade();
        g.scale.setScalar(0.9);
        g.position.set(0.2 * b, 0.25 - i * 0.078, 0.1);
        spine.add(g);
      }
    }
    if (this.cls.id === 'artilleur') {
      // Bandoulière de munitions
      const ang = 0.62;
      const dx = -Math.sin(ang);
      const dy = Math.cos(ang);
      part(spine, box(0.058, 0.5, 0.022), 0x3b3a2a, { p: [0, 0.27, 0.203], r: [0, 0, ang] });
      for (let i = 0; i < 8; i++) {
        const a = -0.2 + i * 0.057;
        part(spine, cyl(0.01, 0.01, 0.054, 6), 0xc9a13a, {
          p: [a * dx, 0.27 + a * dy, 0.215],
          r: [0, 0, ang + Math.PI / 2],
          metal: 0.7,
          rough: 0.3,
        });
      }
      // Épaulières blindées : silhouette massive
      for (const sd of [1, -1]) {
        part(spine, rbox(0.17, 0.065, 0.24, 0.03), T.vest, { p: [0.27 * sd * b, 0.465, 0], r: [0, 0, -0.38 * sd] });
        part(spine, rbox(0.172, 0.022, 0.242, 0.01), T.shirtDark, { p: [0.285 * sd * b, 0.44, 0], r: [0, 0, -0.38 * sd] });
      }
    }
    if (this.cls.id === 'commando') {
      // Fourreau de poignard sur la sangle gauche
      part(spine, rbox(0.034, 0.16, 0.034, 0.012), LEATHER_DARK, { p: [0.13 * b, 0.3, 0.2], r: [0, 0, 0.25] });
      part(spine, rbox(0.03, 0.05, 0.03, 0.01), GLOVE, { p: [0.15 * b, 0.39, 0.2], r: [0, 0, 0.25] });
    }

    // ---------- Bras (deltoïdes marqués, avant-bras lisibles, gros poings) ----------
    for (const sd of [1, -1]) {
      const s = sd === 1 ? 'L' : 'R';
      const sb = Math.sqrt(b);
      const sh = this.bone('shoulder' + s, spine, 0.25 * sd * b, 0.42, 0);
      part(sh, SPHERE, T.shirt, { p: [0.022 * sd, -0.015, 0], s: [0.114 * b, 0.112, 0.118] });
      part(sh, capsule(0.086 * sb, 0.1), T.shirt, { p: [0, -0.1, 0] });
      part(sh, cyl(0.093 * sb, 0.095 * sb, 0.07, 16), T.cuff, { p: [0, -0.18, 0] });
      part(sh, capsule(0.068 * sb, 0.1), skin, { p: [0, -0.235, 0] });
      if (sd === 1) part(sh, emblemGeometry(T.emblem), 0xffffff, { p: [0.091 * sb, -0.09, 0], s: 0.045, r: [0, Math.PI / 2, 0], shadow: false });
      const el = this.bone('elbow' + s, sh, 0, -UPPER_ARM, 0);
      part(el, capsule(0.062 * sb, 0.19), skin, { p: [0, -0.13, 0] });
      part(el, SPHERE, skin, { p: [0, -0.085, 0.006], s: [0.075 * sb, 0.1, 0.071] });
      part(el, cyl(0.058, 0.063, 0.05, 12), GLOVE, { p: [0, -0.275, 0] });
      const hand = this.bone('hand' + s, el, 0, -FOREARM, 0);
      part(hand, rbox(0.1, 0.1, 0.092, 0.035), GLOVE, { p: [0, -0.05, 0.005] });
      part(hand, rbox(0.094, 0.042, 0.08, 0.016), skin, { p: [0, -0.106, 0.01] });
      part(hand, capsule(0.02, 0.04), skin, { p: [-0.052 * sd, -0.065, 0.034], r: [0.4, 0, 0.5 * sd] });
    }

    // ---------- Cou / tête ----------
    const neck = this.bone('neck', spine, 0, 0.47, 0.005);
    part(neck, cyl(0.068, 0.075, 0.13, 14), skin, { p: [0, 0.04, 0] });
    const head = this.bone('head', neck, 0, 0.08, 0.012);
    // Tête légèrement surdimensionnée (lisibilité du visage à distance)
    head.scale.setScalar(HEAD_SCALE);
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
      const bp = buildBackpack(e, this.team.shirt);
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
    if (this.cls.id === 'commando') {
      // Écharpe (shemagh) : silhouette du tireur d'élite
      const sc = buildBandana(0x7a7352);
      sc.scale.set(1.32, 1.5, 1.32);
      sc.position.set(0, 0.03, 0.004);
      B.neck.add(sc);
      this.accessories.scarf = sc;
    }
    if (custom.bandana && this.cls.id !== 'commando') {
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
      this.weapon.group.visible = (s.mode === 'combat' || s.mode === 'dead') && !this.hideWeapon;
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
