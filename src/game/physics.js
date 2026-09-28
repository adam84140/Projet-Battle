import * as THREE from 'three';
import { terrainHeight, MAP } from './map.js';

// Physique simple et rapide : boîtes alignées sur les axes (AABB) pour le décor,
// cylindres pour les personnages, relief analytique pour le sol.

export const GRAVITY = 24;
export const STEP = 0.45;

const CELL = 10;
const ORIGIN = -220;
const GRID = 44;

export class Physics {
  constructor() {
    this.colliders = [];
    this.cells = Array.from({ length: GRID * GRID }, () => []);
    this.stamp = 0;
    this.dynamic = []; // obstacles mobiles (véhicules)
  }

  cellIndex(cx, cz) {
    return cz * GRID + cx;
  }

  toCell(v) {
    return Math.max(0, Math.min(GRID - 1, Math.floor((v - ORIGIN) / CELL)));
  }

  addBox(minX, minY, minZ, maxX, maxY, maxZ, tag = 'solid') {
    const c = { min: new THREE.Vector3(minX, minY, minZ), max: new THREE.Vector3(maxX, maxY, maxZ), tag, id: this.colliders.length, mark: 0 };
    this.colliders.push(c);
    for (let cx = this.toCell(minX); cx <= this.toCell(maxX); cx++) {
      for (let cz = this.toCell(minZ); cz <= this.toCell(maxZ); cz++) this.cells[this.cellIndex(cx, cz)].push(c);
    }
    return c;
  }

  // Boîte centrée posée sur le sol (y = base)
  addBoxCentered(x, z, w, d, base, height, tag) {
    return this.addBox(x - w / 2, base, z - d / 2, x + w / 2, base + height, z + d / 2, tag);
  }

  query(minX, minZ, maxX, maxZ, out = []) {
    out.length = 0;
    this.stamp++;
    for (let cx = this.toCell(minX); cx <= this.toCell(maxX); cx++) {
      for (let cz = this.toCell(minZ); cz <= this.toCell(maxZ); cz++) {
        for (const c of this.cells[this.cellIndex(cx, cz)]) {
          if (c.mark === this.stamp) continue;
          c.mark = this.stamp;
          if (c.max.x < minX || c.min.x > maxX || c.max.z < minZ || c.min.z > maxZ) continue;
          out.push(c);
        }
      }
    }
    return out;
  }

  // Hauteur du sol sous un cercle : relief ou dessus d'une boîte franchissable
  groundHeight(x, z, feetY, radius = 0.3) {
    let g = terrainHeight(x, z);
    const list = this.query(x - radius, z - radius, x + radius, z + radius, _tmpList);
    for (const c of list) {
      if (c.max.y > g && c.max.y <= feetY + STEP && circleBox(x, z, radius * 0.7, c)) g = c.max.y;
    }
    return g;
  }

  // Déplace un corps cylindrique. body = { pos, vel, radius, height, grounded }
  moveBody(body, dt) {
    const p = body.pos;
    const v = body.vel;
    const wasGrounded = body.grounded;
    if (!body.grounded || v.y > 0) v.y -= GRAVITY * dt;
    p.x += v.x * dt;
    p.z += v.z * dt;
    p.y += v.y * dt;
    this.resolveHorizontal(body);
    // Limites de la carte
    const b = MAP.bounds;
    p.x = Math.max(b.minX, Math.min(b.maxX, p.x));
    p.z = Math.max(b.minZ, Math.min(b.maxZ, p.z));
    const g = this.groundHeight(p.x, p.z, p.y, body.radius);
    if (p.y <= g + 0.001 || (wasGrounded && v.y <= 0 && p.y - g < 0.55)) {
      p.y = g;
      if (v.y < 0) {
        body.landSpeed = -v.y;
        v.y = 0;
      }
      body.grounded = true;
    } else {
      body.grounded = false;
    }
    // Plafond (on se cogne sous une boîte)
    if (v.y > 0) {
      const list = this.query(p.x - body.radius, p.z - body.radius, p.x + body.radius, p.z + body.radius, _tmpList);
      for (const c of list) {
        if (c.min.y > p.y + 0.5 && c.min.y < p.y + body.height && circleBox(p.x, p.z, body.radius * 0.8, c)) {
          v.y = 0;
          p.y = c.min.y - body.height;
        }
      }
    }
  }

  resolveHorizontal(body) {
    const p = body.pos;
    const r = body.radius;
    for (let iter = 0; iter < 2; iter++) {
      const list = this.query(p.x - r, p.z - r, p.x + r, p.z + r, _tmpList);
      for (const c of list) {
        if (c.max.y <= p.y + STEP || c.min.y >= p.y + body.height) continue;
        pushOut(p, r, c, body.vel);
      }
      for (const c of this.dynamic) {
        if (c === body.ignore || !c.active || c.max.y <= p.y + STEP || c.min.y >= p.y + body.height) continue;
        if (c.max.x < p.x - r || c.min.x > p.x + r || c.max.z < p.z - r || c.min.z > p.z + r) continue;
        pushOut(p, r, c, body.vel);
      }
    }
  }

  // Lancer de rayon contre le décor (boîtes + relief). Renvoie la distance ou Infinity.
  raycast(origin, dir, maxDist, out, ignore = null) {
    let best = maxDist;
    let hitBox = null;
    // Parcours des cellules traversées (2D, algorithme d'Amanatides & Woo)
    this.stamp++;
    let cx = this.toCell(origin.x);
    let cz = this.toCell(origin.z);
    const stepX = dir.x > 0 ? 1 : -1;
    const stepZ = dir.z > 0 ? 1 : -1;
    const nextBX = ORIGIN + (cx + (stepX > 0 ? 1 : 0)) * CELL;
    const nextBZ = ORIGIN + (cz + (stepZ > 0 ? 1 : 0)) * CELL;
    let tMaxX = Math.abs(dir.x) > 1e-9 ? (nextBX - origin.x) / dir.x : Infinity;
    let tMaxZ = Math.abs(dir.z) > 1e-9 ? (nextBZ - origin.z) / dir.z : Infinity;
    const tDX = Math.abs(dir.x) > 1e-9 ? CELL / Math.abs(dir.x) : Infinity;
    const tDZ = Math.abs(dir.z) > 1e-9 ? CELL / Math.abs(dir.z) : Infinity;
    let tCell = 0;
    for (let guard = 0; guard < 200; guard++) {
      if (cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) break;
      for (const c of this.cells[this.cellIndex(cx, cz)]) {
        if (c.mark === this.stamp) continue;
        c.mark = this.stamp;
        if (c.tag === 'nobullet') continue;
        const t = rayBox(origin, dir, c.min, c.max);
        if (t >= 0 && t < best) {
          best = t;
          hitBox = c;
        }
      }
      const tExit = Math.min(tMaxX, tMaxZ);
      if (best <= tExit || tExit > maxDist) break;
      tCell = tExit;
      if (tMaxX < tMaxZ) {
        tMaxX += tDX;
        cx += stepX;
      } else {
        tMaxZ += tDZ;
        cz += stepZ;
      }
    }
    for (const c of this.dynamic) {
      if (c === ignore || !c.active) continue;
      const t = rayBox(origin, dir, c.min, c.max);
      if (t >= 0 && t < best) {
        best = t;
        hitBox = c;
      }
    }
    void tCell;
    const tTerrain = this.raycastTerrain(origin, dir, best);
    if (tTerrain < best) {
      best = tTerrain;
      hitBox = null;
    }
    if (out) {
      out.t = best;
      out.box = hitBox;
      out.terrain = best < maxDist && !hitBox;
    }
    return best < maxDist ? best : Infinity;
  }

  raycastTerrain(origin, dir, maxDist) {
    const step = 1.25;
    let prevT = 0;
    let prevD = origin.y - terrainHeight(origin.x, origin.z);
    if (prevD < 0) return 0;
    for (let t = step; t <= maxDist + step; t += step) {
      const tt = Math.min(t, maxDist);
      const x = origin.x + dir.x * tt;
      const y = origin.y + dir.y * tt;
      const z = origin.z + dir.z * tt;
      const d = y - terrainHeight(x, z);
      if (d < 0) {
        // affinage par dichotomie
        let a = prevT, b = tt;
        for (let i = 0; i < 6; i++) {
          const m = (a + b) / 2;
          const dm = origin.y + dir.y * m - terrainHeight(origin.x + dir.x * m, origin.z + dir.z * m);
          if (dm < 0) b = m;
          else a = m;
        }
        return (a + b) / 2;
      }
      prevT = tt;
      prevD = d;
      if (tt >= maxDist) break;
    }
    void prevD;
    return Infinity;
  }

  lineOfSight(a, b) {
    _dir.subVectors(b, a);
    const len = _dir.length();
    if (len < 1e-3) return true;
    _dir.divideScalar(len);
    return this.raycast(a, _dir, len - 0.05) === Infinity;
  }
}

const _tmpList = [];
const _dir = new THREE.Vector3();

export function circleBox(x, z, r, c) {
  const cx = Math.max(c.min.x, Math.min(x, c.max.x));
  const cz = Math.max(c.min.z, Math.min(z, c.max.z));
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

function pushOut(p, r, c, vel) {
  const cx = Math.max(c.min.x, Math.min(p.x, c.max.x));
  const cz = Math.max(c.min.z, Math.min(p.z, c.max.z));
  let dx = p.x - cx;
  let dz = p.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    const push = r - d;
    dx /= d;
    dz /= d;
    p.x += dx * push;
    p.z += dz * push;
    const vn = vel.x * dx + vel.z * dz;
    if (vn < 0) {
      vel.x -= vn * dx;
      vel.z -= vn * dz;
    }
  } else {
    // centre à l'intérieur : sortie par le côté le plus proche
    const l = p.x - c.min.x, rr = c.max.x - p.x, b = p.z - c.min.z, f = c.max.z - p.z;
    const m = Math.min(l, rr, b, f);
    if (m === l) p.x = c.min.x - r;
    else if (m === rr) p.x = c.max.x + r;
    else if (m === b) p.z = c.min.z - r;
    else p.z = c.max.z + r;
  }
  return true;
}

// Intersection rayon / boîte (méthode des "slabs"). Renvoie t >= 0 ou -1.
export function rayBox(o, d, min, max) {
  let tmin = -Infinity;
  let tmax = Infinity;
  for (const ax of ['x', 'y', 'z']) {
    if (Math.abs(d[ax]) < 1e-12) {
      if (o[ax] < min[ax] || o[ax] > max[ax]) return -1;
      continue;
    }
    const inv = 1 / d[ax];
    let t1 = (min[ax] - o[ax]) * inv;
    let t2 = (max[ax] - o[ax]) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmax < tmin) return -1;
  }
  if (tmax < 0) return -1;
  return tmin >= 0 ? tmin : 0;
}

// Rayon / sphère
export function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  if (t >= 0) return t;
  const t2 = -b + Math.sqrt(disc);
  return t2 >= 0 ? 0 : -1;
}
