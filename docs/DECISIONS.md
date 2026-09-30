# Journal des décisions

Chaque décision a un identifiant stable. Statuts : **LOCKED** (ne change qu'avec l'accord explicite du propriétaire du projet), **PENDING** (en attente de validation), **SUPERSEDED** (remplacée, garder la trace).

Pour ajouter une décision : nouvel ID à la suite, date, statut, décision, raison, conséquences. Ne jamais réutiliser ni renuméroter un ID.

---

## D-001 — ONE MAP FIRST
- **Statut :** LOCKED
- **Décision :** la carte 2 ne commence pas avant que la carte 1 (*Castelmare*) atteigne le niveau GOLD défini dans [MAP1-GOLD](map1/MAP1-GOLD.md).
- **Raison :** une seule tranche verticale excellente vaut mieux que plusieurs cartes moyennes ; la carte 1 sert de référence de qualité pour tout le reste.
- **Conséquence :** aucune nouvelle carte, aucun nouveau mode, aucun nouveau contenu hors du périmètre de la carte 1 (voir le gel du périmètre dans [CLAUDE.md](../CLAUDE.md)).

## D-002 — MASTER CHARACTER FIRST
- **Statut :** LOCKED
- **Décision :** la classe Assaut est produite en premier comme personnage de référence ; elle fixe l'architecture de production définitive des personnages (maillage, squelette, matériaux, animations, intégration).
- **Raison :** Artilleur, Commando, les skins et la personnalisation réutiliseront cette architecture ; la valider sur un seul personnage limite le risque.
- **Conséquence :** Artilleur et Commando restent sur le personnage procédural actuel jusqu'à la validation du Master Assault. Spécification : [MASTER-ASSAULT](characters/MASTER-ASSAULT.md).
- **Note (2026-09-30) :** la production artistique du Master Assault est **en pause** (D-023) et la carte 1 est la priorité active (D-024). La règle reste : le Master Assault sera le premier personnage de production quand la production reprendra.

## D-003 — SQUELETTE CANONIQUE DES PERSONNAGES
- **Statut :** PENDING
- **Décision :** le squelette définitif (noms d'os, hiérarchie, orientations, sockets) n'est gelé qu'après la validation technique **et** visuelle du Master Assault.
- **Raison :** geler trop tôt obligerait à refaire le rig et les animations de toutes les classes.
- **En attendant :** le squelette de **production** proposé est le contrat M2 (D-018, [ASSET-CONTRACT](characters/ASSET-CONTRACT.md), `src/character/rigContract.js`) : noms canoniques de type Blender, suivis par un adaptateur ; le squelette de **gameplay** (16 articulations du personnage procédural) reste celui du code d'animation. Le gel porte sur le contrat de production, après M7.

## D-004 — POINT DE CONTRÔLE STABLE AVANT MASTER CHARACTER
- **Statut :** LOCKED
- **Décision :** l'état stable de référence, juste avant la préparation de la production du Master Character, est le commit GitHub **`05827b4807c67959e125c9681b5ffa953b113a29`** (branche `claude/similar-project-tn0j8l`).
- **Contenu :** tranche verticale carte 1 après les 15 phases de finition, tous les tests verts (voir [CURRENT-STATE](CURRENT-STATE.md)).
- **Note :** un tag annoté `pre-master-character-v1` a été créé sur ce commit dans une session Cloud, mais le proxy Git Cloud refuse de pousser les tags : **le tag n'existe pas sur GitHub**. Le commit fait foi. Pour revenir à cet état : `git checkout 05827b4807c67959e125c9681b5ffa953b113a29`.

## D-005 — LE DÉPÔT GIT EST LA SOURCE DE VÉRITÉ
- **Statut :** LOCKED
- **Décision :** l'état technique du projet est celui du dépôt Git (code, tests, `docs/`). Un rapport de session, une capture ou un artefact publié ne remplace jamais le dépôt.
- **Conséquence :** tout travail qui compte est commité et poussé avant la fin d'une session ; `docs/CURRENT-STATE.md` et `docs/SESSION-HANDOFF.md` sont mis à jour dans le même commit que le travail qu'ils décrivent.

## D-006 — PRÉSERVER CE QUI FONCTIONNE, AMÉLIORER PAR PETITES ÉTAPES
- **Statut :** LOCKED
- **Décision :** pas de réécriture d'un système central sans autorisation explicite. Un changement risqué est d'abord proposé (quoi, pourquoi, ce qui peut casser, alternative plus sûre).
- **Raison :** le prototype joue ; chaque réécriture a coûté plus qu'elle n'a rapporté.

## D-007 — ANIMATION PILOTÉE PAR LE CODE PAR DÉFAUT
- **Statut :** LOCKED (principe) — les détails d'implémentation restent ouverts
- **Décision :** la locomotion, la visée, l'IK des mains et les réactions restent pilotées par le code (couches additives, IK), y compris avec le futur SkinnedMesh. Les clips d'animation créés dans un outil 3D servent là où le code ne suffit pas (rechargement, lancer, morts, gestes) et sont mélangés par-dessus.
- **Raison :** réactivité du gameplay, cohérence avec l'animateur actuel ([ANIMATION](systems/ANIMATION.md)), peu de clips à produire.

## D-008 — PAS DE RENDU PAR SQUELETTE SANS AUTORISATION (historique)
- **Statut :** SUPERSEDED par D-002
- **Décision d'origine :** pendant les phases 1 à 15, passer les soldats en SkinnedMesh était considéré comme une réécriture de la chaîne des personnages et n'a pas été fait (24 maillages par soldat).
- **Aujourd'hui :** ce passage fait partie du Master Assault, validé par D-002, et suit [CHARACTER-PIPELINE](characters/CHARACTER-PIPELINE.md).

## D-009 — RÉFÉRENCES VISUELLES OFFICIELLES
- **Statut :** LOCKED (fournies et hiérarchisées par le propriétaire du projet le 2026-09-29)
- **Décision :** *Frontline Legends* et les images 01 à 04 sont l'autorité visuelle du projet ([VISUAL-REFERENCES](product/VISUAL-REFERENCES.md), fichiers dans `_attachments/ref-0*.webp`) :
  - **01** vues tournantes du Master Assault : autorité **primaire** du personnage (proportions, silhouette, visage, coiffure, vêtements, équipement, emblèmes, matériaux, palette) ;
  - **02** planche de production du Master Assault : secondaire (expressions, accessoires, poses, échelle) ; l'image 01 prime en cas de conflit ;
  - **03** cible visuelle en jeu : autorité **primaire** de la présentation en jeu (caméra, lisibilité, décor, lumière, HUD, effets, véhicules) ;
  - **04** vision produit et interface : cohérence à long terme seulement ; **n'autorise** ni nouvelles cartes, ni passe de combat, ni serveur multijoueur, ni clans, ni progression, ni boutique, ni contenu supplémentaire ;
  - **05** *Battlefield Heroes* : inspiration seulement (lisibilité arcade, 3ᵉ personne accessible, classes lisibles, véhicules, capture de points, ton militaire bon enfant). **Ne jamais reproduire** ses éléments, personnages, marque, interface, cartes ou designs protégés. L'image n'est pas stockée dans le dépôt (marques d'un tiers).
- **Raison :** donner une cible visuelle unique au Master Assault et à la finition de la carte 1, sans élargir le périmètre.
- **Conséquences :**
  - la spécification [MASTER-ASSAULT](characters/MASTER-ASSAULT.md) suit l'image 01 : hauteur 1,85 m, tête nue, emblèmes poitrine / deux manches / dos, **modèle de base sans sac à dos** (confirmé par D-010) ;
  - le rapprochement 03 = capture de jeu, 04 = vision produit (ordre d'envoi inversé) est confirmé par le propriétaire ;
  - le gel du périmètre et D-001 restent entiers : les classes, cartes, avions et menus visibles dans les images 03 et 04 ne sont pas des demandes de travail ;
  - aucune valeur du jeu (couleurs, HUD, caméra) n'est modifiée par cette décision seule ; chaque écart listé dans [VISUAL-REFERENCES](product/VISUAL-REFERENCES.md) est traité dans l'étape de la [ROADMAP](ROADMAP.md) concernée, avec captures avant/après ;
  - une règle technique déjà fixée (hitboxes, budgets, lisibilité bleu/rouge) n'est jamais changée en silence à cause d'une référence : le conflit est soumis au propriétaire.

## D-010 — ASSAUT PAR DÉFAUT SANS SAC À DOS
- **Statut :** LOCKED (décision du propriétaire, 2026-09-29)
- **Décision :** le Master Assault par défaut **n'a pas de sac à dos**. Les images 01 et 03 font autorité pour sa silhouette par défaut ; l'**emblème du dos doit rester bien visible** depuis la caméra à la 3ᵉ personne. Le sac à dos est **uniquement un accessoire de personnalisation optionnel**.
- **Conservé :** le support du sac dans l'architecture (socket `socket_back`, option `backpack` de la personnalisation, construction de l'accessoire) : un sac doit pouvoir être équipé plus tard. Ne pas le supprimer.
- **Conséquences :** la distinction entre classes ne repose plus sur le sac (test de silhouette à refaire avec le Master Assault) ; le changement de la valeur par défaut en jeu (`DEFAULT_CUSTOM.backpack`) se fait **avec l'étape de migration concernée** (M6 de l'[audit](characters/MASTER-ASSAULT-AUDIT.md)), en respectant la compatibilité des réglages sauvegardés (clé `frontline-legends-settings-v1`).
- **Complément (propriétaire, 2026-09-29) :** à cette étape, une **migration unique des réglages sauvegardés** fait passer l'Assaut existant à « sans sac » (même clé, anciens réglages toujours lisibles). Les **bots Assaut n'ont pas de sac par défaut** ; les autres variations cosmétiques compatibles restent aléatoires.

## D-011 — IDENTITÉ D'ÉQUIPE CANONIQUE
- **Statut :** LOCKED (décision du propriétaire, 2026-09-29)
- **Décision :** l'identité d'équipe établie reste canonique : **Les Aigles (bleu) = emblème ailé actuel** ; **La Légion (rouge) = étoile actuelle** (`src/character/emblems.js`, `TEAMS` dans `src/config.js`).
- **Raison :** les maquettes générées sont des références visuelles, pas des documents de game design garantis cohérents (l'image 03 montre un drapeau bleu à étoile ailée).
- **Conséquences :** quand une référence contredit cette identité, on la réinterprète avec l'emblème canonique ; aucun changement de gameplay ni d'identité d'équipe pour cette raison.

## D-012 — MER ET HORIZON MÉDITERRANÉENS EN DÉCOR DE FOND
- **Statut :** LOCKED (décision du propriétaire, 2026-09-29)
- **Décision :** la carte 1 recevra à terme la mer méditerranéenne et l'horizon côtier de l'image 03, traités comme **art d'environnement et décor de fond**.
- **Interdit pour cela :** changer la disposition jouable, déplacer les objectifs, changer les routes de jeu, modifier collisions ou navigation.
- **Quand :** passe artistique environnement de la carte 1 ([ROADMAP](ROADMAP.md), étape 4). **Pas de refonte de la carte pendant le jalon Master Character.** Exigence documentée dans [LEVEL-DESIGN](map1/LEVEL-DESIGN.md).

## D-013 — DIRECTION DU HUD ET RÈGLES DE LA CONQUÊTE
- **Statut :** LOCKED (décision du propriétaire, 2026-09-29)
- **Décision :** le HUD se rapprochera visuellement de l'image 03 : mini-carte à gauche ; portrait du héros avec la santé ; état des tickets et des objectifs plus clair en haut au centre ; hiérarchie munitions / compétences plus nette ; fil d'éliminations à une place cohérente ; finition visuelle de niveau commercial.
- **Règles inchangées :** la victoire aux tickets reste la règle canonique de la conquête ; on ne change pas les règles pour reproduire une maquette.
- **Chrono :** acceptable plus tard s'il est **informatif seulement** (durée écoulée) et n'influence jamais la victoire ou la défaite. **Aucun compte à rebours ni limite de temps sans autorisation explicite séparée.**
- **Quand :** passe HUD de la [ROADMAP](ROADMAP.md) (étape 5), avec vérifications de chevauchement (ordinateur et tactile) ; pas pendant le Master Character.

## D-014 — ASSET DE PRODUCTION PAR LA CHAÎNE BLENDER / 3D
- **Statut :** LOCKED (décision du propriétaire, 2026-09-29)
- **Décision :** le modèle de production du Master Assault est créé par une vraie chaîne Blender / 3D. **Ne pas tenter de reproduire le personnage final des références avec des primitives JavaScript procédurales.** Les images 01 et 02 restent l'autorité visuelle.
- **Rôle de Claude :** définir le contrat de l'asset, préparer des spécifications compatibles Blender, écrire des scripts d'aide et de validation d'export, valider les fichiers GLB/glTF, intégrer l'asset dans Three.js, automatiser des parties de la chaîne Blender quand c'est pratique. L'asset visuel lui-même appartient à la chaîne Blender / 3D.
- **Conséquence :** aucune production Blender avant l'autorisation de l'étape M4 ([MASTER-ASSAULT-AUDIT](characters/MASTER-ASSAULT-AUDIT.md)).

## D-015 — ADAPTATEUR DE SQUELETTE (RECIBLAGE)
- **Statut :** LOCKED sur le principe (propriétaire, 2026-09-29) ; implémentation soumise à l'autorisation de son étape (M2)
- **Décision :** un adaptateur permet à un squelette Blender de production standard (A-pose, noms canoniques) de suivre le contrat actuel d'animation et de gameplay (squelette de gameplay, `Animator`, IK, hitboxes) **sans réécrire les systèmes de jeu qui fonctionnent**.
- **Raison :** voir les constats C1 à C3 de l'[audit](characters/MASTER-ASSAULT-AUDIT.md).

## D-016 — STRATÉGIE DE MATÉRIAUX DES PERSONNAGES
- **Statut :** LOCKED pour la direction ; **PENDING** pour le rendu à grande distance
- **Décision :** architecture de matériau de production **partagée**, asset de personnage **partagé**, **masque de couleurs d'équipe** bleu/rouge, pas de géométrie ni de texture dupliquées par équipe, nombre de matériaux minimal.
- **En attente :** la stratégie « couleurs de sommets à grande distance » (LOD2) reste **provisoire** : elle ne sera verrouillée que si des mesures visuelles et de performance montrent un gain réel sans dégrader visiblement la cible officielle.

## D-017 — CHEMINS DE RENDU DES SOLDATS (ÉTAPE M1)
- **Statut :** LOCKED (M1 acceptée par le propriétaire le 2026-09-29 : M1 reste le chemin par défaut, legacy reste disponible en repli pour l'instant ; pas d'optimisation spéculative supplémentaire de M1 — shader de peau, envoi de la texture des os, stratégie de découpage, rendu mobile — avant la validation sur de vrais appareils)
- **Décision :** les soldats en jeu ont deux chemins de rendu, choisis dans `src/character/renderPath.js` : `LEGACY_RENDER_PATH` (fusion par os, référence M0, conservé intact) et `M1_OPTIMIZED_RENDER_PATH` (corps en un `SkinnedMesh` lié au squelette de gameplay existant, arme indexée). **M1 est le chemin par défaut**, legacy reste disponible (`?rendu=legacy`, `RENDU=legacy npm test`, ou une ligne à changer).
- **Raison :** diviser par 3 à 4 les appels de rendu en 16v16 sans toucher au gameplay ([MASTER-ASSAULT-M1](characters/MASTER-ASSAULT-M1.md)).
- **Conséquences :** le squelette de gameplay (16 `Group` animés) reste la source des hitboxes, du support d'arme, de la bouche du canon et de l'IK ; le futur adaptateur (D-015, M2) s'y branchera. Le chemin legacy ne sera retiré qu'avec l'accord du propriétaire.

## D-018 — SQUELETTE DE PRODUCTION ET CONTRAT D'ASSET (ÉTAPE M2)
- **Statut :** LOCKED comme contrat de travail (M2 acceptée par le propriétaire le 2026-09-29). **Non gelé** : le gel reste soumis à D-003, après la validation GOLD du vrai Master Assault (M7). Masque d'équipe précisé par D-019 (contrat `M3-0.2`).
- **Décision :**
  - le squelette de **production** a ses propres noms canoniques, de type Blender : `root`, `hips`, `spine`, `spine1`, `chest`, `neck`, `head`, et par côté `clavicle`, `upperArm`, `lowerArm`, `hand`, `thigh`, `calf`, `foot`, `toe` suffixés `.L` / `.R` (23 os requis, doigts et visage facultatifs), en **A-pose**, 1,85 m ; `upperArm.L` devient `upperArmL` au chargement ;
  - ce squelette **suit** le squelette de gameplay (16 articulations, inchangé) par l'adaptateur `src/character/rigAdapter.js` (D-015) : rotations recopiées avec décalages calibrés, colonne répartie, bassin à l'échelle des jambes, IK des mains sur les longueurs de bras de l'asset. Le gameplay reste la seule source des hitboxes, du support d'arme, de la bouche du canon et de la visée ;
  - points d'attache : `socket_hand.R`, `socket_hand.L`, `socket_back`, `socket_head`, `socket_face`, `socket_hip.L`, `socket_hip.R`, `socket_grenade` (requis), `socket_weapon` (aperçu Blender seulement) ; ils remplacent la proposition `socket_hand_R`… de [MASTER-ASSAULT](characters/MASTER-ASSAULT.md) ; l'arme reste sur le support animé par le code ;
  - contrat d'asset complet (repère, maillages, LOD, pondération, matériau `M_body`, masque d'équipe `COLOR_0` + UV d'emblème `TEXCOORD_1`, expressions, clips, export) dans [ASSET-CONTRACT](characters/ASSET-CONTRACT.md), source machine `src/character/rigContract.js` (version `M2-0.1`), validé par `npm run check:glb` ;
  - le code garde locomotion, visée, recul, réactions et IK ; Blender fournit rechargement, lancer, geste, soin, poignard (facultatif), 3 morts, pose assise et 9 expressions ; événements fixés par le contrat en pourcentage.
- **Raison :** un rig de production standard (Blender) ne peut pas porter les noms et repères du squelette procédural ; l'adaptateur évite de réécrire l'animateur, les hitboxes et l'IK ([MASTER-ASSAULT-M2](characters/MASTER-ASSAULT-M2.md)).
- **Conséquences :** toute évolution du contrat modifie `rigContract.js`, [ASSET-CONTRACT](characters/ASSET-CONTRACT.md) et cette décision dans le même commit ; le matériau (M3) et l'intégration (M5 : chargement, LOD, clips, coût de l'adaptateur) ne sont pas décidés ici.

## D-019 — MASQUE D'ÉQUIPE ET MATÉRIAU PARTAGÉ DES PERSONNAGES DE PRODUCTION (ÉTAPE M3)
- **Statut :** LOCKED (M3 et direction acceptées par le propriétaire le 2026-09-30). Non gelé (D-003).
- **Précisions du propriétaire (2026-09-30)** : couleur secondaire = teinte sombre d'équipe (bleu nuit pour les Aigles, rouge sombre / brun pour la Légion) ; **revers des manches neutres gris clair** (image 01) ; **pantalon olive / kaki non teinté** pour l'aperçu, fidèle à la référence ; **cheveux = zone de personnalisation indépendante**, jamais teintée par l'équipe, changeable indépendamment de l'équipe, du teint et des vêtements ; cheveux **bruns** de la référence pour le Master Assault canonique.
- **Décision :**
  - le masque `COLOR_0` se peint avec **huit couleurs pures** (R, G, B à 0 ou 1 ; canal A réservé) : noir = neutre, rouge = couleur d'équipe principale, vert = teinte sombre d'équipe (secondaire), bleu / magenta / cyan = zone d'emblème posée sur neutre / principale / secondaire, jaune = peau, blanc = cheveux (`TEAM_MASK` et `decodeMask()` de `src/character/rigContract.js`, contrat `M3-0.2`) ;
  - les zones colorables sont peintes dans l'atlas en gris ; le **gris de référence `#CCCCCC`** rend exactement la teinte ;
  - teintes par équipe : principale = `TEAMS.shirt`, **secondaire = `TEAMS.vest`** (bleu nuit / brun-rouge : panneau du dos, casquette) ; peau et cheveux = personnalisation existante (6 teints, 6 couleurs) ; **les revers des manches deviennent neutres** (gris clair de l'image 01), ce qui remplace la proposition M2 « G = revers, bandes » ;
  - emblèmes **en décalque** : texture générée depuis `emblems.js` (aigle / étoile, D-011), posée sur des zones carrées par la 2ᵉ carte UV (`TEXCOORD_1`) ;
  - runtime `src/character/teamMaterial.js` : `COLOR_0` **renommé** au chargement (jamais affiché), attributs neutres si absents, **un matériau par aspect** (source, équipe, teint, cheveux) partagé par tous les LOD, accessoires et soldats de même aspect, un seul programme de shader, variante transparente pour le camouflage (un clone de matériau d'équipe reste un matériau d'équipe : le camouflage actuel fonctionne tel quel), visualisation du masque pour le contrôle ;
  - rien n'est branché sur les soldats en jeu avant M5 ; le personnage procédural n'utilise pas ce matériau.
- **Raison :** un seul asset et une seule texture pour bleu et rouge (D-016), sans ambiguïté de peinture ni perte à l'export ([MASTER-ASSAULT-M3](characters/MASTER-ASSAULT-M3.md)).
- **Conséquences :** pantalon, revers et gilet neutre sont **identiques pour les deux équipes** (la Légion perd son pantalon gris-vert) : à confirmer par le propriétaire à l'aperçu bleu / rouge ; une teinte de pantalon par équipe demanderait d'étendre le masque. La couleur des yeux n'est plus tirée au hasard sur l'asset (peinte).

## D-020 — APERÇU JOUABLE AVANT LA VALIDATION FINALE
- **Statut :** LOCKED (règle du propriétaire, 2026-09-29)
- **Décision :** le propriétaire doit **voir et essayer** le nouveau personnage bien avant la validation finale. Dès qu'un **premier GLB valide** existe (M4 : asset d'aperçu qui passe `npm run check:glb -- … --stade prototype --fit` sans erreur), le projet prévoit une **intégration minimale jouable (M5a)** : le personnage de production en partie réelle, caméra à la 3ᵉ personne et en visée, bleu et rouge, avec retour immédiat au personnage actuel par un réglage. Le propriétaire y valide silhouette, proportions, échelle générale, mains et arme, lisibilité à l'écran et sensation en jeu.
- **Rôle des étapes :** **M4 = premier asset réel visible** ; **M5a = première intégration jouable** ; M5 = intégration complète ; **M7 = validation GOLD finale seulement**.
- **Conséquences :** le plan de l'[audit](characters/MASTER-ASSAULT-AUDIT.md) et la [ROADMAP](ROADMAP.md) intègrent M5a juste après le premier GLB d'aperçu ; la même règle s'applique aux futurs personnages (Artilleur, Commando) : un aperçu jouable avant toute validation finale. Chaque étape reste soumise à l'autorisation explicite du propriétaire.

## D-021 — AJUSTEMENTS DU CONTRAT AU POINT DE CONTRÔLE A (ÉTAPE M4)
- **Statut :** PENDING, **suspendue avec la production (D-023)**. Mesuré le 2026-09-30 sur l'ébauche du point A. Le contrat `M4-0.3` reste en vigueur dans le code et le validateur (non gelé, D-003) ; ces valeurs seront revues à la reprise avec le nouvel asset (un asset externe fidèle à l'image 01 aura des bras plus courts que 0,60 m).
- **Décision :**
  - **portée des bras** : bras + avant-bras (épaule → poignet) **≥ 0,60 m** de chaque côté (`ASSET.minArmReachM`, règle `PORTEE_BRAS` du validateur). Mesuré avec l'arme du jeu : 0,565 m laisse la main gauche à 36–46 mm du garde-main, 0,60 m à 11 mm en visée basse, 0,61 m à 1,2 mm. La tolérance de ± 3 cm par segment (M2) ne garantissait pas la prise ;
  - **cou et tête** : cibles et tolérances verticales élargies (cou 1,50 ± 0,06 m, tête 1,59 ± 0,07 m) pour l'anatomie de l'image 01 (base du cou ≈ 1,54 m, pivot du crâne ≈ 1,63 m) ; sans effet sur le gameplay (rotations recopiées ; zone de touche vérifiée par l'essai `--fit`) ;
  - le gabarit accepte une **A-pose détendue** (bras portés vers l'avant, léger pli du coude), comme l'image 01, dans l'angle du contrat (30 à 60°).
- **Conséquence visible** : les bras du Master Assault sont plus longs que sur l'image 01 (≈ 0,51 m de l'épaule au poignet sur la référence) tant que la tenue de l'arme du jeu ne change pas ; rapprocher l'arme du corps serait un changement de gameplay et d'animation, à autoriser séparément.

## D-022 — PRODUCTION DE L'ASSET PAR BLENDER PILOTÉ PAR SCRIPTS (ÉTAPE M4)
- **Statut :** SUPERSEDED par D-023 (2026-09-30) **pour la modélisation de l'art** : la modélisation par script n'atteint pas la qualité visuelle visée. Les outils de `tools/blender/` (gabarit, export verrouillé, validateur automatique, planches de revue, auto-test) restent valables pour tout asset.
- **Décision :** l'asset du Master Assault est produit dans **Blender 4.5 LTS** (module `bpy` dans le conteneur Cloud, même version que le poste d'un artiste), par des **scripts Python versionnés** (`art/master-assault/`) qui régénèrent `.blend`, rendus de revue et `.glb` ; outils communs dans `tools/blender/` (gabarit, export verrouillé, validateur automatique, planches de comparaison). Points de contrôle A (ébauche), B (corps et vêtements), C (visage, cheveux, mains, bottes), D (GLB riggé, validateur à 0 erreur), chacun comparé aux images 01 et 02 et revu par le propriétaire ; M5a (D-020) dès le point D.
- **Fichiers :** scripts et proportions versionnés ; `.blend`, `.glb` d'étape et rendus générés dans `art/build/` (ignoré par Git) ; planches de revue dans `docs/_attachments/m4/` ; asset du jeu `public/models/characters/assault.glb` au point D seulement.
- **Limite :** un script ne sculpte pas : visage, cheveux et plis restent stylisés ; si le rendu du point C ne suffit pas, un artiste reprend le `.blend` au même contrat (D-014 : jamais de primitives JavaScript pour l'asset).

## D-023 — PRODUCTION ARTISTIQUE DU MASTER CHARACTER EN PAUSE
- **Statut :** LOCKED FOR NOW (décision du propriétaire, 2026-09-30). Ne change qu'avec l'accord explicite du propriétaire.
- **Décision :** le personnage du Master Assault modélisé par script dans Blender (M4) **ne va pas au-delà du point de contrôle A**. Points B, C et D non faits, aucun affinage supplémentaire du personnage scripté, **pas de M5a**. L'ébauche du point A **n'est pas approuvée** comme direction visuelle (*NOT APPROVED FINAL ART*).
- **Raison :** l'ébauche est techniquement utile (squelette, export, validateur, masque d'équipe, essai en jeu : tout fonctionne), mais son résultat visuel reste très en dessous des références officielles (images 01 et 02, D-009). La modélisation par script ne permet pas d'atteindre la qualité visée.
- **Ce qui reste accepté et conservé :**
  - M0 : tests et mesures de référence ;
  - M1 : chemin de rendu optimisé, **toujours par défaut** (D-017) ;
  - M2 : adaptateur de squelette et contrat d'asset (D-018) ;
  - M3 : matériau et masque d'équipe (D-019) ;
  - validateur `check:glb`, scripts d'aide `tools/blender/`, documentation et contrat d'asset ;
  - personnage legacy en repli.
- **Fichiers du point A** (`art/master-assault/`, `docs/_attachments/m4/checkpoint-a-*`) : conservés comme **référence technique** (preuve du squelette et de la chaîne, cas d'essai du validateur, comparaison historique), marqués « non approuvé ». Ils ne sont pas une cible visuelle. Dernier commit de la production M4 : `4f626261573c9704a3600b9820b3c611a42a26f2`.
- **Reprise :** seulement quand le propriétaire fournit un asset **GLB / glTF externe de qualité production**, un meilleur asset 3D, ou une autre méthode de production. Cette voie reste compatible avec D-014 (chaîne 3D, jamais de primitives JavaScript). À la reprise :
  1. valider l'asset avec le contrat existant (`npm run check:glb -- … --stade prototype --fit`) ;
  2. le brancher par l'adaptateur M2 et le matériau M3 ;
  3. garder le personnage actuel en repli ;
  4. passer vite à l'aperçu jouable M5a (D-020).
  Procédure : [MASTER-ASSAULT-M4](characters/MASTER-ASSAULT-M4.md), § 8.

## D-024 — CARTE 1 PRIORITÉ ACTIVE ; KITS D'ENVIRONNEMENT TIERS REMPLAÇABLES
- **Statut :** LOCKED (décision du propriétaire, 2026-09-30). La forme exacte du registre sera proposée au propriétaire avant son implémentation.
- **Décision :**
  - le développement actif passe à **MAP 1 GOLD — environnement et production du niveau** (priorités P1 à P10 de la [ROADMAP](ROADMAP.md)). La carte 2 reste hors périmètre (D-001). La réserve « pas de refonte de la carte pendant le jalon Master Character » de D-012 ne s'applique plus ; les règles de D-012 sur la mer restent ;
  - un **kit d'environnement modulaire tiers** (par exemple Quaternius) peut servir **temporairement**, comme échafaudage de production **remplaçable** ;
  - **règle** : les systèmes de jeu, les objectifs, les collisions et la navigation des bots ne dépendent **jamais** d'un nom de fichier ni d'un chemin propre au fournisseur ;
  - **architecture retenue** : un **identifiant sémantique** (ex. `HOUSE_SMALL_A`) est résolu par un **registre d'assets d'environnement** vers l'asset du kit actuel. Exemple : `HOUSE_SMALL_A` → asset Quaternius ou temporaire aujourd'hui → asset propre à Frontline Legends plus tard. Remplacer un asset ne change que le registre : la carte survit au remplacement sans reconstruire la logique de jeu.
- **Raison :** avancer vite sur la qualité de la carte 1 sans lier le jeu à un fournisseur, et pouvoir remplacer le kit par des assets maison sans rien casser.
- **Conséquences :**
  - la licence de chaque kit est vérifiée et notée avant import ;
  - la disposition de la carte 1 est préservée (drapeaux, bases, routes, limites, couverts de combat) ;
  - l'ordre des tirages de `World.js` ne change pas ;
  - `test:bots` et `test:camera` protègent collisions et navigation à chaque étape ;
  - *Battlefield Heroes* reste une inspiration seulement : aucun de ses éléments n'est reproduit.
