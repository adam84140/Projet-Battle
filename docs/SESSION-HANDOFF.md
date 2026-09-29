# Passation de session

*À lire en premier au démarrage d'une session. À mettre à jour à la fin de chaque session.*

## Repères
| | |
| --- | --- |
| Point de contrôle stable avant Master Character | `05827b4807c67959e125c9681b5ffa953b113a29` (D-004) |
| Branche de travail | `claude/dazzling-cray-gn1bg5` (contient tout l'historique de `claude/similar-project-tn0j8l`, où a été créé `05827b4`) |
| Jalon | **MAP 1 GOLD** |
| Sous-jalon | **MASTER CHARACTER ASSAULT** — audit accepté, **M0 (tests de référence) terminée**, **M1 non autorisée** |

## État Git (fin de la session du 2026-09-29, références visuelles)
- `05827b4` : dernier commit de code du jeu (fin des phases 1 à 15).
- Commits suivants : banc de test tolérant aux polices Google (`tests/lib.mjs`), préparation du contexte projet (`CLAUDE.md`, `docs/`, `.claude/skills/`), puis intégration des **références visuelles officielles** (`docs/_attachments/ref-0*.webp`, D-009), réponses du propriétaire (D-010 à D-016), **audit du Master Assault** et **étape M0** (tests `test:character`, référence chiffrée, captures). **Aucun code du jeu modifié après `05827b4`** (`git diff 05827b4 -- src` vide).
- Pas de pull request, pas de merge vers `main`. Le tag `pre-master-character-v1` n'est pas sur GitHub (le proxy Cloud refuse les tags) ; le hash fait foi.

## Ce qui a été fait
- Phases de finition 1 à 15 sur la tranche verticale de la carte 1 (résumé dans [CURRENT-STATE](CURRENT-STATE.md)).
- Préparation du contexte : `CLAUDE.md` permanent, base de connaissances `docs/` (coffre Obsidian), 7 skills projet, spécification du Master Assault et du pipeline personnage.
- **Étape M0 (autorisée) terminée** : `tests/character.mjs` (53 vérifications, dans `npm test`), sonde `tests/character-probe.js` + `tests/character.html`, mesures `tests/baselines/character-m0.json`, aperçus `docs/_attachments/m0-baseline/`, document [MASTER-ASSAULT-BASELINE](characters/MASTER-ASSAULT-BASELINE.md). Surprises : sphère de tête qui ne suit pas l'inclinaison (jusqu'à ~9–12 cm), arme 15° trop basse en visée accroupie, main gauche hors du garde-main en réception / lancer, logique 16v16 à 3,5–3,9 ms en début de partie. Test de mutation fait (18 échecs attendus), source restaurée.
- Décisions du propriétaire : D-014 (asset par la chaîne Blender / 3D), D-015 (adaptateur de squelette, sur le principe), D-016 (matériaux partagés à masque ; LOD2 en couleurs de sommets provisoire), complément de D-010 (migration unique des réglages, bots Assaut sans sac).
- **Audit technique du Master Assault** ([MASTER-ASSAULT-AUDIT](characters/MASTER-ASSAULT-AUDIT.md)) : mesures du personnage actuel (18 maillages visibles, 16 800 triangles, 1,6 à 1,8 Mo non partagés, 73 à 98 ms de construction, 1,94 m), part des soldats dans le rendu 16v16 (762 à 806 appels sur 890 à 936 en scène de charge), dépendances, 15 constats, architecture cible (squelette de gameplay + adaptateur de peau), plan M0 à M7, 7 décisions demandées. **En attente d'autorisation.**
- Réponses du propriétaire enregistrées : D-010 (Assaut par défaut sans sac, support du sac conservé), D-011 (emblèmes canoniques), D-012 (mer en décor de fond, passe environnement), D-013 (direction du HUD, règles de la conquête inchangées, chrono informatif seulement).
- **Références visuelles officielles** fournies par le propriétaire : images 01 à 04 versionnées, lues et documentées dans [VISUAL-REFERENCES](product/VISUAL-REFERENCES.md) (rôle de chacune, palette relevée, écarts avec le jeu, questions ouvertes) ; décision D-009 ; spécification [MASTER-ASSAULT](characters/MASTER-ASSAULT.md) alignée sur l'image 01 (1,85 m, emblèmes poitrine / deux manches / dos, modèle de base sans sac à dos, usure légère peinte) ; skills `frontline-art-direction`, `character-production` et `visual-validation` pointent vers les références. L'image 05 (*Battlefield Heroes*) n'est pas versionnée (marques d'un tiers).

## Tests vérifiés
Dernière exécution complète (fin de l'étape M0, `claude/dazzling-cray-gn1bg5`) : `npm run build` OK · `test:smoke` 48/48 · `test:touch` 12/12 · `test:camera` 6/6 · `test:bots` 8/8 (blocages 0,6 %) · `test:character` 53/53 · 0 erreur console. **`test:bots` a échoué 1 fois sur 5 aujourd'hui** sur un code inchangé (bot bloqué 85 s au Moulin) : voir [CURRENT-STATE](CURRENT-STATE.md), problème connu 1. Captures `npm run shots -- m0-baseline all` : 0 erreur console. Mesures 16v16 dans [PERFORMANCE](systems/PERFORMANCE.md).

## Problèmes connus (résumé)
Blocages brefs des bots (~1 %) · pic de 40 à 65 ms en 16v16 (réserve de modèles vide) · 455 à 709 appels de rendu en 16v16 · arme au-dessus du sol dans une variante de mort · chevauchement forcé rare · bots qui ne conduisent pas · FPS réels, son et vrai téléphone non vérifiés. Détail : [CURRENT-STATE](CURRENT-STATE.md).

## Décisions verrouillées
D-001 ONE MAP FIRST · D-002 MASTER CHARACTER FIRST · D-004 point de contrôle `05827b4` · D-005 Git source de vérité · D-006 préserver ce qui fonctionne · D-007 animation pilotée par le code · D-009 références visuelles officielles · D-010 Assaut par défaut sans sac · D-011 identité d'équipe canonique · D-012 mer en décor de fond · D-013 direction du HUD, règles de la conquête inchangées. En attente : **D-003 squelette canonique**. Voir [DECISIONS](DECISIONS.md).

## Docs et skills utiles pour la suite
- Docs : [VISUAL-REFERENCES](product/VISUAL-REFERENCES.md) · [MASTER-ASSAULT](characters/MASTER-ASSAULT.md) · [CHARACTER-PIPELINE](characters/CHARACTER-PIPELINE.md) · [ANIMATION](systems/ANIMATION.md) · [PERFORMANCE](systems/PERFORMANCE.md) · [ART-DIRECTION](product/ART-DIRECTION.md)
- Skills (`.claude/skills/`) : `character-production` · `character-animation` · `threejs-performance` · `visual-validation` · `gameplay-regression` · `frontline-art-direction`

## Objectif exact de la prochaine session
1. Démarrer selon la procédure de `CLAUDE.md` : vérifier Git, lire ce fichier, `npm install`, `npm run build`, `npm test` (5 suites, dont `test:character`).
2. **Attendre l'autorisation explicite du propriétaire pour M1** ([MASTER-ASSAULT-AUDIT](characters/MASTER-ASSAULT-AUDIT.md), sections 6 et 6 bis). Sans elle : ne pas toucher à l'implémentation du personnage, ni commencer de production Blender.
3. Si M1 est autorisée : suivre l'audit (réglage de peau, ancien chemin intact), puis comparer à la [référence M0](characters/MASTER-ASSAULT-BASELINE.md) : planches au pixel près, alignements identiques, appels de rendu 16v16 remesurés.
4. Sinon, avec autorisation : étape 1 de la [ROADMAP](ROADMAP.md) (petites corrections, d'abord la réserve de modèles 16v16).

**Ne pas supposer que le Master Character existe** : tous les personnages sont encore procéduraux.
