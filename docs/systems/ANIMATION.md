# Système d'animation (actuel)

Fichiers : `src/character/animation.js` (`Animator`), `src/character/Character.js` (squelette, modèle), `src/game/Soldier.js` (état d'animation alimenté à chaque image).

## Principe
Animation **100 % procédurale**, sans clips :
1. `Soldier` remplit un **état** (`defaultAnimState()`) : vitesse, direction de déplacement, accroupi, sprint, visée, au sol, vitesse verticale, tangage de la visée, recul, rechargement, action en cours (`throw`, `knife`, `heal`, `buff`), mort, impact, réception, vitesse de pivot.
2. `Animator.computeTarget()` calcule une **pose cible** (canaux Float32Array : 16 articulations × 3 rotations + hauteur du bassin + position/rotation du support d'arme + poids d'IK + décalage de la main gauche).
3. La pose courante converge vers la cible par **lissage exponentiel par canal** (jambes vives, arme plus souple).
4. `computeAdditive()` ajoute des **couches rapides non lissées** : réaction aux impacts (orientée selon la direction du tir), réception de saut (selon la vitesse de chute).
5. `apply()` écrit les rotations sur les os, puis **IK analytique à deux segments** place les mains sur la poignée et le garde-main de l'arme (`rightWrist`, `leftWrist`, `magWrist` dans le repère de l'arme).

## Squelette actuel (16 articulations)
```
root
└─ hips
   ├─ legL → kneeL → ankleL          (legR → kneeR → ankleR)
   └─ spine
      ├─ shoulderL → elbowL → handL  (shoulderR → elbowR → handR)
      ├─ neck → head
      └─ weaponMount (support d'arme, animé)
```
Convention : le personnage regarde +Z ; sa droite est −X.

Rendu en jeu (étape M1, [MASTER-ASSAULT-M1](../characters/MASTER-ASSAULT-M1.md)) : ces groupes restent le squelette animé ; le corps est un `SkinnedMesh` qui les suit (chemin `M1_OPTIMIZED_RENDER_PATH`, par défaut), ou des maillages fusionnés par os (chemin `LEGACY_RENDER_PATH`). L'animation est identique dans les deux cas.

## Couverture actuelle
Repos combat, marche, course, sprint (arme portée), marche arrière, pas chassés (rotation des hanches), accroupi, pivot sur place (petits pas), saut (montée et chute continues), réception, visée, tir et recul, rechargement (chargeur retiré), lancer de grenade, poignard, soin, geste de compétence, réactions aux impacts, mort en deux temps (trois variantes), assis (jeep), A-pose (fiche).

## Limites connues
- Pas de clips : les gestes complexes (rechargement, morts) restent simples.
- Pas d'IK des pieds : les pieds peuvent glisser légèrement sur les pentes.
- Dans la variante de mort en vrille, l'arme peut rester quelques centimètres au-dessus du sol.
- Mesuré en M0 ([référence](../characters/MASTER-ASSAULT-BASELINE.md)) : mains à < 8 mm de l'arme dans les poses stables, mais main gauche à 7–18 mm en réception et 27–37 mm pendant le lancer de grenade (cible hors d'atteinte) ; en **visée accroupie, l'arme pointe ~15° sous la ligne de visée** (visuel seulement : les balles partent vers le point visé) ; la sphère de touche de la tête est décalée **verticalement** depuis l'os `head` et ne suit pas son inclinaison (écart jusqu'à ~9 cm tête penchée).

## Outils d'inspection
- `npm run test:character` : mesures et gardes du personnage (voir [MASTER-ASSAULT-BASELINE](../characters/MASTER-ASSAULT-BASELINE.md)), planches A/B reproductibles dans `test-results/character/`.
- `tests/turntable.html?classe=…&equipe=…&bake=1` : 7 vues (face, 3/4, profil, dos, repos, visée, course).
- `tests/poses.html` : planche de 18 états (saut, réception, impacts, pivot, morts…).
- `npm run shots -- <étiquette> turn|poses`.

## Futur
Le Master Assault garde ce principe (animation pilotée par le code, [DECISIONS](../DECISIONS.md) D-007) sur un SkinnedMesh, avec quelques clips mélangés par-dessus : [MASTER-ASSAULT](../characters/MASTER-ASSAULT.md), [CHARACTER-PIPELINE](../characters/CHARACTER-PIPELINE.md).
