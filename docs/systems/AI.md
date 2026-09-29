# IA des bots

Fichiers : `src/game/BotBrain.js` (décisions, visée, déplacement), `src/game/nav.js` (grille A*), `src/config.js` (`DIFFICULTIES`).

## Boucle
- Chaque bot produit à chaque image une **commande** identique à celle du joueur (déplacement, visée, tir, compétences) : les bots utilisent exactement les mêmes règles que le joueur.
- Réflexion toutes les ~0,25 s : perception (cône de vision, portée, ligne de vue, camouflage), choix d'objectif, tactique, compétences.
- Budget de 3 recherches de chemin par image pour toute l'équipe.

## Navigation
- Grille de 1,5 m construite depuis les collisions au chargement ; A* avec lissage du chemin.
- Les **véhicules garés et les épaves** sont des obstacles temporaires (mis à jour toutes les 0,5 s).
- Anti-blocage : si le bot veut avancer sans bouger pendant 1,2 s, il saute, recalcule son chemin et abandonne son abri ou son contournement.

## Rôles et tactique
| Rôle | Comportement |
| --- | --- |
| Attaque | drapeaux adverses ou neutres |
| Défense | drapeaux tenus, surtout ceux attaqués |
| Contournement | passe par un point décalé d'environ 20 m sur le côté |
| Soutien | rejoint l'objectif visé par le plus d'équipiers |

- **Abri** : sous le feu ou blessé, cherche dans 10 m un obstacle de 0,7 à 1,8 m de haut, se place du côté opposé à l'ennemi et s'accroupit ; repart une fois soigné ou après 9 s.
- **Repli** : blessé et sans abri, recule en tirant.
- **Combat** : pas chassés, rafales avec pauses, sauts occasionnels, visée avec erreur qui se résorbe selon la précision.

## Difficulté
| | Précision | Réaction | Dégâts au joueur | Tactique |
| --- | --- | --- | --- | --- |
| Recrue | 0,45 | 0,75 s | ×0,7 | 0,3 |
| Vétéran | 0,65 | 0,5 s | ×0,85 | 0,6 |
| Légende | 0,85 | 0,3 s | ×1 | 0,9 |

## Limites connues
- Les bots **ne conduisent pas** les véhicules (ils les ciblent seulement).
- Environ 1 % de courts blocages dans les parties simulées (6 à 8 s au plus), autour des obstacles denses.
- Pas de communication d'équipe ni de mémoire des positions ennemies au-delà de ~3 s.

## Test
`npm run test:bots` : partie simulée de 3 minutes (combats, captures, taux de blocage, usage de la tactique, coût logique).
