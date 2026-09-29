# État actuel du projet

- **Référence :** commit `05827b4807c67959e125c9681b5ffa953b113a29` (point de contrôle D-004, créé sur la branche `claude/similar-project-tn0j8l`). Branche de travail actuelle : `claude/dazzling-cray-gn1bg5`, qui contient ce commit ; depuis, seuls la documentation, les skills et le banc de test ont changé.
- **Vérifié le :** 2026-09-29, dans le conteneur Cloud (Chromium sans GPU), à nouveau en début de session sur `claude/dazzling-cray-gn1bg5`.
- **Jalon :** MAP 1 GOLD — **sous-jalon :** MASTER CHARACTER ASSAULT (**pas commencé**).

Règle : ce fichier ne contient que des faits vérifiés sur le dépôt. Tout ce qui n'a pas été vérifié est marqué comme tel.

## Ce qui est jouable
| Domaine | État |
| --- | --- |
| **Mode** | Conquête, 3 drapeaux, tickets (250 en 8v8, 400 en 16v16), victoire, défaite, relance, retour au menu |
| **Carte** | *Castelmare* (carte 1 uniquement) — [LEVEL-DESIGN](map1/LEVEL-DESIGN.md) |
| **Équipes** | Les Aigles (bleu, aigle) contre La Légion (rouge, étoile) |
| **Classes** | Assaut (fusil FL-4), Artilleur (mitrailleuse M-60L), Commando (sniper à lunette), 3 compétences chacune — [COMBAT](systems/COMBAT.md) |
| **Combat** | hitscan, atténuation par distance, tirs à la tête, recul propre à chaque arme, grenades, roquettes, obus, explosions avec ligne de vue, poignard |
| **Bots** | 8v8 ou 16v16, 3 difficultés, rôles attaque / défense / contournement / soutien, abris, replis — [AI](systems/AI.md) |
| **Véhicules** | jeep et char par équipe, suspension, destruction, réapparition ; conduits par le joueur seulement — [VEHICLES](systems/VEHICLES.md) |
| **Personnages** | procéduraux (primitives Three.js fusionnées par os), 24 maillages par soldat, personnalisation (teint, cheveux, accessoires), planche de référence `fiche.html` |
| **Références visuelles** | images officielles 01 à 04 versionnées dans `docs/_attachments/` ([VISUAL-REFERENCES](product/VISUAL-REFERENCES.md), D-009) ; **le jeu n'a pas encore été modifié** pour s'en rapprocher (écarts listés dans ce document) |
| **Animation** | procédurale avec IK des mains, couches additives d'impact et de réception, 3 variantes de mort — [ANIMATION](systems/ANIMATION.md) |
| **Caméra** | 3ᵉ personne sans traversée du décor ni des feuillages, visée décalée, champ élargi au sprint |
| **HUD** | tickets, drapeaux, mini-carte, fil d'éliminations, marqueurs d'objectifs (aussi derrière le joueur), noms des alliés, dégâts flottants, direction des tirs, compétences, lunette, scores, anneau de rechargement, barre de capture en haut |
| **Son** | synthétisé (Web Audio), spatialisé : tirs étouffés au loin, pas, saut, réception, balles qui sifflent, impacts, vent, oiseaux, jingles. **Jamais écouté par un humain dans ce projet.** |
| **Effets** | lueur de bouche, douilles, traçantes, impacts, étoiles de touche, poussière, explosions, fumée qui s'efface près de la caméra, onde de capture |
| **Lumière** | soleil méditerranéen, ombres douces, rendu des tons *Neutral*, héros du menu éclairé de face |
| **Tactile** | joystick, visée au doigt, boutons, aide à la visée, avertissement en portrait ; marqueurs hors des boutons |

## Finition réalisée (phases 1 à 15)
1 personnage (proportions, silhouettes, IK à < 1 cm) · 2 animations (impacts, réception, foulée, pivots, morts ; correction de l'arme fusionnée dans le torse) · 3 caméra et déplacement · 4 armes · 5 effets · 6 couverts de la carte, mât de B déplacé, bots qui contournent les véhicules garés · 7 kit village · 8 éclairage · 9 HUD · 10 son · 11 IA · 12 véhicules · 13 tactile · 14 performances (fuites GPU, fusion des véhicules, réserve de modèles) · 15 finition (particules près de la caméra, tons harmonisés).
Détail par commit : `git log --oneline 9011271^..05827b4`.

## Tests (tous verts ; code du jeu identique à `05827b4` ; dernière exécution : début de session du 2026-09-29 sur `claude/dazzling-cray-gn1bg5`)
| Commande | Résultat |
| --- | --- |
| `npm run build` | OK |
| `npm run test:smoke` | 48/48, logique 1,54 ms par image |
| `npm run test:touch` | 12/12 |
| `npm run test:camera` | 6/6 : 68 positions, 4 760 images, 0 dans un mur, 0 dans un feuillage, 0 sous le sol |
| `npm run test:bots` | 8/8 : 60 éliminations et 7 captures en 3 min, blocages 0,9 %, 7 s au plus, logique 1,59 ms |
| Session de 4 min (script ad hoc, session précédente, non relancée) | 102 apparitions, 6 772 échantillons : 0 dans le décor, 0 sous le sol, 0 caméra dans un mur, 0 erreur |

Le banc de test abandonne les polices Google si elles ne répondent pas en 8 s (le réseau du conteneur peut les bloquer ; sans cela, la page ne finissait pas de charger).

## Performances
Voir [PERFORMANCE](systems/PERFORMANCE.md). En bref : logique 1,7 ms en 16v16 (large) ; **rendu 16v16 au-dessus de l'objectif** (455 à 709 appels contre 250 visés) ; mémoire GPU stable sur 3 relances ; FPS réels jamais mesurés sur GPU.

## Problèmes connus
Vérifiés le 2026-09-29 sur `05827b4` :
1. **Blocages temporaires des bots** : 1,2 % des échantillons en partie simulée (0,5 à 1,6 % selon les parties), 8 s au plus, surtout près des obstacles denses de la ferme (C).
2. **Pic de 40 à 65 ms en 16v16** : environ une fois par 2 minutes, quand un bot réapparaît dans une classe dont la réserve de modèles est vide ; le modèle est alors construit en pleine partie. Absent en 8v8.
3. **Rendu 16v16 lourd** : 455 à 709 appels de rendu en vue de jeu (24 maillages par soldat) ; sera traité par le Master Assault.
4. **Arme au-dessus du sol** : dans la mort « en vrille » avec chute vers l'avant, le fusil reste à hauteur du torse (17 à 33 cm au-dessus du sol) ; les autres variantes sont correctes.
5. **Chevauchement forcé** : un soldat peut entrer dans un obstacle s'il est placé de force entre deux obstacles très proches (positions écartées par le test caméra) ; une seule occurrence (1 échantillon sur ~7 000) lors d'une session précédente, aucune lors de la dernière.
6. **Bots** : ne conduisent pas les véhicules.
7. **Carte** : pas de verticalité ni d'intérieurs ; grands espaces ouverts sur les routes nord et sud.
8. **Non vérifié** : FPS sur GPU réel, son à l'oreille, jeu sur vrai téléphone.
9. **Git** : le tag `pre-master-character-v1` n'existe que dans une session Cloud (proxy qui refuse les tags) ; le commit `05827b4` fait foi.

## Hors de ce dépôt
- Version jouable publiée (artefact privé du propriétaire), construite depuis `05827b4`.
- GitHub Pages ne publie qu'au push sur `main` ; la branche de travail n'a pas été fusionnée.
