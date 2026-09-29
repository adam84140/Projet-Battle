// Chemin de rendu des soldats en jeu (modèles fusionnés, option `bake`).
// Étape M1 du Master Assault : voir docs/characters/MASTER-ASSAULT-M1.md.
//  - LEGACY_RENDER_PATH : fusion par os (référence M0), 18 maillages visibles par soldat ;
//  - M1_OPTIMIZED_RENDER_PATH : corps entier en un SkinnedMesh lié au squelette de gameplay
//    existant (mêmes os, mêmes animations), arme et chargeur à part : 3 maillages visibles.
// Les personnages non fusionnés (menu, fiche, portraits) ne sont pas concernés.
export const LEGACY_RENDER_PATH = 'LEGACY_RENDER_PATH';
export const M1_OPTIMIZED_RENDER_PATH = 'M1_OPTIMIZED_RENDER_PATH';

// Chemin par défaut. Repli immédiat sur la référence M0 : remplacer par LEGACY_RENDER_PATH.
const DEFAULT_RENDER_PATH = M1_OPTIMIZED_RENDER_PATH;

// Surcharge pour les tests et la comparaison : ?rendu=legacy|m1 dans l'adresse,
// ou window.__RENDU (injecté par tests/lib.mjs quand la variable RENDU est définie).
function fromEnvironment() {
  let v = null;
  try {
    v = new URLSearchParams(globalThis.location?.search || '').get('rendu') || globalThis.__RENDU || null;
  } catch {
    v = null;
  }
  if (v === 'legacy' || v === LEGACY_RENDER_PATH) return LEGACY_RENDER_PATH;
  if (v === 'm1' || v === M1_OPTIMIZED_RENDER_PATH) return M1_OPTIMIZED_RENDER_PATH;
  return null;
}

let current = fromEnvironment() || DEFAULT_RENDER_PATH;

export function getCharacterRenderPath() {
  return current;
}
