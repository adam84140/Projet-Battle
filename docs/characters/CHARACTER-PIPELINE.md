# Pipeline de production des personnages

**Statut : pipeline cible, en préparation.** Aujourd'hui, les personnages en jeu sont entièrement procéduraux (primitives Three.js assemblées par le code, rendues en un SkinnedMesh depuis M1 ; voir [ANIMATION](../systems/ANIMATION.md)). Depuis M2, le côté code de la chaîne existe : **contrat d'asset** ([ASSET-CONTRACT](ASSET-CONTRACT.md)), **adaptateur de squelette** et **validateur** `npm run check:glb` ([MASTER-ASSAULT-M2](MASTER-ASSAULT-M2.md)). Ce document décrit le chemin prévu pour le [Master Assault](MASTER-ASSAULT.md) puis les autres classes.

## Constat
Le personnage procédural a été poussé loin (proportions, visage, équipement, IK des mains), mais il a des limites structurelles : 24 maillages par soldat, pas de déformation de la peau aux articulations, formes limitées aux primitives, pas de textures peintes. **Un personnage de qualité production demande un vrai travail de modélisation 3D** (Blender ou équivalent). Le code seul ne doit pas prétendre remplacer cette étape.

## Chaîne cible

```
concept / référence ──► modélisation ──► topologie ──► UV / textures ──► rig canonique
        ──► animations (clips) ──► export glTF/GLB ──► intégration Three.js
        ──► LOD ──► validation performance ──► validation gameplay et visuelle
```

| Étape | Contenu | Outil | Qui |
| --- | --- | --- | --- |
| 1. Concept / référence | vues face/profil/dos, palette : **images officielles 01 et 02** ([VISUAL-REFERENCES](../product/VISUAL-REFERENCES.md)) | images de référence ; `fiche.html` (planche rendue depuis le modèle du jeu, pour la comparaison) | fourni par le propriétaire ; Claude produit les captures de comparaison |
| 2. Modélisation | volumes, proportions héroïques, silhouette | Blender | artiste 3D (ou humain assisté) |
| 3. Topologie | boucles aux articulations, budgets de triangles, LOD | Blender | artiste 3D |
| 4. UV / textures | atlas partagé, masque de couleurs d'équipe, zones du visage | Blender, peinture de textures | artiste 3D |
| 5. Rig canonique | squelette, points d'attache et pondération de [ASSET-CONTRACT](ASSET-CONTRACT.md) | Blender | artiste 3D ; Claude vérifie la conformité (`npm run check:glb`) |
| 6. Animations | clips : rechargement, grenade, soin, morts, gestes | Blender | animateur ; la locomotion reste dans le code |
| 7. Export | glTF 2.0 binaire (`.glb`), Y en haut, 1 unité = 1 m, face +Z, sans compression (réglages : [ASSET-CONTRACT](ASSET-CONTRACT.md), § 12) | Blender | artiste ; validateur `check:glb` (avec `--fit` : essai en jeu) |
| 8. Intégration | chargement, SkinnedMesh, matériau à masque d'équipe, sockets, animateur | Three.js | **Claude** |
| 9. LOD | niveaux et hystérésis ; génération ou modèles fournis | Blender ou code | artiste pour les modèles ; **Claude** pour la sélection |
| 10. Validation performance | mesures 16v16 ([PERFORMANCE](../systems/PERFORMANCE.md)) | tests Playwright | **Claude** |
| 11. Validation gameplay et visuelle | `npm test`, captures A/B, lisibilité | tests, `shots.mjs` | **Claude** + validation humaine finale |

## Ce que Claude peut faire en toute sécurité (code)
- Chargeur glTF (`GLTFLoader` de three/addons), mise en cache, un seul chargement par modèle, clonage des personnages (`SkeletonUtils.clone`).
- Matériau stylisé partagé avec masque d'équipe (couleurs injectées par uniformes).
- Adaptateur de squelette (**fait en M2**, `src/character/rigAdapter.js`) : le squelette de production, aux noms canoniques de type Blender et en A-pose, suit le squelette de gameplay (rotations recopiées avec décalages calibrés, IK des mains sur les longueurs de bras de l'asset) ; mélange des clips par `AnimationMixer` sur le haut du corps en M5.
- Sockets : rattacher arme, sac, casque aux objets nommés.
- LOD : choix du niveau par distance, hystérésis, désactivation des ombres et du visage au loin.
- Contrôle d'un `.glb` (**fait en M2**, `tests/check-glb.mjs`) : squelette, points d'attache, pose de liaison, dimensions, pondération, LOD, matériaux, textures, masque d'équipe, expressions, clips ; consigne de correction pour chaque erreur ; essai en jeu avec `--fit`.
- Tests et captures de validation, comparaison A/B avec l'ancien personnage.
- **Garder l'ancien personnage procédural disponible** (repli et comparaison) tant que le Master Assault n'est pas GOLD.

## Ce qui demande Blender ou un autre outil 3D
- Modélisation, topologie, UV, peinture de textures.
- Pondération (skinning) propre aux épaules, coudes, hanches.
- Clips d'animation de qualité (rechargement, morts, gestes).
- Morph targets du visage.

Claude ne doit pas générer par le code un maillage « final » en se faisant passer pour du travail d'artiste. Un personnage intermédiaire généré par le code (par exemple le procédural actuel converti en SkinnedMesh pour valider l'intégration) est acceptable **à condition d'être présenté comme tel**.

## Interface entre les deux mondes
Le contrat entre l'outil 3D et le code est le fichier `.glb`, spécifié **en entier** dans [ASSET-CONTRACT](ASSET-CONTRACT.md) (source machine : `src/character/rigContract.js`, version `M2-0.1`, non gelée : D-003, D-018). En bref : `public/models/characters/<classe>.glb` ; 1 unité = 1 m, Y en haut, face +Z ; squelette de 23 os requis en A-pose, 1,85 m ; points d'attache `socket_*` ; maillages `body_LOD0/1/2` et `acc_<nom>_LOD<n>` ; un matériau `M_body`, atlas de 256 à 2 048 px ; masque d'équipe en `COLOR_0` et UV d'emblème en `TEXCOORD_1` ; 9 expressions ; clips `reload_rifle`, `throw_grenade`, `buff`, `heal`, `knife`, `death_back`, `death_front`, `death_spin`, `sit_jeep` ; objectif < 1,5 Mo.

Toute évolution du contrat est notée dans [DECISIONS](../DECISIONS.md).

## Ordre de travail recommandé pour le Master Assault
Détaillé et chiffré dans [MASTER-ASSAULT-AUDIT](MASTER-ASSAULT-AUDIT.md) (étapes M0 à M7).

1. Figer la spécification ([MASTER-ASSAULT](MASTER-ASSAULT.md)) avec le propriétaire du projet.
2. **Prototype d'intégration** : convertir le personnage procédural actuel en SkinnedMesh (un maillage, mêmes os) pour valider chargeur, animateur, sockets, IK, hitboxes et performance sans attendre l'art définitif. Il doit rester présenté comme un prototype. **Fait en M1** pour le corps, l'animateur, l'IK, les hitboxes et la performance ([MASTER-ASSAULT-M1](MASTER-ASSAULT-M1.md)) ; contrat, adaptateur, validateur et squelette d'essai faits en M2 ; chargement de l'asset et points d'attache en jeu relèvent de M5.
3. Production de l'asset dans Blender selon le contrat.
4. Intégration de l'asset, LOD, validation, comparaison A/B.
5. Gel du squelette (D-003 passe à LOCKED), puis Artilleur et Commando.
