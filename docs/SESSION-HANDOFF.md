# Passation de session

*À lire en premier au démarrage d'une session. À mettre à jour à la fin de chaque session.*

## Repères
| | |
| --- | --- |
| Point de contrôle stable avant Master Character | `05827b4807c67959e125c9681b5ffa953b113a29` (D-004) |
| Branche de travail | `claude/similar-project-tn0j8l` (dernière lettre : un « l » minuscule) |
| Jalon | **MAP 1 GOLD** |
| Sous-jalon | **MASTER CHARACTER ASSAULT** — spécifié, **pas implémenté** |

## État Git (fin de la session du 2026-09-29)
- `05827b4` : dernier commit de code du jeu (fin des phases 1 à 15).
- Commits suivants : banc de test tolérant aux polices Google (`tests/lib.mjs`) et préparation du contexte projet (`CLAUDE.md`, `docs/`, `.claude/skills/`). **Aucun code du jeu modifié après `05827b4`.**
- Pas de pull request, pas de merge vers `main`. Le tag `pre-master-character-v1` n'est pas sur GitHub (le proxy Cloud refuse les tags) ; le hash fait foi.

## Ce qui a été fait
- Phases de finition 1 à 15 sur la tranche verticale de la carte 1 (résumé dans [CURRENT-STATE](CURRENT-STATE.md)).
- Préparation du contexte : `CLAUDE.md` permanent, base de connaissances `docs/` (coffre Obsidian), 7 skills projet, spécification du Master Assault et du pipeline personnage.

## Tests vérifiés
`npm run build` OK · `test:smoke` 48/48 · `test:touch` 12/12 · `test:camera` 6/6 · `test:bots` 8/8 (blocages 1,2 %) · session de 4 min propre. Mesures 16v16 dans [PERFORMANCE](systems/PERFORMANCE.md).

## Problèmes connus (résumé)
Blocages brefs des bots (~1 %) · pic de 40 à 65 ms en 16v16 (réserve de modèles vide) · 455 à 709 appels de rendu en 16v16 · arme au-dessus du sol dans une variante de mort · chevauchement forcé rare · bots qui ne conduisent pas · FPS réels, son et vrai téléphone non vérifiés. Détail : [CURRENT-STATE](CURRENT-STATE.md).

## Décisions verrouillées
D-001 ONE MAP FIRST · D-002 MASTER CHARACTER FIRST · D-004 point de contrôle `05827b4` · D-005 Git source de vérité · D-006 préserver ce qui fonctionne · D-007 animation pilotée par le code. En attente : **D-003 squelette canonique**. Voir [DECISIONS](DECISIONS.md).

## Docs et skills utiles pour la suite
- Docs : [MASTER-ASSAULT](characters/MASTER-ASSAULT.md) · [CHARACTER-PIPELINE](characters/CHARACTER-PIPELINE.md) · [ANIMATION](systems/ANIMATION.md) · [PERFORMANCE](systems/PERFORMANCE.md) · [ART-DIRECTION](product/ART-DIRECTION.md)
- Skills (`.claude/skills/`) : `character-production` · `character-animation` · `threejs-performance` · `visual-validation` · `gameplay-regression` · `frontline-art-direction`

## Objectif exact de la prochaine session
1. Démarrer selon la procédure de `CLAUDE.md` : vérifier Git, lire ce fichier, `npm install`, `npm run build`, `npm test`.
2. **Étape 1 de la [ROADMAP](ROADMAP.md)** : petites corrections des problèmes connus, chacune avec son test (d'abord la réserve de modèles en 16v16).
3. Puis **démarrer le Master Assault** par la revue de la spécification [MASTER-ASSAULT](characters/MASTER-ASSAULT.md) avec le propriétaire (proportions, squelette, sockets, budgets, critères GOLD), et proposer le **prototype d'intégration** décrit dans [CHARACTER-PIPELINE](characters/CHARACTER-PIPELINE.md) avant tout code.

**Ne pas supposer que le Master Character existe** : au commit `05827b4`, tous les personnages sont encore procéduraux.
