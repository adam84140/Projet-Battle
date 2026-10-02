# Passation de session

*À lire en premier au démarrage d'une session. À mettre à jour à la fin de chaque session.*

## Repères
| | |
| --- | --- |
| Point de contrôle stable avant Master Character | `05827b4807c67959e125c9681b5ffa953b113a29` (D-004) |
| Branche de travail | `claude/dazzling-cray-gn1bg5` |
| **Jalon actif** | **MAP 1 GOLD — ENVIRONNEMENT / PRODUCTION DU NIVEAU** ([D-024](DECISIONS.md), priorités P1 à P10 de la [ROADMAP](ROADMAP.md)) |
| Master Character | **EN PAUSE** après le point A de M4 ([D-023](DECISIONS.md)) : ne pas reprendre ; infrastructure M0–M3 à préserver |

## État Git (fin de la session du 2026-09-30 : préparation de l'environnement de la carte 1)
- Dernier commit : registre d'assets d'environnement, outils de kit, test `test:env` et documentation, sur `29a22aa`. Poussé sur `origin/claude/dazzling-cray-gn1bg5`.
- Pas de pull request, pas de merge vers `main`. Il n'y a d'ailleurs pas de branche `main` sur le dépôt distant, qui est **public**.

## Ce qui a été fait
- **État réel de la carte 1** audité et documenté ([MAP1-ENVIRONMENT-PLAN](map1/MAP1-ENVIRONMENT-PLAN.md), § 1) :
  - fichiers, déploiements, objectifs, routes ;
  - ce qui est codé en dur ;
  - couplages : générateur aléatoire unique, visuel et collisions dans les mêmes fonctions, fusion du décor ;
  - vue aérienne annotée.
- **Registre sémantique** (`src/environment/`, [MAP1-ASSET-REGISTRY](map1/MAP1-ASSET-REGISTRY.md)) :
  - 35 identifiants tirés des besoins réels de la carte, chacun relié à son constructeur actuel ;
  - paquets à priorité ;
  - paquet du kit village **sans liaison** (kit non livré) ;
  - chargeur par identifiant, **non branché**.
- **Outils de kit** (`tools/env-kit/`, [MAP1-ASSET-INVENTORY](map1/MAP1-ASSET-INVENTORY.md)) : ingestion (chemins intacts, licence obligatoire, manifeste) et inventaire (dimensions, triangles, pivots, familles, rôles).
- **`npm run test:env`** (22 vérifications, ajouté à `npm test`) :
  - empreinte des ancres, du relief, des collisions, des boîtes caméra et de la navigation (`tests/baselines/map1-anchors.json`) ;
  - garde « aucun chemin de fournisseur dans le code du jeu » ;
  - outils testés sur un kit d'essai synthétique ;
  - chargeur.
  Essais de mutation faits sur la garde et sur l'empreinte.
- Décision **D-025** proposée (architecture), en attente du propriétaire.

## Tests vérifiés
Voir [CURRENT-STATE](CURRENT-STATE.md), section « Tests » : build et `npm test` (huit suites) sur l'état commité.

## Problèmes connus et blocages
- **Kit pas encore transféré de façon fiable** ([MAP1-ENVIRONMENT-PLAN](map1/MAP1-ENVIRONMENT-PLAN.md), § 6.1).
  - Licence lue : CC0 1.0, publication permise.
  - Le dossier Google Drive du propriétaire est lisible par le connecteur, mais 310 fichiers sur 374 (`.gltf`, petits `.bin`) reviennent dans la conversation au lieu d'être enregistrés : on ne peut pas les copier de façon sûre.
  - L'accès réseau à Google Drive est refusé par l'environnement.
  - Les 22 PNG (54 Mo) sont récupérés octet pour octet, hors du dépôt (bloc-notes de la session, perdu si le conteneur change).
- Le dépôt est **public** : committer un kit le redistribue. La licence doit le permettre.
- Style du kit « médiéval » face au village méditerranéen de l'image 03 : à juger sur la planche visuelle (étape E2).
- Problèmes de jeu inchangés : [CURRENT-STATE](CURRENT-STATE.md), « Problèmes connus ».

## Décisions
- **Verrouillées** : D-001, D-002, D-004 à D-007, D-009 à D-020, D-023 (Master Character en pause), D-024 (kits tiers remplaçables).
- **En attente** : D-003, D-021 (suspendue), **D-025 (architecture de l'environnement)**.
- **Remplacée** : D-022.

## Docs et skills utiles
- Docs : [MAP1-ENVIRONMENT-PLAN](map1/MAP1-ENVIRONMENT-PLAN.md) · [MAP1-ASSET-REGISTRY](map1/MAP1-ASSET-REGISTRY.md) · [MAP1-ASSET-INVENTORY](map1/MAP1-ASSET-INVENTORY.md) · [LEVEL-DESIGN](map1/LEVEL-DESIGN.md) · [MAP1-GOLD](map1/MAP1-GOLD.md) · [PERFORMANCE](systems/PERFORMANCE.md) · [VISUAL-REFERENCES](product/VISUAL-REFERENCES.md).
- Skills : `map1-level-design` · `gameplay-regression` · `visual-validation` · `threejs-performance` · `frontline-art-direction`.

## Objectif exact de la prochaine session
1. **Démarrer** selon `CLAUDE.md` : vérifier Git, lire ce fichier, `npm install`, `npm run build`, `npm test` (huit suites).
2. **Récupérer le kit de façon fiable**, selon [MAP1-ENVIRONMENT-PLAN](map1/MAP1-ENVIRONMENT-PLAN.md), § 6 et 6.1 :
   - méthode C : archive `glTF-geometrie.zip` (les 352 `.gltf` et `.bin`, environ 2 Mo) dans le dossier Drive `vendor-drop`, téléchargée en un appel par le connecteur ; plus les 22 PNG du même dossier (fichiers lourds, enregistrés octet pour octet) ;
   - ou méthode A : dossier `vendor-drop/medieval-village-megakit/` (licence + dossier glTF) poussé sur la branche.
   **Jamais de recopie manuelle de contenu base64.** Vérifier chaque fichier (taille de la liste Drive, cohérence `.gltf` / `.bin`). Sans fichiers fiables, **s'arrêter** et redemander.
3. **Licence** : déjà lue (CC0 1.0 Universal, Quaternius), publication permise. Vérifier que le fichier livré est le même.
4. **Ingérer** : `node tools/env-kit/ingest.mjs --from <dossier> --pack medieval-village-megakit`. Puis :
   - vérifier `kit-manifest.json` (taille, fichiers manquants) ;
   - retirer `vendor-drop/` ;
   - remplir `license.summary` et `license.redistributionInPublicRepo` dans le paquet.
5. **Inventorier** : `node tools/env-kit/inventory.mjs --pack medieval-village-megakit`, puis lire le rapport :
   - familles, rôles, non reconnus ;
   - échelle, pivots, grille des modules ;
   - décodeurs nécessaires.
6. **Planche visuelle** des assets par famille (captures) pour que le propriétaire juge le style face à l'image 03 (étape E2).
7. **S'arrêter au rapport** : aucune liaison, aucun branchement dans le jeu avant l'accord du propriétaire (étapes E3 et suivantes, D-025).

**Ne pas supposer que le kit ni le Master Character existent** : décor et personnages en jeu sont encore procéduraux.
