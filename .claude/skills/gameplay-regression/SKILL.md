---
name: gameplay-regression
description: Vérifier qu'aucun système jouable de Frontline Legends n'a régressé (déplacement, caméra, combat, compétences, IA, drapeaux, véhicules, HUD, tactile, performances) avant de commiter du code ou de déclarer une tâche terminée. À utiliser après toute modification de src/ ou tests/.
---

# Régression gameplay — Frontline Legends

## 1. Commandes (dans cet ordre)
```bash
npm run build          # doit réussir
npm run test:smoke     # ordinateur : 48 vérifications
npm run test:touch     # téléphone émulé 844×390
npm run test:camera    # caméra jamais dans un mur, un feuillage ou le sol
npm run test:bots      # partie simulée 3 min
npm run test:character # personnage : coût par soldat, mains / arme, tête / hitbox, 16v16, mémoire
```
Rendu logiciel (SwiftShader) : les tests avancent la simulation par pas fixes (`step()` dans `tests/lib.mjs`) ; ne pas attendre en temps réel.

## 2. Ce qui doit rester vrai
| Système | Vérifié par |
| --- | --- |
| Menu, déploiement, pause, scores, victoire, défaite, relance, retour menu | smoke |
| Marche, sprint (> 1,3× vitesse), saut, saut mémorisé, accroupi | smoke |
| Visée (zoom), tir, munitions, dégâts, élimination, recul qui revient, rechargement | smoke |
| Compétences (grenade, adrénaline), mort, réapparition, changement de classe | smoke |
| Jeep (entrer, conduire, sortir, pas coincé), char (entrer, tirer, sortir) | smoke |
| Bots des deux équipes, combats, captures, tickets | smoke + bots |
| HUD : marqueurs hors mini-carte et fil d'éliminations | smoke (géométrie) |
| Tactile : joystick, sprint, visée au doigt, tir, compétence, saut, pause, marqueurs hors boutons | touch |
| Caméra : 0 image dans un mur, 0 dans un feuillage, 0 sous le sol, pas de recul brutal | camera |
| Bots bloqués < 3 %, aucun > 20 s, tactique utilisée | bots |
| Coût logique < 8 ms par image (test) ; objectif 16v16 < 4 ms | smoke, bots |
| Personnage : 16 articulations, ≤ 18 maillages visibles par soldat, mains sur l'arme, tête / sphère de touche, arme / visée, bouche du canon, mémoire sans fuite, 16v16 chargé, planche A/B reproductible | character ([référence M0](../../../docs/characters/MASTER-ASSAULT-BASELINE.md)) |
| Aucune erreur console | tous |

## 3. Règles
- Un test rouge n'est jamais « instable » par défaut : reproduire, trouver la cause. Exception connue : si la page ne charge pas, vérifier le réseau des polices (le banc de test les abandonne après 8 s).
- Nouveau comportement ou bug corrigé → ajouter une vérification au test adapté (voir les exemples géométriques du HUD dans `tests/smoke.mjs` et `tests/touch.mjs`).
- Vérifier qu'un nouveau test **échoue sur l'ancien code** (`git stash push -- <fichiers>`, lancer, `git stash pop`).
- Ne jamais désactiver, sauter ou affaiblir une vérification pour obtenir du vert.
- Parcours complet facultatif : session de 4 min (apparitions, soldats dans le décor, caméra) — voir [PERFORMANCE](../../../docs/systems/PERFORMANCE.md).

## 4. Rapport
Donner les résultats chiffrés (`48/48`, taux de blocage, ms par image), et dire explicitement ce qui n'a **pas** été vérifié (FPS réels sur GPU, son à l'oreille).

Références : [CURRENT-STATE](../../../docs/CURRENT-STATE.md) · [COMBAT](../../../docs/systems/COMBAT.md) · [AI](../../../docs/systems/AI.md) · [VEHICLES](../../../docs/systems/VEHICLES.md)
