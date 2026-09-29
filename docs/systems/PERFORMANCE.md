# Performances

**Scénario de référence : 16v16** (32 soldats, 4 véhicules). Mesures faites dans le conteneur Cloud, **sans GPU** (Chromium avec SwiftShader) : elles valent pour la logique, le nombre d'appels de rendu, les triangles et la mémoire. **Les FPS réels n'ont jamais été mesurés sur une vraie machine.**

## Mesures de référence (commit `05827b4`, mesurées le 2026-09-29)

| Mesure | 8v8 | 16v16 | Objectif GOLD (16v16) |
| --- | --- | --- | --- |
| Logique, moyenne par image | 1,0 à 1,2 ms | 1,66 ms | < 4 ms ✅ |
| Logique, p99 | 2 à 2,7 ms | 3,6 ms | — |
| Images logiques > 16 ms sur 2 min | 0 | **1 (65,8 ms)** | 0 ❌ |
| Appels de rendu, vue de jeu | 172 à 233 | **455 à 709** (place B, 4 directions) | ≤ 250 ❌ |
| Triangles, vue de jeu | 0,56 à 0,60 M | 0,81 à 0,97 M | — |
| Géométries GPU sur 3 relances | 328 → 347 → 347 (stable) | 873 (une partie) | stable ✅ en 8v8 |

Détail : maillages par soldat 24 ; par jeep 5 ; par char 3 ; décor statique fusionné en gros paquets.

**Pic 16v16** : attribué à la construction d'un modèle de soldat (≈ 40 ms) quand un bot réapparaît dans une classe dont la réserve est vide (réserve de 2 par équipe et classe, pensée pour le 8v8). Correction simple prévue à l'étape 1 de la [ROADMAP](../ROADMAP.md).

**Lecture** : la logique est large (1,7 ms pour 4 ms d'objectif). Le rendu 16v16 est au-dessus de l'objectif, surtout à cause des 24 maillages par soldat (32 × 24 = 768 maillages potentiels) : c'est le levier principal du [Master Assault](../characters/MASTER-ASSAULT.md) (≤ 4 appels par soldat).

## Mesures de l'audit Master Assault (2026-09-29, même code)
Scène de charge 16v16 : 32 soldats vivants à moins de 18 m de la place B, 4 directions, ombres comprises. **Pas le scénario de référence** ci-dessus : c'est le pire cas pour les personnages.

| Mesure | Valeur |
| --- | --- |
| Appels de rendu, total | 890 à 936 |
| dont soldats | **762 à 806** (≈ 24 par soldat visible, couleur et ombre) |
| Triangles des soldats | 653 000 à 668 000 |
| Soldat fusionné | 24 maillages dont 18 visibles, ~16 800 triangles, 1,6 à 1,8 Mo de géométrie non partagée, 73 à 98 ms de construction |

Détail et plan : [MASTER-ASSAULT-AUDIT](../characters/MASTER-ASSAULT-AUDIT.md).

## Référence M0 automatisée (`npm run test:character`)
Mesures répétées par le test, sur le même code (détail : [MASTER-ASSAULT-BASELINE](../characters/MASTER-ASSAULT-BASELINE.md)) :
- soldat seul : 36 appels (couleur + ombre), 18 maillages visibles, 16 800 triangles, 1,78 Mo de géométrie, ≈ 1,9 Mo de mémoire JS ;
- vue de jeu de référence 16v16 : 521 à 865 appels, dont 420 à 729 pour les soldats ; scène chargée : 811 à 966 appels, dont 717 à 810 (22 à 25 par soldat) ;
- logique 16v16 sur les 60 s qui suivent le déploiement : **3,5 à 3,9 ms** en moyenne, p99 8,5 à 9,9 ms, 1 à 4 images > 16 ms. Plus élevé que les 1,66 ms ci-dessus (autre fenêtre de mesure, autre machine, même code) : c'est la valeur de référence pour le travail sur le personnage ;
- mémoire stable sur 3 relances 16v16 (827 géométries GPU à chaque fois).

## Techniques en place
- Décor statique fusionné en paquets de 1 500 maillages (`bakeStatic`) ; personnages fusionnés par os, arme fusionnée à part sous son support animé (`bakeHierarchy`) ; véhicules fusionnés par pièce mobile.
- Matériaux en cache (`mat()`), géométries partagées marquées (`markShared`), libération par `disposeTree` (véhicules, drapeaux, projectiles, personnages).
- Réserve de modèles de soldats par équipe et classe, remplie pendant l'écran de déploiement (2 par case, 1 en tactile).
- Budget de 3 recherches A* par image ; obstacles temporaires de navigation mis à jour toutes les 0,5 s.
- Particules : deux systèmes `Points` (3 000 max chacun), fondu près de la caméra.
- Ombre : une lumière directionnelle qui suit le joueur (alignée sur les texels), carte 2048 (1024 en tactile), désactivée en qualité basse.
- Tactile : résolution réduite (pixel ratio ≤ 1,25).

## Historique des gains (phase 14)
- Fuite de mémoire GPU corrigée : 428 → 700 → 876 géométries sur 3 relances avant, stable après.
- Véhicules fusionnés : 44 / 28 maillages → 5 / 3.
- Pics de 40 ms à la réapparition des bots (reconstruction du modèle lors d'un changement de classe) supprimés en 8v8 grâce à la réserve.

## Comment mesurer
Procédure et extraits de code : skill `threejs-performance` (`.claude/skills/threejs-performance/SKILL.md`). Toujours mesurer avant et après, dans le même scénario.
