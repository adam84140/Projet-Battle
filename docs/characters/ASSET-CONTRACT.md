# Contrat d'asset — Master Assault (remise à l'artiste)

**Contrat `M4-0.3` (étapes M2 à M4, [audit](MASTER-ASSAULT-AUDIT.md)). NON GELÉ** : le squelette et les noms peuvent encore changer jusqu'à la validation GOLD du vrai Master Assault (M7, [DECISIONS](../DECISIONS.md) D-003, D-018, D-019 et D-021). Toute évolution passe par [`src/character/rigContract.js`](../../src/character/rigContract.js) (source unique lue par le jeu et par le validateur), puis par ce document, dans le même commit.

Ce document dit **exactement** ce qu'un artiste, une chaîne Blender automatisée ou un **asset externe adapté** doit livrer pour le Master Assault (étape M4, en pause : [D-023](../DECISIONS.md) ; à la reprise, tout asset passe par ce contrat). Version courte pour démarrer la production : [M4-BLENDER-BRIEF](M4-BLENDER-BRIEF.md). L'apparence est fixée par la [spécification](MASTER-ASSAULT.md) et les images [01](../_attachments/ref-01-master-assault-turnaround.webp) et [02](../_attachments/ref-02-master-assault-production-sheet.webp) ; ce contrat fixe **tout le reste** : repère, squelette, points d'attache, maillages, pondération, matériau, masque d'équipe, expressions, clips, export. Un fichier conforme passe le validateur (§ 13) sans erreur.

Le jeu ne remplace pas son squelette de gameplay : l'asset en est une **peau** qui le suit (§ 14). Les hitboxes, le support d'arme, la bouche du canon et la logique de visée ne dépendent **pas** de l'asset.

---

## 1. Livrables

| Fichier | Contenu | Stade |
| --- | --- | --- |
| `public/models/characters/assault.glb` | corps `body_LOD0` (+ `body_LOD1`, `body_LOD2`), armature, points d'attache, accessoires `acc_*`, expressions, clips, un matériau `M_body` et son atlas | un seul fichier binaire glTF 2.0 |
| (facultatif) `public/models/weapons/fl4.glb` | fusil FL-4, voir § 11 | hors M4 sauf demande du propriétaire |
| fichier source `.blend` | conservé par l'artiste ou le propriétaire, **pas dans le dépôt** | — |

Deux stades de validation :
- **prototype** : squelette, points d'attache, `body_LOD0`, pondération, repère et dimensions conformes. Permet l'essai en jeu (`--fit`) avant l'habillage final.
- **production** : tout le contrat (LOD1 et LOD2, masque d'équipe, UV, texture, expressions, clips). C'est le livrable de M4.

Taille visée : **< 1,5 Mo** LOD et textures compris (avertissement au-delà). **Pas de compression** (Draco, meshopt, KTX2) dans ce contrat : elle sera décidée à l'intégration (M5), mesures à l'appui.

## 2. Repère, unités, hauteur, pose de liaison

| Règle | Dans le jeu (glTF) | Dans Blender |
| --- | --- | --- |
| Haut | +Y | +Z |
| Avant (le personnage regarde) | +Z | **−Y** (vue de face, pavé numérique 1 : le personnage vous regarde) |
| Gauche **du personnage** | +X | +X |
| Unité | 1 = 1 m | système métrique, échelle d'unité 1,0 |

Conversion d'un point : jeu (x ; y ; z) = Blender (X ; Z ; −Y). L'exportateur glTF la fait seul avec l'option **+Y Up**.

- **Hauteur : 1,85 m ± 4 cm**, des semelles au **sommet des cheveux**, en pose de liaison. Les os gardent les positions du § 3 : la différence avec le personnage actuel (1,94 m) se prend sur **le volume de la tête et des cheveux**, pas en réduisant le corps (sinon les mains n'atteignent plus l'arme et la tête sort de sa zone de touche). La hauteur en jeu ne change qu'à l'intégration (M5).
- **Origine** : au sol, entre les pieds (semelles à y = 0 ± 2 cm, personnage centré en x et z).
- **Pose de liaison : A-pose.** Bras tendus vers le bas et l'extérieur, **30 à 60°** de la verticale (≈ 45° recommandé ; mains vers (±0,67 ; 1,0 ; 0) m), coudes pliés de **20° au plus**, jambes droites légèrement écartées, pieds à plat vers l'avant, tête droite, regard vers l'avant. Ni T-pose ni bras le long du corps.
- **Pose de liaison = pose de repos exportée** : exporter en position de repos, transformations appliquées (§ 12).
- **Aucune échelle** sur les os ni sur les objets (échelle 1 partout, appliquée).

Référence d'échelle : `npm run test:rig` écrit `test-results/rig/fixture-assaut-blue.glb`, un squelette d'essai conforme (1,85 m, A-pose, tous les os et points d'attache) généré depuis le personnage actuel. **C'est une donnée de test, pas de l'art** : à importer dans Blender seulement comme gabarit de proportions.

## 3. Squelette canonique

### Noms
- Noms **exacts**, sensibles à la casse, en anglais, camelCase, côté par suffixe **`.L` / `.R`** (compatible avec le miroir de Blender). Le jeu retire les points au chargement : `upperArm.L` devient `upperArmL` (colonne « nom au chargement »). `upperArm.L`, `upperArm_L` → **différents** ; `UpperArm.L` → refusé.
- `.L` = **gauche du personnage** (côté +X), pas celle de la caméra.
- **Une seule armature** ; tous les maillages lui sont liés.

### Os requis (23)
Côté droit (`.R`) : mêmes noms en `.R`, positions en miroir (x → −x). Positions de repos **dans le repère du jeu** (m) ; tolérance par axe. « Longueur » : distance à l'articulation parente.

| Os (Blender) | Nom au chargement | Parent | Rôle | Suit l'articulation du gameplay | Position de repos, jeu (x ; y ; z) ± tolérance | Blender (X ; Y ; Z) |
| --- | --- | --- | --- | --- | --- | --- |
| `root` | `root` | — | racine au sol ; jamais animée | — | 0 ; 0 ; 0 ± 0,01 | 0 ; 0 ; 0 |
| `hips` | `hips` | `root` | bassin | `hips` | 0 ; 0,95 ; 0 ± 0,02 ; 0,05 ; 0,04 | 0 ; 0 ; 0,95 |
| `spine` | `spine` | `hips` | bas du dos | `spine` | 0 ; 1,01 ; 0 ± 0,02 ; 0,05 ; 0,05 | 0 ; 0 ; 1,01 |
| `spine1` | `spine1` | `spine` | milieu du dos | part de `spine` | 0 ; 1,17 ; 0 ± 0,02 ; 0,06 ; 0,06 | 0 ; 0 ; 1,17 |
| `chest` | `chest` | `spine1` | poitrine | part de `spine` | 0 ; 1,33 ; 0 ± 0,02 ; 0,06 ; 0,06 | 0 ; 0 ; 1,33 |
| `neck` | `neck` | `chest` | cou (base) | `neck` | 0 ; 1,50 ; 0,005 ± 0,02 ; 0,06 ; 0,04 | 0 ; −0,005 ; 1,50 |
| `head` | `head` | `neck` | tête (pivot du crâne) | `head` | 0 ; 1,59 ; 0,017 ± 0,02 ; 0,07 ; 0,04 | 0 ; −0,017 ; 1,59 |
| `clavicle.L` | `clavicleL` | `chest` | clavicule | — (suit `chest`) | 0,06 ; 1,41 ; 0 ± 0,05 | 0,06 ; 0 ; 1,41 |
| `upperArm.L` | `upperArmL` | `clavicle.L` | bras (épaule) | `shoulderL` | 0,25 ; 1,43 ; 0 ± 0,03 ; 0,04 ; 0,04 | 0,25 ; 0 ; 1,43 |
| `lowerArm.L` | `lowerArmL` | `upperArm.L` | avant-bras (coude) | `elbowL` | longueur 0,30 ± 0,03 | — |
| `hand.L` | `handL` | `lowerArm.L` | main (poignet) | `handL` | longueur 0,30 ± 0,03 | — |
| `thigh.L` | `thighL` | `hips` | cuisse (hanche) | `legL` | 0,10 ; 0,91 ; 0 ± 0,03 ; 0,05 ; 0,04 | 0,10 ; 0 ; 0,91 |
| `calf.L` | `calfL` | `thigh.L` | tibia (genou) | `kneeL` | longueur 0,42 ± 0,04 | — |
| `foot.L` | `footL` | `calf.L` | pied (cheville) | `ankleL` | longueur 0,39 ± 0,04 | — |
| `toe.L` | `toeL` | `foot.L` | orteils | — (suit `foot`) | libre (vers l'avant du pied) | — |

Règles :
- **Tête d'os = articulation.** Seules les têtes (positions) comptent ; la queue et le *roll* sont libres (l'adaptateur calibre l'orientation de chaque os dans la pose de liaison). Exception : **`hand.*` sans os de doigts**, dont la queue doit pointer le long de la main, vers le bout des doigts (c'est la direction de la main). Convention conseillée partout : axe +Y de l'os vers l'os enfant (Blender le fait par défaut).
- Les positions et longueurs viennent du squelette de gameplay : elles garantissent que **les mains atteignent les points de prise de l'arme** et que **la tête reste dans sa zone de touche** (sphère centrée à 1,724 m, rayon 0,17 m, debout). Hors tolérance, le validateur refuse le fichier.
- Gauche et droite **symétriques** à 1 cm près (Armature > Symmetrize).
- Os **déformants** : tous les os requis (`Deform` coché), **`root` compris** (sinon l'export « os de déformation seulement » le supprime).
- **Portée des bras** : bras + avant-bras (épaule → poignet) **≥ 0,60 m** de chaque côté (règle `PORTEE_BRAS`, D-021) : plus courts, la main gauche n'atteint plus le garde-main de l'arme du jeu (mesuré : 0,565 m laisse 36 à 46 mm d'écart). Les positions du cou et de la tête ont une tolérance verticale large (anatomie de l'image 01 : base du cou ≈ 1,54 m, pivot du crâne ≈ 1,63 m).
- Tous les os requis sont **directement** enfants des parents indiqués (pas d'os intermédiaire).

### Os facultatifs (acceptés, ignorés par l'adaptateur en M2)
| Os | Parent | Usage |
| --- | --- | --- |
| `thumb1.L` → `thumb2.L` → `thumb3.L` | `hand.L` puis la phalange précédente | pouce |
| `index1.L` → `index2.L` → `index3.L` | idem | index |
| `fingers1.L` → `fingers2.L` → `fingers3.L` | idem | majeur, annulaire et auriculaire **regroupés** |
| `eye.L`, `brow.L` (et `.R`) | `head` | yeux, sourcils (si pas en expressions) |
| `jaw` | `head` | mâchoire |

Sans clip, ces os gardent leur pose de repos : **modéliser les mains en prise détendue** si aucun os de doigt n'est fourni. Avec des doigts, les poses `hand_grip.R` / `hand_grip.L` (§ 10) serrent la poignée et le garde-main.

### Interdit dans le fichier exporté
- Os de contrôle ou de mécanique : préfixes `DEF-`, `MCH-`, `ORG-`, `CTRL-`, `IK-`, `FK-`, contraintes, os « pole » ou « target ». Un rig **Rigify** ou **Auto-Rig Pro** se garde dans le `.blend` pour animer, mais s'exporte **converti** vers une armature de jeu aux noms canoniques (armature dédiée qui copie les transformations, ou script de conversion ; § 16).
- Os hors contrat : tolérés (avertissement) mais ignorés ; à supprimer s'ils ne servent pas.
- Plusieurs armatures, os en double (après retrait des points : `hand.L` et `handL` sont le même nom).

## 4. Points d'attache (sockets)

Objets **non déformants**, enfants directs de l'os indiqué. Deux formes acceptées : **objet vide (Empty) parenté à l'os** (Parent > Bone, recommandé : survit à l'export « os de déformation seulement ») ou **os non déformant** (`Deform` décoché) dans l'armature de jeu. Aucun sommet ne doit leur être pondéré.

| Point d'attache | Parent | Requis | Emplacement conseillé | Usage |
| --- | --- | --- | --- | --- |
| `socket_hand.R` | `hand.R` | oui | au creux de la paume, là où se tient un objet | grenade lancée, poignard, trousse de soin |
| `socket_hand.L` | `hand.L` | oui | idem | chargeur pendant le rechargement |
| `socket_back` | `chest` | oui | au centre du dos, sur le harnais (≈ 20 cm derrière `chest`) | sac à dos (accessoire facultatif, D-010), arme en bandoulière |
| `socket_head` | `head` | oui | sommet du crâne, sous les cheveux | casquette, casque, bonnet |
| `socket_face` | `head` | oui | devant les yeux, à la racine du nez | lunettes |
| `socket_hip.L` | `hips` | oui | hanche gauche, sur la ceinture | gourde, sacoche |
| `socket_hip.R` | `hips` | oui | hanche droite, sur la ceinture | sacoche (l'étui de la cuisse fait partie du corps) |
| `socket_grenade` | `hips` | oui | avant de la ceinture | grenades de ceinture (accessoire) |
| `socket_weapon` | `chest` | non | position du fusil en visée (gabarit : `socket_weapon` du squelette d'essai) | **aperçu dans Blender seulement** : en jeu, l'arme reste sur le support animé par le code |

- L'origine du point d'attache est le point de contact ; son orientation est celle de l'objet tel qu'il est modélisé (axe +Y du point d'attache = haut de l'objet).
- **Accessoires** : objets séparés `acc_<nom>_LOD<n>` (§ 5), modélisés en place sur le personnage en A-pose et **parentés à leur point d'attache** (objet rigide, sans pondération), pour que le jeu puisse les montrer, les cacher ou les échanger. Noms réservés pour les accessoires possibles (image 02) : `acc_backpack`, `acc_cap`, `acc_sunglasses`, `acc_canteen`, `acc_pouch`, `acc_grenades`, `acc_bandana`. **Le modèle par défaut n'a pas de sac** (D-010).
- L'équipement du modèle de base (gilet, harnais, ceinture et poches, étui de cuisse, genouillères, gants, bottes) fait **partie du corps**, pas des accessoires.

## 5. Maillages et niveaux de détail (contrat LOD)

| Objet | Triangles | Stade | Contenu |
| --- | --- | --- | --- |
| `body_LOD0` | **12 000 à 18 000** | prototype | corps complet, tête et équipement de base, expressions ; < 15 m, menu, fiche |
| `body_LOD1` | **3 000 à 6 000** | production | même silhouette, sans doigts séparés ni expressions ; 15 à 45 m |
| `body_LOD2` | **800 à 2 000** | production | silhouette et couleurs d'équipe lisibles ; > 45 m |
| `acc_<nom>_LOD0` (et `_LOD1`) | ≤ 1 500 par accessoire conseillé | facultatif | accessoire amovible ; pas de `_LOD2` en principe (caché au loin) |

- Noms exacts : `body_LOD0`, `body_LOD1`, `body_LOD2` ; `acc_` + minuscules et chiffres + `_LOD0` à `_LOD2`. Tout autre maillage est refusé.
- Chaque `body_LOD*` : **un seul objet**, lié à **la même armature**, même pose de liaison, même atlas et même matériau, masque d'équipe peint (§ 8). Les LOD1 et LOD2 peuvent n'utiliser qu'une partie des os (sans doigts, sans visage).
- **Triangulé** à l'export, normales vers l'extérieur, pas de faces en double, ni de géométrie cachée sous les vêtements (supprimer la peau sous le gilet).
- **Ce que M5 fera (hors de ce contrat)** : choix du niveau selon la distance avec hystérésis, ombres portées en LOD0 et LOD1 seulement, expressions coupées en LOD1 et LOD2, accessoires cachés au loin. Les seuils (15 / 45 m) sont indicatifs et seront mesurés en M5. La stratégie « couleurs de sommets à grande distance » reste **provisoire** (D-016) : le LOD2 est livré texturé comme les autres.

## 6. Pondération (skinning)

- **4 influences au plus** par sommet (Weights > Limit Total, 4), **poids normalisés** (somme = 1), **aucun sommet sans poids**.
- Seuls les os requis et facultatifs déforment ; **jamais** les points d'attache.
- Zones à soigner (vérifiées à l'essai `--fit`, § 13) : **épaules et aisselles** (le bras monte jusqu'à l'horizontale en visée et au-dessus de la tête au lancer), coudes (jusqu'à ~110° de pliage), hanches et genoux (accroupi, course), cou et buste (visée vers le haut et vers le bas), poignets. Les bras suivent l'IK : **aucun os de torsion d'avant-bras** dans ce contrat ; la pondération du poignet doit supporter la rotation de la main imposée par la prise de l'arme.
- La **colonne** reçoit en M2 toute la rotation du buste sur `spine` (`spine1` et `chest` suivent rigidement) : pondérer le ventre et la poitrine de façon progressive entre `hips`, `spine`, `spine1` et `chest`. Le partage de la rotation sur les trois os est un réglage du jeu (`spineWeights`), ajustable sans réexport.

## 7. Matériau et textures

- **Un seul matériau, nommé `M_body`**, pour le corps et les accessoires (2 au plus toléré, avec avertissement). L'arme est un asset séparé.
- **Opaque** (pas de transparence : cheveux en volumes nets), **faces simples** (Backface Culling coché).
- **Atlas de couleur de base** : PNG ou JPEG, **sRGB**, carré de côté en puissance de deux : **256 à 2 048** (**1 024 × 1 024 recommandé**). Usure légère peinte, pas de saleté photoréaliste ([MASTER-ASSAULT](MASTER-ASSAULT.md), § 1).
- **Zones colorables** (chemise, teinte sombre d'équipe, peau, cheveux ; § 8) : peintes dans l'atlas en **gris neutre**. Le **gris de référence `#CCCCCC`** (204) rend **exactement** la couleur choisie par le jeu ; plus sombre (plis, ombres peintes, usure) l'assombrit, plus clair l'éclaircit, dans le même rapport. Aucune teinte dans ces zones : un gris coloré fausserait les deux équipes.
- **Zones neutres** (tout le reste : gilet noir, cuir, pantalon, bottes, gants, revers gris clair, métal, yeux, lèvres) : peintes dans leurs **couleurs finales**, identiques pour les deux équipes.
- Carte de rugosité ou de normales : **facultatives**, dans le même matériau et à la même taille ; le jeu les conserve telles quelles (non vérifié sur un vrai asset).
- Pas de texture propre à une équipe : bleu et rouge viennent du masque (§ 8).
- Au chargement, le jeu remplace `M_body` par son **matériau d'équipe** (`src/character/teamMaterial.js`, étape M3) construit sur les textures livrées : l'atlas, la rugosité et les normales de l'asset sont gardés, partagés entre tous les soldats ; seules les couleurs de teinte et l'emblème changent.

## 8. Masque d'équipe

Un seul modèle et une seule texture pour les deux équipes ([DECISIONS](../DECISIONS.md) D-016, D-019). Le masque est un **attribut de couleur** de chaque maillage du corps et des accessoires (`body_LOD0`, `body_LOD1`, `body_LOD2`, `acc_*`) : Blender, Color Attribute nommé **`teamMask`**, domaine **Face Corner** (coin de face, pour des bords nets), type **Byte Color**, exporté en `COLOR_0`. Il se peint avec **huit couleurs pures seulement** :

| Couleur à peindre (R G B) | Zone | Rendu en jeu | Où (images 01 et 02) |
| --- | --- | --- | --- |
| **noir** (0 0 0) | neutre | couleur de l'atlas | gilet noir, poches, cuir, ceinture, pantalon olive, genouillères, gants, bottes, **revers gris clair des manches**, métal, yeux, lèvres |
| **rouge** (1 0 0) | couleur d'équipe **principale** | gris × bleu `#2F5BB7` / rouge `#B2382C` | chemise, manches, col |
| **vert** (0 1 0) | **teinte sombre** d'équipe (secondaire) | gris × bleu nuit `#29344A` / brun-rouge `#4A2C27` | **panneau du dos** qui porte le grand emblème, casquette (image 02) |
| **bleu** (0 0 1) | emblème sur zone neutre | atlas + emblème blanc | (réservé, peu utile) |
| **magenta** (1 0 1) | emblème sur la chemise | principale + emblème blanc | emblèmes des **deux manches** ; emblème de poitrine s'il est sur la chemise |
| **cyan** (0 1 1) | emblème sur la teinte sombre | secondaire + emblème blanc | **grand emblème du dos** (panneau) |
| **jaune** (1 1 0) | **peau** | gris × teint choisi (6 teints du jeu) | visage, oreilles, cou, bras, doigts nus des gants |
| **blanc** (1 1 1) | **cheveux** | gris × couleur de cheveux choisie (6 couleurs) | cheveux, sourcils |
| — (canal A) | réservé | — | laisser à 1 |

- **Valeurs 0 ou 1 seulement** : pas de dégradé, pas de pinceau doux. Les valeurs pures ne sont pas modifiées par la conversion de couleurs de l'exportateur. Les valeurs intermédiaires sont signalées par le validateur (`MASQUE_NUANCES`) et arrondies par le jeu.
- **Teinte sombre d'équipe (vert)** : le gilet de l'image 01 est « très sombre » ; il peut rester **noir neutre** (même gilet pour les deux équipes) ou passer en vert pour prendre la teinte d'équipe. Le **panneau du dos** qui porte l'emblème doit être en vert ou cyan : sinon, la Légion porterait un panneau bleu nuit sous son étoile (image 03 : dos lu depuis la caméra).
- **Pantalon, revers des manches, gilet neutre** : identiques pour les deux équipes (le pantalon rouge actuel, gris-vert, deviendra olive comme l'image 01 ; à valider au test bleu / rouge, M5).
- Les **emblèmes ne sont pas peints** dans l'atlas : ce sont des décalques interchangeables générés par le jeu (aigle ailé pour Les Aigles, étoile pour La Légion, D-011, **blancs**). Une zone d'emblème est un **carré** (ou rectangle légèrement courbé) placé là où l'emblème doit apparaître, dont les sommets sont peints en magenta ou cyan ; sa **deuxième carte UV nommée `emblem`** (exportée en `TEXCOORD_1`) couvre tout le carré UV [0 ; 1], **à l'endroit** dans l'éditeur UV de Blender (haut de l'emblème en haut ; l'exportateur gère l'inversion de V). L'emblème occupe tout le carré : prévoir la zone un peu plus grande que l'emblème voulu. Autour de l'emblème, le carré garde la teinte de sa zone.
- Dans l'atlas, la zone d'emblème est peinte comme la zone qui la porte (gris de référence pour magenta et cyan).
- Première carte UV (`TEXCOORD_0`) : l'atlas de couleur. Sur les sommets hors emblème, la carte `emblem` est libre (tout à 0 convient).
- Le jeu **n'affiche jamais** `COLOR_0` comme couleur : au chargement, l'attribut est renommé en masque (le chargeur glTF de Three.js l'afficherait sinon, et rendrait la zone neutre noire).
- Contrôle visuel : `npm run check:glb -- fichier.glb --fit` écrit `…-essai-masque.png` (zones en couleurs pures, sans éclairage), `…-essai.png` (bleu) et `…-essai-rouge.png` (rouge, même fichier).

## 9. Expressions (shape keys → morph targets)

Sur `body_LOD0` uniquement, noms exacts, relatives à la pose de repos (valeur 1 = expression complète) ; pilotées par le code selon l'état :

| Nom | Usage en jeu |
| --- | --- |
| `blink` | clignement (les deux yeux) |
| `expr_determined` | visage par défaut en combat |
| `expr_confident` | menu, victoire |
| `expr_angry` | tir soutenu |
| `expr_surprised` | explosion proche |
| `expr_smile` | menu, fiche |
| `expr_focus` | visée |
| `expr_pain` | impact |
| `expr_ko` | mort |

Référence visuelle : image 02 (neutre, déterminé, confiant, énervé, surpris, souriant). Les expressions ne bougent que le visage (pas le cou ni les cheveux). Os `jaw`, `eye.*`, `brow.*` possibles en complément, jamais à la place de ces noms.

## 10. Contrat d'animation

**Le code garde la locomotion, la visée et les réactions** ([DECISIONS](../DECISIONS.md) D-007). Blender ne fournit que les clips ci-dessous.

| État | Source |
| --- | --- |
| repos, repos en combat, respiration | code |
| marche, course, sprint, déplacements directionnels, pivot | code |
| début de saut, en l'air, réception | code |
| accroupi (immobile, en marche) | code |
| visée (haut, bas), tir, recul | code |
| réactions aux impacts | code |
| mains sur l'arme (IK), orientation du coude | code, appliqué **après** les clips |
| choix de l'expression, clignement | code (morph targets du § 9) |

| Clip (nom exact de l'action) | Durée | Images à 30 i/s | Zone | Requis | Événements (fixés par le jeu) |
| --- | --- | --- | --- | --- | --- |
| `reload_rifle` | 1,8 s | 0 à 54 | haut du corps | oui | main gauche au chargeur ; chargeur **retiré de 30 % à 62 %** (images 16 à 33), suit `socket_hand.L` ; main droite reste sur la poignée |
| `throw_grenade` | 0,7 s | 0 à 21 | haut du corps | oui | bras **droit** : armé puis lancer ; **lâcher à 45 %** (image 9) ; main gauche reste sur le garde-main ; retour sur l'arme à partir de 80 % |
| `buff` | 0,45 s | 0 à 14 | haut du corps | oui | geste court (adrénaline et compétences de geste) ; ne doit pas lâcher l'arme |
| `heal` | 0,6 s | 0 à 18 | haut du corps | oui | trousse dans `socket_hand.R` ou geste vers la poitrine |
| `knife` | 0,55 s | 0 à 17 | haut du corps | non | coup de poignard du bras droit ; **touche à 30 %** (image 5) |
| `death_back` | 1,0 s | 0 à 30 | corps entier | oui | chute sur le dos ; **dernière image tenue au sol** |
| `death_front` | 1,0 s | 0 à 30 | corps entier | oui | chute en avant ; idem |
| `death_spin` | 1,0 s | 0 à 30 | corps entier | oui | chute en vrille ; idem |
| `sit_jeep` | pose | 1 image | corps entier | oui | assis au volant de la jeep, mains au volant |
| `hand_grip.R` | pose | 1 image | doigts | non | doigts serrés sur la poignée (si os de doigts) |
| `hand_grip.L` | pose | 1 image | doigts | non | doigts sur le garde-main (si os de doigts) |

Règles :
- Scène à **30 images/s** ; une action Blender par clip, au nom exact ; les clips hors contrat sont ignorés (avertissement).
- **Aucun déplacement de `root`** (le jeu déplace le personnage) ; animer `hips` pour les chutes. **Aucune clé d'échelle.**
- **Haut du corps** = `spine` et tout ce qui est au-dessus (colonne, cou, tête, clavicules, bras, mains, doigts) : les clés des jambes et du bassin y sont ignorées. **Corps entier** = tous les os sauf `root`. **Doigts** = os de doigts seulement.
- Les événements ne sont **pas** lus dans le fichier (les marqueurs de la timeline ne s'exportent pas en glTF) : ils sont fixés par le jeu, en pourcentage de la durée. Le jeu peut accélérer ou ralentir un clip pour l'accorder à la durée de gameplay d'une autre arme ; les pourcentages restent vrais.
- Animer avec l'**arme d'aperçu** au point `socket_weapon` (gabarit : squelette d'essai, § 2) : la main droite est recalée sur la poignée par l'IK du jeu ; un clip qui l'éloigne de l'arme sera corrigé, pas respecté. La main gauche est libre pendant le rechargement.
- Morts : la pose finale doit poser le corps au sol (semelles, dos ou ventre à y ≈ 0) ; le fusil est géré par le jeu.
- Mélange avec le code (M5, hors contrat) : clips du haut du corps mélangés par-dessus la locomotion (transitions de 0,1 à 0,25 s), puis IK des mains.

## 11. Arme (asset séparé, facultatif)

Aujourd'hui l'arme est construite par le code (`src/character/weapons.js`) et **reste la référence** (spécification, « Langage des armes »). Si le propriétaire demande un FL-4 modélisé :
- fichier `public/models/weapons/fl4.glb`, même repère (Y en haut), **canon vers +Z**, échelle 1 (le jeu applique ×1,12) ;
- origine = origine de l'arme du jeu ; objets vides aux points actuels, dans ce repère : `grip_R` (0 ; −0,075 ; −0,075), `grip_L` (0 ; −0,045 ; 0,24), `muzzle` (0 ; 0,022 ; 0,64) ; maillage séparé `magazine` (caché pendant le rechargement) dont l'origine est son point de prise (0 ; −0,15 ; 0,06) ;
- 1 matériau, ≤ 3 000 triangles en LOD0 ;
- **la bouche du canon du gameplay reste définie par le code** : `muzzle` sert seulement à placer l'éclair ; un écart de plus de 1 cm avec le point du code sera refusé à l'intégration.

## 12. Réglages d'export Blender (glTF 2.0)

Avant l'export :
1. Échelle d'unité 1,0 ; armature et maillages à l'origine, rotation 0, échelle 1 : **Ctrl+A > All Transforms** sur l'armature et chaque maillage.
2. Armature en **pose de repos** = pose de liaison A-pose ; modificateur Armature en dernier sur chaque maillage ; autres modificateurs appliqués ou appliqués à l'export.
3. Os `socket_*` : `Deform` décoché (ou objets vides parentés aux os).
4. Une action par clip, nommée exactement ; scène à 30 i/s.

**Recommandé : `tools/blender/fl_export.py`** applique tous ces réglages par script (Blender 4.5 LTS), contrôle la scène avant l'export et lance le validateur ([README](../../tools/blender/README.md)). Export à la main (File > Export > glTF 2.0) : libellés de Blender 4.x ; **ils varient selon la version : vérifier sur celle utilisée**, puis passer le validateur, qui fait foi.

| Réglage | Valeur |
| --- | --- |
| Format | **glTF Binary (.glb)** |
| Include | objets sélectionnés (armature, `body_LOD*`, `acc_*`, points d'attache) ; pas de caméra ni de lumière |
| Transform | **+Y Up** coché |
| Mesh | Apply Modifiers, UVs, Normals ; Tangents non ; **Vertex Color : Active** (l'attribut `teamMask` doit être l'attribut de couleur actif, domaine Face Corner, Byte Color) ; Loose Edges / Points non |
| Material | Export ; Images : Automatic (PNG ou JPEG) |
| Shape Keys | oui (normales des shape keys facultatives) |
| Compression | **non** (ni Draco, ni meshopt) |
| Armature | **Use Rest Position** ; **Export Deformation Bones Only** si les points d'attache sont des objets vides (sinon non, avec une armature de jeu sans os de contrôle) ; Flatten Bone Hierarchy **non** |
| Skinning | oui ; **Include All Bone Influences non** (4 influences) |
| Animation | mode Actions ; Always Sample Animations ; pas d'échantillonnage : 1 ; Optimize Animation Size ; Force keying des os non animés non nécessaire |

## 13. Validation (`npm run check:glb`)

```bash
npm run check:glb -- chemin/assault.glb                     # stade production (livrable complet)
npm run check:glb -- chemin/assault.glb --stade prototype   # squelette et LOD0 seulement (aperçu M4)
npm run check:glb -- chemin/assault.glb --fit               # + essai réel dans le jeu (navigateur local)
npm run check:glb -- chemin/assault.glb --json              # rapport machine (chaîne automatisée)
npm run check:glb -- --file chemin/assault.glb --state prototype --fit   # mêmes options, alias anglais
```

- Lit le fichier sans aucun service externe ; code de sortie **0 = accepté, 1 = refusé**. Chaque problème a un **code**, un message et **la correction à faire dans Blender**. Les avertissements (⚠) n'empêchent pas l'acceptation.
- Vérifie : version et extensions ; armature unique ; os requis, doublons, os de contrôle ou Rigify, os hors contrat ; hiérarchie ; **pose de repos = pose de liaison** ; racine, axe vertical, orientation, côtés ; A-pose et coudes ; positions et longueurs des articulations, symétrie ; points d'attache et leur parent ; noms des maillages ; triangulation ; influences, poids vides, normalisés, hors squelette, sur un point d'attache ; budgets de triangles par LOD ; unités, hauteur, origine, centrage ; masque d'équipe (présence, valeurs pures, canal A, zones principale, emblème, peau et cheveux, UV d'emblème ; nombre de sommets par zone) ; UV ; expressions ; nombre de matériaux, transparence, double face, texture de couleur ; format et taille des textures ; clips (présence, durée, hors contrat, déplacement de la racine, échelle) ; taille du fichier.
- **`--fit`** charge l'asset dans le jeu, le branche sur le squelette de gameplay par l'adaptateur et joue les **32 états** du banc de mesure (repos, visée, tir, course, accroupi, saut, réception, impacts, rechargement, lancer, soin, geste, poignard, jeep, 5 morts…). Erreurs : sommets invalides (`ESSAI_DEFORMATION`), mains à plus de 10 mm de l'arme dans une pose tenue (`ESSAI_MAINS`), squelette de gameplay modifié (`ESSAI_GAMEPLAY`) ; avertissement si la tête s'écarte de plus de 6 cm du centre de sa zone de touche debout (`ESSAI_TETE`). Captures de contrôle (à regarder) : `test-results/check-glb/<nom>-essai.png` (bleu), `<nom>-essai-rouge.png` (rouge, même fichier), `<nom>-essai-masque.png` (zones du masque).
- La validation automatique ne juge **pas** la qualité artistique : conformité aux images 01 et 02 et comparaison A/B restent faites par le propriétaire ([MASTER-ASSAULT](MASTER-ASSAULT.md), § 5).

## 14. Comment le jeu utilise l'asset

`src/character/rigAdapter.js` (M2) :
1. **Calibration** une fois, gameplay en pose de repos et squelette de production dans sa pose de liaison : pour chaque os suivi, un décalage de rotation. Pour les membres, la direction de repos du gameplay (bras et jambes vers le bas) est alignée sur celle de l'os de production (A-pose), quel que soit le *roll*.
2. **À chaque image** : recopie des rotations du squelette de gameplay (repère du personnage) ; colonne répartie sur `spine` / `spine1` / `chest` ; hauteur du bassin mise à l'échelle des jambes de production ; clavicules, orteils, doigts et points d'attache suivent leur parent.
3. **IK des mains** résolue sur les **vraies longueurs de bras** de l'asset vers les points de prise de l'arme, coude orienté comme celui du gameplay.

4. **Matériau d'équipe** (`src/character/teamMaterial.js`, M3) : masque renommé (jamais affiché), teintes et emblème par soldat, un matériau partagé par aspect (équipe, teint, cheveux), le même pour tous les LOD et accessoires.

Le squelette de gameplay n'est jamais modifié : hitboxes, support d'arme, bouche du canon, visée, bots et véhicules restent identiques. Conséquences pour l'artiste : des bras plus longs ou plus courts que la cible restent sur l'arme (l'IK s'adapte, dans la tolérance du § 3) ; des épaules trop larges ou trop hautes décalent le fusil par rapport au corps (l'arme ne bouge pas) ; une tête trop grande ou trop haute sort de sa zone de touche.

## 15. Ce qui n'est pas dans ce contrat
- Réglage des couleurs finales des équipes (harmonisation avec l'image 01, test bleu / rouge à 40 m) : avec l'asset réel (M5).
- Chargement, préchargement, clonage, sélection des LOD, ombres, visage, mélange des clips, remplacement du personnage procédural en jeu, hauteur en jeu : **M5** (d'abord un aperçu jouable minimal, D-020).
- Artilleur et Commando : même squelette, mêmes points d'attache, mêmes clips, après le GOLD du Master Assault.
- Compression, streaming, personnalisation au-delà des accessoires existants.

## 16. Outils Blender (`tools/blender/`, M4)
Scripts Python simples pour Blender 4.5 LTS, vérifiés sur de vrais exports ([README](../../tools/blender/README.md)) :
1. **`fl_template.py`** : gabarit (unités, 30 i/s, armature des 23 os aux noms exacts en A-pose, points d'attache en objets vides, repères de hauteur et de zones de touche, palette des 8 couleurs du masque), avec les proportions du personnage (`--props`).
2. **`fl_export.py`** : export verrouillé (§ 12) après contrôles dans Blender, puis `check:glb` automatique (`--fit` pour l'essai en jeu).
3. **`fl_review.py`** : vues face, 3/4, profil et dos à l'échelle de l'image 01 et superposition des silhouettes.
4. **`fl_selftest.py`** : auto-test de toute la chaîne.
Conversion Rigify / Auto-Rig Pro : non faite (inutile tant que l'armature vient du gabarit).
