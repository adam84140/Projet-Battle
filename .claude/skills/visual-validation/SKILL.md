---
name: visual-validation
description: Valider visuellement un changement de Frontline Legends (personnage, animation, arme, décor, lumière, effets, HUD, caméra) avec des captures avant/après, tests de silhouette, lisibilité à distance et lisibilité bleu/rouge. À utiliser pour tout changement visible avant de le déclarer terminé.
---

# Validation visuelle — Frontline Legends

## 1. Captures avant / après
```bash
git stash push -- src          # état « avant » (ne stash que src/)
npm run shots -- avant-<sujet> <mode>
git stash pop
npm run shots -- apres-<sujet> <mode>
```
Modes de `tests/shots.mjs` :
| Mode | Contenu |
| --- | --- |
| `turn` | 6 planches (3 classes × 2 équipes), 7 vues : face, 3/4, profil, dos, repos, visée, course |
| `poses` | 18 états d'animation (saut, réception, impacts, pivot, morts…) |
| `sheet` | fiche personnage (vues, visage, équipement, expressions, A-pose, échelle) |
| `game` | menu, jeu, visée, tir, capture, moulin, char, jeep |
| `fx` | tir, explosion, fumée, capture de drapeau |
| `ui` | HUD chargé (fil d'éliminations, capture, bannière, objectif derrière) |
Sortie : `test-results/shots/<étiquette>/` (non versionné). **Regarder réellement chaque image** (outil de lecture d'image) et comparer.

## 2. Liste de contrôle
- **Références** : comparer aux images officielles ([VISUAL-REFERENCES](../../../docs/product/VISUAL-REFERENCES.md)) : personnage → image 01 (mêmes vues), en jeu → image 03 (cadrage, lumière, HUD). Signaler les écarts, ne pas copier l'image 04 ni *Battlefield Heroes*.
- **Silhouette** : reconnaissable en ombre pleine ; chaque classe distincte.
- **Distance** : équipe et classe lisibles à 5, 20 et 40 m en jeu.
- **Bleu / rouge** : mêmes vues pour les deux équipes, identification immédiate de face et de dos.
- **Interpénétrations** : mains sur l'arme, arme hors du corps, accessoires hors de la tête, pieds sur le sol.
- **Caméra** : le personnage ne masque pas le centre en visée ; jamais de vue depuis un mur.
- **Animation** : transitions sans saut de pose (`poses`, puis en jeu).
- **Lumière** : pas de zone bouchée ni brûlée, rendu des tons *Neutral* conservé.
- **Effets** : ne masquent pas durablement le combat ni l'écran.
- **HUD** : aucun chevauchement (ordinateur 1280×720 et tactile 844×390).

## 3. Pièges connus
- Le rendu logiciel est lent : pour les éléments de HUD temporisés, figer l'horloge de la page (`page.clock`), comme le fait le mode `ui`.
- Les vues de dessus ou les caméras libres : rendre directement avec `g.renderer.render(scene, cam)` puis `toDataURL`.

## 4. Rapport
Lister les captures regardées, ce qui s'est amélioré, ce qui reste imparfait. Un avis esthétique final revient au propriétaire du projet.

Références : [VISUAL-REFERENCES](../../../docs/product/VISUAL-REFERENCES.md) · [ART-DIRECTION](../../../docs/product/ART-DIRECTION.md) · [MASTER-ASSAULT](../../../docs/characters/MASTER-ASSAULT.md) (section Validation)
