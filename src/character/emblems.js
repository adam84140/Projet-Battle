import * as THREE from 'three';

// Emblèmes d'équipe décrits comme des polygones dans un carré [-1, 1].
// Les mêmes données servent pour la 3D (ShapeGeometry) et pour l'interface (SVG).

function mirror(poly) {
  return poly.map(([x, y]) => [-x, y]).reverse();
}

const EAGLE_BODY = [
  [0, 0.62],
  [0.13, 0.42],
  [0.15, 0.1],
  [0.1, -0.35],
  [0, -0.8],
  [-0.1, -0.35],
  [-0.15, 0.1],
  [-0.13, 0.42],
];
const EAGLE_WING = [
  [
    [0.2, 0.36],
    [0.98, 0.9],
    [0.94, 0.62],
    [0.22, 0.12],
  ],
  [
    [0.21, 0.04],
    [0.86, 0.48],
    [0.8, 0.22],
    [0.21, -0.2],
  ],
  [
    [0.2, -0.28],
    [0.68, 0.04],
    [0.6, -0.18],
    [0.17, -0.5],
  ],
];

function starPoly(outer = 0.95, inner = 0.4, points = 5) {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + (i * Math.PI) / points;
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

export function emblemPolygons(type) {
  if (type === 'star') return [starPoly()];
  return [EAGLE_BODY, ...EAGLE_WING, ...EAGLE_WING.map(mirror)];
}

export function emblemGeometry(type) {
  const shapes = emblemPolygons(type).map((poly) => {
    const s = new THREE.Shape();
    poly.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
    s.closePath();
    return s;
  });
  return new THREE.ShapeGeometry(shapes);
}

export function emblemSVG(type, color = '#fff', size = 24) {
  const paths = emblemPolygons(type)
    .map((poly) => 'M' + poly.map(([x, y]) => `${x.toFixed(3)} ${(-y).toFixed(3)}`).join('L') + 'Z')
    .join('');
  return `<svg class="emblem" viewBox="-1.05 -1.05 2.1 2.1" width="${size}" height="${size}" aria-hidden="true"><path d="${paths}" fill="${color}"/></svg>`;
}
