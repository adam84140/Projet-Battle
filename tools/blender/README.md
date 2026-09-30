# Chaîne Blender de Frontline Legends

Scripts Python pour produire les personnages de production selon le [contrat d'asset](../../docs/characters/ASSET-CONTRACT.md) : gabarit, export verrouillé, contrôle automatique, planches de revue. **Blender 4.5 LTS** (testé en 4.5.14). Aucune extension Blender à installer : de simples scripts.

## Lancer Blender
Deux possibilités, mêmes scripts :

| Où | Commande |
| --- | --- |
| Blender installé (poste de l'artiste) | `blender -b [fichier.blend] -P tools/blender/<script>.py -- <options>` ; ou, dans Blender, onglet *Scripting* > *Open* > *Run Script* |
| Sans interface (conteneur Cloud, intégration continue) | `python3.11 -m venv .venv-blender && .venv-blender/bin/pip install bpy==4.5.14` puis `.venv-blender/bin/python tools/blender/<script>.py <options>` |

Le module `bpy` exige **Python 3.11** exactement. Rendus : moteur Cycles sur processeur (pas de GPU nécessaire). Le contrôle automatique appelle `node tests/check-glb.mjs` : il faut ce dépôt et `npm install`.

## Scripts
| Script | Rôle |
| --- | --- |
| `export-contract.mjs` | copie `src/character/rigContract.js` (et les emblèmes) en `rig_contract.json` pour Python. **À relancer après toute modification du contrat** (`npm run test:rig` vérifie qu'elle est à jour). |
| `fl_template.py` | gabarit : unités métriques, 30 i/s, armature des 23 os aux noms exacts en A-pose, points d'attache (objets vides parentés aux os), repères non exportés (hauteur 1,85 m, zones de touche), palette des 8 couleurs du masque. `--out gabarit.blend [--props proportions.json]` |
| `fl_export.py` | export glTF **verrouillé** (réglages du § 12 du contrat) après contrôles dans Blender (transformations appliquées, os, points d'attache, `teamMask` actif…), puis **validateur automatique**. `--out assault.glb [--stade prototype] [--fit] [--blend fichier.blend]` ; code de sortie 0 = accepté |
| `fl_review.py` | planches de revue : vues face, 3/4, profil et dos à l'échelle exacte de l'image 01, et superposition des silhouettes (référence en jaune, modèle en cyan) |
| `fl_selftest.py` | auto-test de la chaîne sans art : gabarit, mannequin pondéré automatiquement, masque, atlas, export, validateur. `--out dossier [--fit]` |
| `fl_common.py` | outils communs (arguments, conversion de repère jeu ↔ Blender, contrat) |

Repère : le jeu a Y en haut et le personnage regarde +Z ; Blender a Z en haut et le personnage regarde −Y ; la gauche du personnage est +X dans les deux (Blender (X, Y, Z) = jeu (x, −z, y)).

## Chemin d'un asset
1. `fl_template.py --out perso.blend --props art/<perso>/proportions.json` (ou le script du personnage, par exemple `art/master-assault/blockout.py`).
2. Modéliser dans `perso.blend` : maillage `body_LOD0` lié à l'armature (Ctrl+P > With Automatic Weights), attribut de couleur `teamMask` (palette `FL_teamMask`), carte UV `emblem`, matériau `M_body`.
3. `fl_export.py --blend perso.blend --out assault.glb --stade prototype --fit` : export, validateur, essai en jeu, captures `test-results/check-glb/`.
4. Revue : `fl_review.render_views()` + `compare_sheet()` à côté de l'image 01.

Les fichiers produits (`.blend`, `.glb`, rendus) vont dans `art/build/` (ignoré par Git). Seul l'asset validé du jeu sera versionné (`public/models/characters/assault.glb`) ; il n'existe pas encore. Détail et décisions : [MASTER-ASSAULT-M4](../../docs/characters/MASTER-ASSAULT-M4.md).

**Production du Master Assault en pause ([D-023](../../docs/DECISIONS.md))** : `art/master-assault/blockout.py` est une ébauche **non approuvée**, gardée comme référence technique. Ne pas la continuer. Ces outils restent valables pour adapter et contrôler un **asset externe** : gabarit d'armature, export verrouillé, validateur, planches.
