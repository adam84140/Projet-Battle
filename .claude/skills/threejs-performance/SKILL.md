---
name: threejs-performance
description: Mesurer et améliorer les performances Three.js de Frontline Legends (coût logique par image, pics, appels de rendu, triangles, mémoire GPU, fuites) dans le scénario de référence 16v16. À utiliser avant et après toute optimisation, tout ajout de géométrie, de personnage, d'effet ou d'objet de décor.
---

# Performance Three.js — Frontline Legends

## Principe
**Mesurer d'abord, optimiser ensuite, mesurer encore.** Pas de réécriture spéculative. Le conteneur Cloud n'a pas de GPU (rendu logiciel) : on mesure la logique, les appels de rendu, les triangles et la mémoire ; les FPS réels restent à confirmer sur une vraie machine.

## Mesures (dans une page de test Playwright)
- **Logique** : chronométrer `g.update(1/30)` sur 1 800 à 3 600 images → moyenne, p99, max, nombre d'images > 16 ms.
- **Rendu** : `g.renderer.info.autoReset = false; g.renderer.info.reset(); g.render();` → `render.calls`, `render.triangles` (vue de jeu typique sur la place B, 4 directions).
- **Mémoire** : `g.renderer.info.memory.geometries` et `textures` sur 3 relances de partie : elles ne doivent pas croître.
- **16v16** : `window.__game.settings.mode = '16v16'` avant « Commencer ».
- **Pics** : envelopper la fonction suspecte (ex. `g.respawnBot`, `g.nav.findPath`) pour attribuer chaque image lente.

## Référence et objectifs (16v16)
Règle immédiate : **ne pas régresser** par rapport aux mesures de référence de [PERFORMANCE](../../../docs/systems/PERFORMANCE.md). Objectifs GOLD (pas encore tous atteints) :
| Mesure | Objectif GOLD |
| --- | --- |
| Logique moyenne | < 4 ms |
| Image logique max sur 2 min | < 16 ms |
| Appels de rendu, vue de jeu | ≤ 250 (≈ 450 à 700 aujourd'hui, surtout les 24 maillages par soldat) |
| Mémoire GPU sur 3 relances | stable |
| Soldat (futur Master Assault, LOD0) | ≤ 4 appels de rendu |

## Techniques déjà en place (à respecter)
- Fusion des maillages statiques (`bakeStatic`) et par os ou pièce mobile (`bakeHierarchy`, `userData.bakeOwner`).
- Matériaux en cache (`mat()`), géométries partagées marquées (`markShared`), libération par `disposeTree` à chaque retrait.
- Réserve de modèles de soldats remplie pendant l'écran de déploiement (pas de construction en pleine partie).
- Budget de 3 recherches A* par image ; particules dans deux `Points` (3 000 max chacun).
- Ombres : une lumière directionnelle qui suit le joueur (alignée sur les texels), carte 2048 (1024 en tactile).

## Soldats : chemins de rendu
`src/character/renderPath.js` : `M1_OPTIMIZED_RENDER_PATH` (par défaut, corps en un `SkinnedMesh`) ou `LEGACY_RENDER_PATH` (fusion par os). Comparer avec `?rendu=legacy|m1` ou `RENDU=legacy|m1` ; `npm run test:character` mesure les deux ([MASTER-ASSAULT-M1](../../../docs/characters/MASTER-ASSAULT-M1.md)).

## Pièges
- Toute nouvelle géométrie créée en boucle (projectiles, effets) doit être libérée ou mise en réserve.
- Ne pas changer l'ordre des tirages aléatoires du décor pour « optimiser » (voir `CLAUDE.md`).

Références : [PERFORMANCE](../../../docs/systems/PERFORMANCE.md) · [MAP1-GOLD](../../../docs/map1/MAP1-GOLD.md) (section Performances)
