# Master Assault — audit technique et plan de migration

**Statut : audit accepté par le propriétaire (2026-09-29). Étape M0 terminée ([référence M0](MASTER-ASSAULT-BASELINE.md)) ; étape M1 terminée, en attente d'acceptation ([M1](MASTER-ASSAULT-M1.md)) ; M2 et suivantes NON autorisées** (chacune demandera une autorisation explicite). Aucun code du jeu n'a été modifié pour cet audit. Base auditée : branche `claude/dazzling-cray-gn1bg5`, code du jeu identique à `05827b4` ; mesures du 2026-09-29 dans le conteneur Cloud (Chromium sans GPU : appels de rendu, triangles, mémoire et temps de construction sont fiables ; les FPS ne le sont pas).

Cible : [MASTER-ASSAULT](MASTER-ASSAULT.md) · chaîne : [CHARACTER-PIPELINE](CHARACTER-PIPELINE.md) · références : [VISUAL-REFERENCES](../product/VISUAL-REFERENCES.md) · décisions : D-002, D-003, D-007, D-009, D-010, D-011 ([DECISIONS](../DECISIONS.md)).

---

## 1. Résumé
- Le personnage actuel est **entièrement procédural** : environ 170 primitives Three.js assemblées sur 16 articulations, puis fusionnées par os pour le jeu. Rien d'un Master Assault n'existe encore.
- **Les soldats font 85 à 88 % des appels de rendu** dans une scène 16v16 chargée (32 soldats visibles) : environ 24 appels par soldat visible (passe couleur et ombre). C'est le levier principal de l'objectif ≤ 250 appels.
- Le code d'animation (état → pose → lissage → couches → IK) est sain et découplé de la géométrie ; il peut piloter un `SkinnedMesh` **sans être réécrit**, à condition d'ajouter une couche d'adaptation (reciblage) pour un vrai squelette d'artiste.
- Plan recommandé : **d'abord des tests protecteurs, puis un prototype à peau rigide** (le personnage actuel en un seul `SkinnedMesh`, 18 → 3 maillages visibles par soldat, rendu identique), puis l'adaptateur de squelette, le matériau à masque d'équipe, et enfin l'asset de production, qui demande un artiste 3D.

## 2. Mesures de référence (personnage actuel)

### Par modèle (Assaut bleu, sac porté sauf mention)
| Mesure | Menu, fiche (non fusionné) | En jeu (fusionné) | Remarque |
| --- | --- | --- | --- |
| Maillages | 174 visibles | **24, dont 18 visibles** : 15 fusionnés par os, le cou (seul, non fusionné), l'arme fusionnée, le chargeur ; 6 cachés (éclair de bouche, poignard) | le chiffre « 24 maillages » des docs compte les cachés |
| Matériaux | 55 | 3 | matériau partagé à couleurs de sommets |
| Triangles | 44 100 | **16 800** (15 900 sans sac) | Artilleur 14 900, Commando 15 300 |
| Données de géométrie | 1,9 Mo | **1,6 à 1,8 Mo par soldat, non partagées** | couleurs de sommets propres à chaque soldat |
| Construction | 37 à 47 ms | **73 à 98 ms** (moyenne 73 ms) | explique le pic de 40 à 65 ms quand la réserve est vide |
| Hauteur (sommet des cheveux) | 1,97 m | **1,94 m** | la cible de l'image 01 est 1,85 m |

### Squelette et hitboxes actuels (repère du personnage, au repos)
| Élément | Valeur |
| --- | --- |
| `hips` | y = 0,95 m (`hipsHeight`, constante) |
| `legX` → `kneeX` → `ankleX` | décalages 0,42 m et 0,39 m ; cheville à y = 0,10 m |
| `spine` / `neck` / `head` | y = 1,01 / 1,48 / 1,56 m ; tête ×1,13 |
| `shoulderX` | x = ±0,25 m, y = 1,43 m ; bras et avant-bras 0,30 m (`UPPER_ARM`, `FOREARM`) |
| Sphère de tête | centre = os `head` + 0,164 m (≈ 1,724 m), rayon 0,17 m → 1,55 à 1,89 m |
| Capsule de corps | de 0,10 à 1,45 m (1,08 m accroupi), rayon 0,36 m ; capsule physique 1,80 m |

### Part des soldats dans le rendu 16v16
Scène de charge : 32 soldats vivants regroupés à moins de 18 m de la place B, joueur au centre, 4 directions ; ombres comprises.

| Direction | Appels totaux | Sans les soldats | Soldats | Triangles des soldats |
| --- | --- | --- | --- | --- |
| nord | 890 | 107 | **783** | 668 000 |
| est | 897 | 91 | **806** | 668 000 |
| sud | 896 | 114 | **782** | 668 000 |
| ouest | 936 | 174 | **762** | 653 000 |

Cette scène est plus chargée que la vue de jeu de référence de [PERFORMANCE](../systems/PERFORMANCE.md) (455 à 709 appels) : elle mesure le pire cas, pas une régression. La logique y monte à 5,4 ms par image (32 soldats en combat rapproché), elle aussi hors du scénario de référence (1,66 ms).

## 3. Inventaire : ce qui dépend du personnage

### Contrat public de `Character` (à préserver)
`root`, `bones` (16 articulations), `weaponMount`, `weapon` (`group`, `mag`, `flash`, `muzzle`, `rightWrist`, `leftWrist`, `magWrist`), `knife`, `face`, `accessories`, `headOffset`, `hipsHeight`, `anim` (état), `animator.first`, `update(dt)`, `setOpacity()`, `showWeapon()`, `hideWeapon`, `getMuzzleWorld()`, `setAccessories()`, `setWeapon()`, `bake()`, `dispose()`.

| Utilisateur | Ce qu'il utilise |
| --- | --- |
| `src/game/Soldier.js` (33 usages) | état d'animation, visibilité, position, `setOpacity`, éclair de bouche, `bones.head` + `headOffset` → **hitbox de tête**, réserve de modèles, `dispose` |
| `src/game/Vehicle.js` | pose assise (jeep), arme cachée, personnage masqué dans le char |
| `src/game/Combat.js` | `bones.handR` (origine des lancers), `getMuzzleWorld` (tirs) |
| `src/game/Game.js` | héros du menu, réserve `charPool` par équipe et classe |
| `src/game/PlayerController.js` | visibilité du joueur (lunette, caméra trop proche) |
| `src/sheet/fiche.js`, `src/ui/portraits.js` | planche et portraits (modèle non fusionné, `bones` pour les légendes) |
| `tests/turntable.html`, `tests/poses.html`, `tests/*.mjs` | vues, poses, `char.root.visible` |

### Animateur (`src/character/animation.js`)
- Écrit des **rotations d'Euler absolues** sur les 16 articulations, avec une pose de repos **identité** : membres vers −Y, colonne vers +Y.
- Constantes de proportions : `hipsHeight` 0,95, décalages des os, `UPPER_ARM` = `FOREARM` = 0,30, tenues d'arme (`HOLDS`) dans le repère du buste.
- IK `solveTwoBone` : suppose le coude en (0, −`UPPER_ARM`, 0) sous l'épaule et une flexion autour de X.

### Rendu
- `bakeHierarchy` fusionne les maillages de chaque os en un maillage à couleurs de sommets (matériau partagé) ; l'arme a son propre maillage (`bakeOwner`) ; chargeur, éclair et poignard restent séparés (`dynamic`).
- Tous les maillages visibles projettent une ombre.
- Camouflage du Commando : `setOpacity` clone les matériaux en version transparente.

### Personnalisation et réglages
- `DEFAULT_CUSTOM.backpack: true` ; les **bots tirent leurs accessoires au hasard** (sac 60 %, lunettes 20 %, bandana 30 %).
- Réglages sauvegardés (`frontline-legends-settings-v1`) : `custom` fusionné avec `DEFAULT_CUSTOM`. Un joueur qui a déjà sauvegardé garde `backpack: true` même si la valeur par défaut change.

## 4. Constats

| # | Constat | Conséquence pour la migration |
| --- | --- | --- |
| C1 | L'animateur suppose des repos identité ; un squelette Blender en A-pose a d'autres repères d'os | **adaptateur de reciblage** nécessaire (§ 5), sinon réécriture de l'animateur, à éviter (D-006, D-007) |
| C2 | Proportions codées en dur (bassin, jambes, bras) | l'IK des mains doit tourner **sur le squelette visible** avec ses propres longueurs, sinon les mains quittent l'arme |
| C3 | Hitboxes calculées depuis l'os `head` animé | garder le squelette actuel comme **squelette de gameplay** (source des hitboxes, du support d'arme et de la bouche du canon) : hitboxes identiques par construction |
| C4 | Cible 1,85 m contre 1,94 m aujourd'hui | compatible avec des hitboxes inchangées (sphère de tête 1,55 à 1,89 m) ; à contrôler par un test d'écart tête visible / sphère |
| C5 | 18 maillages visibles par soldat | corps et équipement en **un** maillage + arme + chargeur (caché au rechargement) = 3 maillages visibles |
| C6 | 1,6 à 1,8 Mo de géométrie par soldat, non partagée | avec l'asset et le masque d'équipe : **une géométrie partagée** par classe (`SkeletonUtils.clone`) |
| C7 | 73 à 98 ms pour construire un soldat | le clonage d'un asset chargé coûte peu : le pic de réapparition disparaît |
| C8 | La sphère englobante d'un `SkinnedMesh` vient de la pose de liaison | fixer une sphère englobante large, sinon un soldat allongé (mort) peut disparaître au bord de l'écran |
| C9 | Le camouflage clone les matériaux | prévoir une variante transparente du matériau à peau (une par soldat camouflé) |
| C10 | Expressions figées à la construction (« déterminé » en jeu, « confiant » au menu) | pas de régression si l'asset garde une expression fixe ; morph targets ensuite |
| C11 | Sac par défaut, sac pour 60 % des bots | D-010 : défaut sans sac ; politique des bots à décider (§ 7) |
| C12 | Réglages sauvegardés avec `backpack: true` | migration douce dans la même clé (§ 7) |
| C13 | Aucun test automatique sur appels de rendu par soldat, écart mains / arme, alignement de la tête, mémoire par soldat | **tests à écrire avant toute migration** (étape M0) |
| C14 | Chargement d'un `.glb` asynchrone ; le jeu construit tout de manière synchrone | préchargement pendant le menu ; **repli sur le personnage procédural** si le chargement échoue |
| C15 | Aucune dépendance nouvelle requise | `GLTFLoader`, `SkeletonUtils`, décodeur meshopt : fournis par le paquet `three` |

## 5. Architecture cible

```
Soldier (état) ──► Animator (inchangé) ──► squelette de gameplay (16 os actuels, invisibles)
                                              │  hitboxes, support d'arme, bouche du canon
                                              ▼
                                  adaptateur de peau (nouveau)
                                   1. reciblage des rotations (décalages calculés en A-pose)
                                   2. clips masqués au haut du corps (AnimationMixer, plus tard)
                                   3. IK des mains sur le squelette visible
                                              ▼
                        SkinnedMesh (corps + équipement) + arme + accessoire éventuel
```

- **Le contrat public de `Character` ne change pas** : les systèmes de jeu ne voient pas la différence.
- Trois implémentations de peau derrière un réglage (défaut : l'actuelle jusqu'à la validation A/B) : `procedural` (fusion par os, actuelle), `skinned-proto` (étape M1), `gltf` (étape M5).
- Le personnage procédural reste disponible comme repli et comme référence A/B jusqu'au GOLD ([CHARACTER-PIPELINE](CHARACTER-PIPELINE.md)).

## 6. Plan de migration

Chaque étape : un ou plusieurs petits commits, `npm test` vert, captures avant / après regardées, mesures 16v16, docs à jour, retour arrière possible par le réglage de peau.

| Étape | Contenu | Risque | Qui | Résultat vérifiable |
| --- | --- | --- | --- | --- |
| **M0** Tests protecteurs ✅ [fait](MASTER-ASSAULT-BASELINE.md) | nouveau test `test:character` : maillages, appels et triangles par soldat, mémoire par soldat et sur rotation de la réserve, écart mains / points de prise dans les 18 poses (< 1 cm), écart tête visible / sphère de tête, temps de construction ; captures de référence `turn`, `poses`, `game` | aucun (tests seulement) | Claude | chiffres de ce document reproduits par un test |
| **M1** Prototype à peau rigide ✅ [fait](MASTER-ASSAULT-M1.md) | les os deviennent des `THREE.Bone` (même nom, même rôle) ; nouvelle fusion en **un seul `SkinnedMesh`** (chaque sommet lié à 100 % à son os), arme à part ; sphère englobante fixe ; variante transparente pour le camouflage ; derrière le réglage `skinned-proto` | moyen : touche `Character.bake` et `parts.js` (système central) ; le chemin actuel reste intact | Claude | rendu identique en A/B (même géométrie, mêmes couleurs) ; 18 → 3 maillages visibles par soldat ; appels de rendu 16v16 remesurés |
| **M2** Adaptateur de squelette ✅ [fait](MASTER-ASSAULT-M2.md), contrat : [ASSET-CONTRACT](ASSET-CONTRACT.md) | reciblage vers un squelette aux repères quelconques (A-pose), IK des mains sur ses longueurs ; **squelette d'essai synthétique** exporté depuis le modèle actuel en A-pose (présenté comme donnée de test, pas comme art) ; script de contrôle d'un `.glb` (noms d'os, sockets, triangles, matériaux, textures, échelle, orientation) sans dépendance | moyen : nouveau code isolé | Claude | mains < 1 cm, hitboxes identiques, poses A/B avec le squelette d'essai |
| **M3** Matériau à masque d'équipe | matériau stylisé partagé : couleurs d'équipe (primaire, secondaire, emblème), teint et cheveux par uniformes ; emblèmes canoniques (aigle / étoile, D-011) en décalque | faible | Claude | bleu et rouge depuis une seule géométrie et une seule texture ; test bleu/rouge à 5, 20 et 40 m |
| **M4** Asset de production | modèle, topologie, UV, textures peintes, rig canonique, sockets, LOD 0/1/2, morph targets du visage, clips (rechargement, grenade, soin, geste, morts, assis), selon les images 01 et 02, **sans sac par défaut** (D-010), sac en `acc_backpack` | élevé (qualité artistique, délais) | **artiste 3D / Blender** ; Claude fournit contrat, liste de contrôle et vérification | `.glb` qui passe le script de contrôle |
| **M5** Intégration de l'asset | préchargement au menu, repli procédural, sockets, LOD avec hystérésis, ombres LOD0/LOD1, visage piloté par l'état, clips mélangés au haut du corps puis IK | moyen | Claude | critères de la section 5 de [MASTER-ASSAULT](MASTER-ASSAULT.md) |
| **M6** Valeurs par défaut | `DEFAULT_CUSTOM.backpack = false` avec migration des réglages ; politique des accessoires des bots ; test de silhouette des 3 classes | faible | Claude | dos et emblème visibles en visée ; classes distinctes en ombre pleine |
| **M7** Validation GOLD | tableau de validation complet, A/B, 16v16, validation visuelle du propriétaire ; gel du squelette (D-003 → LOCKED) | — | Claude + propriétaire | critères GOLD de [MASTER-ASSAULT](MASTER-ASSAULT.md), section 6 |

Ensuite seulement : Artilleur et Commando sur la même architecture ([ROADMAP](../ROADMAP.md), étape 3).

**Ordre et dépendances** : M0 → M1 → M2 → M3 peuvent avancer sans l'asset. M4 se prépare en parallèle (hors code). M5 attend M4. L'étape 1 de la roadmap (petites corrections, dont la réserve de modèles 16v16) reste indépendante et peut passer avant ou entre M0 et M1.

### Budgets visés (16v16)
| Élément | Budget |
| --- | --- |
| Soldat LOD0 | corps 1 + arme 1 + chargeur 1 + au plus 1 accessoire (= 4, budget de la spécification) ; ombre : corps et arme |
| Soldat LOD1 (15 à 45 m) | corps + arme (chargeur fusionné) ; ombre : corps ; pas d'accessoire fin |
| Soldat LOD2 (> 45 m) | corps + arme ; sans ombre |
| Scène de charge ci-dessus | estimation après M1 : environ 4 à 6 appels par soldat (couleur et ombre), soit ~130 à 190 pour 32 soldats au lieu de ~780 (à mesurer, pas une promesse) |
| Mémoire | après M3 et M5 : une géométrie et une texture partagées par classe ; asset < 1,5 Mo LOD compris |

## 6 bis. Bénéfice attendu de M1, révisé après M0
Estimations faites avant M1 ; **mesures réelles** dans [MASTER-ASSAULT-M1](MASTER-ASSAULT-M1.md) (vue de jeu 16v16 : 156 à 265 appels ; scène chargée : 208 à 313 ; géométrie −28,5 %).

| Mesure | M0 (actuel) | Après M1 (estimation) |
| --- | --- | --- |
| Maillages visibles par soldat | 18 | **3** (corps avec le cou, arme, chargeur) |
| Soldat seul, couleur + ombre | 36 appels | **≈ 6** |
| Scène chargée 16v16 : appels des soldats / total | 717–810 / 811–966 | ≈ 120–135 / **≈ 210–310** |
| Vue de jeu de référence : appels des soldats / total | 420–729 / 521–865 | ≈ 70–120 / **≈ 140–260** (objectif GOLD ≤ 250 à portée dans la vue typique) |
| Triangles | 16 800 par soldat | inchangés (même géométrie) |
| Géométrie par soldat | 1,78 Mo, non indexée | + attributs de peau (≈ +0,4 Mo en entiers 8 bits) ; **réindexer** peut au contraire la réduire nettement : à mesurer |
| Construction d'un soldat | 54–82 ms | inchangée à peu près : le pic de réapparition relève de l'étape 1 de la roadmap (réserve) puis de M5 (clonage de l'asset) |
| Hitboxes, mains, arme, bouche du canon | voir M0 | **identiques** (mêmes os) : vérifié par `test:character` |
| Rendu | planche M0 | **identique au pixel près** attendu (même géométrie, mêmes couleurs) |

**M1 paraît toujours sûre**, aux conditions déjà prévues : derrière un réglage, ancien chemin intact ; les os restent les mêmes objets (seul leur type passe de `Group` à `Bone`, rien n'en dépend) ; comparaison chiffrée et au pixel avec la référence M0. Risques restants : sphère englobante du `SkinnedMesh` (disparition au bord de l'écran), ombres, transparence du camouflage, coût du skinning sur téléphone (non mesurable dans le conteneur), mémoire des attributs de peau.

## 7. Décisions du propriétaire (2026-09-29)
1. **M0 : autorisée.** Tests protecteurs et mesures de référence avant toute migration ; personnage procédural intégralement préservé. Résultats : [MASTER-ASSAULT-BASELINE](MASTER-ASSAULT-BASELINE.md).
2. **M1 : non autorisée pour l'instant** (décision initiale ; autorisée ensuite, voir 8). Après M0 : rapport des mesures, puis arrêt ; M1 sera autorisée séparément.
3. **M4** : asset de production par la chaîne Blender / 3D, jamais par des primitives procédurales ([DECISIONS](../DECISIONS.md) D-014).
4. **Adaptateur de squelette** : autorisé sur le principe, implémenté seulement à son étape (D-015).
5. **Réglages et sac** : Assaut par défaut sans sac ; migration unique des réglages sauvegardés à l'étape concernée ; support du sac conservé (D-010).
6. **Bots** : bots Assaut sans sac par défaut ; autres variations cosmétiques compatibles aléatoires (D-010).
7. **Matériaux** : matériau et asset partagés, masque d'équipe, pas de duplication bleu/rouge, peu de matériaux ; couleurs de sommets à grande distance **provisoires** jusqu'à mesure (D-016).
8. **M1 : acceptée** ; M1 reste le chemin par défaut, legacy reste le repli ; pas d'optimisation spéculative supplémentaire de M1 avant la validation sur de vrais appareils (D-017).
9. **M2 : autorisée** (code et chaîne de production seulement) : adaptateur, squelette d'essai synthétique, contrat du squelette et de l'asset, validateur. Faite : [MASTER-ASSAULT-M2](MASTER-ASSAULT-M2.md), D-018 en attente d'acceptation. **M3 et la production Blender ne sont pas autorisées.**

## 8. Ce qui n'est pas vérifié
- FPS et mémoire sur un vrai GPU (le conteneur n'en a pas).
- Le gain réel de M1 en vue de jeu typique : les chiffres de la section 6 sont des estimations.
- La charge de travail et les délais de l'asset de production.
- Le choix de compression du `.glb` (meshopt ou aucune) : à trancher avec l'asset réel.
