# État actuel du projet

- **Référence :** commit `05827b4807c67959e125c9681b5ffa953b113a29` (point de contrôle D-004, créé sur la branche `claude/similar-project-tn0j8l`). Branche de travail actuelle : `claude/dazzling-cray-gn1bg5`, qui contient ce commit. Seuls changements du code du jeu depuis : **l'étape M1** (`src/character/renderPath.js`, `bakeSkinned` / `bakeIndexed` dans `parts.js`, `Character.bake()` / `dispose()`) **l'étape M2** (deux modules **non branchés en jeu**, `src/character/rigContract.js` et `src/character/rigAdapter.js`, et un export en lecture seule `IK_CHANNELS` dans `animation.js`) **l'étape M3** (module `src/character/teamMaterial.js`, **non branché en jeu**, et le masque d'équipe `TEAM_MASK` dans `rigContract.js`) et **l'étape M4** (contrat `M4-0.3` dans `rigContract.js` : données du validateur ; chaîne Blender `tools/blender/` et ébauche `art/master-assault/`, hors du jeu livré).
- **Vérifié le :** 2026-09-30, dans le conteneur Cloud (Chromium sans GPU), sur `claude/dazzling-cray-gn1bg5` à partir du commit `29a22aa` (mise en pause du Master Character), puis avec la préparation de la chaîne d'environnement de la carte 1 : nouveaux modules `src/environment/` et outils `tools/env-kit/`, **non branchés dans le jeu**.
- **Jalon :** MAP 1 GOLD — **priorité active : ENVIRONNEMENT / PRODUCTION DU NIVEAU** (D-024 ; priorités P1 à P10 de la [ROADMAP](ROADMAP.md)). Préparation faite, le jeu n'est pas modifié : section « Environnement de la carte 1 ». **Le kit tiers n'est pas livré** : c'est le blocage de l'étape suivante.
- **MASTER CHARACTER : EN PAUSE** après le point de contrôle A de M4 (D-023) : voir la section suivante.

Règle : ce fichier ne contient que des faits vérifiés sur le dépôt. Tout ce qui n'a pas été vérifié est marqué comme tel.

## Master Character Assault : en pause (D-023)
| Étape | État |
| --- | --- |
| M0 à M3 | **terminées et acceptées** : tests et mesures de référence ; rendu M1 **par défaut** (`DEFAULT_RENDER_PATH = M1_OPTIMIZED_RENDER_PATH`, legacy en repli par `?rendu=legacy` / `RENDU=legacy`) ; adaptateur de squelette et contrat d'asset ; matériau et masque d'équipe ; validateur `check:glb` |
| M4, point A | ébauche technique **faite** (Blender piloté par scripts : validateur accepté, mains ≤ 1,2 mm de l'arme) mais **NON APPROUVÉE visuellement** ; marquée « non approuvé » (`art/master-assault/README.md`, bandeau sur les planches `docs/_attachments/m4/`) |
| M4, production artistique | **arrêtée** : points B, C et D non faits ; aucun asset de production dans le jeu |
| M5a | **non commencée** |

- **Raison :** la modélisation par script dans Blender n'atteint pas la qualité visuelle des références officielles (images 01 et 02).
- **Plan :** reprendre seulement avec un asset GLB / glTF externe de qualité production ou un meilleur asset 3D. À la reprise :
  1. valider l'asset avec le contrat existant ;
  2. le brancher par l'adaptateur M2 et le matériau M3 ;
  3. garder le repli ;
  4. passer vite à M5a (D-020).
  Procédure : [MASTER-ASSAULT-M4](characters/MASTER-ASSAULT-M4.md), § 8.

## Environnement de la carte 1 : préparation (D-024, D-025 proposée)
| Élément | État |
| --- | --- |
| Décor en jeu | inchangé : entièrement construit par `World.js`, aucun fichier 3D chargé |
| Registre sémantique | `src/environment/catalog.js` : 35 identifiants (28 prefabs, 7 modules ; 29 remplacent un élément existant, 6 prévus). `registry.js` : résolution par priorité de paquet, validation. [MAP1-ASSET-REGISTRY](map1/MAP1-ASSET-REGISTRY.md) |
| Paquet du kit | `src/environment/kits/medieval-village-megakit.js` : racine `public/kits/medieval-village-megakit/`, licence attendue, **aucune liaison** (kit non livré) |
| Chargeur | `src/environment/EnvAssetLibrary.js` (identifiant → glTF, instances partagées, `null` si non lié), **non branché** |
| Outils de kit | `tools/env-kit/` : ingestion (copie à chemins intacts, licence obligatoire, manifeste) et inventaire (dimensions, triangles, pivots, familles, rôles), testés sur un kit d'essai synthétique. [MAP1-ASSET-INVENTORY](map1/MAP1-ASSET-INVENTORY.md) |
| Ancres protégées | empreinte `tests/baselines/map1-anchors.json` : ancres, relief, 412 collisions (390 `solid`, 18 `cover`, 4 `nobullet`), 544 boîtes caméra, 2 297 cases de navigation bloquées. Décor fusionné : 4 maillages, 213 028 triangles |
| Plan | état détaillé, architecture, étapes E1 à E7, génération : [MAP1-ENVIRONMENT-PLAN](map1/MAP1-ENVIRONMENT-PLAN.md) |

## Ce qui est jouable
| Domaine | État |
| --- | --- |
| **Mode** | Conquête, 3 drapeaux, tickets (250 en 8v8, 400 en 16v16), victoire, défaite, relance, retour au menu |
| **Carte** | *Castelmare* (carte 1 uniquement) — [LEVEL-DESIGN](map1/LEVEL-DESIGN.md), [MAP1-ENVIRONMENT-PLAN](map1/MAP1-ENVIRONMENT-PLAN.md). Décor **entièrement construit par le code** (`src/game/World.js`, `src/game/map.js`) : 24 maisons, clocher, moulin, grange, 120 oliviers, 50 cyprès… ; aucun fichier 3D chargé par le jeu, pas de dossier `public/` |
| **Équipes** | Les Aigles (bleu, aigle) contre La Légion (rouge, étoile) |
| **Classes** | Assaut (fusil FL-4), Artilleur (mitrailleuse M-60L), Commando (sniper à lunette), 3 compétences chacune — [COMBAT](systems/COMBAT.md) |
| **Combat** | hitscan, atténuation par distance, tirs à la tête, recul propre à chaque arme, grenades, roquettes, obus, explosions avec ligne de vue, poignard |
| **Bots** | 8v8 ou 16v16, 3 difficultés, rôles attaque / défense / contournement / soutien, abris, replis — [AI](systems/AI.md) |
| **Véhicules** | jeep et char par équipe, suspension, destruction, réapparition ; conduits par le joueur seulement — [VEHICLES](systems/VEHICLES.md) |
| **Personnages** | procéduraux (primitives Three.js) ; en jeu, **chemin de rendu M1 par défaut** : corps en un `SkinnedMesh` lié au squelette animé, 3 maillages visibles par soldat (arme et chargeur compris), ~16 800 triangles, 1,2 à 1,3 Mo de géométrie ; repli `LEGACY_RENDER_PATH` (fusion par os, 18 maillages visibles) disponible ([M1](characters/MASTER-ASSAULT-M1.md)) ; 1,94 m au sommet des cheveux ; personnalisation (teint, cheveux, accessoires), planche de référence `fiche.html`. **Asset de production** : contrat prêt pour Blender ([ASSET-CONTRACT](characters/ASSET-CONTRACT.md)), adaptateur, validateur et **matériau d'équipe** (masque à 8 couleurs, bleu / rouge depuis un seul fichier, emblèmes en décalque) testés sur un asset d'essai synthétique et sur de **vrais exports Blender** (auto-test, ébauche du point A **non approuvée visuellement** : acceptés par le validateur, essai en jeu : mains ≤ 1,2 mm de l'arme), **rien de branché en jeu** ; production artistique **en pause** (D-023) ([M2](characters/MASTER-ASSAULT-M2.md), [M3](characters/MASTER-ASSAULT-M3.md)) ; brief pour l'artiste : [M4-BLENDER-BRIEF](characters/M4-BLENDER-BRIEF.md) ; M4 : [MASTER-ASSAULT-M4](characters/MASTER-ASSAULT-M4.md) |
| **Références visuelles** | images officielles 01 à 04 versionnées dans `docs/_attachments/` ([VISUAL-REFERENCES](product/VISUAL-REFERENCES.md), D-009) ; **le jeu n'a pas encore été modifié** pour s'en rapprocher (écarts listés dans ce document) |
| **Animation** | procédurale avec IK des mains, couches additives d'impact et de réception, 3 variantes de mort — [ANIMATION](systems/ANIMATION.md) |
| **Caméra** | 3ᵉ personne sans traversée du décor ni des feuillages, visée décalée, champ élargi au sprint |
| **HUD** | tickets, drapeaux, mini-carte, fil d'éliminations, marqueurs d'objectifs (aussi derrière le joueur), noms des alliés, dégâts flottants, direction des tirs, compétences, lunette, scores, anneau de rechargement, barre de capture en haut |
| **Son** | synthétisé (Web Audio), spatialisé : tirs étouffés au loin, pas, saut, réception, balles qui sifflent, impacts, vent, oiseaux, jingles. **Jamais écouté par un humain dans ce projet.** |
| **Effets** | lueur de bouche, douilles, traçantes, impacts, étoiles de touche, poussière, explosions, fumée qui s'efface près de la caméra, onde de capture |
| **Lumière** | soleil méditerranéen, ombres douces, rendu des tons *Neutral*, héros du menu éclairé de face |
| **Tactile** | joystick, visée au doigt, boutons, aide à la visée, avertissement en portrait ; marqueurs hors des boutons |

## Finition réalisée (phases 1 à 15)
1 personnage (proportions, silhouettes, IK à < 1 cm) · 2 animations (impacts, réception, foulée, pivots, morts ; correction de l'arme fusionnée dans le torse) · 3 caméra et déplacement · 4 armes · 5 effets · 6 couverts de la carte, mât de B déplacé, bots qui contournent les véhicules garés · 7 kit village · 8 éclairage · 9 HUD · 10 son · 11 IA · 12 véhicules · 13 tactile · 14 performances (fuites GPU, fusion des véhicules, réserve de modèles) · 15 finition (particules près de la caméra, tons harmonisés).
Détail par commit : `git log --oneline 9011271^..05827b4`.

## Tests (tous verts ; dernière exécution complète : 2026-09-30, préparation de l'environnement de la carte 1, `claude/dazzling-cray-gn1bg5`, chemin M1 par défaut : smoke 48/48 · tactile 12/12 · caméra 6/6 · bots 8/8 · personnage 72/72 · squelette 31/31 · matériau 18/18 · environnement 22/22 ; détails chiffrés des suites plus anciennes : étape M4 point A)
| Commande | Résultat |
| --- | --- |
| `npm run build` | OK |
| `npm run test:smoke` | 48/48, logique 1,31 ms par image |
| `npm run test:touch` | 12/12 |
| `npm run test:camera` | 6/6 : 68 positions, 4 760 images, 0 dans un mur, 0 dans un feuillage, 0 sous le sol |
| `npm run test:bots` | 8/8 : 45 éliminations et 5 captures en 3 min, blocages 0,5 %, 6 s au plus, logique 1,18 ms |
| `npm run test:character` | 72/72 : les deux chemins de rendu comparés (coût, mains / arme, tête / hitbox, arme / visée, bouche du canon, planches au pixel, camouflage, bord de l'écran), 16v16, mémoire, téléphone — [M0](characters/MASTER-ASSAULT-BASELINE.md), [M1](characters/MASTER-ASSAULT-M1.md) |
| `npm run test:rig` | 31/31 : contrat cohérent, copie JSON des scripts Blender à jour ; adaptateur sur un squelette d'essai aux repères différents (3 classes × 32 états : gameplay jamais modifié, articulations à 0 mm, mains identiques au gameplay, rendu = M1 à 0,004 % près) ; **un seul GLB d'essai** de 1,85 m pour les deux équipes (masque M3), exporté, validé et rechargé (mains 0 mm avec des bras +5 %, tête dans sa zone de touche) ; 14 fichiers fautifs refusés (dont bras trop courts) ; partie 8v8 avec véhicules, 0 exception — [M2](characters/MASTER-ASSAULT-M2.md) |
| `npm run test:material` | 18/18 : chaque zone du masque à sa couleur exacte (0 niveau d'écart, bleu, rouge, personnalisation) ; COLOR_0 jamais affiché ; asset sans masque neutre ; aigle / étoile à l'endroit ; LOD et accessoire sur un seul matériau ; camouflage ; bleu = M1 à 0,4 % près (zones d'emblème) ; bleu → rouge et teint / cheveux ne changent que leurs zones ; 16 soldats, un matériau par aspect, un programme de shader ; partie 8v8 habillée, camouflage compris, 0 exception — [M3](characters/MASTER-ASSAULT-M3.md) |
| `npm run test:env` | **22/22** : catalogue et registre valides, 12 erreurs de liaison refusées, remplacement par priorité ; garde D-024 (aucun chemin de fournisseur dans le code du jeu, essai de mutation fait) ; ingestion et inventaire sur un kit d'essai synthétique ; **empreinte de la carte 1 identique** (ancres, relief, collisions, boîtes caméra, navigation ; un déplacement de 50 cm d'une caisse est détecté) ; vue aérienne ; chargeur par identifiant. Kit réel **non testé** (non livré) |
| `npm run check:glb` | validateur d'asset (Node, sans service externe) ; accepte le GLB d'essai au stade prototype, le refuse au stade production pour LOD1/LOD2, expressions et clips absents seulement ; compte les sommets par zone du masque ; `--fit` : captures bleu, rouge et masque |
| `python tools/blender/fl_selftest.py` (module `bpy` 4.5.14) | auto-test de la chaîne Blender → glTF → validateur : **accepté** (prototype), essai en jeu : mains 4,7 mm, tête 3,2 cm (point A ; Blender non réinstallé depuis) |
| `python art/master-assault/blockout.py --fit` | ébauche du point A (**non approuvée**, référence technique ; non relancée depuis) : 14 456 triangles, 1,85 m, A-pose 30,5°, **acceptée** (prototype), mains ≤ 1,2 mm de l'arme, tête 1,9 cm ; silhouettes / image 01 : face 0,68, dos 0,72, 3/4 0,54, profil 0,41 |
| `RENDU=legacy npm test` | étape M1 : 5 suites vertes sur le chemin de repli (48/48, 12/12, 6/6, 8/8, 72/72) ; non relancé en M2 ni en M3 (aucun code de rendu du jeu touché) |
| Session de 4 min (script ad hoc, session précédente, non relancée) | 102 apparitions, 6 772 échantillons : 0 dans le décor, 0 sous le sol, 0 caméra dans un mur, 0 erreur |

Le banc de test abandonne les polices Google si elles ne répondent pas en 8 s (le réseau du conteneur peut les bloquer ; sans cela, la page ne finissait pas de charger).

## Performances
Voir [PERFORMANCE](systems/PERFORMANCE.md). En bref : logique 16v16 de 1,7 ms (mesure de référence) à 3,9 ms (juste après le déploiement) pour 4 ms visés ; **rendu 16v16 depuis M1 : 156 à 265 appels en vue de jeu** (objectif 250, atteint dans la plupart des vues ; 455 à 865 avant M1) ; mémoire GPU stable sur 3 relances ; FPS réels jamais mesurés sur GPU. Adaptateur M2 (non branché) : ≈ 0,1 ms par soldat et par image, à réduire avant l'intégration (M5).

## Problèmes connus
Vérifiés le 2026-09-29 sur `05827b4` :
1. **Blocages temporaires des bots** : 1,2 % des échantillons en partie simulée (0,5 à 1,6 % selon les parties), 8 s au plus, surtout près des obstacles denses de la ferme (C). **Le 2026-09-29, 1 exécution de `test:bots` sur 5 a échoué** sur un code inchangé : un bot bloqué **85 s** au drapeau A (Moulin, vers (−68 ; −7)), 11,1 % des échantillons ; les 4 autres exécutions : 0 à 0,9 %. Cause non identifiée (hors du périmètre M0).
2. **Pic de 40 à 65 ms en 16v16** : environ une fois par 2 minutes, quand un bot réapparaît dans une classe dont la réserve de modèles est vide ; le modèle est alors construit en pleine partie. Absent en 8v8.
3. **Rendu 16v16** : avant M1, 455 à 865 appels en vue de jeu (soldats : 18 maillages visibles chacun). **Depuis M1 (chemin par défaut) : 156 à 265 appels en vue de jeu, 208 à 313 en scène chargée** ([M1](characters/MASTER-ASSAULT-M1.md)) ; FPS réels et coût du skinning sur téléphone non mesurés.
4. **Arme au-dessus du sol** : dans la mort « en vrille » avec chute vers l'avant, le fusil reste à hauteur du torse (17 à 33 cm au-dessus du sol) ; les autres variantes sont correctes.
5. **Chevauchement forcé** : un soldat peut entrer dans un obstacle s'il est placé de force entre deux obstacles très proches (positions écartées par le test caméra) ; une seule occurrence (1 échantillon sur ~7 000) lors d'une session précédente, aucune lors de la dernière.
6. **Bots** : ne conduisent pas les véhicules.
7. **Carte** : pas de verticalité ni d'intérieurs ; grands espaces ouverts sur les routes nord et sud.
8. **Non vérifié** : FPS sur GPU réel, son à l'oreille, jeu sur vrai téléphone.
9. **Git** : le tag `pre-master-character-v1` n'existe que dans une session Cloud (proxy qui refuse les tags) ; le commit `05827b4` fait foi.
10. **Sphère de tête** placée à la verticale de l'os `head` : elle ne suit pas l'inclinaison de la tête (écart jusqu'à ~9 cm en pose, ~12 cm en partie). Gameplay existant, non modifié ([référence M0](characters/MASTER-ASSAULT-BASELINE.md)).
11. **Visée accroupie** : l'arme pointe ~15° sous la ligne de visée (visuel seulement).
12. **Main gauche** à 7–18 mm du garde-main en réception et 27–37 mm pendant le lancer de grenade (< 8 mm dans les poses stables).
13. **Logique 16v16** : 3,5 à 3,9 ms en moyenne juste après le déploiement (mesure M0), au lieu des 1,66 ms notés en référence (autre fenêtre de mesure) ; objectif < 4 ms tenu de justesse.
14. **`test:material`, échec ponctuel** (2026-09-30) : 1 exécution de `npm test` sur 2 a échoué. Le clic sur « start » est resté bloqué 30 s (fil principal occupé, rendu logiciel SwiftShader) au lancement de la partie de la vérification en jeu. Relancé seul : 18/18 ; chaîne complète relancée : verte. Le code du jeu n'était pas modifié. Cause non identifiée : à surveiller, comme l'échec ponctuel de `test:bots` (problème 1).

## Hors de ce dépôt
- Version jouable publiée (artefact privé du propriétaire), construite depuis `05827b4`.
- Déploiement GitHub Pages : le workflow `.github/workflows/deploy.yml` ne se déclenche qu'au push sur `main`. **Vérifié le 2026-09-30** : le dépôt distant n'a **pas** de branche `main` (seulement `claude/similar-project-tn0j8l`, branche par défaut, et `claude/dazzling-cray-gn1bg5`), et GitHub Pages n'est pas activé. Aucune publication automatique n'a donc lieu.
- Le dépôt GitHub `adam84140/Projet-Battle` est **public** : tout fichier commité est publié (important pour la licence d'un kit tiers).
