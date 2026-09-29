# Master Assault — étape M3 : matériau d'équipe et contrat de rendu

**Statut : implémentée et validée par les tests, en attente d'acceptation par le propriétaire.** M4 (production Blender) et M5 (intégration) ne sont pas autorisées. M3 prépare le jeu à **recevoir** l'asset de production : le personnage procédural actuel, son apparence, le gameplay, les hitboxes et les chemins de rendu (M1 par défaut, legacy en repli) sont **inchangés** ; le nouveau matériau n'est branché sur aucun soldat en jeu. Contrat pour l'artiste : [ASSET-CONTRACT](ASSET-CONTRACT.md), § 7 et 8 ; brief de production : [M4-BLENDER-BRIEF](M4-BLENDER-BRIEF.md). Étapes précédentes : [M1](MASTER-ASSAULT-M1.md), [M2](MASTER-ASSAULT-M2.md).

## 1. Architecture
```
asset .glb (Blender)                          jeu (src/character/teamMaterial.js)
─────────────────────                         ──────────────────────────────────────────────
M_body : atlas (gris #CCCCCC dans les zones    matériau d'équipe = clone de M_body (textures partagées)
         colorables), rugosité / normales         + injection de shader (onBeforeCompile) :
COLOR_0 : masque, 8 couleurs pures      ──►       zone = décodage du masque (même règle que decodeMask)
          (renommé « teamMask » au chargement)    couleur = atlas / gris de référence × teinte de la zone
TEXCOORD_1 : UV d'emblème (« emblemUv »)          emblème = texture aigle / étoile générée (emblems.js)
                                                  posée par les UV d'emblème, blanche
                                              un matériau par (source, équipe, teint, cheveux), partagé ;
                                              un seul programme de shader pour tous
```

| Fichier | Rôle |
| --- | --- |
| `src/character/rigContract.js` | contrat `M3-0.2` : `TEAM_MASK` (8 codes, gris de référence 204, canal A réservé) et `decodeMask()` |
| `src/character/teamMaterial.js` (nouveau) | `prepareMaskGeometry`, `emblemTexture`, `teamLook`, `createTeamMaterial` (variantes visualisation du masque et transparente), `TeamMaterialCache`, `applyTeamLook`, `sourceMaterial`, `teamUniforms` ; **non branché en jeu** (M5) |
| `tests/check-glb.mjs` | décode les 8 codes : sommets par zone, `MASQUE_NUANCES`, `MASQUE_ALPHA`, `MASQUE_PEAU`, `MASQUE_CHEVEUX` ; `--fit` écrit aussi la capture rouge et la capture du masque |
| `tests/rig-probe.js` | squelette d'essai exporté selon le contrat M3 (un seul fichier pour les deux équipes, zones d'emblème carrées avec UV d'emblème) ; chargé avec le matériau d'équipe |
| `tests/material-probe.js`, `tests/material.html`, `tests/material.mjs` (nouveaux) | `npm run test:material`, ajouté à `npm test` |

### Choix de conception
- **Huit couleurs pures, pas de canal alpha.** Chaque combinaison de R, G, B à 0 ou 1 est une zone : R et G seuls = couleurs d'équipe, R + G = peau (B = 0) ou cheveux (B = 1), B sans R + G = zone d'emblème posée sur la zone indiquée par R ou G. Les valeurs 0 et 1 ne sont pas altérées par la conversion sRGB / linéaire de l'exportateur Blender (une valeur intermédiaire le serait), et le canal alpha, mal visible dans Blender et pas toujours exporté, reste libre.
- **Gris de référence.** Les zones colorables sont peintes en gris ; `#CCCCCC` rend exactement la teinte (calcul en linéaire : texel / gris × teinte). Les plis et l'usure peints en gris plus sombre ou plus clair suivent la teinte.
- **Couleur secondaire = teinte sombre d'équipe** (`TEAMS.vest` : bleu nuit / brun-rouge), portée par le panneau du dos qui reçoit l'emblème (image 01 : panneau bleu nuit ; image 03 : dos vu par la caméra). Les revers gris clair des manches deviennent neutres (image 01). C'est un changement par rapport à la proposition M2 (« G = revers, bandes ») : décision D-019.
- **Emblèmes en décalque** : texture 256² générée depuis `emblems.js` (aucun fichier), une par emblème, partagée ; la zone d'emblème du modèle est un carré ; l'emblème canonique de l'équipe (D-011) y est posé, à l'endroit (convention glTF, v = 0 en haut).
- **COLOR_0 renommé**, jamais désactivé seulement : même si un matériau réactive les couleurs de sommets, le masque ne peut plus s'afficher. Masque ou UV d'emblème absents (stade prototype, LOD simplifié) : attributs neutres explicites (sinon WebGL garderait une valeur par défaut d'un autre objet).
- **Un matériau par aspect**, pas un par soldat : même programme de shader (`customProgramCacheKey`), mêmes textures ; seuls les uniformes diffèrent. Un soldat = toujours un appel de rendu pour le corps.
- **Visualisation du masque** : couleurs pures, sans éclairage (captures de contrôle, tests au pixel près).
- **Variante transparente** pour le camouflage du Commando : même shader, `transparent`, sans écriture de profondeur, une par soldat (comme aujourd'hui). **Un clone reste un matériau d'équipe** (`clone()` redéfini) : le camouflage actuel du jeu (`Character.setOpacity`, qui clone le matériau de chaque maillage) garde donc les teintes sans modification du code du jeu. Trouvé par l'essai en partie : un `Material.clone()` ordinaire perdait le shader (zones d'équipe grises pendant le camouflage).
- Uniformes et matériau source hors de `userData` (un `Material.clone()` recopie `userData` en JSON).

## 2. Résultats (conteneur Cloud, 2026-09-29)

### Zones, au niveau près (banc orthographique, comparaison avec un matériau standard de la couleur attendue)
| Cas | Bleu | Rouge | Rouge, teint et cheveux choisis |
| --- | --- | --- | --- |
| neutre, principale, secondaire, peau, cheveux | 0 niveau d'écart | 0 | 0 |
| emblème dedans (blanc) / dehors (couleur de la zone), 3 zones d'emblème | 0 | 0 | 0 |
| principale sur gris sombre (102) : teinte assombrie dans le rapport attendu | 0 | 0 | 0 |

### Contrat de rendu
| Vérification | Résultat |
| --- | --- |
| COLOR_0 chargé tel quel par `GLTFLoader` | affiché comme couleur (zone neutre rendue noire : 12, 12, 12) : **danger reproduit** |
| Même fichier avec le matériau d'équipe | couleur de l'atlas (161, 161, 161 = atlas), attribut `color` supprimé, `vertexColors` désactivé |
| Asset sans masque ni UV d'emblème | zone neutre explicite (0, 0, 0, 1), couleur de l'atlas |
| Emblème, même zone carrée | Aigles : aigle (IoU 0,96 ; retourné 0,35 ; étoile 0,41) · Légion : étoile (IoU 0,98 ; retournée 0,42 ; aigle 0,42) |
| LOD0, LOD1, LOD2 (sans masque), accessoire | **un seul matériau** ; LOD2 préparé en zone neutre ; accessoire en teinte sombre |
| Variante transparente, et clone fait par le camouflage actuel du jeu | teinte gardée, transparente, même source ; le clone rend exactement comme la variante |

### Asset synthétique complet (GLB exporté puis rechargé, 1 fichier)
| Mesure | Résultat |
| --- | --- |
| Validateur, stade prototype | 0 erreur ; masque : chemise 1 346, teinte sombre 718, peau 2 843, cheveux 1 808, emblème / principale 4, emblème / secondaire 8 sommets ; aucune valeur intermédiaire |
| Bleu comparé au personnage actuel (M1), mêmes proportions | **0,40 %** de pixels différents (0,10 % au-delà de 32 niveaux) : uniquement les zones d'emblème carrées, qui recouvrent les sangles du harnais sur ce squelette d'essai |
| Bleu → rouge, même fichier | 4,5 % des pixels changent ; **0,09 %** de ces pixels hors des zones d'équipe (bords anticrénelés de 1 à 2 pixels) |
| Teint et cheveux changés | 3,8 % des pixels changent ; **0,08 %** hors des zones peau et cheveux (bords) |
| 16 soldats, bleus et rouges, teints et cheveux variés | géométrie et atlas partagés, 2 textures d'emblème, **un matériau par aspect** (2 aspects par défaut, 8 au total), **1 programme de shader**, aucun nouveau programme en ajoutant des aspects |
| En partie 8v8, 20 s, chaque soldat habillé de l'asset (test seulement) | 16 à 17 soldats selon l'exécution, 13 à 14 aspects = autant de matériaux partagés, bonne couleur d'équipe pour tous, **camouflage forcé sur le joueur pendant 4 s (120 images) : teintes gardées**, 0 exception, 0 erreur console |

Captures regardées : `test-results/material/` (`bleu-m1.png` / `bleu-m3.png` / différences, `zones-*.png`, `partie.png` : le joueur en jeu, vu de dos, chemise bleue, panneau bleu nuit, aigle blanc) et `test-results/rig/lineup-proportions-{blue,red}.png`, `lineup-proportions-masque.png`.

## 3. Régression
| Vérification | Résultat |
| --- | --- |
| `npm run build` | OK |
| `npm test` | smoke 48/48 · tactile 12/12 · caméra 6/6 · bots 8/8 · personnage 72/72 · squelette 30/30 · **matériau 18/18** · 0 erreur console |
| Code du jeu touché | `rigContract.js` (contrat, données) ; `teamMaterial.js` nouveau, non branché. Aucun fichier du jeu livré ne l'importe |

`test:rig` passe de 31 à 30 vérifications : les deux GLB par équipe de M2 deviennent un seul fichier pour les deux équipes, avec une vérification du masque.

## 4. Risques découverts
1. **Pantalon et revers identiques pour les deux équipes** : aujourd'hui, la Légion a un pantalon gris-vert et des revers beiges. Avec une seule texture, ils deviennent ceux de l'image 01 (olive, gris clair). À valider par le propriétaire au test bleu / rouge (aperçu M5) ; sinon, une teinte de pantalon demanderait d'étendre le masque (canal A réservé).
2. **Couleur des yeux** : aujourd'hui tirée au hasard pour les bots ; peinte dans l'atlas sur l'asset (invisible à distance de jeu).
3. **Peinture du masque** : les zones d'emblème doivent être des carrés à UV propres ; une zone mal dépliée donne un emblème déformé ou coupé (visible sur la capture `-essai.png`).
4. **Anticrénelage des bords de zones** : le masque par sommet donne des bords nets au pixel ; peint par coin de face (Face Corner), la limite suit exactement les arêtes du maillage : les zones doivent suivre la topologie (bord de manche, col).
5. **Camouflage** : le code actuel (`Character.setOpacity`) parcourt aussi les maillages de l'asset attaché ; il fonctionne grâce au clone d'équipe, mais M5 devra décider si le camouflage garde ce mécanisme (un clone par maillage et par soldat) ou utilise `createTeamMaterial(…, { ghost: true })`.
6. **Coût GPU** du shader (un échantillonnage de texture et quelques opérations de plus par pixel) : **non mesuré** (conteneur sans GPU), attendu négligeable.

## 5. Non vérifié
- Aucun vrai fichier Blender : l'asset d'essai est produit par Three.js.
- Cartes de rugosité et de normales d'un vrai asset (le jeu les garde, sans test visuel).
- Rendu sur un vrai GPU et un vrai téléphone.
