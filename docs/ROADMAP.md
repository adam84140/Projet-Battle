# Feuille de route

**Jalon actuel : MAP 1 GOLD** ([critères](map1/MAP1-GOLD.md)).
**Sous-jalon actuel : MASTER CHARACTER ASSAULT** ([spécification](characters/MASTER-ASSAULT.md)).

La carte 2 est **hors périmètre** tant que la carte 1 n'est pas GOLD ([DECISIONS](DECISIONS.md) D-001). Aucun nouveau mode, aucune nouvelle arme, aucun système de progression ou de boutique avant cela.

## Ordre des étapes

| # | Étape | Résultat attendu | Statut |
| --- | --- | --- | --- |
| 0 | Phases de finition 1 à 15 | tranche verticale stable (commit `05827b4`) | ✅ terminé |
| 1 | Petit nettoyage des régressions restantes | problèmes connus de [CURRENT-STATE](CURRENT-STATE.md) corrigés ou acceptés | à faire |
| 2 | **Master Character Assault** | personnage de référence GOLD ([critères](characters/MASTER-ASSAULT.md), section 6) | **prochaine étape** |
| 3 | Pipeline personnage et animation définitif | squelette gelé (D-003), Artilleur et Commando portés | à faire |
| 4 | Passe artistique environnement carte 1 | kit village abouti, zones finies ([LEVEL-DESIGN](map1/LEVEL-DESIGN.md)) | à faire |
| 5 | Revue finale effets et son | effets lisibles ; son validé à l'oreille par un humain | à faire |
| 6 | Équilibrage du gameplay | classes, armes, véhicules, tickets | à faire |
| 7 | Télémétrie et cartes de chaleur | journal des morts, captures et trajets, visualisation | à faire |
| 8 | Tests par des joueurs humains | au moins 3 sessions, retours traités | à faire |
| 9 | Validation MAP 1 GOLD | tous les critères de [MAP1-GOLD](map1/MAP1-GOLD.md) cochés, avec preuves | à faire |

## Notes
- **Étape 1** : liste exacte dans [CURRENT-STATE](CURRENT-STATE.md), section « Problèmes connus ». Candidats : réserve de modèles trop petite en 16v16 (pic de 40 à 65 ms), arme au-dessus du sol dans une variante de mort, blocages des bots près de la ferme. Petites corrections seulement, chacune avec son test.
- **Étape 2** : commencer par un prototype d'intégration (le personnage actuel converti en SkinnedMesh) avant l'asset définitif ; voir [CHARACTER-PIPELINE](characters/CHARACTER-PIPELINE.md). Certaines étapes demandent Blender et un humain.
- **Étape 7** : doit rester hors du jeu livré ou désactivable ; aucune donnée ne quitte le navigateur sans décision explicite.
- Les étapes 4 à 6 peuvent se chevaucher une fois l'étape 3 terminée ; l'étape 9 vient en dernier.

## Hors périmètre jusqu'à MAP 1 GOLD
Carte 2 et suivantes, multijoueur en ligne, nouveaux modes, grandes bibliothèques d'armes, progression, passe de combat, boutique, clans, matchmaking, serveur, monétisation, grands systèmes de personnalisation.
