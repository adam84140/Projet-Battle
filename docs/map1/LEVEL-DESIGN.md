# Carte 1 — *Castelmare* : level design

Village méditerranéen, mode Conquête, 3 drapeaux. Données : `src/game/map.js` (limites, drapeaux, bases, véhicules, routes, relief) ; construction : `src/game/World.js` ; couverts ajoutés en phase 6 : `World.buildCombatCover()`.

## Plan général

```
                 z = +112   BASE LÉGION (rouge)  jeep (4.5,103) · char (-4.5,106.5)
                                  │  route nord bordée de cyprès
        routes diagonales ─┐      │      ┌─ routes diagonales
                           │      │      │
   A — LE MOULIN  ────── route ── B — PLACE ── route ────── C — LA FERME
   (-68, -8) r=10               (0, 2) r=11                (66, 12) r=11
                           │      │      │
                                  │  route sud bordée de cyprès
                 z = -112   BASE AIGLES (bleu)  jeep (-4.5,-103) · char (4.5,-106.5)
```

- Schéma en **miroir** : vu du ciel, le nord (Légion) en haut, A (ouest) est à droite. Vue aérienne réelle et état détaillé : [MAP1-ENVIRONMENT-PLAN](MAP1-ENVIRONMENT-PLAN.md).
- Limites jouables : x ∈ [-112, 112], z ∈ [-128, 128]. Axe bases : nord-sud ; drapeaux : ouest-est.
- Chaque base est à ~115 m de B et ~135 m de A ou C ; les routes diagonales relient directement chaque base à A et à C (flancs).
- Zones aplanies autour du village, des drapeaux et des bases ; collines douces ailleurs.
- Décor dispersé à graine fixe (`rng(20240917)`) : ~120 oliviers, 28 cyprès, buissons, rochers. **Ne pas changer l'ordre des tirages aléatoires** : cela déplacerait tout le décor. Les ajouts se font après `buildScatter()`.

## Zones
- [ZONE-A-MILL](ZONE-A-MILL.md) — le Moulin (ouest)
- [ZONE-B-VILLAGE](ZONE-B-VILLAGE.md) — la place du village (centre)
- [ZONE-C-FARM](ZONE-C-FARM.md) — la ferme (est)

## Règles de level design (carte 1)
- **Couvert** : dans chaque zone de capture, on doit pouvoir passer d'un couvert à un autre en moins de ~6 m. Couverts à hauteur d'accroupi (0,7–1,8 m) : les bots savent les utiliser ([AI](../systems/AI.md)).
- **Lignes de vue** : éviter les couloirs de plus de ~80 m sans obstacle vers un drapeau (le sniper porte à 320 m ; il doit y avoir des angles morts).
- **Flancs** : chaque drapeau a au moins deux approches (route principale + route diagonale ou champ).
- **Véhicules** : les routes restent praticables pour la jeep et le char ; pas d'obstacle bloquant sur une route.
- **Lisibilité** : un obstacle de gameplay ressemble à un obstacle (sacs de sable, murets) ; le décor purement visuel ne bloque pas le passage.
- **Collisions** : tout nouvel objet solide a une boîte de collision ; tout feuillage au-dessus de la tête a une boîte « caméra seule » (`physics.addCameraBox`).
- **Navigation** : la grille A* est construite depuis les collisions au chargement (cellules de 1,5 m) ; vérifier avec `npm run test:bots` que les bots ne se bloquent pas autour d'un ajout.

## Horizon méditerranéen (décor de fond, [DECISIONS](../DECISIONS.md) D-012)
La carte recevra, pendant la passe artistique environnement ([ROADMAP](../ROADMAP.md), étape 4), la mer et l'horizon côtier de l'image 03 ([VISUAL-REFERENCES](../product/VISUAL-REFERENCES.md)). Contraintes :
- **uniquement du décor de fond**, hors des limites jouables (x ∈ [-112, 112], z ∈ [-128, 128]) ;
- ne pas changer la disposition jouable, ne pas déplacer les objectifs, ne pas changer les routes de jeu ;
- aucune collision ni cellule de navigation ajoutée ou retirée pour la mer ; `test:bots` et `test:camera` inchangés ;
- ajouts après `buildScatter()` (ordre des tirages aléatoires préservé) ; coût de rendu mesuré (quelques appels de rendu au plus) ;
- le côté de la carte qui donne sur la mer et le sort des montagnes de fond actuelles se décident pendant la passe, par captures depuis les trois zones.

## Faiblesses connues (à traiter pour GOLD)
- Grands espaces ouverts entre les bases et les drapeaux, peu de couverts sur les routes nord/sud.
- Pas de verticalité accessible (maisons pleines, pas d'intérieurs ni de toits praticables).
- Aucune donnée de télémétrie : on ne sait pas encore où les joueurs meurent réellement (voir [ROADMAP](../ROADMAP.md), télémétrie et cartes de chaleur).
