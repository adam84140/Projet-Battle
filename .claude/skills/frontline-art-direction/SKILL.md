---
name: frontline-art-direction
description: Appliquer la direction artistique de Frontline Legends (cartoon héroïque lisible, village méditerranéen, couleurs d'équipe bleu/rouge, silhouettes de classe, rendu stylisé) à tout travail visuel sur personnages, armes, décor, lumière ou effets. À utiliser avant de créer ou modifier un élément visuel.
---

# Direction artistique — Frontline Legends

## En une phrase
Cartoon héroïque, coloré et **lisible d'abord**, dans un village méditerranéen ensoleillé. Identité propre (*Frontline Legends*, Assaut bleu à l'aigle ailé) ; *Battlefield Heroes* n'est qu'une inspiration de lisibilité, jamais reproduite.

## Références officielles (D-009)
[VISUAL-REFERENCES](../../../docs/product/VISUAL-REFERENCES.md) : **image 01** fait autorité pour le personnage, **image 03** pour la présentation en jeu, image 02 pour les détails du personnage. L'image 04 ne sert qu'à la cohérence et n'autorise aucun contenu hors périmètre. Regarder la référence concernée avant tout travail visuel. Les maquettes ne sont pas des documents de game design : emblèmes d'équipe canoniques (D-011) et règles de la conquête (D-013) priment.

## À faire
- Proportions héroïques : tête un peu grosse, épaules larges, taille fine, avant-bras, mains et bottes légèrement exagérés.
- Silhouette unique par classe (Assaut : tête nue, harnais, ceinture à poches selon l'image 01 — **pas de sac par défaut**, sac en accessoire optionnel (D-010) ; Artilleur : casque, épaulières, carrure ×1,12 ; Commando : bonnet, écharpe, carrure ×0,95).
- Couleur d'équipe dominante sur le haut du corps et visible de dos (chemise `#2F5BB7` / `#B2382C`, emblème aigle / étoile sur poitrine, manches et dos).
- Armes épaisses, légèrement surdimensionnées, reconnaissables à leur forme.
- Décor : murs crème à ocre, tuiles orangées, volets colorés, pierre, oliviers, cyprès ; couverts qui « ont l'air » de couverts.
- Couleurs franches, ombres douces, brume légère au loin, rendu des tons *Neutral*.

## À éviter
Reproduire un élément de *Battlefield Heroes* (ou de tout jeu tiers), réalisme granuleux, saleté réaliste (l'usure légère peinte de l'image 01 est admise), bloom excessif, flou de mouvement, profondeur de champ, couleurs boueuses ou sursaturées, surexposition, encombrement visuel, effets qui masquent le combat.

## Méthode
1. Relire la section concernée de [ART-DIRECTION](../../../docs/product/ART-DIRECTION.md).
2. Réutiliser la palette et les briques existantes (`src/config.js` → `TEAMS`, `PALETTE` ; `src/character/parts.js` ; kit village de `src/game/World.js`).
3. Valider avec la skill `visual-validation` (captures avant/après, bleu/rouge, distances).

Références : [VISUAL-REFERENCES](../../../docs/product/VISUAL-REFERENCES.md) · [ART-DIRECTION](../../../docs/product/ART-DIRECTION.md) · [GAME-VISION](../../../docs/product/GAME-VISION.md) · [MASTER-ASSAULT](../../../docs/characters/MASTER-ASSAULT.md)
