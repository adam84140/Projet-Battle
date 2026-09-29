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

## D-003 — SQUELETTE CANONIQUE DES PERSONNAGES
- **Statut :** PENDING
- **Décision :** le squelette définitif (noms d'os, hiérarchie, orientations, sockets) n'est gelé qu'après la validation technique **et** visuelle du Master Assault.
- **Raison :** geler trop tôt obligerait à refaire le rig et les animations de toutes les classes.
- **En attendant :** la proposition de squelette est dans [MASTER-ASSAULT](characters/MASTER-ASSAULT.md) ; elle reprend les 16 articulations du personnage procédural actuel pour préserver la compatibilité avec le code d'animation.

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
  - la spécification [MASTER-ASSAULT](characters/MASTER-ASSAULT.md) suit l'image 01 : hauteur 1,85 m, tête nue, emblèmes poitrine / deux manches / dos, **modèle de base sans sac à dos** (le sac devient un accessoire) — point à confirmer à la revue de la spécification ;
  - le gel du périmètre et D-001 restent entiers : les classes, cartes, avions et menus visibles dans les images 03 et 04 ne sont pas des demandes de travail ;
  - aucune valeur du jeu (couleurs, HUD, caméra) n'est modifiée par cette décision seule ; chaque écart listé dans [VISUAL-REFERENCES](product/VISUAL-REFERENCES.md) est traité dans l'étape de la [ROADMAP](ROADMAP.md) concernée, avec captures avant/après ;
  - une règle technique déjà fixée (hitboxes, budgets, lisibilité bleu/rouge) n'est jamais changée en silence à cause d'une référence : le conflit est soumis au propriétaire.
