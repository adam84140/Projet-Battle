# Passation de session

*À lire en premier au démarrage d'une session. À mettre à jour à la fin de chaque session.*

## Repères
| | |
| --- | --- |
| Point de contrôle stable avant Master Character | `05827b4807c67959e125c9681b5ffa953b113a29` (D-004) |
| Branche de travail | `claude/dazzling-cray-gn1bg5` (contient tout l'historique de `claude/similar-project-tn0j8l`) |
| **Jalon actif** | **MAP 1 GOLD — ENVIRONNEMENT / PRODUCTION DU NIVEAU** ([D-024](DECISIONS.md), priorités P1 à P10 de la [ROADMAP](ROADMAP.md)) |
| Master Character | **EN PAUSE** après le point de contrôle A de M4 ([D-023](DECISIONS.md)) ; dernier commit de production du personnage : `4f62626` |

## État Git (fin de la session du 2026-09-30 : mise en pause)
- Dernier commit : mise en pause du Master Character et passage à la carte 1. Il ne change que la documentation, les marqueurs « non approuvé » et le bandeau des planches ; son parent est `4f62626`. Poussé sur `origin/claude/dazzling-cray-gn1bg5`.
- Code du jeu modifié depuis `05827b4` : étapes M1 à M4 seulement (liste dans [CURRENT-STATE](CURRENT-STATE.md)).
- Pas de pull request, pas de merge vers `main`. Tag non poussé (proxy) : le hash fait foi.

## MASTER CHARACTER : EN PAUSE
- **Pourquoi** : l'ébauche du point A (Blender piloté par scripts) est techniquement valide : validateur accepté, mains ≤ 1,2 mm de l'arme. Mais son résultat visuel reste très en dessous des images 01 et 02, et le propriétaire ne l'approuve pas. On attend un asset GLB / glTF externe ou meilleur.
- **Ne pas faire** : points B, C, D ; affiner `art/master-assault/` (marqué **non approuvé**) ; M5a.
- **À PRÉSERVER, ne rien supprimer** :
  - M0 : `test:character`, mesures de référence ;
  - M1 : rendu **par défaut**, et legacy en repli ;
  - M2 : `rigAdapter.js`, `rigContract.js`, [ASSET-CONTRACT](characters/ASSET-CONTRACT.md) ;
  - M3 : `teamMaterial.js` ;
  - validateur `check:glb`, `tools/blender/`, documentation et contrat.
- **Reprise** : seulement quand le propriétaire fournit un asset. Procédure : [MASTER-ASSAULT-M4](characters/MASTER-ASSAULT-M4.md), § 8 (contrat → adaptateur M2 → matériau M3 → repli gardé → M5a au plus vite).

## MAP 1 : intention
- **But** : amener la carte 1 au niveau GOLD par la production de l'environnement (priorités P1 à P10 de la [ROADMAP](ROADMAP.md)). La carte 2 ne commence pas (D-001).
- **État réel** : le décor est entièrement construit par le code (`src/game/World.js`, ≈ 810 lignes ; `src/game/map.js`). Aucun fichier 3D n'est chargé, il n'y a pas de dossier `public/`, et `src/game/` n'utilise aucun chargeur glTF.
- **Kit tiers** : un kit d'environnement modulaire (par exemple Quaternius) peut servir **temporairement**. Sa licence est vérifiée et notée avant import.
- **RÈGLE (D-024)** : un asset tiers doit rester **remplaçable**. Le gameplay, les objectifs, les collisions et la navigation des bots ne dépendent **jamais** d'un nom de fichier ni d'un chemin du fournisseur.
- **Architecture retenue** : **identifiant sémantique → registre d'assets d'environnement → asset du kit actuel**.
  - Exemple : `HOUSE_SMALL_A` → asset Quaternius ou temporaire aujourd'hui → asset propre à Frontline Legends plus tard.
  - La carte doit survivre au remplacement d'un asset sans reconstruire la logique de jeu.
- **Contraintes permanentes** :
  - disposition préservée : drapeaux, bases, routes, limites, couverts de combat ;
  - ordre des tirages de `World.js` inchangé (ajouts après `buildScatter()`) ;
  - chaque objet solide a sa collision (`physics.addBox`), chaque feuillage en hauteur sa boîte caméra (`addCameraBox`) ;
  - la grille de navigation A* est construite depuis les collisions ;
  - `test:bots` et `test:camera` passent à chaque étape ;
  - au plus 250 appels de rendu en vue de jeu 16v16 ;
  - `disposeTree` pour tout objet retiré.

## Tests vérifiés
Exécution complète du 2026-09-30, sur `4f62626`, au moment de la mise en pause :
- `npm run build` : OK ;
- `npm test` : smoke 48/48 · tactile 12/12 · caméra 6/6 · bots 8/8 (54 éliminations, 5 captures, 1,4 % de blocages, 7 s au plus) · personnage 72/72 · squelette 31/31 · matériau 18/18 ;
- 0 erreur console.

`RENDU=legacy npm test` : vert à l'étape M1, non relancé depuis (aucun code de rendu du jeu touché). Mesures 16v16 : [PERFORMANCE](systems/PERFORMANCE.md).

## Problèmes connus (résumé)
- Blocages brefs des bots (~1 %, dont un blocage de 85 s au Moulin sur 1 exécution de 5).
- Pic de 40 à 65 ms en 16v16 (réserve de modèles vide).
- 156 à 265 appels de rendu en vue de jeu 16v16.
- Arme au-dessus du sol dans une variante de mort.
- Chevauchement forcé rare.
- Bots qui ne conduisent pas.
- Carte : grands espaces ouverts, pas de verticalité.
- FPS réels, son et vrai téléphone non vérifiés.

Détail : [CURRENT-STATE](CURRENT-STATE.md).

## Décisions
- **Verrouillées** : D-001 ONE MAP FIRST · D-002 · D-004 · D-005 · D-006 · D-007 · D-009 à D-020 · **D-023 production du Master Character en pause** (LOCKED FOR NOW) · **D-024 carte 1 prioritaire, kits tiers remplaçables**.
- **En attente** : D-003 (gel du squelette), D-021 (suspendue avec la production).
- **Remplacée** : D-022 (méthode par script).

Voir [DECISIONS](DECISIONS.md).

## Docs et skills utiles pour la suite
- Docs : [ROADMAP](ROADMAP.md) (P1 à P10) · [LEVEL-DESIGN](map1/LEVEL-DESIGN.md) · [MAP1-GOLD](map1/MAP1-GOLD.md) · [ZONE-A-MILL](map1/ZONE-A-MILL.md) · [ZONE-B-VILLAGE](map1/ZONE-B-VILLAGE.md) · [ZONE-C-FARM](map1/ZONE-C-FARM.md) · [AI](systems/AI.md) · [PERFORMANCE](systems/PERFORMANCE.md) · [ART-DIRECTION](product/ART-DIRECTION.md) · [VISUAL-REFERENCES](product/VISUAL-REFERENCES.md) (image 03 = présentation en jeu).
- Skills : `map1-level-design` · `threejs-performance` · `visual-validation` · `gameplay-regression` · `frontline-art-direction`.

## Objectif exact de la prochaine session
1. **Démarrer** selon la procédure de `CLAUDE.md` : vérifier Git, lire ce fichier, `npm install`, `npm run build`, `npm test`. Blender n'est pas nécessaire.
2. **Auditer l'environnement de la carte 1 et proposer la chaîne d'assets (P1 à P3)**, sans modifier le jeu avant l'autorisation du propriétaire :
   - **inventaire** de ce que construit `World.js` (bâtiments, murs, couverts, props, végétation, relief). Pour chaque famille : sa collision, sa boîte caméra, son effet sur la navigation, sa place dans l'ordre des tirages ;
   - **mesures de référence** : appels de rendu et triangles du décor, temps de construction, `test:bots`, `test:camera` ; captures vue de dessus et en jeu des 3 zones (skill `visual-validation`) ;
   - **proposition** :
     - liste des identifiants sémantiques et format du registre ;
     - chargement glTF (préchargement, instanciation ou fusion, ombres, `disposeTree`) ;
     - collisions déclarées par identifiant, jamais par fichier ;
     - repli sur le décor actuel si un asset manque ;
     - tests de non-régression, dont un contrôle qui refuse tout nom de fichier du fournisseur hors du registre ;
   - **demander au propriétaire** le kit tiers (fichier ou lien) et sa licence.
3. **S'arrêter au rapport** ; l'implémentation attend l'autorisation.

**Ne pas supposer que le Master Character existe** : tous les personnages en jeu sont encore procéduraux.
