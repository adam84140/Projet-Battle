# Master Assault — brief de production Blender (M4)

**Pour l'artiste 3D ou la chaîne Blender.** Document court pour démarrer ; la référence complète et exacte est le [contrat d'asset](ASSET-CONTRACT.md) (en cas de doute, le contrat et le validateur font foi). **M4 n'est pas commencée** : elle démarre sur autorisation du propriétaire du projet ([DECISIONS](../DECISIONS.md) D-014).

## 1. Ce qu'on produit, et dans quel ordre
1. **D'abord l'asset d'aperçu** (« preview ») : le Master Assault complet en **un seul niveau de détail**, riggé, avec son masque d'équipe et des couleurs simples. Son seul but : **l'essayer en jeu au plus tôt** (aperçu jouable M5, [D-020](../DECISIONS.md)) pour juger silhouette, proportions, échelle, mains sur l'arme, lisibilité à l'écran et sensation en caméra de jeu.
2. **Ensuite l'asset complet** (après les retours sur l'aperçu) : texture peinte finale, LOD1 et LOD2, expressions, clips, accessoires. Il sera validé GOLD à M7.

## 2. Le personnage (image 01 = autorité, image 02 = détails)
[Image 01](../_attachments/ref-01-master-assault-turnaround.webp) · [image 02](../_attachments/ref-02-master-assault-production-sheet.webp) · lecture détaillée et palette relevée : [VISUAL-REFERENCES](../product/VISUAL-REFERENCES.md) · spécification artistique : [MASTER-ASSAULT](MASTER-ASSAULT.md), § 1.
- **1,85 m** au sommet des cheveux, ≈ 6,5 têtes, athlétique, torse en V, avant-bras et mains forts, bottes massives. Cartoon héroïque stylisé.
- Tête nue ; cheveux brun foncé, côtés courts, dessus relevé vers l'arrière, mèche avant ; mâchoire carrée, sourcils épais, yeux bruns, léger sourire.
- Chemise **d'équipe** (bleue sur la planche) à col ouvert, tee-shirt sombre, manches retroussées à **revers gris clair**.
- Gilet porte-chargeurs **très sombre**, ouvert devant, poches à rabat ; **harnais de cuir brun** (en Y dans le dos) ; **panneau du dos** qui porte le **grand emblème**.
- Ceinture de cuir à boucle et poches brunes tout autour ; pantalon cargo **olive** rentré dans les bottes, sangles aux cuisses ; **étui noir sur la cuisse droite**, poche noire sur la cuisse gauche ; genouillères noires ; gants noirs mi-doigts ; bottes de cuir brun lacées.
- Emblèmes (blancs) : **poitrine, les deux manches, grand emblème du dos**. Ils ne sont **pas peints** : ce sont des zones carrées où le jeu pose l'aigle (Aigles) ou l'étoile (Légion).
- **Pas de sac à dos, pas de coiffe, pas d'arme** sur le modèle (le fusil reste celui du jeu).
- Matériaux stylisés, couleurs franches, **usure légère peinte** ; pas de photoréalisme ni de saleté réaliste.

## 3. Obligatoire pour l'asset d'aperçu
| Domaine | Exigence (détail dans le contrat) |
| --- | --- |
| Fichier | un `.glb` glTF 2.0, sans compression ([§ 1](ASSET-CONTRACT.md), [§ 12](ASSET-CONTRACT.md)) |
| Échelle et pose | mètres, face −Y dans Blender, **1,85 m ± 4 cm**, pieds sur l'origine, **A-pose** (bras à ≈ 45°, coudes droits), transformations appliquées ([§ 2](ASSET-CONTRACT.md)) |
| Maillage | un objet `body_LOD0`, **12 000 à 18 000 triangles**, corps et équipement de base ensemble, triangulé ([§ 5](ASSET-CONTRACT.md)) |
| Squelette | **23 os aux noms exacts** (`root`, `hips`, `spine`, `spine1`, `chest`, `neck`, `head`, `clavicle.L`, `upperArm.L`, `lowerArm.L`, `hand.L`, `thigh.L`, `calf.L`, `foot.L`, `toe.L` et les `.R`), **positions dans les tolérances** du tableau du [§ 3](ASSET-CONTRACT.md) (elles garantissent mains sur l'arme et tête dans sa zone de touche) ; pas d'os de contrôle exporté |
| Points d'attache | 8 objets vides parentés aux os : `socket_hand.R`, `socket_hand.L`, `socket_back`, `socket_head`, `socket_face`, `socket_hip.L`, `socket_hip.R`, `socket_grenade` ([§ 4](ASSET-CONTRACT.md)) |
| Pondération | 4 influences au plus, normalisées, aucun sommet oublié ; épaules, coudes, hanches, genoux et cou propres ([§ 6](ASSET-CONTRACT.md)) |
| Matériau | un matériau `M_body`, atlas 1 024² sRGB ; **couleurs simples acceptées** pour l'aperçu ; zones colorables au **gris `#CCCCCC`** ([§ 7](ASSET-CONTRACT.md)) |
| Masque d'équipe | attribut de couleur `teamMask` (Face Corner, Byte Color), **8 couleurs pures** : chemise **rouge**, panneau du dos **vert** (ou **cyan** sous l'emblème), emblèmes de manche **magenta**, peau **jaune**, cheveux et sourcils **blanc**, le reste **noir** ([§ 8](ASSET-CONTRACT.md)) |
| Emblèmes | 4 zones carrées (poitrine, deux manches, dos) avec une 2ᵉ carte UV `emblem` couvrant [0 ; 1], à l'endroit ([§ 8](ASSET-CONTRACT.md)) |
| Contrôle | `npm run check:glb -- assaut.glb --stade prototype --fit` : **0 erreur**, captures bleu / rouge / masque regardées ([§ 13](ASSET-CONTRACT.md)) |

## 4. Peut attendre (après l'aperçu, avant le GOLD)
- `body_LOD1` (3 000 à 6 000 triangles) et `body_LOD2` (800 à 2 000).
- Les **9 expressions** (shape keys `blink`, `expr_*`) ; os de doigts et de visage.
- Les **clips** : `reload_rifle`, `throw_grenade`, `buff`, `heal`, `knife`, `death_back`, `death_front`, `death_spin`, `sit_jeep`, `hand_grip.R/L` ([§ 10](ASSET-CONTRACT.md)). Sans clips, l'aperçu utilise l'animation du jeu actuelle (toutes les actions restent jouables).
- Texture peinte finale (tissus, cuir, usure), cartes de rugosité ou de normales.
- Accessoires `acc_*` (sac, casquette, lunettes, gourde, sacoches, grenades, bandana) ; fusil modélisé (facultatif, § 11).
- Objectif de taille < 1,5 Mo (l'aperçu peut le dépasser).

## 5. Ce que l'aperçu jouable montrera (M5 minimal, sur autorisation)
- Le joueur (et, si possible, les bots) porte l'asset en **partie réelle**, caméra à la 3ᵉ personne et en visée, bleu et rouge depuis le même fichier ; l'arme, les hitboxes, les animations et le gameplay restent ceux du jeu (adaptateur de squelette) ; retour au personnage actuel par un simple réglage.
- Le propriétaire juge : **silhouette, proportions, échelle, mains / arme, lisibilité à l'écran, sensation en jeu**.
- Ne sont **pas** jugés à ce stade : clips, expressions, LOD, performance finale, texture finale.

## 6. Avant d'envoyer un fichier
1. Transformations appliquées, armature en pose de repos (A-pose), échelle 1.
2. `teamMask` actif, peint avec les 8 couleurs pures seulement ; carte UV `emblem` présente.
3. Export glTF Binary avec les réglages du [§ 12](ASSET-CONTRACT.md) (libellés à vérifier selon la version de Blender).
4. `npm run check:glb -- fichier.glb --stade prototype --fit` : 0 erreur ; regarder `test-results/check-glb/<nom>-essai.png`, `-essai-rouge.png`, `-essai-masque.png`.

## 7. Aides disponibles
- **Gabarit de proportions** : `npm run test:rig` écrit `test-results/rig/fixture-assaut.glb`, squelette d'essai conforme (1,85 m, A-pose, os, points d'attache, masque, zones d'emblème) généré depuis le personnage actuel. **Donnée de test, pas de l'art** : à importer comme repère d'échelle et de placement des os, jamais comme base de modèle.
- **Validateur** : messages en français avec la correction à faire dans Blender.
- **Scripts Blender proposés** (gabarit d'armature, export verrouillé, conversion Rigify) : non faits, sur autorisation ([§ 16](ASSET-CONTRACT.md)).

## 8. Ordre de travail conseillé
Ébauche à l'échelle sur le gabarit → armature aux noms et positions du contrat → pondération → masque d'équipe et carte `emblem` → couleurs simples dans l'atlas → export → validateur `--fit` → **aperçu jouable** → retours → texture finale, LOD, expressions, clips, accessoires → validateur au stade production → GOLD (M7).
