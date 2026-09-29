// Données de la carte "Village de Castelmare" et relief du terrain.

export const MAP = {
  name: 'Castelmare',
  bounds: { minX: -112, maxX: 112, minZ: -128, maxZ: 128 },
  bases: {
    blue: { x: 0, z: -112, yaw: 0 },
    red: { x: 0, z: 112, yaw: Math.PI },
  },
  points: [
    { id: 'A', name: 'Le Moulin', x: -68, z: -8, radius: 10 },
    // pole : décalage du mât (le centre de B est occupé par la fontaine)
    { id: 'B', name: 'Place du village', x: 0, z: 2, radius: 11, pole: [3.8, 0] },
    { id: 'C', name: 'La Ferme', x: 66, z: 12, radius: 11 },
  ],
  vehicles: [
    { type: 'jeep', team: 'blue', x: -4.5, z: -103, yaw: 0 },
    { type: 'tank', team: 'blue', x: 4.5, z: -106.5, yaw: 0 },
    { type: 'jeep', team: 'red', x: 4.5, z: 103, yaw: Math.PI },
    { type: 'tank', team: 'red', x: -4.5, z: 106.5, yaw: Math.PI },
  ],
  // Routes de terre (polylignes)
  roads: [
    [[0, -125], [0, -80], [2, -45], [0, -14]],
    [[0, 125], [0, 80], [-2, 45], [0, 16]],
    [[-14, 2], [-34, -2], [-52, -6], [-68, -8], [-90, -10]],
    [[14, 4], [34, 8], [50, 10], [66, 12], [92, 14]],
    [[0, -110], [-30, -92], [-52, -60], [-66, -24]],
    [[0, -110], [30, -94], [52, -64], [64, -8]],
    [[0, 110], [-32, 92], [-54, 62], [-68, 8]],
    [[0, 110], [30, 94], [54, 64], [66, 28]],
  ],
};

// Zones aplanies (village, points, bases)
const FLATS = [
  { x: 0, z: 2, r: 34, fall: 14 },
  { x: -68, z: -8, r: 16, fall: 12 },
  { x: 66, z: 12, r: 20, fall: 12 },
  { x: 0, z: -112, r: 20, fall: 12 },
  { x: 0, z: 112, r: 20, fall: 12 },
];

function rawHeight(x, z) {
  return (
    2.2 * Math.sin(x * 0.021 + 0.5) * Math.cos(z * 0.017) +
    1.1 * Math.sin(x * 0.047 + z * 0.031) +
    0.5 * Math.cos(x * 0.083 - z * 0.061) +
    0.8 * Math.sin(z * 0.035 - 1.2)
  );
}

for (const f of FLATS) f.h = rawHeight(f.x, f.z) * 0.4;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function terrainHeight(x, z) {
  let h = rawHeight(x, z);
  for (const f of FLATS) {
    const dx = x - f.x;
    const dz = z - f.z;
    const d2 = dx * dx + dz * dz;
    const lim = f.r + f.fall;
    if (d2 > lim * lim) continue;
    const t = smoothstep(f.r, lim, Math.sqrt(d2));
    h = f.h + (h - f.h) * t;
  }
  // Collines autour de la zone jouable
  const ex = Math.max(0, Math.abs(x) - 108);
  const ez = Math.max(0, Math.abs(z) - 124);
  const e = Math.hypot(ex, ez);
  if (e > 0) h += 20 * (1 - Math.exp(-e / 22)) + e * 0.08 + Math.sin(x * 0.05) * Math.cos(z * 0.04) * Math.min(1, e / 20) * 4;
  return h;
}

export function distToSegment(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const l2 = vx * vx + vz * vz;
  let t = l2 > 0 ? (wx * vx + wz * vz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = px - (ax + vx * t);
  const dz = pz - (az + vz * t);
  return Math.sqrt(dx * dx + dz * dz);
}

export function distToRoad(x, z) {
  let best = Infinity;
  for (const road of MAP.roads) {
    for (let i = 0; i < road.length - 1; i++) {
      const d = distToSegment(x, z, road[i][0], road[i][1], road[i + 1][0], road[i + 1][1]);
      if (d < best) best = d;
    }
  }
  return best;
}

// Générateur pseudo-aléatoire déterministe (même carte à chaque partie)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
