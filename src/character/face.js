import * as THREE from 'three';
import { part, rbox, cyl, SPHERE, mat, shade, isLowDetail, markShared } from './parts.js';
import { emblemGeometry } from './emblems.js';

// Paramètres des expressions faciales (voir la planche "Expressions faciales")
export const EXPRESSIONS = {
  neutre: { label: 'Neutre', browY: 0, browTilt: 0.06, eyeOpen: 1, smile: 0, smirk: 0, open: 0, width: 1 },
  determine: { label: 'Déterminé', browY: -0.006, browTilt: 0.26, eyeOpen: 0.78, smile: -0.15, smirk: 0, open: 0, width: 0.95 },
  confiant: { label: 'Confiant', browY: 0.003, browTilt: 0.02, browAsym: 0.008, eyeOpen: 0.82, smile: 0.25, smirk: 0.9, open: 0, width: 1 },
  enerve: { label: 'Énervé', browY: -0.01, browTilt: 0.42, eyeOpen: 0.72, smile: -0.7, smirk: 0, open: 0.35, width: 1.1, teeth: true },
  surpris: { label: 'Surpris', browY: 0.018, browTilt: -0.18, eyeOpen: 1.32, smile: 0.1, smirk: 0, open: 0.95, width: 0.62 },
  souriant: { label: 'Souriant', browY: 0.006, browTilt: -0.06, eyeOpen: 0.8, smile: 1, smirk: 0, open: 0.5, width: 1.18, teeth: true },
};

export const EXPRESSION_ORDER = ['neutre', 'determine', 'confiant', 'enerve', 'surpris', 'souriant'];

const LIP = 0xb06a55;

// Sphère unité déformée : bas du visage "carré", face aplatie, menton avancé
function buildHeadGeometry(ws = 40, hs = 30) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let { x, y, z } = v;
    // mâchoire carrée : on pousse (x, z) vers un super-ellipse en bas du crâne
    const w = Math.min(1, Math.max(0, (0.25 - y) / 0.9));
    const r = Math.hypot(x, z);
    if (r > 1e-5) {
      const p = 3.2;
      const sq = r / Math.pow(Math.pow(Math.abs(x), p) + Math.pow(Math.abs(z), p), 1 / p);
      const k = 1 + (sq - 1) * 0.55 * w;
      x *= k;
      z *= k;
    }
    // vue de face : angles de mâchoire marqués
    if (y < 0) {
      const r2 = Math.hypot(x, y);
      const p2 = 2.8;
      const sq2 = r2 / Math.pow(Math.pow(Math.abs(x), p2) + Math.pow(Math.abs(y), p2), 1 / p2);
      const k2 = 1 + (sq2 - 1) * 0.35;
      x *= k2;
      y *= 1 + (k2 - 1) * 0.4;
    }
    // visage aplati à l'avant
    if (z > 0.55) z = 0.55 + (z - 0.55) * 0.75;
    // menton qui descend et avance légèrement
    if (y < 0 && z > 0) {
      y *= 1 + 0.16 * z;
      z *= 1 + 0.08 * -y;
    }
    // arrière du crâne légèrement plus bombé
    if (z < 0 && y > -0.3) z *= 1.04;
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
const HEAD_GEO = markShared(buildHeadGeometry());
const HEAD_GEO_LOW = markShared(buildHeadGeometry(22, 16));
const MOUTH_IN = 0x4a1616;

export class Face {
  constructor(head, { skin, hair, eyes, headgear = 'none', cap = false, glasses = false, team }) {
    this.head = head;
    this.skin = skin;
    this.hair = hair;
    this.eyeColor = eyes;
    this.headgear = headgear;
    this.team = team;
    this.mouth = new THREE.Group();
    this.expression = null;
    this.build(cap);
  }

  build(cap) {
    const h = this.head;
    const skin = this.skin;
    // Crâne : une seule sphère déformée (mâchoire carrée, visage aplati) => aucune arête
    const headMesh = part(h, isLowDetail() ? HEAD_GEO_LOW : HEAD_GEO, skin, { p: [0, 0.145, 0.004], s: [0.118, 0.14, 0.13] });
    headMesh.updateMatrix();
    const probe = new THREE.Mesh(HEAD_GEO);
    probe.matrixWorld.copy(headMesh.matrix);
    const ray = new THREE.Raycaster();
    const zAt = (x, y) => {
      ray.set(new THREE.Vector3(x, y, 0.5), new THREE.Vector3(0, 0, -1));
      const hit = ray.intersectObject(probe)[0];
      return hit ? hit.point.z : 0.1;
    };
    this.zAt = zAt;
    part(h, rbox(0.15, 0.02, 0.03, 0.009), skin, { p: [0, 0.17, zAt(0, 0.17) - 0.017] }); // arcade discrète
    // Oreilles
    for (const sd of [1, -1]) {
      part(h, SPHERE, skin, { p: [0.116 * sd, 0.128, -0.004], s: [0.022, 0.04, 0.03] });
      part(h, SPHERE, shade(skin, 0.85), { p: [0.124 * sd, 0.128, 0], s: [0.01, 0.026, 0.017] });
    }
    // Nez
    const zn = zAt(0, 0.12);
    part(h, rbox(0.024, 0.045, 0.026, 0.011), skin, { p: [0, 0.127, zn - 0.002], r: [-0.3, 0, 0] });
    part(h, SPHERE, skin, { p: [0, 0.105, zn + 0.009], s: [0.019, 0.016, 0.016] });
    part(h, SPHERE, shade(skin, 0.93), { p: [0.013, 0.1, zn + 0.006], s: [0.01, 0.009, 0.01] });
    part(h, SPHERE, shade(skin, 0.93), { p: [-0.013, 0.1, zn + 0.006], s: [0.01, 0.009, 0.01] });
    // Menton légèrement fendu
    part(h, SPHERE, skin, { p: [0, 0.012, zAt(0, 0.012) - 0.018], s: [0.04, 0.026, 0.022] });

    // Yeux
    this.eyes = [];
    for (const sd of [1, -1]) {
      const g = new THREE.Group();
      g.position.set(0.047 * sd, 0.148, zAt(0.047 * sd, 0.148) - 0.006);
      g.rotation.y = 0.1 * sd;
      h.add(g);
      part(g, SPHERE, 0xf8f6f0, { s: [0.026, 0.021, 0.013], shadow: false });
      part(g, SPHERE, this.eyeColor, { p: [0, -0.001, 0.0092], s: [0.0128, 0.0138, 0.0062], shadow: false });
      part(g, SPHERE, 0x0d0d0d, { p: [0, -0.001, 0.0135], s: [0.006, 0.0065, 0.003], shadow: false });
      part(g, SPHERE, 0xffffff, { p: [0.0045, 0.004, 0.0158], s: [0.003, 0.003, 0.0015], shadow: false });
      part(g, rbox(0.058, 0.007, 0.014, 0.003), 0x2a1a12, { p: [0, 0.019, 0.005], r: [0, 0, -0.08 * sd], shadow: false });
      this.eyes.push(g);
    }
    // Sourcils épais
    this.brows = [];
    for (const sd of [1, -1]) {
      const b = part(h, rbox(0.06, 0.017, 0.02, 0.007), shade(this.hair, 0.8), { p: [0.048 * sd, 0.182, zAt(0.048 * sd, 0.182) + 0.004], shadow: false });
      b.userData.side = sd;
      this.brows.push(b);
    }
    this.browZ = this.brows[0].position.z;
    this.mouth.position.set(0, 0.056, zAt(0, 0.056) + 0.002);
    h.add(this.mouth);

    this.buildHair(cap);
  }

  buildHair(cap) {
    const h = this.head;
    const hair = this.hair;
    const hg = this.headgear;
    // Pattes (toujours visibles)
    for (const sd of [1, -1]) {
      part(h, rbox(0.012, 0.045, 0.026, 0.005), hair, { p: [0.111 * sd, 0.118, 0.03] });
    }
    if (hg === 'helmet') {
      const helm = 0x4b5140;
      const g = new THREE.Group();
      g.position.set(0, 0.15, -0.008);
      g.rotation.x = -0.3;
      h.add(g);
      const dome = new THREE.SphereGeometry(0.152, isLowDetail() ? 14 : 22, isLowDetail() ? 7 : 12, 0, Math.PI * 2, 0, 1.45);
      part(g, dome, helm, { s: [1, 0.98, 1.06], rough: 0.6 });
      part(g, cyl(0.16, 0.166, 0.022, 24), shade(helm, 0.85), { p: [0, 0.018, 0], s: [1, 1, 1.06] });
      part(g, cyl(0.1545, 0.1575, 0.032, 24), this.team.shirt, { p: [0, 0.052, 0], s: [1, 1, 1.06] });
      part(g, emblemGeometry(this.team.emblem), 0xffffff, { p: [0, 0.075, 0.143], s: 0.03, r: [-0.45, 0, 0], shadow: false });
      // Jugulaire
      for (const sd of [1, -1]) part(h, box3(0.008, 0.1, 0.012), 0x2a2622, { p: [0.112 * sd, 0.08, 0.035], r: [0.25, 0, 0] });
      part(h, SPHERE, hair, { p: [0, 0.11, -0.075], s: [0.1, 0.07, 0.06] }); // nuque
      return;
    }
    if (hg === 'beanie') {
      const knit = 0x353a33;
      const g = new THREE.Group();
      g.position.set(0, 0.145, -0.01);
      g.rotation.x = -0.4;
      h.add(g);
      const dome = new THREE.SphereGeometry(0.136, isLowDetail() ? 14 : 22, isLowDetail() ? 7 : 12, 0, Math.PI * 2, 0, 1.3);
      part(g, dome, knit, { s: [1, 1.14, 1.05], rough: 0.95 });
      part(g, cyl(0.134, 0.136, 0.045, 24), shade(this.team.shirt, 0.5), { p: [0, 0.045, 0], s: [1, 1, 1.05], rough: 0.95 });
      part(g, SPHERE, shade(knit, 0.9), { p: [0, 0.16, 0], s: 0.03, rough: 0.95 });
      part(h, SPHERE, hair, { p: [0, 0.11, -0.08], s: [0.1, 0.06, 0.06] });
      return;
    }
    // Coiffure "banane" de héros : calotte + mèches volumineuses
    const cap1 = new THREE.SphereGeometry(0.126, isLowDetail() ? 14 : 22, isLowDetail() ? 7 : 12, 0, Math.PI * 2, 0, 1.3);
    part(h, cap1, hair, { p: [0, 0.148, -0.006], s: [1.01, 1.06, 1.07], r: [-0.45, 0, 0] });
    part(h, SPHERE, hair, { p: [0, 0.12, -0.075], s: [0.105, 0.085, 0.065] }); // nuque
    for (const sd of [1, -1]) part(h, SPHERE, hair, { p: [0.103 * sd, 0.185, -0.025], s: [0.024, 0.058, 0.09] });
    if (cap) return; // la casquette cache la banane
    part(h, SPHERE, hair, { p: [0.005, 0.276, 0.045], s: [0.1, 0.056, 0.09], r: [0.25, 0, -0.12] });
    part(h, SPHERE, hair, { p: [-0.048, 0.264, 0.028], s: [0.068, 0.048, 0.084], r: [0.15, 0, 0.3] });
    part(h, SPHERE, hair, { p: [0.052, 0.262, 0.06], s: [0.064, 0.046, 0.07], r: [0.2, 0, -0.35] });
    part(h, SPHERE, hair, { p: [0.028, 0.256, 0.104], s: [0.088, 0.046, 0.052], r: [0.75, 0, -0.25] }); // mèche avant relevée
    part(h, SPHERE, hair, { p: [0.055, 0.238, 0.118], s: [0.05, 0.03, 0.035], r: [1.0, 0, -0.5] }); // pointe de la banane
    part(h, SPHERE, shade(hair, 1.14), { p: [0.03, 0.292, 0.06], s: [0.055, 0.024, 0.055], r: [0.3, 0, -0.2] }); // reflet
  }

  setExpression(name) {
    const e = EXPRESSIONS[name] || EXPRESSIONS.neutre;
    this.expression = name;
    for (const b of this.brows) {
      const sd = b.userData.side;
      const asym = e.browAsym && sd === 1 ? e.browAsym : 0;
      b.position.y = 0.182 + e.browY + asym;
      b.position.z = this.browZ;
      b.rotation.z = e.browTilt * sd;
    }
    for (const eye of this.eyes) eye.scale.y = e.eyeOpen;
    this.buildMouth(e);
  }

  buildMouth(e) {
    for (const c of [...this.mouth.children]) {
      this.mouth.remove(c);
      c.geometry.dispose();
    }
    const w = 0.037 * e.width;
    const N = 11;
    const upper = [];
    const lower = [];
    for (let i = 0; i < N; i++) {
      const u = (i / (N - 1)) * 2 - 1;
      const x = u * w;
      let y = e.smile * 0.014 * u * u - e.smile * 0.004;
      y += e.smirk * 0.012 * Math.max(0, u) * u;
      const z = -0.02 * u * u;
      upper.push(new THREE.Vector3(x, y, z));
      const open = e.open * 0.034 * (1 - u * u) * (1 - 0.2 * Math.abs(u));
      lower.push(new THREE.Vector3(x, y - open - (e.smile > 0.5 ? 0.004 * (1 - u * u) : 0), z));
    }
    const lipMat = mat(LIP);
    const upperTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(upper), isLowDetail() ? 8 : 20, 0.0042, isLowDetail() ? 4 : 6), lipMat);
    this.mouth.add(upperTube);
    if (e.open > 0.02) {
      const lowerTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lower), isLowDetail() ? 8 : 20, 0.005, isLowDetail() ? 4 : 6), lipMat);
      this.mouth.add(lowerTube);
      this.mouth.add(strip(upper, lower, -0.004, MOUTH_IN));
      if (e.teeth) {
        const teethLow = upper.map((p, i) => {
          const u = (i / (N - 1)) * 2 - 1;
          return new THREE.Vector3(p.x, p.y - Math.min(0.012, (p.y - lower[i].y) * 0.55) * (1 - u * u * 0.3), p.z);
        });
        this.mouth.add(strip(upper, teethLow, -0.002, 0xfafafa));
      }
    }
  }
}

function box3(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

// Bande de triangles entre deux courbes (intérieur de la bouche, dents)
function strip(a, b, dz, color) {
  const pos = [];
  for (let i = 0; i < a.length - 1; i++) {
    const a0 = a[i], a1 = a[i + 1], b0 = b[i], b1 = b[i + 1];
    pos.push(a0.x, a0.y, a0.z + dz, b0.x, b0.y, b0.z + dz, a1.x, a1.y, a1.z + dz);
    pos.push(a1.x, a1.y, a1.z + dz, b0.x, b0.y, b0.z + dz, b1.x, b1.y, b1.z + dz);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat(color, { side: THREE.DoubleSide, rough: 0.5 }));
}
