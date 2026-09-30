---
name: map1-level-design
description: Modifier la carte 1 de Frontline Legends (Castelmare, drapeaux A Moulin / B Place / C Ferme) — couverts, lignes de vue, flancs, trajets de véhicules, props, kit village — sans casser la disposition, les collisions ni la navigation des bots. À utiliser pour tout changement dans src/game/World.js ou src/game/map.js.
---

# Level design carte 1 — Frontline Legends

## Où
- `src/game/map.js` : limites, drapeaux (`points`, champ `pole` pour décaler un mât), bases, véhicules, routes, relief.
- `src/game/World.js` : construction ; couverts de combat dans `buildCombatCover()`.
- Aujourd'hui, le décor est entièrement construit par le code : aucun fichier 3D chargé.
- Chaîne d'environnement (état, architecture, génération) : [MAP1-ENVIRONMENT-PLAN](../../../docs/map1/MAP1-ENVIRONMENT-PLAN.md).
- Registre sémantique `src/environment/` : [MAP1-ASSET-REGISTRY](../../../docs/map1/MAP1-ASSET-REGISTRY.md).
- Outils de kit `tools/env-kit/` : [MAP1-ASSET-INVENTORY](../../../docs/map1/MAP1-ASSET-INVENTORY.md).

## Règles impératives
- **Ne jamais changer l'ordre des tirages aléatoires** (`this.rand`, `this.r`, `this.pick`) : tout le décor bougerait. Ajouter les nouveaux éléments **après** `buildScatter()` (ex. dans `buildCombatCover()`).
- Tout objet solide a une collision (`physics.addBox` ou les helpers `sandbags`, `stoneWall`, `crate`…) ; tout feuillage ou balcon au-dessus de la tête a une boîte « caméra seule » (`physics.addCameraBox`).
- Vérifier l'absence de chevauchement avec les collisions existantes.
- Routes praticables par la jeep et le char ; pas d'obstacle bloquant sur une route.
- Couverts de combat entre 0,7 et 1,8 m de haut : les bots savent s'en servir.
- ONE MAP FIRST : aucune nouvelle carte ([DECISIONS](../../../docs/DECISIONS.md) D-001).
- **Kits d'environnement tiers** (D-024) : échafaudage temporaire et remplaçable, licence notée.
  - Le code de gameplay, les objectifs, les collisions et la navigation ne référencent **jamais** un nom de fichier ou un chemin du fournisseur.
  - Ils passent par un identifiant sémantique (ex. `HOUSE_SMALL_A`), résolu par le registre d'assets d'environnement.
  - Remplacer un asset ne touche que le registre.
- Mer et horizon côtier (D-012) : **décor de fond seulement**, hors des limites jouables, pendant la passe environnement ; jamais de changement de disposition, d'objectifs, de routes, de collisions ou de navigation pour eux.

## Critères de design
Couvert tous les ~6 m dans une zone de capture ; au moins deux approches par drapeau ; pas de couloir de plus de ~80 m sans obstacle vers un drapeau ; repères visuels (moulin, clocher, grange) jamais masqués.

## Vérification
1. `npm run test:env` : empreinte des ancres, collisions et navigation. Un écart doit être voulu (`-- --update-baseline` avec une décision). Vue aérienne annotée : `test-results/env/map1-top.png`, avant / après. Vu du ciel, avec le nord en haut, A est à droite.
2. `npm run test:bots` : blocages < 3 %, aucun blocage près des ajouts.
3. `npm run test:camera` et `npm run test:smoke`.
4. Captures en jeu du secteur modifié (skill `visual-validation`).
5. Mettre à jour le doc de zone concerné.

Références : [LEVEL-DESIGN](../../../docs/map1/LEVEL-DESIGN.md) · [ZONE-A-MILL](../../../docs/map1/ZONE-A-MILL.md) · [ZONE-B-VILLAGE](../../../docs/map1/ZONE-B-VILLAGE.md) · [ZONE-C-FARM](../../../docs/map1/ZONE-C-FARM.md) · [MAP1-GOLD](../../../docs/map1/MAP1-GOLD.md)
