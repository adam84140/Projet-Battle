# Véhicules

Fichier : `src/game/Vehicle.js` (types, modèles, conduite, tourelle, dégâts, suspension). Apparitions : `MAP.vehicles` dans `src/game/map.js`.

| | Jeep | Char lourd |
| --- | --- | --- |
| Points de vie | 450 | 1 400 |
| Vitesse max / marche arrière | 23 / 8 m/s | 9,5 / 5 m/s |
| Arme | écrasement (> 4,5 m/s) | canon, obus explosifs, rechargement 2,4 s |
| Par équipe | 1 | 1 |

## Fonctionnement
- Modèle de conduite simple (pas de simulation physique) : accélération, freinage, direction de type Ackermann pour la jeep, rotation sur place pour le char.
- Collisions : cercle contre le décor et entre véhicules ; un choc au-delà de 12 m/s abîme le véhicule.
- Le véhicule suit le relief (tangage et roulis calculés sur 4 points).
- **Suspension** (phase 12) : ressort amorti qui fait cabrer à l'accélération, plonger au freinage, pencher en virage ; le char bascule au tir.
- Tourelle du char orientée vers la visée (1,5 rad/s), canon limité entre −0,12 et 0,35 rad.
- Endommagé : fumée sous 40 % de vie. Détruit : explosion, épave en feu 10 s, réapparition à la base après 25 s.
- Entrer / sortir : touche `E` (ou invite tactile) ; sortie du côté libre avec un petit saut.
- Collision dynamique (boîte) active pour les tirs, les soldats et la caméra ; ignorée par la caméra du conducteur.

## Modèles
Procéduraux, fusionnés par pièce mobile (caisse, tourelle, canon, roues) : 5 maillages par jeep, 3 par char.

## Limites connues
- Les bots ne conduisent pas.
- Pas de passager ni de poste de tireur.

## Test
`test:smoke` : entrer, conduire, sortir (jeep) ; entrer, tirer, sortir (char).
