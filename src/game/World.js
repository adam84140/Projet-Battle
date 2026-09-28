import * as THREE from 'three';
import { part, rbox, box, cyl, SPHERE_LOW, shade, bakeStatic, setDetail } from '../character/parts.js';
import { emblemGeometry } from '../character/emblems.js';
import { TEAMS } from '../config.js';
import { MAP, terrainHeight, distToRoad, rng } from './map.js';

// Construction procédurale du village méditerranéen "Castelmare".

const WALLS = [0xf0e3c6, 0xead3a6, 0xf3e8d4, 0xe8c99c, 0xdcb68b, 0xefdcc0];
const ROOFS = [0xc4623a, 0xb5552f, 0xcf6e43, 0xba5a35];
const SHUTTERS = [0x5f8a6a, 0x4a78a8, 0x6d9fb0, 0x8a5a3a, 0x7a9a5a];
const STONE = 0xbcae90;
const WOOD = 0x8a6038;
const SANDBAG = 0xb9a67c;

export class World {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.rand = rng(20240917);
    this.statics = new THREE.Group();
    this.updatables = [];
    this.footprints = [];
    // décor en géométrie allégée (des centaines de sacs de sable et de caisses)
    const prevDetail = setDetail('low');
    try {
      this.buildSky();
      this.buildTerrain();
      this.buildVillage();
      this.buildWindmill(-75, -3);
      this.buildFarm();
      this.buildBase('blue');
      this.buildBase('red');
      this.buildScatter();
    } finally {
      setDetail(prevDetail);
    }
    const baked = bakeStatic(this.statics);
    baked.name = 'world-static';
    scene.add(baked);
  }

  // ---------- utilitaires ----------
  r(a = 0, b = 1) {
    return a + (b - a) * this.rand();
  }

  pick(list) {
    return list[Math.floor(this.rand() * list.length)];
  }

  groundRange(x, z, w, d) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
      const h = terrainHeight(x + (dx * w) / 2, z + (dz * d) / 2);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    return [lo, hi];
  }

  // Bloc posé au sol avec collision
  block(x, z, w, d, h, color, o = {}) {
    const [lo, hi] = this.groundRange(x, z, w, d);
    const y0 = lo - (o.sink ?? 0.3);
    const top = (o.fromLow ? lo : hi) + h;
    part(this.statics, o.round ? rbox(w, top - y0, d, o.round) : box(w, top - y0, d), color, { p: [x, (y0 + top) / 2, z], receive: true });
    if (o.collide !== false) this.physics.addBox(x - w / 2, y0, z - d / 2, x + w / 2, top, z + d / 2, o.tag);
    if (o.footprint !== false) this.footprints.push({ x, z, w: w + 2, d: d + 2 });
    return top;
  }

  gableRoof(x, y, z, span, length, rise, alongX, color) {
    const s = new THREE.Shape();
    s.moveTo(-span / 2, 0);
    s.lineTo(span / 2, 0);
    s.lineTo(0, rise);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
    g.translate(0, 0, -length / 2);
    const m = part(this.statics, g, color, { p: [x, y, z], r: [0, alongX ? Math.PI / 2 : 0, 0], receive: true });
    // faîtage
    part(this.statics, box(0.35, 0.25, length + 0.1), shade(color, 0.8), { p: [x, y + rise, z], r: [0, alongX ? Math.PI / 2 : 0, 0] });
    return m;
  }

  // ---------- ciel, relief ----------
  buildSky() {
    const geo = new THREE.SphereGeometry(900, 32, 16);
    const colors = [];
    const top = new THREE.Color(0x3f82d6);
    const hor = new THREE.Color(0xd4e8f7);
    const low = new THREE.Color(0xe9eef0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 900;
      const c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.55)) : low.clone();
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10;
    this.scene.add(sky);
    this.sky = sky;

    // Nuages
    const cloudGroup = new THREE.Group();
    const cmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x9aa9b8, emissiveIntensity: 0.5, fog: false, flatShading: true });
    for (let i = 0; i < 22; i++) {
      const a = this.r(0, Math.PI * 2);
      const dist = this.r(260, 560);
      const c = new THREE.Group();
      const n = 4 + Math.floor(this.r(0, 4));
      for (let k = 0; k < n; k++) {
        const s = new THREE.Mesh(SPHERE_LOW, cmat);
        const sz = this.r(10, 22);
        s.scale.set(sz * 1.4, sz * 0.7, sz);
        s.position.set(this.r(-25, 25), this.r(-3, 5), this.r(-12, 12));
        c.add(s);
      }
      c.position.set(Math.cos(a) * dist, this.r(95, 150), Math.sin(a) * dist);
      cloudGroup.add(c);
    }
    this.scene.add(cloudGroup);
    this.clouds = cloudGroup;

    // Montagnes lointaines
    const mgeo = [];
    const mcolors = [0x9fb3b0, 0xa9bcb6, 0x93a9a6, 0xb2c2bb];
    const mountains = new THREE.Group();
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + this.r(-0.05, 0.05);
      const dist = this.r(300, 420);
      const h = this.r(40, 110);
      const m = new THREE.Mesh(new THREE.ConeGeometry(this.r(70, 130), h, 7, 1), new THREE.MeshStandardMaterial({ color: this.pick(mcolors), flatShading: true, roughness: 1 }));
      m.position.set(Math.cos(a) * dist, h / 2 - 8, Math.sin(a) * dist);
      m.rotation.y = this.r(0, 3);
      mountains.add(m);
      mgeo.push(m);
    }
    this.scene.add(mountains);
  }

  buildTerrain() {
    const size = 480;
    const seg = 170;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const grassA = new THREE.Color(0x8fb04e);
    const grassB = new THREE.Color(0xa9b95c);
    const dry = new THREE.Color(0xc8b56e);
    const dirt = new THREE.Color(0xc2a071);
    const paving = new THREE.Color(0xd4c3a0);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = terrainHeight(x, z);
      pos.setY(i, h);
      const n = Math.sin(x * 0.13) * Math.cos(z * 0.11) * 0.5 + Math.sin(x * 0.37 + z * 0.29) * 0.25 + 0.5;
      tmp.copy(grassA).lerp(grassB, n);
      const dryness = Math.min(1, Math.max(0, (h - 1.5) * 0.25 + Math.sin(x * 0.05 - z * 0.04) * 0.35));
      tmp.lerp(dry, dryness * 0.6);
      const road = distToRoad(x, z);
      if (road < 3.2) tmp.lerp(dirt, Math.min(1, (3.2 - road) / 1.6));
      const dv = Math.hypot(x, z - 2);
      if (dv < 15) tmp.lerp(paving, Math.min(1, (15 - dv) / 2.5));
      for (const b of Object.values(MAP.bases)) {
        const db = Math.hypot(x - b.x, z - b.z);
        if (db < 16) tmp.lerp(dirt, Math.min(0.8, (16 - db) / 5));
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.scene.add(terrain);
    this.terrain = terrain;
  }

  // ---------- bâtiments ----------
  house(x, z, w, d, floors, o = {}) {
    const [lo, hi] = this.groundRange(x, z, w, d);
    const y0 = lo - 0.4;
    const wallH = floors * 3.1 + 0.5;
    const top = hi + wallH;
    const wall = o.wall ?? this.pick(WALLS);
    const roofC = o.roof ?? this.pick(ROOFS);
    const shut = o.shutter ?? this.pick(SHUTTERS);
    part(this.statics, box(w, top - y0, d), wall, { p: [x, (y0 + top) / 2, z], receive: true });
    part(this.statics, box(w + 0.25, hi + 0.7 - y0, d + 0.25), STONE, { p: [x, (y0 + hi + 0.7) / 2, z], receive: true });
    part(this.statics, box(w + 0.35, 0.22, d + 0.35), shade(wall, 0.88), { p: [x, top - 0.1, z] });
    const alongX = w >= d;
    const span = (alongX ? d : w) + 0.9;
    const length = (alongX ? w : d) + 0.7;
    const rise = span * 0.32;
    this.gableRoof(x, top, z, span, length, rise, alongX, roofC);
    // cheminée
    if (this.rand() < 0.6) {
      const cx = x + (alongX ? w * 0.25 : span * 0.15);
      const cz = z + (alongX ? span * 0.15 : d * 0.25);
      part(this.statics, box(0.7, 1.6, 0.7), shade(wall, 0.9), { p: [cx, top + rise * 0.6, cz] });
      part(this.statics, box(0.9, 0.2, 0.9), shade(roofC, 0.8), { p: [cx, top + rise * 0.6 + 0.85, cz] });
    }
    // Fenêtres et volets sur les 4 façades
    const faces = [
      { nx: 0, nz: 1, len: w },
      { nx: 0, nz: -1, len: w },
      { nx: 1, nz: 0, len: d },
      { nx: -1, nz: 0, len: d },
    ];
    const doorFace = o.door ?? 0;
    faces.forEach((f, fi) => {
      const n = Math.max(1, Math.floor(f.len / 2.8));
      for (let fl = 0; fl < floors; fl++) {
        for (let i = 0; i < n; i++) {
          const t = -f.len / 2 + (i + 0.5) * (f.len / n);
          const isDoor = fl === 0 && fi === doorFace && i === Math.floor(n / 2);
          const wy = hi + (isDoor ? 1.15 : 1.7) + fl * 3.1;
          const along = f.nx === 0 ? [t, 0] : [0, t];
          const px = x + along[0] + f.nx * (w / 2 + 0.03);
          const pz = z + along[1] + f.nz * (d / 2 + 0.03);
          const rotY = f.nx === 0 ? 0 : Math.PI / 2;
          if (isDoor) {
            part(this.statics, box(1.25, 2.3, 0.14), 0x6a4428, { p: [px, wy, pz], r: [0, rotY, 0] });
            part(this.statics, box(1.55, 0.18, 0.2), STONE, { p: [px, wy + 1.22, pz], r: [0, rotY, 0] });
            continue;
          }
          if (fl === 0 && this.rand() < 0.25) continue;
          part(this.statics, box(0.85, 1.15, 0.12), 0x33414d, { p: [px, wy, pz], r: [0, rotY, 0] });
          part(this.statics, box(1.05, 0.12, 0.2), shade(wall, 0.85), { p: [px, wy - 0.63, pz], r: [0, rotY, 0] });
          for (const sd of [-1, 1]) {
            const ox = f.nx === 0 ? sd * 0.68 : 0;
            const oz = f.nx === 0 ? 0 : sd * 0.68;
            part(this.statics, box(0.48, 1.2, 0.08), shut, { p: [px + ox, wy, pz + oz], r: [0, rotY, 0] });
          }
          // jardinière fleurie
          if (fl > 0 && this.rand() < 0.35) {
            part(this.statics, box(0.9, 0.22, 0.28), 0x9a5a3a, { p: [px + f.nx * 0.15, wy - 0.75, pz + f.nz * 0.15], r: [0, rotY, 0] });
            part(this.statics, box(0.8, 0.2, 0.22), this.pick([0xd8454f, 0xe86aa0, 0xf0c23a]), { p: [px + f.nx * 0.15, wy - 0.56, pz + f.nz * 0.15], r: [0, rotY, 0] });
          }
        }
      }
    });
    this.physics.addBox(x - w / 2, y0, z - d / 2, x + w / 2, top + rise, z + d / 2);
    this.footprints.push({ x, z, w: w + 3, d: d + 3 });
  }

  bellTower(x, z) {
    const w = 5;
    const [lo, hi] = this.groundRange(x, z, w, w);
    const H = 15;
    const c = 0xe3d3b2;
    part(this.statics, box(w, H + hi - lo + 0.4, w), c, { p: [x, (lo - 0.4 + hi + H) / 2, z], receive: true });
    part(this.statics, box(w + 0.4, 1.2, w + 0.4), STONE, { p: [x, hi + 0.4, z] });
    part(this.statics, box(w + 0.3, 0.3, w + 0.3), shade(c, 0.85), { p: [x, hi + H - 4.2, z] });
    // Beffroi ouvert
    const top = hi + H;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      part(this.statics, box(dz ? 2 : 0.2, 2.6, dx ? 2 : 0.2), 0x2d2a26, { p: [x + dx * 2.45, top - 2, z + dz * 2.45] });
    }
    part(this.statics, SPHERE_LOW, 0xb08a3a, { p: [x, top - 2.2, z], s: [0.9, 1, 0.9], metal: 0.7, rough: 0.35 });
    part(this.statics, box(w + 0.5, 0.35, w + 0.5), shade(c, 0.85), { p: [x, top, z] });
    const roof = new THREE.ConeGeometry(4.1, 4.2, 4);
    part(this.statics, roof, 0xc05c36, { p: [x, top + 2.25, z], r: [0, Math.PI / 4, 0] });
    part(this.statics, SPHERE_LOW, 0xd8b04a, { p: [x, top + 4.5, z], s: 0.3, metal: 0.8, rough: 0.3 });
    // Horloge
    part(this.statics, cyl(0.95, 0.95, 0.12, 20), 0xfaf5e8, { p: [x, top - 5.6, z - w / 2 - 0.05], r: [Math.PI / 2, 0, 0] });
    part(this.statics, box(0.08, 0.7, 0.05), 0x222222, { p: [x, top - 5.35, z - w / 2 - 0.13] });
    part(this.statics, box(0.5, 0.08, 0.05), 0x222222, { p: [x + 0.2, top - 5.6, z - w / 2 - 0.13] });
    this.physics.addBox(x - w / 2, lo - 0.4, z - w / 2, x + w / 2, top + 4, z + w / 2);
    this.footprints.push({ x, z, w: w + 3, d: w + 3 });
  }

  fountain(x, z) {
    const y = terrainHeight(x, z);
    part(this.statics, cyl(2.5, 2.6, 0.9, 8), STONE, { p: [x, y + 0.2, z], receive: true });
    part(this.statics, cyl(2.15, 2.15, 0.1, 8), 0x4f9ccf, { p: [x, y + 0.62, z], rough: 0.15, metal: 0.2 });
    part(this.statics, cyl(0.35, 0.45, 1.8, 10), STONE, { p: [x, y + 1.2, z] });
    part(this.statics, cyl(1.0, 0.4, 0.35, 12), STONE, { p: [x, y + 2.1, z] });
    part(this.statics, cyl(0.9, 0.9, 0.06, 12), 0x5fb0de, { p: [x, y + 2.27, z], rough: 0.1 });
    part(this.statics, SPHERE_LOW, STONE, { p: [x, y + 2.55, z], s: 0.25 });
    this.physics.addBox(x - 2.3, y - 0.5, z - 2.3, x + 2.3, y + 0.65, z + 2.3);
    this.physics.addBox(x - 0.45, y, z - 0.45, x + 0.45, y + 2.6, z + 0.45);
  }

  stall(x, z, rotY, color) {
    const y = terrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    part(g, box(3, 0.9, 1.2), WOOD, { p: [0, 0.45, 0] });
    for (const sx of [-1.4, 1.4]) for (const sz of [-0.55, 0.55]) part(g, box(0.1, 2.4, 0.1), shade(WOOD, 0.8), { p: [sx, 1.2, sz] });
    for (let i = 0; i < 6; i++) part(g, box(0.5, 0.12, 1.4), i % 2 ? 0xffffff : color, { p: [-1.25 + i * 0.5, 2.5, 0], r: [0.18, 0, 0] });
    for (let i = 0; i < 5; i++) part(g, SPHERE_LOW, this.pick([0xe0502e, 0xf0b030, 0x8fbf3a, 0xd0303a]), { p: [-1.1 + i * 0.55, 1.02, this.r(-0.3, 0.3)], s: [0.25, 0.14, 0.25] });
    this.statics.add(g);
    const w = Math.abs(Math.cos(rotY)) > 0.5 ? 3 : 1.2;
    const d = Math.abs(Math.cos(rotY)) > 0.5 ? 1.2 : 3;
    this.physics.addBox(x - w / 2, y, z - d / 2, x + w / 2, y + 1, z + d / 2);
  }

  parasolTable(x, z, color) {
    const y = terrainHeight(x, z);
    part(this.statics, cyl(0.5, 0.5, 0.06, 12), 0xf2f2f2, { p: [x, y + 0.75, z] });
    part(this.statics, cyl(0.05, 0.05, 2.3, 6), 0xdddddd, { p: [x, y + 1.15, z] });
    part(this.statics, new THREE.ConeGeometry(1.6, 0.6, 8), color, { p: [x, y + 2.45, z] });
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI + 0.4;
      part(this.statics, box(0.45, 0.06, 0.45), 0x2d2d2d, { p: [x + Math.cos(a) * 0.8, y + 0.45, z + Math.sin(a) * 0.8] });
    }
    this.physics.addBox(x - 0.5, y, z - 0.5, x + 0.5, y + 0.8, z + 0.5);
  }

  crate(x, z, s = 1.1, stackY = null) {
    const y = stackY ?? terrainHeight(x, z);
    part(this.statics, rbox(s, s, s, 0.04), 0xa87b48, { p: [x, y + s / 2, z], r: [0, this.r(-0.2, 0.2), 0] });
    part(this.statics, box(s + 0.02, 0.1, s + 0.02), 0x6f4f2c, { p: [x, y + s * 0.2, z] });
    part(this.statics, box(s + 0.02, 0.1, s + 0.02), 0x6f4f2c, { p: [x, y + s * 0.8, z] });
    this.physics.addBox(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2);
    return y + s;
  }

  barrel(x, z) {
    const y = terrainHeight(x, z);
    const c = this.pick([0x7a4f2c, 0x5d7040, 0x8a3b2e]);
    part(this.statics, cyl(0.42, 0.42, 1.1, 12), c, { p: [x, y + 0.55, z] });
    for (const h of [0.2, 0.9]) part(this.statics, cyl(0.44, 0.44, 0.07, 12), 0x3b3b3b, { p: [x, y + h, z], metal: 0.5 });
    this.physics.addBox(x - 0.4, y, z - 0.4, x + 0.4, y + 1.1, z + 0.4);
  }

  sandbags(x, z, length, rotY = 0) {
    const n = Math.round(length / 0.9);
    const dir = [Math.cos(rotY), -Math.sin(rotY)];
    const y = terrainHeight(x, z);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < n - (row % 2); i++) {
        const t = (i - (n - 1) / 2 + (row % 2) * 0.5) * 0.9;
        const px = x + dir[0] * t;
        const pz = z + dir[1] * t;
        part(this.statics, rbox(0.95, 0.32, 0.55, 0.14), shade(SANDBAG, 0.92 + this.rand() * 0.15), { p: [px, terrainHeight(px, pz) + 0.16 + row * 0.3, pz], r: [0, rotY + this.r(-0.08, 0.08), 0] });
      }
    }
    const hl = (n * 0.9) / 2;
    const ex = Math.abs(dir[0]) * hl + Math.abs(dir[1]) * 0.35;
    const ez = Math.abs(dir[1]) * hl + Math.abs(dir[0]) * 0.35;
    this.physics.addBox(x - ex, y - 0.5, z - ez, x + ex, y + 0.95, z + ez, 'cover');
  }

  stoneWall(x1, z1, x2, z2, h = 0.9) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const n = Math.ceil(len / 2);
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const cx = x1 + dx * (t0 + t1) / 2;
      const cz = z1 + dz * (t0 + t1) / 2;
      const segL = len / n;
      const alongX = Math.abs(dx) >= Math.abs(dz);
      this.block(cx, cz, alongX ? segL + 0.1 : 0.7, alongX ? 0.7 : segL + 0.1, h + this.r(-0.1, 0.1), shade(STONE, 0.9 + this.rand() * 0.15), { round: 0.15, footprint: false });
    }
  }

  fence(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / 2.2));
    const ang = Math.atan2(-dz, dx);
    for (let i = 0; i <= n; i++) {
      const px = x1 + (dx * i) / n;
      const pz = z1 + (dz * i) / n;
      part(this.statics, box(0.16, 1.2, 0.16), WOOD, { p: [px, terrainHeight(px, pz) + 0.6, pz] });
      if (i < n) {
        const mx = x1 + (dx * (i + 0.5)) / n;
        const mz = z1 + (dz * (i + 0.5)) / n;
        const my = terrainHeight(mx, mz);
        for (const hy of [0.45, 0.95]) part(this.statics, box(len / n, 0.12, 0.06), shade(WOOD, 1.1), { p: [mx, my + hy, mz], r: [0, ang, 0] });
      }
    }
    const minX = Math.min(x1, x2) - 0.1, maxX = Math.max(x1, x2) + 0.1;
    const minZ = Math.min(z1, z2) - 0.1, maxZ = Math.max(z1, z2) + 0.1;
    const y = Math.min(terrainHeight(x1, z1), terrainHeight(x2, z2));
    this.physics.addBox(minX, y - 0.3, minZ, maxX, y + 1.1, maxZ, 'nobullet');
  }

  hayBale(x, z, rot = 0) {
    const y = terrainHeight(x, z);
    part(this.statics, cyl(0.75, 0.75, 1.3, 14), 0xdcbc62, { p: [x, y + 0.75, z], r: [0, rot, Math.PI / 2] });
    part(this.statics, cyl(0.6, 0.6, 1.32, 12), 0xc9a64c, { p: [x, y + 0.75, z], r: [0, rot, Math.PI / 2] });
    const alongX = Math.abs(Math.cos(rot)) > 0.7;
    this.physics.addBox(x - (alongX ? 0.65 : 0.75), y, z - (alongX ? 0.75 : 0.65), x + (alongX ? 0.65 : 0.75), y + 1.5, z + (alongX ? 0.75 : 0.65));
  }

  oliveTree(x, z, s = 1) {
    const y = terrainHeight(x, z);
    part(this.statics, cyl(0.18 * s, 0.32 * s, 2.2 * s, 7), 0x6e5a44, { p: [x, y + 1.1 * s, z], r: [this.r(-0.15, 0.15), 0, this.r(-0.15, 0.15)] });
    const leaf = this.pick([0x7f9150, 0x8a9a5b, 0x74874a]);
    for (let i = 0; i < 4; i++) {
      part(this.statics, SPHERE_LOW, shade(leaf, 0.9 + this.rand() * 0.2), {
        p: [x + this.r(-1, 1) * s, y + (2.4 + this.r(0, 0.9)) * s, z + this.r(-1, 1) * s],
        s: [this.r(1.1, 1.6) * s, this.r(0.8, 1.1) * s, this.r(1.1, 1.6) * s],
      });
    }
    this.physics.addBox(x - 0.3, y, z - 0.3, x + 0.3, y + 2.4 * s, z + 0.3);
  }

  cypress(x, z, s = 1) {
    const y = terrainHeight(x, z);
    part(this.statics, cyl(0.15, 0.2, 1.2, 6), 0x5a4633, { p: [x, y + 0.6, z] });
    part(this.statics, SPHERE_LOW, this.pick([0x3f5e2e, 0x355428, 0x4a6a34]), { p: [x, y + 4.2 * s, z], s: [0.95 * s, 3.8 * s, 0.95 * s] });
    this.physics.addBox(x - 0.35, y, z - 0.35, x + 0.35, y + 6 * s, z + 0.35);
  }

  bush(x, z) {
    const y = terrainHeight(x, z);
    const c = this.pick([0x6f8f3e, 0x5f7f36, 0x87a04a]);
    for (let i = 0; i < 3; i++) part(this.statics, SPHERE_LOW, shade(c, 0.9 + this.rand() * 0.2), { p: [x + this.r(-0.5, 0.5), y + 0.4, z + this.r(-0.5, 0.5)], s: [this.r(0.6, 0.9), this.r(0.45, 0.7), this.r(0.6, 0.9)], shadow: false });
  }

  rock(x, z) {
    const y = terrainHeight(x, z);
    const s = this.r(0.6, 1.6);
    part(this.statics, new THREE.DodecahedronGeometry(1, 0), this.pick([0xa8a39a, 0x9a958c, 0xb5afa4]), { p: [x, y + s * 0.3, z], s: [s * 1.3, s * 0.7, s], r: [this.r(0, 3), this.r(0, 3), 0] });
    if (s > 1) this.physics.addBox(x - s, y, z - s * 0.8, x + s, y + s * 0.8, z + s * 0.8);
  }

  // ---------- zones ----------
  buildVillage() {
    this.fountain(0, 2);
    // Maisons autour de la place
    const H = [
      [-16, 20, 9, 7, 2, 1], [16, 22, 8, 8, 2, 1],
      [-15, -16, 9, 7, 2, 0], [15, -17, 9, 8, 2, 0],
      [-24, 13, 7, 9, 2, 3], [-24, -12, 8, 8, 2, 3],
      [25, 17, 7, 9, 2, 2], [25, -10, 8, 8, 1, 2],
      [-40, 22, 8, 6, 1, 1], [-44, -24, 7, 7, 2, 0], [38, -26, 9, 7, 2, 0], [42, 30, 7, 8, 1, 1],
      [-18, 44, 8, 7, 2, 1], [22, 50, 8, 7, 1, 1], [-14, -44, 9, 7, 1, 0], [18, -44, 7, 8, 2, 0],
      [-31, 36, 6, 6, 1, 1], [34, -44, 6, 6, 1, 0], [-36, -40, 7, 6, 1, 0], [36, 44, 6, 7, 2, 1],
    ];
    for (const [x, z, w, d, f, door] of H) this.house(x, z, w, d, f, { door });
    this.bellTower(10, 30);
    this.house(19.5, 31, 12, 8, 2, { wall: 0xe8dcc0, roof: 0xb5552f, door: 1 });
    // Mobilier de la place
    this.stall(-8, 10, 0, 0xd8454f);
    this.stall(9, -6, Math.PI / 2, 0x3a78c8);
    this.parasolTable(-9, -7, 0xd8454f);
    this.parasolTable(-6, -9, 0xf0f0f0);
    this.parasolTable(8, 11, 0x3a78c8);
    this.crate(-11.5, 14.5);
    this.crate(-12.8, 14.5);
    this.crate(-12.1, 14.5, 1, this.crate(-12.1, 15.8));
    this.barrel(11.5, 14);
    this.barrel(12.4, 13.2);
    this.barrel(-11, -12.5);
    this.sandbags(-5, -2, 4, Math.PI / 2);
    this.sandbags(5.5, 6, 4, Math.PI / 2);
    this.sandbags(0, -9.5, 5, 0);
    this.crate(4, -12);
    this.crate(-4.5, 12.5);
    // Rangées de cyprès le long de la route du nord et du sud
    for (let z = 58; z < 100; z += 8) {
      this.cypress(-5.5, z, this.r(0.9, 1.15));
      this.cypress(5.5, z + 3, this.r(0.9, 1.15));
    }
    for (let z = -58; z > -96; z -= 8) {
      this.cypress(-5.5, z, this.r(0.9, 1.15));
      this.cypress(6.5, z - 3, this.r(0.9, 1.15));
    }
    // Murets de pierre entre les champs
    this.stoneWall(-60, 30, -30, 30);
    this.stoneWall(30, -30, 55, -30);
    this.stoneWall(-50, -45, -25, -45);
    this.stoneWall(25, 60, 45, 60);
    this.stoneWall(-18, 70, -18, 95);
    this.stoneWall(18, -70, 18, -95);
    this.stoneWall(-85, 40, -85, 70);
    this.stoneWall(85, -40, 85, -70);
  }

  buildWindmill(x, z) {
    const [lo, hi] = this.groundRange(x, z, 6, 6);
    const H = 10;
    part(this.statics, cyl(2.5, 3.3, H + hi - lo + 0.5, 16), 0xf2eadb, { p: [x, (lo - 0.5 + hi + H) / 2, z], receive: true });
    part(this.statics, cyl(3.4, 3.5, 0.8, 16), STONE, { p: [x, hi + 0.2, z] });
    part(this.statics, new THREE.ConeGeometry(2.9, 3.2, 16), 0x8a5a3a, { p: [x, hi + H + 1.5, z] });
    part(this.statics, box(0.3, 2.3, 1.3), 0x6a4428, { p: [x + 3.15, hi + 1.15, z] });
    for (const hy of [4, 7]) part(this.statics, box(0.3, 1, 0.8), 0x33414d, { p: [x + 2.9 - (hy - 4) * 0.12, hi + hy, z] });
    this.physics.addBox(x - 3, lo - 0.5, z - 3, x + 3, hi + H + 3, z + 3);
    this.footprints.push({ x, z, w: 9, d: 9 });
    // Ailes (animées)
    const pivot = new THREE.Group();
    pivot.position.set(x, hi + H - 0.6, z);
    pivot.rotation.y = Math.PI / 2; // ailes tournées vers le village (+X)
    this.scene.add(pivot);
    const hub = new THREE.Group();
    hub.position.set(0, 0, 2.9);
    pivot.add(hub);
    part(hub, cyl(0.35, 0.35, 0.6, 10), 0x5a3a22, { r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      part(arm, box(0.18, 6.4, 0.12), WOOD, { p: [0, 3.3, 0.25] });
      part(arm, box(1.3, 5, 0.05), 0xefe8da, { p: [0.72, 3.8, 0.3] });
      for (let k = 0; k < 5; k++) part(arm, box(1.4, 0.06, 0.07), WOOD, { p: [0.72, 1.5 + k * 1.15, 0.33] });
      hub.add(arm);
    }
    hub.traverse((o) => (o.castShadow = true));
    this.updatables.push((dt) => (hub.rotation.z += dt * 0.6));
    // Abords
    this.house(-60, -20, 6, 5, 1, { door: 1 });
    this.hayBale(-62, 2, 0.3);
    this.hayBale(-60.5, 3.2, 1.2);
    this.hayBale(-80, -14, 0);
    this.sandbags(-66, -15, 4, 0);
    this.sandbags(-72, 6, 5, 0.2);
    this.crate(-58, -8);
    this.crate(-57, -9.2);
    this.stoneWall(-88, -22, -80, -22);
    this.stoneWall(-56, 8, -50, 14);
  }

  buildFarm() {
    // Grange
    const bx = 76, bz = 20, bw = 14, bd = 9;
    const [lo, hi] = this.groundRange(bx, bz, bw, bd);
    const top = hi + 6.5;
    const red = 0x9a4a32;
    part(this.statics, box(bw, top - lo + 0.4, bd), red, { p: [bx, (lo - 0.4 + top) / 2, bz], receive: true });
    for (let i = 0; i <= 7; i++) part(this.statics, box(0.12, top - hi, 0.1), shade(red, 0.8), { p: [bx - bw / 2 + i * 2, (hi + top) / 2, bz - bd / 2 - 0.05] });
    part(this.statics, box(4, 4.5, 0.2), 0x7a3826, { p: [bx, hi + 2.25, bz - bd / 2 - 0.08] });
    part(this.statics, box(4.1, 0.25, 0.25), 0xf2eadb, { p: [bx, hi + 4.6, bz - bd / 2 - 0.1] });
    part(this.statics, box(0.25, 4.5, 0.25), 0xf2eadb, { p: [bx - 2, hi + 2.25, bz - bd / 2 - 0.1] });
    part(this.statics, box(0.25, 4.5, 0.25), 0xf2eadb, { p: [bx + 2, hi + 2.25, bz - bd / 2 - 0.1] });
    this.gableRoof(bx, top, bz, bd + 1, bw + 0.8, 3.4, true, 0x6d5a4a);
    this.physics.addBox(bx - bw / 2, lo - 0.4, bz - bd / 2, bx + bw / 2, top + 3.4, bz + bd / 2);
    this.footprints.push({ x: bx, z: bz, w: bw + 3, d: bd + 3 });
    // Ferme + dépendances
    this.house(56, 26, 8, 7, 2, { door: 0, wall: 0xe8c99c });
    this.house(80, 2, 6, 6, 1, { door: 3 });
    // Château d'eau en bois
    const wx = 58, wz = -2;
    const wy = terrainHeight(wx, wz);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(this.statics, box(0.25, 6, 0.25), WOOD, { p: [wx + dx * 1.2, wy + 3, wz + dz * 1.2] });
    part(this.statics, cyl(1.9, 1.9, 2.6, 16), 0x7a5232, { p: [wx, wy + 7.3, wz] });
    part(this.statics, new THREE.ConeGeometry(2.2, 1.3, 16), 0x5a4a3a, { p: [wx, wy + 9.25, wz] });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.physics.addBox(wx + dx * 1.2 - 0.15, wy, wz + dz * 1.2 - 0.15, wx + dx * 1.2 + 0.15, wy + 6, wz + dz * 1.2 + 0.15);
    // Bottes de foin, clôtures, abreuvoir
    this.hayBale(64, 6, 0);
    this.hayBale(65.6, 6.2, 0.2);
    this.hayBale(64.8, 7.4, 1.4);
    this.hayBale(70, 2, 1.57);
    this.hayBale(60, 16, 0.7);
    this.hayBale(73, 11, 0.1);
    this.fence(84, -14, 96, -14);
    this.fence(96, -14, 96, 8);
    this.fence(84, -14, 84, -4);
    this.fence(46, 36, 66, 36);
    this.sandbags(62, 12, 4, Math.PI / 2);
    this.sandbags(70, 16, 4, 0);
    this.crate(68, 24);
    this.crate(69.2, 24.3);
    this.barrel(58, 9);
    this.barrel(58.8, 9.9);
    const ty = terrainHeight(72, -2);
    part(this.statics, box(3, 0.8, 1), 0x7a5232, { p: [72, ty + 0.4, -2] });
    part(this.statics, box(2.8, 0.1, 0.8), 0x4f9ccf, { p: [72, ty + 0.75, -2], rough: 0.15 });
    this.physics.addBox(70.5, ty, -2.5, 73.5, ty + 0.8, -1.5);
  }

  buildBase(teamId) {
    const b = MAP.bases[teamId];
    const team = TEAMS[teamId];
    const s = b.z > 0 ? -1 : 1; // direction de l'ennemi (+z pour les bleus)
    const x = b.x;
    const z = b.z;
    // Murs de sacs de sable avec ouvertures
    this.sandbags(x - 14, z + s * 12, 12, 0);
    this.sandbags(x + 14, z + s * 12, 12, 0);
    this.sandbags(x - 21, z + s * 2, 10, Math.PI / 2);
    this.sandbags(x + 21, z + s * 2, 10, Math.PI / 2);
    // Tentes
    for (const dx of [-12, 12]) {
      const tx = x + dx;
      const tz = z - s * 7;
      const ty = terrainHeight(tx, tz);
      const tent = new THREE.Shape();
      tent.moveTo(-2.6, 0);
      tent.lineTo(2.6, 0);
      tent.lineTo(0, 2.6);
      tent.closePath();
      const g = new THREE.ExtrudeGeometry(tent, { depth: 5, bevelEnabled: false });
      g.translate(0, 0, -2.5);
      part(this.statics, g, 0x5f6b45, { p: [tx, ty, tz] });
      part(this.statics, emblemGeometry(team.emblem), 0xffffff, { p: [tx, ty + 1.1, tz + 2.52], s: 0.7, shadow: false });
      this.physics.addBox(tx - 2.4, ty, tz - 2.5, tx + 2.4, ty + 2.4, tz + 2.5);
    }
    // Caisses de ravitaillement
    this.crate(x - 5, z - s * 12);
    this.crate(x - 3.8, z - s * 12);
    this.crate(x - 4.4, z - s * 12, 1.1, this.crate(x - 4.4, z - s * 13.2));
    this.crate(x + 5, z - s * 12.5);
    this.barrel(x + 6.5, z - s * 11.5);
    this.barrel(x + 7.3, z - s * 12.3);
    // Mât et drapeau
    const fy = terrainHeight(x, z - s * 3);
    part(this.statics, cyl(0.1, 0.12, 9, 8), 0xdddddd, { p: [x, fy + 4.5, z - s * 3], metal: 0.6, rough: 0.3 });
    part(this.statics, SPHERE_LOW, 0xd8b04a, { p: [x, fy + 9.1, z - s * 3], s: 0.18, metal: 0.8 });
    const flag = this.makeFlag(team.flag, team.emblem);
    flag.position.set(x + 0.1, fy + 7.6, z - s * 3);
    this.scene.add(flag);
    // Plateformes des véhicules
    for (const v of MAP.vehicles.filter((v) => v.team === teamId)) {
      const vy = terrainHeight(v.x, v.z);
      part(this.statics, cyl(3.4, 3.4, 0.12, 20), 0x9a9486, { p: [v.x, vy + 0.03, v.z], receive: true, shadow: false });
    }
  }

  makeFlag(color, emblem) {
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(2.6, 1.6, 12, 6);
    geo.translate(1.3, 0, 0);
    const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.9 });
    const cloth = new THREE.Mesh(geo, mat);
    cloth.castShadow = true;
    g.add(cloth);
    const em = new THREE.Mesh(emblemGeometry(emblem), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    em.scale.setScalar(0.55);
    em.position.set(1.3, 0, 0.02);
    g.add(em);
    const base = geo.attributes.position.array.slice();
    const t0 = this.rand() * 10;
    this.updatables.push((dt, time) => {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        p.setZ(i, Math.sin(x * 2.2 - (time + t0) * 5) * 0.12 * x * 0.5 + Math.sin(y * 3 + time * 3) * 0.02 * x);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
      em.position.z = p.getZ(Math.floor(p.count / 2)) + 0.02;
    });
    g.userData.cloth = cloth;
    return g;
  }

  buildScatter() {
    const isFree = (x, z, margin) => {
      if (distToRoad(x, z) < 4.5) return false;
      for (const f of this.footprints) {
        if (Math.abs(x - f.x) < f.w / 2 + margin && Math.abs(z - f.z) < f.d / 2 + margin) return false;
      }
      for (const p of MAP.points) if (Math.hypot(x - p.x, z - p.z) < p.radius + 2) return false;
      for (const b of Object.values(MAP.bases)) if (Math.hypot(x - b.x, z - b.z) < 24) return false;
      if (Math.hypot(x, z - 2) < 15) return false;
      return true;
    };
    const B = MAP.bounds;
    let placed = 0;
    for (let i = 0; i < 900 && placed < 120; i++) {
      const x = this.r(B.minX + 3, B.maxX - 3);
      const z = this.r(B.minZ + 3, B.maxZ - 3);
      if (!isFree(x, z, 2)) continue;
      this.oliveTree(x, z, this.r(0.8, 1.25));
      this.footprints.push({ x, z, w: 3, d: 3 });
      placed++;
    }
    placed = 0;
    for (let i = 0; i < 400 && placed < 28; i++) {
      const x = this.r(B.minX + 3, B.maxX - 3);
      const z = this.r(B.minZ + 3, B.maxZ - 3);
      if (!isFree(x, z, 1.5)) continue;
      this.cypress(x, z, this.r(0.8, 1.2));
      this.footprints.push({ x, z, w: 2, d: 2 });
      placed++;
    }
    for (let i = 0; i < 90; i++) {
      const x = this.r(B.minX, B.maxX);
      const z = this.r(B.minZ, B.maxZ);
      if (!isFree(x, z, 0.5)) continue;
      this.bush(x, z);
    }
    for (let i = 0; i < 40; i++) {
      const x = this.r(B.minX, B.maxX);
      const z = this.r(B.minZ, B.maxZ);
      if (!isFree(x, z, 1)) continue;
      this.rock(x, z);
    }
    // Arbres hors limites (décor)
    for (let i = 0; i < 70; i++) {
      const a = this.r(0, Math.PI * 2);
      const d = this.r(150, 210);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d * 1.1;
      const y = terrainHeight(x, z);
      part(this.statics, SPHERE_LOW, this.pick([0x5f7f36, 0x6f8f3e, 0x3f5e2e]), { p: [x, y + 3, z], s: [this.r(2.5, 4), this.r(3, 5), this.r(2.5, 4)], shadow: false });
    }
  }

  update(dt, time) {
    for (const u of this.updatables) u(dt, time);
    if (this.clouds) this.clouds.rotation.y += dt * 0.002;
  }
}
