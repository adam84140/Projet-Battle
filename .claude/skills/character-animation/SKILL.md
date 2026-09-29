---
name: character-animation
description: Modifier ou étendre l'animation des personnages de Frontline Legends — animateur procédural (état, pose cible, lissage par canal, couches additives, IK des mains), locomotion, visée, actions, réactions, morts, et futur mélange avec des clips sur SkinnedMesh. À utiliser pour tout travail sur src/character/animation.js ou les poses.
---

# Animation des personnages — Frontline Legends

## Architecture actuelle (à préserver)
`src/character/animation.js` :
1. **État** (`defaultAnimState`) rempli par `Soldier.update()` : vitesse, direction, accroupi, sprint, visée, au sol, vitesse verticale, tangage, recul, rechargement, action (`throw`, `knife`, `heal`, `buff`), mort, impact, réception, vitesse de pivot.
2. **Pose cible** (`computeTarget`) → canaux Float32Array (16 articulations × 3 + bassin + support d'arme + poids IK + main gauche).
3. **Lissage par canal** (`RATES` : jambes 24, bassin 20, défaut 16, arme 13, IK 12).
4. **Couches additives rapides** (`computeAdditive`) : impact directionnel, réception.
5. **Application + IK des mains** (`apply`, `solveArm`) sur les points de prise de l'arme.

Conventions : face +Z, droite −X ; `hitX` > 0 = tir venant de la gauche ; `hitZ` = +1 de face.

## Règles
- **Pilotée par le code par défaut** (D-007) : locomotion, visée, recul, réactions. Clips seulement pour rechargement, lancer, soin, gestes, morts, une fois le SkinnedMesh en place.
- Un nouvel état passe par l'état d'animation (`Soldier` → `anim`), jamais par un accès direct aux os depuis le gameplay.
- Transitions sans saut : lissage ou enveloppe (attaque courte, retour progressif).
- Mains sur l'arme : écart < 1 cm dans toutes les poses tenues.
- Une action ne doit pas annuler le rechargement sans raison (`heal` et `buff` ne l'annulent pas).
- Les poses du menu et de la fiche utilisent le même animateur : les vérifier aussi.

## Vérification
- `tests/poses.html` (18 états) et `npm run shots -- <étiquette> poses turn`.
- `tests/turntable.html?classe=…&equipe=…&bake=1` pour les vues fixes.
- `npm run test:smoke` (tir, rechargement, compétences, mort, véhicules).

## Futur (Master Assault)
L'animateur écrit ses rotations sur les os du SkinnedMesh portant les mêmes noms ; `AnimationMixer` mélange les clips sur le haut du corps (au-dessus de `spine`) ; l'IK des mains est appliquée en dernier. Ne pas implémenter avant la validation de la spécification.

Références : [ANIMATION](../../../docs/systems/ANIMATION.md) · [MASTER-ASSAULT](../../../docs/characters/MASTER-ASSAULT.md) (section Animation)
