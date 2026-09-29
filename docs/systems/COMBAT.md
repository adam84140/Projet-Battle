# Système de combat

Fichiers : `src/game/Combat.js` (tirs, projectiles, explosions, couteau), `src/game/Soldier.js` (tir, dispersion, dégâts reçus, compétences), `src/game/PlayerController.js` (recul de la vue), `src/config.js` (**toutes les valeurs**).

## Tir
- **Hitscan** depuis l'épaule droite du tireur (`eyePosition`) vers le point visé par le réticule (le rayon de visée part au niveau du personnage pour ignorer les murs situés derrière lui).
- Test contre le décor (grille AABB + relief) puis contre les soldats : sphère de tête et capsule verticale de corps (`hitVolumes`).
- **Dégâts** = dégâts de l'arme × atténuation par distance (`falloff`) × multiplicateur de tête.
- **Dispersion** = base (hanche ou visée) + *bloom* du tir soutenu + pénalité de mouvement ; ×0,7 accroupi ; +0,04 en l'air.
- Le joueur subit ×`damageMult` des dégâts des bots selon la difficulté (0,7 / 0,85 / 1).

| Arme | Dégâts | Cadence | Chargeur | Portée | Tête | Zoom |
| --- | --- | --- | --- | --- | --- | --- |
| Fusil FL-4 (Assaut) | 15 | 540/min | 30 | 140 m | ×1,6 | 1,45 |
| Mitrailleuse M-60L (Artilleur) | 12 | 720/min | 90 | 110 m | ×1,5 | 1,3 |
| Sniper Faucon (Commando) | 70 | 48/min, coup par coup | 5 | 320 m | ×2,2 | 4 (lunette) |

## Ressenti (phase 4)
Profil `feel` par arme dans `config.js` : impulsion verticale, dérive latérale, vitesse de retour, part qui reste, montée en rafale, recul de caméra, recul du modèle, taille des traçantes. Le recul est un décalage temporaire de la vue qui revient de lui-même ; une petite part reste. Visée ×0,65, accroupi ×0,8, tactile ×0,5.

## Projectiles et explosions
| Projectile | Source | Rayon | Dégâts | ×véhicule |
| --- | --- | --- | --- | --- |
| Grenade (mèche 2,2 s, rebonds) | Assaut | 6,5 m | 110 | — |
| Roquette | Artilleur | 5 m | 95 | ×3,2 |
| Obus | Char | 6 m | 140 | ×2,5 |

Explosions : dégâts dégressifs, **ligne de vue requise**, projection, tremblement de caméra selon la distance ; le char protège son conducteur.

## Compétences
Définies dans `ABILITIES` (`config.js`), déclenchées dans `Soldier.useAbility()`. Une compétence ne se lance pas pendant une autre action (lancer, couteau, soin, geste).

| Classe | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Assaut | Grenade (12 s) | Adrénaline : +35 % vitesse, régénération, 6 s (22 s) | Soin : 50 PV zone 9 m (25 s) |
| Artilleur | Roquette (9 s) | Blindage : −50 % dégâts, 7 s (24 s) | Fureur : cadence +35 %, sans rechargement, 6 s (26 s) |
| Commando | Camouflage 10 s, révélé en tirant (22 s) | Tir de précision : prochaine balle ×2,5 (12 s) | Poignard : bond + 120 dégâts (7 s) |

## Vie, mort, réapparition
- Protection de 2 s à l'apparition ; régénération 9 PV/s après 5 s sans dégâts.
- Réapparition après 5 s, à la base ou sur un drapeau tenu (choix du joueur à l'écran de déploiement).

## Conquête
- Capture : 7 s seul, ~4,7 s à deux, 3,5 s à trois ou plus (différence d'effectifs) ; la présence des deux équipes bloque la progression.
- Tickets : 250 (8v8) ou 400 (16v16) ; −1 par mort ; toutes les 3 s, l'équipe qui tient le moins de drapeaux perd la différence.

## Retours au joueur
Marqueur de touche (tête, élimination), dégâts flottants, indicateur de direction des tirs reçus, vignette de dégâts, sifflement des balles proches, anneau de rechargement. Voir aussi [ANIMATION](ANIMATION.md) (réactions aux impacts) et [PERFORMANCE](PERFORMANCE.md).

## Tests
`test:smoke` couvre : visée, tir, munitions, dégâts, élimination comptée, recul qui revient, rechargement, grenade, adrénaline, char.
