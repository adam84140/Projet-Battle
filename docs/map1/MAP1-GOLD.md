# Carte 1 — critères GOLD

**GOLD** = la carte 1 est une tranche verticale qu'on peut montrer publiquement sans excuse. Tant que tous les critères ne sont pas remplis, la carte 2 ne commence pas ([DECISIONS](../DECISIONS.md) D-001).

Chaque critère est validé par une preuve reproductible (test, mesure ou capture versionnée dans le rapport de session), jamais par une simple affirmation.

## 1. Stabilité (bloquant)
- [ ] `npm test` entièrement vert (smoke, tactile, caméra, bots) sur le commit candidat.
- [ ] Aucune erreur console sur une partie complète 8v8 et 16v16, victoire et défaite, relance, retour au menu.
- [ ] Mémoire GPU stable sur 3 relances consécutives (géométries et textures ne croissent pas).
- [ ] Aucun soldat dans le décor, sous le sol ou apparu dans un obstacle sur 4 minutes simulées.

## 2. Personnages
- [ ] Master Assault validé selon ses critères GOLD ([MASTER-ASSAULT](../characters/MASTER-ASSAULT.md)).
- [ ] Artilleur et Commando portés sur la même architecture, avec leurs silhouettes propres.
- [ ] Bleu et rouge distingués sans hésitation à 5, 20 et 40 m, de face et de dos.

## 3. Gameplay
- [ ] Les trois classes sont viables : aucune classe au-dessus de 45 % ou en dessous de 22 % de présence dans des parties de bots équilibrées (mesure via la télémétrie).
- [ ] Durée de partie 8v8 entre 8 et 15 minutes en difficulté Vétéran.
- [ ] Chaque drapeau change de mains au moins une fois par partie en moyenne.
- [ ] Véhicules utiles mais pas dominants (les éliminations en véhicule restent sous 25 % du total).

## 4. IA
- [ ] Bots bloqués < 1 % (`test:bots`), aucun blocage de plus de 10 s.
- [ ] Les bots utilisent couverts, replis, contournements et compétences à chaque niveau de difficulté.
- [ ] Les bots conduisent les véhicules (pas encore le cas aujourd'hui, voir [AI](../systems/AI.md)).

## 5. Carte et environnement
- [ ] Passe artistique environnement terminée (kit village cohérent, pas de zone vide ou non finie).
- [ ] Mer méditerranéenne et horizon côtier visibles en décor de fond, sans changement de disposition, d'objectifs, de routes, de collisions ni de navigation ([DECISIONS](../DECISIONS.md) D-012).
- [ ] Chaque zone de capture respecte les règles de [LEVEL-DESIGN](LEVEL-DESIGN.md) (couverts, lignes de vue, flancs).
- [ ] Cartes de chaleur des morts sans point aberrant (camping, couloir de la mort).

## 6. Caméra, effets, son
- [ ] `test:camera` vert ; aucune caméra dans un mur ni dans un feuillage en partie réelle.
- [ ] Revue finale des effets : lisibles, jamais masquants.
- [ ] Revue finale du son **à l'oreille par un humain** (volumes, répétitions, spatialisation).

## 7. Interface
- [ ] HUD rapproché de l'image 03 ([VISUAL-REFERENCES](../product/VISUAL-REFERENCES.md), [DECISIONS](../DECISIONS.md) D-013) : mini-carte à gauche, portrait et santé, tickets et objectifs lisibles, hiérarchie munitions / compétences, fil d'éliminations cohérent ; règles de la conquête inchangées.
- [ ] Aucun chevauchement du HUD sur ordinateur et en tactile (vérifications géométriques des tests).
- [ ] Menus, déploiement, scores, fin de partie : complets et sans texte coupé en 1280×720, 1920×1080 et 844×390 tactile.

## 8. Performances (scénario de référence : 16v16)
- [ ] Logique < 4 ms par image en 16v16 (mesure `step()` des tests).
- [ ] ≤ 250 appels de rendu en vue de jeu typique 16v16.
- [ ] Aucune image logique au-dessus de 16 ms sur 2 minutes de partie.
- [ ] **60 images/s sur un ordinateur portable de milieu de gamme réel** (à mesurer par un humain : le conteneur Cloud n'a pas de GPU).
- [ ] Tactile : 30 images/s stables sur un téléphone récent réel.

## 9. Tests humains
- [ ] Au moins 3 sessions de jeu par des joueurs humains, retours consignés et traités.

Détails de mesure : [PERFORMANCE](../systems/PERFORMANCE.md). État actuel : [CURRENT-STATE](../CURRENT-STATE.md).
