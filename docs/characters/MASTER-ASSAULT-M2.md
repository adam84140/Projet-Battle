# Master Assault — étape M2 : adaptateur de squelette et contrat d'asset

**Statut : implémentée et validée par les tests, en attente d'acceptation par le propriétaire.** M3 et la production Blender ne sont pas autorisées. M2 est une étape **de code et de chaîne de production seulement** : l'apparence du personnage en jeu, le gameplay, les hitboxes, la hauteur en jeu et le chemin de rendu (M1 par défaut, legacy en repli) sont **inchangés**. Remise à l'artiste : [ASSET-CONTRACT](ASSET-CONTRACT.md). Étapes précédentes : [M0](MASTER-ASSAULT-BASELINE.md), [M1](MASTER-ASSAULT-M1.md). Plan : [audit](MASTER-ASSAULT-AUDIT.md).

## 1. Architecture
```
Soldier (état) ──► Animator (inchangé) ──► squelette de gameplay : 16 groupes (inchangés, SOURCE)
                                              │  hitboxes, support d'arme, bouche du canon, IK, bots, véhicules
                                              │  (lecture seule)
                                              ▼
                              RigAdapter (nouveau, src/character/rigAdapter.js)
                               1. calibration en pose de liaison : décalage de rotation par os
                               2. par image : rotations recopiées (repère du personnage),
                                  colonne répartie, hauteur du bassin × rapport des jambes
                               3. IK des mains sur les longueurs de bras de l'asset
                                              ▼
                     squelette de production (A-pose, noms canoniques) ──► SkinnedMesh de l'asset
```

| Fichier | Rôle |
| --- | --- |
| `src/character/rigContract.js` (nouveau) | **source unique du contrat** : os requis et facultatifs, points d'attache, budgets, masque d'équipe, clips, expressions ; importable par Node et par le jeu |
| `src/character/rigAdapter.js` (nouveau) | adaptateur ; n'est **branché sur aucun soldat en jeu** (M5) : seuls les tests l'utilisent |
| `src/character/animation.js` | ajout d'un export en lecture seule `IK_CHANNELS` (indices des canaux d'IK) ; aucun changement de comportement |
| `tests/check-glb.mjs` (nouveau) | validateur d'asset, sans service externe (`npm run check:glb`) |
| `tests/rig-probe.js`, `tests/rig.html` (nouveaux) | squelette d'essai synthétique, export et rechargement GLB, mesures |
| `tests/rig.mjs` (nouveau) | `npm run test:rig`, ajouté à `npm test` |
| `tests/character-probe.js` | exporte des aides existantes (`simulate`, `stage`, `LINEUP`, `EXTENT_POSES`) ; aucun changement de mesure |

### Choix de conception
- **Le gameplay reste la source** (et non l'inverse) : aucun système de jeu ne lit le squelette de production. Un asset raté ne peut pas casser les hitboxes, la visée, les bots ni les véhicules.
- **Calibration par direction pour les membres** : pour bras, avant-bras, main, cuisse et tibia, la direction de repos du gameplay (vers le bas) est alignée sur la direction réelle de l'os de production (A-pose) ; le *roll* des os et les axes locaux choisis dans Blender n'ont donc aucune importance. Les autres os (bassin, colonne, cou, tête, pieds) recopient la rotation du gameplay avec un décalage constant.
- **Colonne** : le gameplay n'a qu'un os `spine` ; il est réparti sur `spine` / `spine1` / `chest` par des poids réglables (`spineWeights`, défaut [1, 0, 0] = buste rigide comme aujourd'hui).
- **Bassin** : seul le mouvement vertical du gameplay existe ; il est mis à l'échelle du rapport des longueurs de jambes, pour garder les pieds au sol.
- **IK** : même algorithme analytique à deux segments que le gameplay, vers les mêmes points de prise, mais sur les **longueurs de bras de l'asset**, coude orienté par le coude du gameplay. Bornes de portée identiques à celles du gameplay dans les poses tenues, exactes pendant les transitions (écart résiduel ≤ 1 × 10⁻⁹ mm en partie).
- **Noms** : les noms Blender `upperArm.L` deviennent `upperArmL` au chargement (règle de Three.js) ; le contrat, l'adaptateur et le validateur appliquent la même conversion (`runtimeName`).

## 2. Squelette d'essai synthétique (donnée de test, pas de l'art)
Généré **à chaque exécution** par `tests/rig-probe.js` à partir du personnage actuel, de façon déterministe ; **aucun fichier binaire n'est versionné** (les `.glb` d'essai sont écrits dans `test-results/rig/`).
- Os de type Blender : axe +Y vers l'enfant, *roll* différent pour chaque os, racine couchée vers +Z : leurs repères locaux diffèrent de ceux du gameplay de **101° en moyenne (jusqu'à 176°)**.
- Liaison en **A-pose** (bras à 41,3° de la verticale), pas en pose de repos du gameplay.
- Géométrie : le corps M1 actuel, remis en A-pose et lié aux os de production (sans nouvelle forme).
- Deux variantes :
  - **orientation** : mêmes proportions que le gameplay, repères différents. L'adaptateur doit reproduire M1 exactement ;
  - **proportions** (Master Assault simulé) : **1,85 m** (tête réduite à 0,84), bras +5 %, jambes −3 %, épaules décalées (+1,5 cm, +1 cm), exportée en GLB (masque d'équipe, UV d'emblème, atlas 256², un matériau) puis **rechargée par `GLTFLoader`** comme le serait un fichier Blender.

## 3. Résultats (conteneur Cloud, 2026-09-29)

### Variante « orientation », 3 classes, 32 états chacune
| Mesure | Résultat |
| --- | --- |
| Squelette de gameplay modifié par l'adaptateur | **jamais** (matrices et hitbox identiques, 32 états × 3 classes) |
| Articulations de production / articulations du gameplay | **0 mm** partout (seuil 0,5 mm) |
| Mains / arme, poses tenues | Assaut 4,72 mm (visée basse), Artilleur 0, Commando 7,71 mm : **identiques au gameplay** (même écart que M0/M1) |
| Poses non tenues (réception, lancer, poignard) | écarts du gameplay reproduits à l'identique (problème connu 12, non corrigé) |
| Rendu comparé à M1 (Assaut bleu et rouge, Artilleur rouge, Commando bleu ; 8 vues) | **0,002 à 0,004 %** de pixels différents ; ≤ 0,0002 % au-delà de 32 niveaux |
| Coût de l'adaptateur (processeur, conteneur) | **0,09 à 0,11 ms par soldat et par image** |

### Variante « proportions » exportée en GLB, bleu et rouge
| Mesure | Résultat |
| --- | --- |
| Validateur, stade prototype | **0 erreur** |
| Validateur, stade production | refusé **seulement** pour ce qu'un squelette d'essai ne peut pas fournir : `LOD_MANQUANT` (LOD1, LOD2), `EXPRESSIONS`, `CLIP_MANQUANT` |
| Contenu | 23 os + 9 points d'attache, `body_LOD0` 14 872 / 14 842 triangles, 1 matériau, atlas 256² PNG, masque (R 1 346, G 128, B 96 / 30 sommets), 1,71 Mo (avertissement > 1,5 Mo) |
| Rechargé : 32 états (repos, visée ×3, tir, marche, course, marche arrière, pas chassé, accroupi ×3, sprint, saut, chute, réception, 2 impacts, pivot, rechargement, lancer, geste, soin, jeep, 5 morts, poignard, debout, A-pose) | tous exécutés, **0 sommet invalide**, gameplay intact |
| Mains / arme avec des bras **+5 %** (0,63 m au lieu de 0,60) | **0 mm** dans toutes les poses tenues |
| Main libre (lancer, poignard), non tenue | 22 à 42 mm de la main du gameplay (rotations recopiées sur des bras plus longs) |
| Tête visible / zone de touche, debout | centre à 4,0–4,9 cm, couverture 92 à 96 % (seuil : 6 cm, 80 %) |
| Pieds au repos / sommet le plus éloigné | −2,4 cm / 1,73 m (dans la sphère englobante M1 de 2,2 m) |
| Rapports mesurés par l'adaptateur | jambes 0,97, bras 0,63 m |

### Validateur
13 fichiers fautifs construits par le test, **tous refusés pour la bonne raison** avec une consigne de correction : os renommé (`UpperArm_L`), os Rigify (`DEF-spine`), point d'attache absent, mauvais parent, personnage tourné de 180°, centimètres, épaule 10 cm trop haute, T-pose, trois matériaux, poids non normalisés, sommets pondérés sur un point d'attache, plus de 4 influences, racine déplacée dans un clip. Le fichier conforme reste accepté.

### En partie
8v8, 30 s (≈ 900 images), bots, entrée et sortie de jeep et de char, morts et réapparitions, **tous les soldats** équipés du squelette d'essai : 922 à 950 échantillons selon l'exécution (10 à 12 en véhicule, 49 à 62 morts), 16 à 17 squelettes, écart maximal ≤ 1 × 10⁻⁹ mm, **0 exception**, 0 erreur console (2 exécutions).

### Contrôle visuel
Planches regardées : `test-results/rig/lineup-orientation-*.png` (identiques à M1 ; cartes de différences sans zone marquée visible), `lineup-proportions-{blue,red}.png` (personnage à 1,85 m, tête plus petite, mains sur l'arme, pieds au sol, aucune déformation aberrante), `lineup-proportions-*-masque.png` (zones R / G / B du masque), `test-results/check-glb/*-essai.png`. Bleu et rouge : même fichier, même géométrie.

## 4. Régression
| Vérification | Résultat |
| --- | --- |
| `npm run build` | OK |
| `npm test` | smoke 48/48 · tactile 12/12 · caméra 6/6 · bots 8/8 · personnage 72/72 · **squelette 31/31** · 0 erreur console |
| Code du jeu touché | `animation.js` : un export en lecture seule ; deux nouveaux modules non branchés en jeu |

## 5. Risques découverts
1. **Coût de l'adaptateur** : 0,09 à 0,11 ms par soldat (processeur, conteneur), soit ~3 ms pour 32 soldats s'ils étaient tous mis à jour à chaque image, face à un objectif de logique < 4 ms. **À traiter en M5** (pas d'allocation par image, soldats hors champ ou en LOD2 mis à jour moins souvent), mesures à l'appui.
2. **L'arme reste sur le support du gameplay** : des épaules ou une poitrine placées autrement que les cibles décalent le corps par rapport au fusil (d'où les tolérances de ±3 cm aux épaules).
3. **Main libre** (lancer, poignard) à 2–4 cm de la main du gameplay avec d'autres longueurs de bras : la grenade et le poignard du gameplay partent de la main du gameplay. Invisible au gameplay ; à régler en M5 si l'objet tenu paraît décalé.
4. **Tête plus petite** (1,85 m) : zone de touche centrée 4 à 5 cm plus haut que la tête visible (contre ~2 cm aujourd'hui), couverture encore ≥ 92 % debout. À revérifier avec le vrai asset ; les hitboxes ne changent pas.
5. **`COLOR_0` active automatiquement les couleurs de sommets** dans `GLTFLoader` : le masque teinterait le personnage. Le chargement de test les désactive ; M3 / M5 devront faire de même.
6. **Taille du fichier** : 1,71 Mo pour le seul LOD0 et un atlas 256² sans compression. Avec LOD1, LOD2, un atlas 1 024² et 9 expressions, l'objectif de 1,5 Mo sera probablement dépassé : expressions en accesseurs creux (réglage par défaut de l'exportateur), puis décision de compression en M5.
7. **Marqueurs de la timeline non exportés** en glTF : les événements des clips sont fixés par le contrat en pourcentage.
8. **Rigify / Auto-Rig Pro** : leurs os ne sont pas exportables tels quels ; une conversion vers l'armature de jeu est nécessaire.
9. **Libellés de l'exportateur Blender** : ils changent selon la version ; le validateur fait foi.
10. **Squelette non gelé** (D-003) : un changement du contrat après le début de la production coûte une reprise du rig ; toute évolution passe par `rigContract.js` et une décision.

## 6. Non vérifié
- Aucun vrai fichier Blender n'a été validé : le squelette d'essai est produit par Three.js (`GLTFExporter`), pas par l'exportateur de Blender.
- Clips et expressions : contrat et validation statique seulement ; leur lecture et leur mélange relèvent de M5.
- Coût de l'adaptateur et du skinning sur un vrai GPU, un vrai téléphone.

## 7. Problèmes connus inchangés (non corrigés en M2, sur instruction)
Inclinaison de la zone de touche de la tête, angle du fusil en visée accroupie, dérive de la main gauche en réception et au lancer, bot bloqué au Moulin, autres problèmes de [CURRENT-STATE](../CURRENT-STATE.md).
