---
name: character-production
description: Produire ou intégrer un personnage de production pour Frontline Legends (Master Assault puis autres classes) — SkinnedMesh, squelette canonique, sockets, glTF/GLB, matériaux et masque de couleurs d'équipe, LOD, budgets de performance, hitboxes. À utiliser pour tout travail sur le futur pipeline de personnages.
---

# Production de personnage — Frontline Legends

**EN PAUSE ([D-023](../../../docs/DECISIONS.md))** : production artistique du Master Assault arrêtée après le point A de M4.
- L'ébauche scriptée `art/master-assault/` est **non approuvée** : ne pas la continuer ni l'affiner, pas de M5a.
- Reprise seulement avec un asset externe fourni par le propriétaire : procédure dans [MASTER-ASSAULT-M4](../../../docs/characters/MASTER-ASSAULT-M4.md), § 8.
- Ne rien supprimer de l'infrastructure M0–M3.

**Vérifier d'abord l'état réel** : le personnage en jeu est encore procédural (`src/character/`). Ne jamais supposer que le Master Assault existe déjà ; lire [CURRENT-STATE](../../../docs/CURRENT-STATE.md).

**Cible visuelle** : l'[image 01](../../../docs/_attachments/ref-01-master-assault-turnaround.webp) fait autorité (proportions, silhouette, équipement, emblèmes, matériaux, palette), l'[image 02](../../../docs/_attachments/ref-02-master-assault-production-sheet.webp) complète ; lecture et écarts : [VISUAL-REFERENCES](../../../docs/product/VISUAL-REFERENCES.md) (D-009).

## Contrat de l'asset (étape M2, non gelé : D-003, D-018)
- **Remise à l'artiste : [ASSET-CONTRACT](../../../docs/characters/ASSET-CONTRACT.md)** ; source machine unique : `src/character/rigContract.js` (os, points d'attache, budgets, masque, clips, expressions). Toute évolution modifie les deux, plus D-018, dans le même commit.
- Squelette de **production** : noms de type Blender (`hips`, `spine`, `spine1`, `chest`, `upperArm.L`, `calf.R`…), A-pose, 1,85 m ; `upperArm.L` devient `upperArmL` au chargement (`runtimeName`). Squelette de **gameplay** : les 16 groupes actuels, inchangés, source des hitboxes, du support d'arme, de la bouche du canon et de l'IK.
- `.glb` : `body_LOD0/1/2`, `acc_<nom>_LOD<n>`, points d'attache `socket_*` non déformants, un matériau `M_body`, masque d'équipe `COLOR_0` à **8 couleurs pures** (`TEAM_MASK` : noir neutre, rouge principale, vert teinte sombre d'équipe, bleu / magenta / cyan emblème, jaune peau, blanc cheveux ; D-019), zones colorables au gris `#CCCCCC` dans l'atlas, UV d'emblème `TEXCOORD_1`, 9 expressions, clips du contrat ; pas de compression.
- Brief court pour l'artiste : [M4-BLENDER-BRIEF](../../../docs/characters/M4-BLENDER-BRIEF.md). **Règle D-020** : dès le premier GLB valide, un aperçu jouable (M5a) avant toute validation finale.
- Contrôle : `npm run check:glb -- <fichier> [--stade prototype|production] [--fit] [--json]` (code de sortie 1 si refusé ; `--fit` = essai en jeu).
- **Blender (M4)** : `tools/blender/` (gabarit `fl_template.py`, export verrouillé + validateur `fl_export.py`, planches `fl_review.py`, auto-test `fl_selftest.py`) ; Blender 4.5 LTS ou module `bpy==4.5.14` (Python 3.11) dans le conteneur. Sources de l'asset : `art/master-assault/` (scripts, proportions mesurées) ; fichiers produits dans `art/build/` (non versionnés). Toujours comparer aux images 01 et 02 (`fl_review.compare_sheet`) et passer `--fit` : la portée des bras (≥ 0,60 m) décide de la prise de l'arme (D-021). Suivi : [MASTER-ASSAULT-M4](../../../docs/characters/MASTER-ASSAULT-M4.md).

## État (étapes M1 à M3)
- M1 (acceptée, D-017) : le personnage actuel est rendu en un `SkinnedMesh` lié aux 16 groupes animés (`M1_OPTIMIZED_RENDER_PATH` par défaut, `LEGACY_RENDER_PATH` en repli).
- M2 : `src/character/rigAdapter.js` fait suivre le squelette de gameplay par un squelette de production (décalages calibrés en A-pose, colonne répartie, bassin à l'échelle, IK des mains sur les longueurs de l'asset). **Pas encore branché en jeu** ; testé par `npm run test:rig` sur un squelette d'essai synthétique (donnée de test, jamais versionnée). Coût ≈ 0,1 ms par soldat : à réduire avant M5. Voir [MASTER-ASSAULT-M2](../../../docs/characters/MASTER-ASSAULT-M2.md).

- M3 : `src/character/teamMaterial.js` : `applyTeamLook(root, teamLook(équipe, perso), cache)` prépare la géométrie (COLOR_0 renommé en `teamMask`, jamais affiché ; attributs neutres si absents) et pose un matériau d'équipe partagé par aspect (un seul programme de shader) ; `createTeamMaterial(…, { ghost: true })` pour le camouflage (un `clone()` d'un matériau d'équipe garde aussi le shader : `Character.setOpacity` fonctionne tel quel), `{ debugMask: true }` pour voir les zones. **Pas encore branché en jeu.** Voir [MASTER-ASSAULT-M3](../../../docs/characters/MASTER-ASSAULT-M3.md).

## Intégration (ce que Claude fait dans le code)
1. Charger une fois (`GLTFLoader`), cloner par soldat (`SkeletonUtils.clone`), partager matériaux et textures.
2. Brancher le squelette de l'asset par `RigAdapter` (l'`Animator` et le squelette de gameplay ne changent pas) ; garder les points de prise de l'arme ; habiller par `applyTeamLook` (jamais `vertexColors` : le masque `COLOR_0` n'est pas une couleur) ; ombres activées sur les maillages chargés (`castShadow`).
3. Rattacher arme et équipement aux sockets ; conserver `getMuzzleWorld`, `headOffset` et les hitboxes (`Soldier.hitVolumes`) **identiques**.
4. Garder le personnage procédural comme repli et référence A/B jusqu'au GOLD.
5. Libérer les ressources (`disposeTree`) et garder la réserve de modèles de soldats.

## Ce qui n'est pas du code
Modélisation, topologie, UV, textures peintes, pondération, clips d'animation de qualité, morph targets : Blender et un humain. Un maillage généré par le code n'est qu'un **prototype** et doit être présenté comme tel.

## Validation
Skills `visual-validation`, `threejs-performance` et `gameplay-regression` ; critères GOLD : [MASTER-ASSAULT](../../../docs/characters/MASTER-ASSAULT.md), section 6.

Références : [ASSET-CONTRACT](../../../docs/characters/ASSET-CONTRACT.md) · [CHARACTER-PIPELINE](../../../docs/characters/CHARACTER-PIPELINE.md) · [MASTER-ASSAULT](../../../docs/characters/MASTER-ASSAULT.md) · [DECISIONS](../../../docs/DECISIONS.md) (D-002, D-003, D-007, D-015, D-018)
