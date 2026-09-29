# Frontline Legends — base de connaissances

Point d'entrée de la documentation du projet. Les règles permanentes de travail sont dans [CLAUDE.md](../CLAUDE.md) à la racine du dépôt.

> **Jalon : MAP 1 GOLD — sous-jalon : MASTER CHARACTER ASSAULT (M0 et M1 faits : rendu optimisé du personnage actuel ; asset de production pas commencé).**
> Point de contrôle stable : commit `05827b4807c67959e125c9681b5ffa953b113a29`.

## Commencer ici
| Document | Pour quoi faire |
| --- | --- |
| [SESSION-HANDOFF](SESSION-HANDOFF.md) | où en est le travail, objectif exact de la prochaine session |
| [CURRENT-STATE](CURRENT-STATE.md) | ce qui fonctionne, tests, performances, problèmes connus (faits vérifiés) |
| [ROADMAP](ROADMAP.md) | ordre des étapes jusqu'à MAP 1 GOLD |
| [DECISIONS](DECISIONS.md) | décisions verrouillées ou en attente (ONE MAP FIRST, Master Character…) |

## Personnages
| Document | Contenu |
| --- | --- |
| [MASTER-ASSAULT](characters/MASTER-ASSAULT.md) | spécification du personnage de référence : art, technique, animation, validation, critères GOLD |
| [CHARACTER-PIPELINE](characters/CHARACTER-PIPELINE.md) | chaîne de production cible (Blender → glTF → Three.js), partage code / outil 3D |
| [MASTER-ASSAULT-AUDIT](characters/MASTER-ASSAULT-AUDIT.md) | audit technique du personnage actuel, mesures, plan de migration M0 à M7, décisions du propriétaire |
| [MASTER-ASSAULT-BASELINE](characters/MASTER-ASSAULT-BASELINE.md) | **référence M0** : tests `test:character`, mesures, captures A/B, surprises |
| [MASTER-ASSAULT-M1](characters/MASTER-ASSAULT-M1.md) | **étape M1** : corps en un SkinnedMesh, chemins de rendu legacy / M1, mesures avant / après, différences expliquées |

## Carte 1 — *Castelmare*
| Document | Contenu |
| --- | --- |
| [MAP1-GOLD](map1/MAP1-GOLD.md) | critères de validation GOLD |
| [LEVEL-DESIGN](map1/LEVEL-DESIGN.md) | plan général, règles de level design, faiblesses connues |
| [ZONE-A-MILL](map1/ZONE-A-MILL.md) · [ZONE-B-VILLAGE](map1/ZONE-B-VILLAGE.md) · [ZONE-C-FARM](map1/ZONE-C-FARM.md) | détail des trois zones de capture |

## Produit
| Document | Contenu |
| --- | --- |
| [GAME-VISION](product/GAME-VISION.md) | ce qu'est (et n'est pas) le jeu |
| [GAMEPLAY-PILLARS](product/GAMEPLAY-PILLARS.md) | piliers de gameplay, classes |
| [ART-DIRECTION](product/ART-DIRECTION.md) | style, couleurs d'équipe, personnages, décor, lumière |
| [VISUAL-REFERENCES](product/VISUAL-REFERENCES.md) | **références visuelles officielles** (images 01 à 04), rôle de chacune, écarts avec le jeu actuel |

## Systèmes
| Document | Contenu |
| --- | --- |
| [COMBAT](systems/COMBAT.md) | tir, armes, projectiles, compétences, conquête |
| [ANIMATION](systems/ANIMATION.md) | animateur procédural, squelette actuel, outils d'inspection |
| [AI](systems/AI.md) | bots : navigation, rôles, tactique, difficulté |
| [VEHICLES](systems/VEHICLES.md) | jeep et char |
| [PERFORMANCE](systems/PERFORMANCE.md) | mesures de référence 8v8 / 16v16, objectifs, techniques |

## Skills du projet (`.claude/skills/`)
`gameplay-regression` · `visual-validation` · `threejs-performance` · `frontline-art-direction` · `character-production` · `character-animation` · `map1-level-design`. Elles donnent les procédures ; ces documents donnent les références.

## Utiliser ce dossier avec Obsidian
1. Ouvrir Obsidian.
2. **Open folder as vault** (Ouvrir un dossier comme coffre).
3. Choisir le dossier `docs/` du dépôt.

Les liens sont des liens Markdown relatifs standard : ils fonctionnent aussi sur GitHub et dans n'importe quel éditeur. Les images vont dans `_attachments/`. L'état de l'espace de travail Obsidian (`.obsidian/workspace*.json`) est ignoré par Git. Claude lit directement les fichiers Markdown ; Obsidian n'est qu'un confort de lecture pour les humains et n'est jamais une dépendance du jeu.

## Entretien
- Mettre à jour les documents dans le même commit que le travail qu'ils décrivent.
- [CURRENT-STATE](CURRENT-STATE.md) : uniquement des faits vérifiés, avec la date.
- Pas de fichier vide créé « pour la structure ».
