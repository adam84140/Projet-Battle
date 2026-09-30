# Feuille de route

**Jalon actuel : MAP 1 GOLD** ([critères](map1/MAP1-GOLD.md)).
**Priorité active : MAP 1 GOLD — ENVIRONNEMENT / PRODUCTION DU NIVEAU** ([DECISIONS](DECISIONS.md) D-024).
**MASTER CHARACTER ASSAULT : EN PAUSE** après le point de contrôle A de M4 ([DECISIONS](DECISIONS.md) D-023). Il reprend quand un asset externe de qualité production est fourni.

La carte 2 est **hors périmètre** tant que la carte 1 n'est pas GOLD ([DECISIONS](DECISIONS.md) D-001). Aucun nouveau mode, aucune nouvelle arme, aucun système de progression ou de boutique avant cela.

## Priorité active : environnement et production du niveau (carte 1)
Chaque priorité se propose puis s'autorise séparément. Règle permanente : un asset tiers est un échafaudage remplaçable. Le jeu le désigne par un **identifiant sémantique** (ex. `HOUSE_SMALL_A`), résolu par un **registre d'assets d'environnement**, jamais par un nom de fichier du fournisseur (D-024).

| # | Priorité | Résultat attendu | Statut |
| --- | --- | --- | --- |
| P1 | Chaîne d'assets d'environnement | charger un décor glTF / GLB dans la carte 1 : échelle, matériaux, ombres, collisions, libération (`disposeTree`), coût de rendu mesuré | **à faire (prochaine session : audit et proposition)** |
| P2 | Import et inventaire d'un kit tiers | kit choisi par le propriétaire, licence notée, inventaire (pièces, dimensions, triangles, matériaux) | à faire |
| P3 | Registre d'assets sémantique et remplaçable | identifiant sémantique → registre → asset du kit actuel ; gameplay, objectifs, collisions et navigation sans nom de fichier du fournisseur | à faire |
| P4 | Préservation de la disposition de la carte 1 | drapeaux, bases, routes, limites et couverts de combat inchangés ; ordre des tirages de `World.js` inchangé | règle permanente |
| P5 | Génération automatique / semi-procédurale | pièces du kit placées par règles et à graine fixe, à partir des données de `map.js` | à faire |
| P6 | Lisibilité, couverts, trajets des véhicules | règles de [LEVEL-DESIGN](map1/LEVEL-DESIGN.md) : couvert tous les ~6 m, deux approches par drapeau, lignes de vue ≤ 80 m, routes praticables | à faire |
| P7 | Régression de navigation des bots | `test:bots` vert à chaque étape ; blocages vers l'objectif GOLD (< 1 %, aucun > 10 s) ; blocage de 85 s au Moulin élucidé | à faire |
| P8 | Passe visuelle de l'environnement | kit village cohérent, lumière et ciel de l'image 03, mer en décor de fond (D-012) | à faire |
| P9 | Essais de jeu et équilibrage de la carte 1 | parties de bots et de joueurs humains, retours traités | à faire |
| P10 | Validation MAP 1 GOLD | tous les critères de [MAP1-GOLD](map1/MAP1-GOLD.md), avec preuves | à faire ; exige aussi le Master Assault (critères § 2), donc sa reprise avant |

**Ne pas commencer la carte 2** (D-001).

## Ordre des étapes (vue d'ensemble)

| # | Étape | Résultat attendu | Statut |
| --- | --- | --- | --- |
| 0 | Phases de finition 1 à 15 | tranche verticale stable (commit `05827b4`) | ✅ terminé |
| 1 | Petit nettoyage des régressions restantes | problèmes connus de [CURRENT-STATE](CURRENT-STATE.md) corrigés ou acceptés | à faire (peut s'intercaler, notamment en P7) |
| 2 | Master Character Assault | personnage de référence GOLD ([critères](characters/MASTER-ASSAULT.md), section 6) | **EN PAUSE** après M4, point A (D-023) : M0 à M3 faites ; reprise avec un asset externe |
| 3 | Pipeline personnage et animation définitif | squelette gelé (D-003), Artilleur et Commando portés | à faire, après la reprise de l'étape 2 |
| 4 | Passe artistique environnement carte 1 | kit village abouti, zones finies, lumière et ciel de l'image 03, **mer et horizon côtier en décor de fond** (D-012) ([LEVEL-DESIGN](map1/LEVEL-DESIGN.md)) | **ACTIVE** : priorités P1 à P8 |
| 5 | Revue finale effets, son et HUD | effets lisibles ; son validé à l'oreille par un humain ; **HUD rapproché de l'image 03** sans changer les règles (D-013) | à faire |
| 6 | Équilibrage du gameplay | classes, armes, véhicules, tickets | à faire (P9 pour la carte) |
| 7 | Télémétrie et cartes de chaleur | journal des morts, captures et trajets, visualisation | à faire |
| 8 | Tests par des joueurs humains | au moins 3 sessions, retours traités | à faire |
| 9 | Validation MAP 1 GOLD | tous les critères de [MAP1-GOLD](map1/MAP1-GOLD.md) cochés, avec preuves | à faire (P10) |

## Notes
- **Étape 1** : liste exacte dans [CURRENT-STATE](CURRENT-STATE.md), section « Problèmes connus ». Candidats : réserve de modèles trop petite en 16v16 (pic de 40 à 65 ms), arme au-dessus du sol dans une variante de mort, blocages des bots près de la ferme. Petites corrections seulement, chacune avec son test.
- **Étape 2 (en pause, D-023)** : sous-étapes M0 à M7 de l'[audit](characters/MASTER-ASSAULT-AUDIT.md).
  - M0 à M3 faites et acceptées : tests, rendu optimisé, adaptateur et contrat d'asset, matériau d'équipe.
  - M4 : point de contrôle A fait (ébauche technique), **non approuvé** visuellement ; production artistique arrêtée.
  - À la reprise, avec un asset externe : validation par le contrat → **M5a aperçu jouable** (D-020) → asset complet → M5 intégration complète → M6 valeurs par défaut → **M7 validation GOLD finale seulement**.
  - Procédure de reprise : [MASTER-ASSAULT-M4](characters/MASTER-ASSAULT-M4.md), § 8.
- **Étape 4 (active)** : détail dans les priorités P1 à P8 ci-dessus. La mer et la côte sont du décor de fond hors des limites jouables : disposition, objectifs, routes, collisions et navigation inchangés ([DECISIONS](DECISIONS.md) D-012).
- **Étape 5** : passe HUD selon [DECISIONS](DECISIONS.md) D-013 (mini-carte à gauche, portrait et santé, tickets et objectifs, munitions / compétences, fil d'éliminations). Un chrono éventuel affiche la durée écoulée seulement ; victoire aux tickets inchangée.
- **Étape 7** : doit rester hors du jeu livré ou désactivable ; aucune donnée ne quitte le navigateur sans décision explicite.
- Ordre modifié le 2026-09-30 (D-023, D-024) : l'étape 4 passe avant les étapes 2 et 3, qui reprendront avec l'asset externe du personnage. Les étapes 5 et 6 peuvent se chevaucher avec la fin de l'étape 4. L'étape 9 vient en dernier.

## Hors périmètre jusqu'à MAP 1 GOLD
Carte 2 et suivantes, multijoueur en ligne, nouveaux modes, grandes bibliothèques d'armes, progression, passe de combat, boutique, clans, matchmaking, serveur, monétisation, grands systèmes de personnalisation.
