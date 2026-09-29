# Piliers de gameplay

Toute modification de gameplay doit renforcer au moins un pilier sans en affaiblir un autre.

## 1. Lisibilité avant tout
- On identifie l'équipe d'un soldat à 40 m en une fraction de seconde (couleur de maillot, emblème, silhouette de classe).
- On sait d'où vient un tir (indicateur de direction, sifflement des balles, traçantes).
- Les effets (fumée, explosions, particules) ne masquent jamais durablement le combat.

## 2. Réactivité
- Déplacement franc (accélération/arrêt nets), saut mémorisé, caméra qui ne traverse jamais le décor.
- Chaque tir donne un retour : recul propre à l'arme, marqueur de touche, son, impact.

## 3. Héros distincts
| Classe | Rôle | Arme | Compétences |
| --- | --- | --- | --- |
| Assaut | polyvalent, mène l'offensive | fusil d'assaut FL-4 | Grenade · Adrénaline · Trousse de soin |
| Artilleur | encaisse, tient la ligne, anti-véhicule | mitrailleuse M-60L | Roquette · Blindage · Fureur |
| Commando | longue portée, furtivité | fusil de précision (lunette ×4) | Camouflage · Tir de précision · Poignard |

Valeurs chiffrées : `src/config.js` (source unique de l'équilibrage).

## 4. Le territoire compte
- Mode Conquête : trois drapeaux (A Moulin, B Place, C Ferme), tickets de renfort ; tenir la majorité des drapeaux fait perdre des tickets à l'adversaire.
- Chaque zone a ses couverts, ses lignes de vue et ses flancs ([LEVEL-DESIGN](../map1/LEVEL-DESIGN.md)).

## 5. Moments forts, sans complexité
- Jeep (vitesse, écrasement), char (canon explosif), grenades, roquettes, poignard.
- Pas de menus profonds ni de systèmes à apprendre avant de s'amuser.

## 6. Bots crédibles
- Ils capturent, défendent, contournent, se mettent à couvert, se replient ; ils ne restent pas bloqués ni plantés à découvert ([AI](../systems/AI.md)).
