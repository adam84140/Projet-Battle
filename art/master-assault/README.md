# Master Assault — ébauche du point A (M4)

> **NON APPROUVÉ — PAS L'ART FINAL (*NOT APPROVED FINAL ART*).**
> Ce dossier contient l'ébauche du point de contrôle A de M4, modélisée par script dans Blender. Elle n'est **pas** la direction visuelle du Master Assault : la cible reste l'[image 01](../../docs/_attachments/ref-01-master-assault-turnaround.webp) (D-009). La production artistique est **en pause** ([DECISIONS](../../docs/DECISIONS.md) D-023) ; ne pas continuer ni affiner ce modèle.

## Pourquoi ces fichiers sont gardés
Ils servent de **référence technique** :
- preuve que le squelette du contrat, l'export verrouillé, le masque d'équipe et l'essai en jeu fonctionnent avec un vrai fichier Blender (mains ≤ 1,2 mm de l'arme) ;
- cas d'essai pour le validateur `npm run check:glb` ;
- comparaison historique avec les références.

| Fichier | Contenu |
| --- | --- |
| `blockout.py` | ébauche en volumes simples, export, rendus et planche de comparaison (sortie dans `art/build/`, non versionné) |
| `proportions.json` | proportions mesurées sur l'image 01 (hauteurs, largeurs, positions des articulations) ; ces mesures restent utiles pour contrôler un futur asset |

Planches : `docs/_attachments/m4/checkpoint-a-*.webp`, avec un bandeau « NON APPROUVÉ ». Suivi et procédure de reprise avec un asset externe : [MASTER-ASSAULT-M4](../../docs/characters/MASTER-ASSAULT-M4.md), § 5 et § 8.
