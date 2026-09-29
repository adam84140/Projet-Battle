# Master Assault — étape M1 : rendu optimisé du personnage actuel

**Statut : implémentée et validée par les tests, en attente d'acceptation par le propriétaire.** M2 n'est pas autorisée. Ce n'est **pas** le Master Assault visuel : c'est le personnage procédural actuel, rendu moins cher, avec la même apparence et le même contrat de jeu. Référence de comparaison : [M0](MASTER-ASSAULT-BASELINE.md). Plan : [audit](MASTER-ASSAULT-AUDIT.md).

## 1. Architecture
```
Soldier (état) ──► Animator (inchangé) ──► squelette de gameplay : les 16 groupes actuels (inchangés)
                                             │  hitboxes, support d'arme, bouche du canon, IK des mains
                                             ├──► SkinnedMesh « body » (M1) : un seul maillage pour tout le corps,
                                             │     lié à ces mêmes groupes (chaque sommet suit à 100 % son os)
                                             └──► weaponMount ► arme fusionnée (1 maillage) + chargeur + éclair + poignard
```
- **Squelette de gameplay inchangé** : les os restent les `Group` actuels, animés par le même `Animator` ; `THREE.Skeleton` les lit tels quels (aucun code ne dépend de leur type). Hitboxes, support d'arme, bouche du canon et IK ne voient aucune différence.
- **Corps** (`bakeSkinned`, `src/character/parts.js`) : toutes les pièces du corps, du visage, des cheveux et des accessoires sont fusionnées en **un `SkinnedMesh`** à peau rigide (index d'os sur 8 bits, poids 1). Liaison dans la **pose de repos** du squelette (rotations nulles), indépendante de la phase de respiration aléatoire : rendu reproductible au pixel près.
- **Arme** (`bakeIndexed`) : fusionnée en un maillage sous son support animé, comme avant ; chargeur (caché au rechargement), éclair de bouche et poignard restent séparés, comme avant.
- **Géométrie indexée** : chaque pièce garde son index d'origine (mêmes sommets, mêmes normales, mêmes triangles) au lieu d'être dupliquée en 3 sommets par triangle.
- **Matériau** : le même matériau partagé à couleurs de sommets que le chemin legacy (`bakedMaterial`) ; le camouflage du Commando (`setOpacity`) fonctionne sans changement.
- **Sphère englobante fixe** (centre (0 ; 0,9 ; 0), rayon 2,2 m) : le sommet le plus éloigné, sur 87 cas (3 classes × 29 poses, morts comprises), est à 1,71 m.
- **Libération** : `dispose()` libère aussi la texture des os du squelette.
- Menu, fiche et portraits (personnages non fusionnés) : **non concernés**.

## 2. Chemins de rendu et repli
`src/character/renderPath.js` :

| Chemin | Contenu | Sélection |
| --- | --- | --- |
| `LEGACY_RENDER_PATH` | fusion par os (référence M0), code d'origine inchangé | `?rendu=legacy` dans l'adresse, `RENDU=legacy npm test`, ou constante par défaut |
| `M1_OPTIMIZED_RENDER_PATH` | corps en un SkinnedMesh, arme indexée | **par défaut** ; `?rendu=m1`, `RENDU=m1` |

**Repli immédiat** : remplacer `DEFAULT_RENDER_PATH` par `LEGACY_RENDER_PATH` dans `renderPath.js` (une ligne), ou ajouter `?rendu=legacy` à l'adresse sans rien reconstruire. Le chemin legacy rend **au pixel près** comme M0 (7 planches, empreintes SHA-256 dans `tests/baselines/character-m0-lineups.json`).

## 3. Mesures avant / après (conteneur Cloud, sans GPU)

### Un soldat (Assaut bleu, sac porté)
| Mesure | Legacy = M0 | M1 | Écart |
| --- | --- | --- | --- |
| Objets de rendu (total / visibles) | 24 / 18 | **9 / 3** | −15 / −15 |
| Matériaux | 3 | **2** | le cou rejoint le matériau partagé |
| Maillages qui projettent une ombre | 18 | 3 | |
| Appels de rendu, soldat seul (couleur + ombre) | 36 | **6** | **−83 %** |
| Triangles | 16 798 | 16 798 | identique |
| Sommets | 50 350 | **27 648** | −45 % (indexation) |
| Géométrie | 1 782 Ko | **1 274 Ko** | **−28,5 %** (attributs de peau compris) |
| Mémoire JS par soldat | ≈ 1,90 Mo | **≈ 1,37 Mo** | −28 % ; aucune fuite (résidu indépendant du nombre de soldats) |
| Construction (médiane, rendu logiciel) | 54 à 71 ms | 53 à 80 ms | du même ordre (± 10 %) |

Toutes classes : géométrie 1 579–1 782 Ko → **1 211–1 274 Ko** ; sans sac 1 494–1 692 Ko → 1 105–1 164 Ko.

### Partie 16v16 (plusieurs exécutions)
| Mesure | M0 / legacy | M1 |
| --- | --- | --- |
| Vue de jeu de référence (place B, 4 directions) : appels totaux | 502 à 865 | **156 à 265** |
| … dont soldats | 402 à 729 | **73 à 138** |
| … triangles des soldats | 386 000 à 561 000 | 450 000 à 715 000 (voir § 5) |
| Scène chargée (32 soldats à moins de 18 m) : appels totaux | 811 à 993 | **208 à 313** |
| … dont soldats | 717 à 810 (22 à 25 par soldat) | **116 à 140 (3,8 à 4,4 par soldat)** |
| Rendu de la scène chargée (`g.render()`, rendu logiciel) | médiane 15 à 23 ms | médiane 8 à 9 ms |
| Logique, 60 s après le déploiement | moyenne 3,1 à 3,9 ms | moyenne 2,5 à 3,8 ms |
| Images logiques > 40 ms | 1 construction de modèle (réserve vide) : 65 à 69 ms | idem : 73 à 76 ms (problème connu 2, pas lié à M1) |
| Mémoire sur 3 relances | 827 géométries, 3 textures, 163 à 165 Mo JS | **347 géométries**, 35 textures (une par squelette, libérées), **143 à 146 Mo JS**, stable |
| Téléphone émulé 844×390 (même scène) | 659 à 688 appels | **190 à 209 appels** |

L'objectif GOLD « ≤ 250 appels en vue de jeu 16v16 » est atteint dans la plupart des vues de référence (156 à 265 selon la direction et la partie).

## 4. Validation
| Vérification | Résultat |
| --- | --- |
| `npm run build` | OK |
| `npm test`, chemin M1 (par défaut) | smoke 48/48 · tactile 12/12 · caméra 6/6 · bots 8/8 · personnage 72/72 · 0 erreur console |
| `RENDU=legacy npm test` | smoke 48/48 · tactile 12/12 · caméra 6/6 · bots 8/8 · personnage 72/72 · 0 erreur console |
| Legacy = M0 | 7 planches identiques au pixel près ; coût identique |
| Mains, bouche du canon, support d'arme, tête / sphère de touche, arme / visée | **écart M1 − legacy : 0** sur 25 poses × 3 classes |
| Planches M1 / legacy (face, 3/4, profil, dos, repos, visée, course, accroupi ; bleu, rouge ; ombres) | 0,01 à 0,15 % des pixels différents ; 0,0005 % au plus au-delà de 32 niveaux |
| Soldat mort coupé par le bord de l'image (point d'ancrage et centre de la sphère hors champ) | affiché dans les deux chemins (3 928 pixels de soldat), 0 pixel différent |
| Sphère englobante | tous les sommets à l'intérieur, 87 cas, marge ≥ 0,49 m |
| Camouflage du Commando | tout le corps transparent sans ombre, puis restauré (les deux chemins) |
| M1 reproductible | planches identiques d'une exécution à l'autre |

### Différences visuelles expliquées
1. **Planches (0,01 à 0,15 % des pixels)** : pixels isolés sur les contours et les surfaces presque confondues (bord des cheveux, sourcil, bouts de bottes), écart ≤ 7 niveaux sur 255 pour 95 % d'entre eux, 41 au plus. Causes : la peau passe par des matrices en flottants 32 bits (arrondis différents de la fusion par os) et **le cou** utilise désormais le matériau partagé (rugosité 0,75 au lieu de 0,78, métal 0,02 au lieu de 0) — c'était la seule pièce du corps restée seule sur son os. Invisible à l'œil (planches regardées).
2. **Camouflage (4,1 % des pixels de la silhouette à opacité 0,35)** : là où des parties transparentes se superposent (bras devant le buste, épaules, genoux vus de dos). Legacy mélange 18 maillages transparents triés par distance ; M1 mélange un seul maillage dans l'ordre de ses triangles. Les deux sont des approximations de la transparence ; la règle de jeu (tout transparent, pas d'ombre, restauration) est identique. En jeu l'opacité vaut 0,35 (alliés) ou 0,1 (ennemis).

Captures : `test-results/character/` (`lineup-*-legacy|m1|diff.png`, `camo-commando-*.png`, `edge-*.png`, `crowd-16v16-m1-*.png`, `mobile-legacy|m1.png`) ; aperçus versionnés dans [`docs/_attachments/m1/`](../_attachments/m1/).

## 5. Risques sur téléphone et petites machines (non mesurables ici)
Aucun FPS n'est mesuré : le conteneur n'a pas de GPU.
- **Appels de rendu** : ÷3 à ÷4 en 16v16 (coût processeur du pilote graphique nettement réduit : c'est le gain principal, surtout sur téléphone).
- **Mémoire** : −28 % de géométrie et de mémoire JS par soldat ; −480 géométries GPU en 16v16.
- **Travail ajouté par la peau** : par soldat visible et par image, mise à jour d'une petite texture d'os (17 os, 2,3 Ko) ; dans le nuanceur de sommets, lecture de 4 matrices d'os (16 lectures de texture) par sommet, même si 3 ont un poids nul, pour ~27 600 sommets par soldat, en passe couleur et en passe d'ombre.
- **Triangles envoyés** : +15 à +30 % en vue de jeu, car un soldat partiellement visible est dessiné en entier (une sphère par soldat au lieu d'une par os).
- **Risque probable** : sur un GPU mobile modeste, le coût des sommets augmente pendant que celui des appels baisse ; le bilan net est probablement positif (les appels étaient le goulot mesuré) mais **doit être mesuré sur un vrai téléphone**. Piste si besoin (pas faite en M1) : nuanceur de peau à un seul os par sommet (1 matrice au lieu de 4).

## 6. Problèmes connus conservés tels quels
Sphère de tête qui ne suit pas l'inclinaison de la tête · arme ~15° trop basse en visée accroupie · main gauche hors du garde-main en réception et au lancer de grenade · blocage intermittent d'un bot au Moulin · pic de construction de modèle quand la réserve est vide (16v16) · squelette de gameplay inchangé. Détail : [CURRENT-STATE](../CURRENT-STATE.md).

## 7. Tests
`tests/character.mjs` (72 vérifications) compare désormais les deux chemins dans la même exécution (modèle, alignements, planches, camouflage, bord de l'écran, sphère englobante) puis mesure la partie 16v16 avec le chemin par défaut (ou `RENDU`) et le téléphone émulé avec les deux chemins. `tests/lib.mjs` impose le chemin à tout le parcours avec `RENDU=legacy|m1`.
