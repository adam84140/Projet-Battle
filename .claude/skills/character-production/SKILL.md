---
name: character-production
description: Produire ou intégrer un personnage de production pour Frontline Legends (Master Assault puis autres classes) — SkinnedMesh, squelette canonique, sockets, glTF/GLB, matériaux et masque de couleurs d'équipe, LOD, budgets de performance, hitboxes. À utiliser pour tout travail sur le futur pipeline de personnages.
---

# Production de personnage — Frontline Legends

**Vérifier d'abord l'état réel** : le personnage en jeu est encore procédural (`src/character/`). Ne jamais supposer que le Master Assault existe déjà ; lire [CURRENT-STATE](../../../docs/CURRENT-STATE.md).

**Cible visuelle** : l'[image 01](../../../docs/_attachments/ref-01-master-assault-turnaround.webp) fait autorité (proportions, silhouette, équipement, emblèmes, matériaux, palette), l'[image 02](../../../docs/_attachments/ref-02-master-assault-production-sheet.webp) complète ; lecture et écarts : [VISUAL-REFERENCES](../../../docs/product/VISUAL-REFERENCES.md) (D-009).

## Règles du rig canonique (proposition, gel en attente : D-003)
- 1 unité = 1 m, Y en haut, personnage face à +Z, droite = −X, pose de liaison en A-pose.
- Noms d'os en camelCase, suffixe `L`/`R` ; les os actuels (`hips`, `spine`, `neck`, `head`, `shoulderX`, `elbowX`, `handX`, `legX`, `kneeX`, `ankleX`) gardent leur rôle ; ajouts listés dans [MASTER-ASSAULT](../../../docs/characters/MASTER-ASSAULT.md).
- Ne jamais renommer un os après le gel.

## Contrat de l'asset (`.glb`)
- `public/models/characters/<classe>.glb` ; corps = **un** `SkinnedMesh` ; accessoires `acc_*` ; sockets `socket_*` (arme, mains, dos, tête, visage, hanches, emblèmes).
- 1 matériau corps + 1 arme (≤ 3 par soldat) ; atlas partagé ; **masque de couleurs d'équipe** : un seul modèle et une seule texture pour bleu et rouge.
- LOD0 12 000 à 18 000 triangles, LOD1 ≈ 5 000, LOD2 ≈ 1 500 ; ≤ 4 appels de rendu par soldat en LOD0.

## Intégration (ce que Claude fait dans le code)
1. Charger une fois (`GLTFLoader`), cloner par soldat (`SkeletonUtils.clone`), partager matériaux et textures.
2. Brancher l'`Animator` existant sur les os portant les mêmes noms ; garder l'IK des mains (`solveTwoBone`) et les points de prise de l'arme.
3. Rattacher arme et équipement aux sockets ; conserver `getMuzzleWorld`, `headOffset` et les hitboxes (`Soldier.hitVolumes`) **identiques**.
4. Garder le personnage procédural comme repli et référence A/B jusqu'au GOLD.
5. Libérer les ressources (`disposeTree`) et garder la réserve de modèles de soldats.

## Ce qui n'est pas du code
Modélisation, topologie, UV, textures peintes, pondération, clips d'animation de qualité, morph targets : Blender et un humain. Un maillage généré par le code n'est qu'un **prototype** et doit être présenté comme tel.

## Validation
Skills `visual-validation`, `threejs-performance` et `gameplay-regression` ; critères GOLD : [MASTER-ASSAULT](../../../docs/characters/MASTER-ASSAULT.md), section 6.

Références : [CHARACTER-PIPELINE](../../../docs/characters/CHARACTER-PIPELINE.md) · [MASTER-ASSAULT](../../../docs/characters/MASTER-ASSAULT.md) · [DECISIONS](../../../docs/DECISIONS.md) (D-002, D-003, D-007)
