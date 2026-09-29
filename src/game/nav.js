import * as THREE from 'three';
import { MAP, terrainHeight } from './map.js';

// Grille de navigation + A* pour les bots.

const SQRT2 = Math.SQRT2;

export class NavGrid {
  constructor(physics, cell = 1.5) {
    const b = MAP.bounds;
    this.cell = cell;
    this.minX = b.minX;
    this.minZ = b.minZ;
    this.w = Math.ceil((b.maxX - b.minX) / cell);
    this.h = Math.ceil((b.maxZ - b.minZ) / cell);
    const n = this.w * this.h;
    this.blocked = new Uint8Array(n);
    this.g = new Float32Array(n);
    this.f = new Float32Array(n);
    this.parent = new Int32Array(n);
    this.visit = new Uint32Array(n);
    this.closed = new Uint32Array(n);
    this.search = 0;
    this.heap = new Int32Array(n);
    this.dynCells = []; // cases bloquées temporairement (bit 2) : véhicules à l'arrêt
    this.build(physics);
  }

  // Obstacles temporaires (véhicules garés, épaves) : remplace l'ensemble précédent.
  // Bit 1 = décor fixe, bit 2 = temporaire ; toutes les recherches testent les deux.
  setDynamic(boxes, inflate = 0.55) {
    const b = this.blocked;
    for (const i of this.dynCells) b[i] &= ~2;
    this.dynCells.length = 0;
    for (const c of boxes) {
      const x0 = this.toCellX(c.min.x - inflate), x1 = this.toCellX(c.max.x + inflate);
      const z0 = this.toCellZ(c.min.z - inflate), z1 = this.toCellZ(c.max.z + inflate);
      for (let cz = z0; cz <= z1; cz++) {
        for (let cx = x0; cx <= x1; cx++) {
          const i = cz * this.w + cx;
          if (b[i] & 2) continue;
          b[i] |= 2;
          this.dynCells.push(i);
        }
      }
    }
  }

  build(physics) {
    const inflate = 0.55;
    for (const c of physics.colliders) {
      const x0 = this.toCellX(c.min.x - inflate);
      const x1 = this.toCellX(c.max.x + inflate);
      const z0 = this.toCellZ(c.min.z - inflate);
      const z1 = this.toCellZ(c.max.z + inflate);
      for (let cz = z0; cz <= z1; cz++) {
        for (let cx = x0; cx <= x1; cx++) {
          const wx = this.cellX(cx);
          const wz = this.cellZ(cz);
          const ground = terrainHeight(wx, wz);
          if (c.max.y - ground < 0.5) continue; // franchissable
          if (wx < c.min.x - inflate || wx > c.max.x + inflate || wz < c.min.z - inflate || wz > c.max.z + inflate) continue;
          this.blocked[cz * this.w + cx] = 1;
        }
      }
    }
    // Bords de carte
    for (let x = 0; x < this.w; x++) {
      this.blocked[x] = 1;
      this.blocked[(this.h - 1) * this.w + x] = 1;
    }
    for (let z = 0; z < this.h; z++) {
      this.blocked[z * this.w] = 1;
      this.blocked[z * this.w + this.w - 1] = 1;
    }
  }

  toCellX(x) {
    return Math.max(0, Math.min(this.w - 1, Math.floor((x - this.minX) / this.cell)));
  }
  toCellZ(z) {
    return Math.max(0, Math.min(this.h - 1, Math.floor((z - this.minZ) / this.cell)));
  }
  cellX(cx) {
    return this.minX + (cx + 0.5) * this.cell;
  }
  cellZ(cz) {
    return this.minZ + (cz + 0.5) * this.cell;
  }

  // Décor fixe uniquement (sans les véhicules garés)
  isStaticBlockedWorld(x, z) {
    return (this.blocked[this.toCellZ(z) * this.w + this.toCellX(x)] & 1) !== 0;
  }

  isBlockedWorld(x, z) {
    return this.blocked[this.toCellZ(z) * this.w + this.toCellX(x)] !== 0;
  }

  nearestFree(cx, cz) {
    if (!this.blocked[cz * this.w + cx]) return [cx, cz];
    for (let r = 1; r < 12; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const x = cx + dx;
          const z = cz + dz;
          if (x < 0 || z < 0 || x >= this.w || z >= this.h) continue;
          if (!this.blocked[z * this.w + x]) return [x, z];
        }
      }
    }
    return null;
  }

  // Ligne libre entre deux cellules (pour lisser le chemin)
  clearLine(x0, z0, x1, z1) {
    let dx = Math.abs(x1 - x0), dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1, sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;
    let x = x0, z = z0;
    for (let guard = 0; guard < 400; guard++) {
      if (this.blocked[z * this.w + x]) return false;
      if (x === x1 && z === z1) return true;
      const e2 = 2 * err;
      if (e2 > -dz) {
        err -= dz;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        z += sz;
      }
      // éviter de couper les coins
      if (this.blocked[z * this.w + x]) return false;
    }
    return false;
  }

  worldClear(a, b) {
    return this.clearLine(this.toCellX(a.x), this.toCellZ(a.z), this.toCellX(b.x), this.toCellZ(b.z));
  }

  findPath(from, to, maxIter = 9000) {
    const s0 = this.nearestFree(this.toCellX(from.x), this.toCellZ(from.z));
    const t0 = this.nearestFree(this.toCellX(to.x), this.toCellZ(to.z));
    if (!s0 || !t0) return null;
    const W = this.w;
    const start = s0[1] * W + s0[0];
    const goal = t0[1] * W + t0[0];
    const gx = t0[0], gz = t0[1];
    const id = ++this.search;
    const heap = this.heap;
    let hn = 0;
    const g = this.g, f = this.f, parent = this.parent, visit = this.visit, closed = this.closed, blocked = this.blocked;
    const hfun = (i) => {
      const x = i % W, z = (i / W) | 0;
      const dx = Math.abs(x - gx), dz = Math.abs(z - gz);
      return (dx + dz + (SQRT2 - 2) * Math.min(dx, dz)) * 1.05;
    };
    const push = (i) => {
      let k = hn++;
      heap[k] = i;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (f[heap[p]] <= f[heap[k]]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      heap[0] = heap[--hn];
      let k = 0;
      for (;;) {
        const l = 2 * k + 1, r = l + 1;
        let m = k;
        if (l < hn && f[heap[l]] < f[heap[m]]) m = l;
        if (r < hn && f[heap[r]] < f[heap[m]]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
      return top;
    };
    visit[start] = id;
    g[start] = 0;
    f[start] = hfun(start);
    parent[start] = -1;
    push(start);
    let found = false;
    let best = start;
    let bestH = Infinity;
    let iter = 0;
    while (hn > 0 && iter++ < maxIter) {
      const cur = pop();
      if (closed[cur] === id) continue;
      closed[cur] = id;
      if (cur === goal) {
        found = true;
        break;
      }
      const hc = f[cur] - g[cur];
      if (hc < bestH) {
        bestH = hc;
        best = cur;
      }
      const cx = cur % W, cz = (cur / W) | 0;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= this.h) continue;
          const ni = nz * W + nx;
          if (blocked[ni] || closed[ni] === id) continue;
          if (dx && dz && (blocked[cz * W + nx] || blocked[nz * W + cx])) continue;
          const ng = g[cur] + (dx && dz ? SQRT2 : 1);
          if (visit[ni] !== id || ng < g[ni]) {
            visit[ni] = id;
            g[ni] = ng;
            f[ni] = ng + hfun(ni);
            parent[ni] = cur;
            push(ni);
          }
        }
      }
    }
    let node = found ? goal : best;
    const cells = [];
    while (node !== -1 && cells.length < 2000) {
      cells.push(node);
      node = parent[node];
    }
    cells.reverse();
    // Lissage : on garde uniquement les points nécessaires
    const pts = [];
    let anchor = 0;
    pts.push(cells[0]);
    for (let i = 2; i < cells.length; i++) {
      const a = cells[anchor];
      if (!this.clearLine(a % W, (a / W) | 0, cells[i] % W, (cells[i] / W) | 0)) {
        pts.push(cells[i - 1]);
        anchor = i - 1;
      }
    }
    if (cells.length > 1) pts.push(cells[cells.length - 1]);
    const out = pts.slice(1).map((i) => new THREE.Vector3(this.cellX(i % W), 0, this.cellZ((i / W) | 0)));
    if (found && out.length) {
      // le dernier point devient la vraie destination si elle est libre
      if (!this.isBlockedWorld(to.x, to.z)) out[out.length - 1].set(to.x, 0, to.z);
    }
    return out;
  }
}
