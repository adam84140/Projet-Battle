# Pipeline de production des personnages

**Statut : pipeline cible, pas encore en place.** Aujourd'hui, les personnages sont entièrement procéduraux (primitives Three.js assemblées par le code, fusionnées par os ; voir [ANIMATION](../systems/ANIMATION.md)). Ce document décrit le chemin prévu pour le [Master Assault](MASTER-ASSAULT.md) puis les autres classes.

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
| 1. Concept / référence | planche de référence, vues face/profil/dos, palette | `fiche.html` (planche rendue depuis le modèle actuel), dessin | humain ; Claude peut produire la planche et les captures de référence |
| 2. Modélisation | volumes, proportions héroïques, silhouette | Blender | artiste 3D (ou humain assisté) |
| 3. Topologie | boucles aux articulations, budgets de triangles, LOD | Blender | artiste 3D |
| 4. UV / textures | atlas partagé, masque de couleurs d'équipe, zones du visage | Blender, peinture de textures | artiste 3D |
| 5. Rig canonique | squelette et noms d'os de [MASTER-ASSAULT](MASTER-ASSAULT.md), sockets, pondération | Blender | artiste 3D ; Claude vérifie la conformité (script de contrôle) |
| 6. Animations | clips : rechargement, grenade, soin, morts, gestes | Blender | animateur ; la locomotion reste dans le code |
| 7. Export | glTF 2.0 binaire (`.glb`), Y en haut, 1 unité = 1 m, face +Z, compression facultative | Blender | artiste ; Claude fournit la liste de contrôle d'export |
| 8. Intégration | chargement, SkinnedMesh, matériau à masque d'équipe, sockets, animateur | Three.js | **Claude** |
| 9. LOD | niveaux et hystérésis ; génération ou modèles fournis | Blender ou code | artiste pour les modèles ; **Claude** pour la sélection |
| 10. Validation performance | mesures 16v16 ([PERFORMANCE](../systems/PERFORMANCE.md)) | tests Playwright | **Claude** |
| 11. Validation gameplay et visuelle | `npm test`, captures A/B, lisibilité | tests, `shots.mjs` | **Claude** + validation humaine finale |

## Ce que Claude peut faire en toute sécurité (code)
- Chargeur glTF (`GLTFLoader` de three/addons), mise en cache, un seul chargement par modèle, clonage des personnages (`SkeletonUtils.clone`).
- Matériau stylisé partagé avec masque d'équipe (couleurs injectées par uniformes).
- Adaptateur d'animation : l'`Animator` actuel écrit ses rotations sur les os du SkinnedMesh portant les **mêmes noms** ; IK des mains conservée ; mélange des clips par `AnimationMixer` sur le haut du corps.
- Sockets : rattacher arme, sac, casque aux objets nommés.
- LOD : choix du niveau par distance, hystérésis, désactivation des ombres et du visage au loin.
- Scripts de contrôle d'un `.glb` : noms d'os, sockets présents, nombre de triangles et de matériaux, taille des textures, échelle et orientation.
- Tests et captures de validation, comparaison A/B avec l'ancien personnage.
- **Garder l'ancien personnage procédural disponible** (repli et comparaison) tant que le Master Assault n'est pas GOLD.

## Ce qui demande Blender ou un autre outil 3D
- Modélisation, topologie, UV, peinture de textures.
- Pondération (skinning) propre aux épaules, coudes, hanches.
- Clips d'animation de qualité (rechargement, morts, gestes).
- Morph targets du visage.

Claude ne doit pas générer par le code un maillage « final » en se faisant passer pour du travail d'artiste. Un personnage intermédiaire généré par le code (par exemple le procédural actuel converti en SkinnedMesh pour valider l'intégration) est acceptable **à condition d'être présenté comme tel**.

## Interface entre les deux mondes
Le contrat entre l'outil 3D et le code est le fichier `.glb` :

| Élément | Règle |
| --- | --- |
| Emplacement | `public/models/characters/<classe>.glb` (à créer), servi tel quel par Vite |
| Échelle, axes | 1 unité = 1 m, Y en haut, personnage face à +Z |
| Squelette | noms et hiérarchie de [MASTER-ASSAULT](MASTER-ASSAULT.md) ; pose de liaison en A-pose |
| Sockets | objets vides nommés `socket_*`, enfants des bons os |
| Maillages | `body` (SkinnedMesh), accessoires séparés nommés `acc_*` |
| Matériaux | 1 matériau corps, 1 arme ; atlas de couleur de base + masque d'équipe |
| Clips | noms en anglais : `reload_rifle`, `throw_grenade`, `heal`, `buff`, `death_back`, `death_front`, `death_spin`, `sit_jeep`… |
| Taille | objectif < 1,5 Mo par personnage LOD compris (textures incluses) |

Toute évolution du contrat est notée dans [DECISIONS](../DECISIONS.md).

## Ordre de travail recommandé pour le Master Assault
1. Figer la spécification ([MASTER-ASSAULT](MASTER-ASSAULT.md)) avec le propriétaire du projet.
2. **Prototype d'intégration** : convertir le personnage procédural actuel en SkinnedMesh (un maillage, mêmes os) pour valider chargeur, animateur, sockets, IK, hitboxes et performance sans attendre l'art définitif. Il doit rester présenté comme un prototype.
3. Production de l'asset dans Blender selon le contrat.
4. Intégration de l'asset, LOD, validation, comparaison A/B.
5. Gel du squelette (D-003 passe à LOCKED), puis Artilleur et Commando.
