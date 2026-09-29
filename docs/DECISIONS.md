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
