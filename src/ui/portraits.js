import * as THREE from 'three';
import { Character } from '../character/Character.js';
import { CLASS_ORDER, TEAMS } from '../config.js';

// Rend des portraits des classes dans des images (un seul contexte WebGL temporaire).

let shared = null;

function getRenderer(w, h) {
  if (!shared) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.92;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xe0ecff, 0x4a4030, 1.6));
    const key = new THREE.DirectionalLight(0xfff1dd, 2.6);
    key.position.set(2, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9cc2ff, 1.8);
    rim.position.set(-3, 2, -3);
    scene.add(rim);
    const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 20);
    shared = { renderer, scene, camera };
  }
  shared.renderer.setSize(w, h, false);
  shared.camera.aspect = w / h;
  shared.camera.updateProjectionMatrix();
  return shared;
}

export function renderPortraits(team, custom, { w = 320, h = 400, framing = 'body' } = {}) {
  const { renderer, scene, camera } = getRenderer(w, h);
  const out = {};
  for (const classId of CLASS_ORDER) {
    const c = new Character({ team, classId, custom, expression: 'confiant' });
    c.anim.hold = 'relaxed';
    c.root.rotation.y = -0.45;
    c.animator.setStatic(() => {});
    scene.add(c.root);
    c.root.updateMatrixWorld(true);
    if (framing === 'bust') {
      camera.position.set(0.25, 1.62, 2.4);
      camera.lookAt(0, 1.52, 0);
    } else {
      camera.position.set(0.3, 1.35, 4.2);
      camera.lookAt(0, 1.15, 0);
    }
    renderer.setClearColor(new THREE.Color(TEAMS[team].uiDark), 0);
    renderer.render(scene, camera);
    out[classId] = renderer.domElement.toDataURL('image/png');
    scene.remove(c.root);
  }
  return out;
}
