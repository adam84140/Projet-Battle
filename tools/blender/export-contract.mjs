// Copie JSON du contrat d'asset (src/character/rigContract.js) pour les scripts Blender (Python).
// La source reste rigContract.js : régénérer après toute modification du contrat.
// Usage : node tools/blender/export-contract.mjs            (écrit tools/blender/rig_contract.json)
//         node tools/blender/export-contract.mjs --check    (code 1 si le fichier n'est pas à jour)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as C from '../../src/character/rigContract.js';
import { emblemPolygons } from '../../src/character/emblems.js';

export function contractJson() {
  const data = {
    version: C.RIG_CONTRACT_VERSION,
    note: 'Généré depuis src/character/rigContract.js par tools/blender/export-contract.mjs : ne pas modifier à la main.',
    requiredBones: C.REQUIRED_BONES,
    optionalBones: C.OPTIONAL_BONES,
    sockets: C.SOCKETS,
    asset: { ...C.ASSET, accessoryPattern: C.ASSET.accessoryPattern.source },
    teamMask: C.TEAM_MASK,
    animation: C.ANIMATION_CONTRACT,
    fps: C.FPS,
    morphTargets: C.MORPH_TARGETS,
    // emblèmes canoniques (D-011), polygones dans [-1, 1] : aperçus de rendu dans Blender
    emblems: { eagle: emblemPolygons('eagle'), star: emblemPolygons('star') },
  };
  return JSON.stringify(data, null, 1) + '\n';
}

const file = fileURLToPath(new URL('./rig_contract.json', import.meta.url));
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = contractJson();
  if (process.argv.includes('--check')) {
    let old = '';
    try {
      old = readFileSync(file, 'utf8');
    } catch {}
    if (old !== text) {
      console.error('tools/blender/rig_contract.json n’est pas à jour : lancer node tools/blender/export-contract.mjs');
      process.exit(1);
    }
    console.log('rig_contract.json à jour');
  } else {
    writeFileSync(file, text);
    console.log(`écrit : ${file}`);
  }
}
