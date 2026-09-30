# Master Character — Assaut

**Statut : spécification ; l'asset n'existe pas encore. Production artistique en pause ([D-023](../DECISIONS.md)) : l'ébauche scriptée du point A de M4 n'est pas approuvée ; reprise avec un asset externe.** Plan de migration : [MASTER-ASSAULT-AUDIT](MASTER-ASSAULT-AUDIT.md) (M0 à M3 faites ; ensuite asset d'aperçu M4 puis **aperçu jouable M5a**, D-020). Brief de production Blender : [M4-BLENDER-BRIEF](M4-BLENDER-BRIEF.md). **Remise à l'artiste (contrat technique de l'asset) : [ASSET-CONTRACT](ASSET-CONTRACT.md)** ; en cas d'écart entre ce document et le contrat sur un point technique, le contrat fait foi. Le personnage en jeu est encore le personnage procédural décrit dans [CURRENT-STATE](../CURRENT-STATE.md) et [ANIMATION](../systems/ANIMATION.md).

Le Master Assault est le **personnage de référence de production** ([DECISIONS](../DECISIONS.md) D-002). Il fixe l'architecture que réutiliseront Artilleur, Commando, les skins et la personnalisation. Chemin de production : [CHARACTER-PIPELINE](CHARACTER-PIPELINE.md).

---

## 1. Art

### Références officielles
- **Autorité primaire : [image 01](../_attachments/ref-01-master-assault-turnaround.webp)** (vues tournantes) pour les proportions, la silhouette, le visage, la coiffure, les vêtements, l'équipement, les gants, les genouillères, les bottes, le placement des emblèmes, les matériaux et la palette.
- **Secondaire : [image 02](../_attachments/ref-02-master-assault-production-sheet.webp)** (planche de production) pour les expressions, les accessoires, les poses et l'échelle.
- Lecture détaillée, palette relevée et écarts avec le jeu actuel : [VISUAL-REFERENCES](../product/VISUAL-REFERENCES.md). Décision : [DECISIONS](../DECISIONS.md) D-009.

### Rôle
Le héros de la jaquette : l'Assaut bleu à l'aigle ailé des images 01 à 03. Il doit être reconnaissable en vignette, lisible en combat et assez sympathique pour porter l'identité du jeu.

### Proportions (unités en mètres)
- **Hauteur totale 1,85 m** au sommet des cheveux (image 01), environ 8 têtes (tête cheveux compris ≈ 0,23 m, mesure du point A de M4). Le personnage actuel mesure **1,94 m** au sommet des cheveux en jeu (capsule physique 1,80 m ; sphère de tête centrée à 1,724 m, rayon 0,17 m) : la cible est donc **plus petite** de 9 cm. Les hitboxes ne changent pas (partie technique) ; la sphère de tête (1,55 à 1,89 m) couvre la tête d'un personnage de 1,85 m, à vérifier au prototype ([audit](MASTER-ASSAULT-AUDIT.md)).
- Épaules larges (≈ 0,55 m d'un deltoïde à l'autre), taille fine, bassin étroit : torse en V.
- Avant-bras épais et lisibles, mains fortes, gantées.
- Jambes solides, bottes massives à semelle épaisse.
- Posture droite, menton volontaire.

### Silhouette
- Lisible en ombre pleine, **tête nue** (coiffure relevée), gilet ouvert à harnais, ceinture chargée de poches, étui sur la cuisse droite, genouillères, bottes massives, fusil compact.
- **Pas de sac à dos sur le modèle par défaut** ([DECISIONS](../DECISIONS.md) D-010) : l'emblème du dos doit rester bien visible. Le sac est un **accessoire de personnalisation optionnel** (image 02) ; son support (`socket_back`, option `backpack`) est conservé.
- Différente de l'Artilleur (plus massif, casque, épaulières) et du Commando (plus fin, bonnet, écharpe) : à revérifier au test de silhouette puisque le sac ne porte plus la différence.

### Visage et cheveux
- Visage stylisé à grands traits : mâchoire carrée, menton marqué, sourcils épais et sombres, yeux bruns lisibles, léger sourire assuré.
- Cheveux brun foncé en quelques volumes nets : côtés courts dégradés, dessus relevé vers l'arrière, mèche avant marquée ; sans fils ni transparence.
- Expressions de référence (image 02) : neutre, déterminé, confiant, énervé, surpris, souriant. Expressions nécessaires au jeu : concentré (visée), douleur (impact), K.-O. (mort).

### Lisibilité d'équipe
- Chemise aux couleurs d'équipe, dominante sur le haut du corps (manches retroussées à revers gris clair).
- Emblème blanc, **identité canonique** (Aigles : emblème ailé ; Légion : étoile ; [DECISIONS](../DECISIONS.md) D-011) : **poitrine**, **les deux manches**, **grand emblème du dos** sur le panneau du harnais, visible de la caméra à la 3ᵉ personne (image 03).
- Couleurs actuelles du jeu : bleu `#2F5BB7` / rouge `#B2382C` ; gilet `#29344A` / `#4A2C27` ; pantalon olive / gris-vert (voir [ART-DIRECTION](../product/ART-DIRECTION.md)). Palette relevée sur l'image 01 (bleu plus sombre `#32548F`, olive `#787752`, cuir `#493427`…) : [VISUAL-REFERENCES](../product/VISUAL-REFERENCES.md). L'harmonisation se fait avec l'asset et se valide par le test bleu/rouge à 40 m. Sur l'asset de production, **pantalon, revers et gilet neutre sont communs aux deux équipes** (une seule texture) ; seules la chemise, la teinte sombre d'équipe (panneau du dos) et les emblèmes changent (D-019).

### Équipement (modèle de base, image 01)
Chemise à col ouvert sur tee-shirt sombre ; gilet porte-chargeurs très sombre ouvert devant, poches à rabat sur la poitrine ; harnais de cuir brun (en Y dans le dos) ; ceinture de cuir brun à boucle métallique et poches brunes tout autour ; pantalon cargo olive rentré dans les bottes, sangles sur les deux cuisses ; étui de pistolet noir sur la cuisse droite, poche noire sur la cuisse gauche ; genouillères noires ; gants noirs mi-doigts ; bottes de cuir brun lacées à crochets. Pas d'accessoire qui masque le visage par défaut.

**Accessoires optionnels** (image 02, via sockets) : sac à dos olive à emblème, 2 grenades, gourde, casquette, sacoches, lunettes de soleil, bandana.

### Langage des armes
Fusil d'assaut FL-4 : compact, épais, crosse et garde-main tan `#8B7A57`, viseur à point rouge, chargeur courbe bien visible (il se retire au rechargement). Échelle ×1,12 (cartoon). Les images ne montrent pas l'arme en détail : la forme actuelle reste la référence.

### Matériaux et textures
- Rendu stylisé comme l'image 01 : couleurs franches, léger dégradé peint, toile, cuir, caoutchouc et métal distincts, **usure légère peinte** (poussière du pantalon, éraflures des bottes et du cuir). **Pas de PBR photoréaliste, pas de saleté réaliste ni de bruit.**
- Un **atlas partagé** de textures (couleur de base, et au besoin un canal de rugosité) pour tout le personnage, avec des zones peintes à la main pour le visage et les détails.
- Couleurs d'équipe par **masque**, pas par duplication de textures (voir la partie technique).

---

## 2. Technique

### Maillage
- **Un seul `SkinnedMesh` pour le corps** (tête comprise), plus des objets rigides attachés aux sockets : arme, sac, casque ou bonnet, accessoires amovibles.
- L'équipement du modèle de base (gilet, harnais, ceinture et poches, étui, genouillères, gants, bottes) fait **partie du maillage du corps**, pas des objets séparés : il ne coûte aucun appel de rendu.
- Objectif : **≤ 4 appels de rendu par soldat** en LOD0 (corps, arme, sac, accessoire), contre 24 maillages aujourd'hui.

### Budgets de géométrie
| LOD | Distance | Triangles corps | Triangles arme | Os animés |
| --- | --- | --- | --- | --- |
| LOD0 | < 15 m (et menu, fiche) | 12 000 à 18 000 | ≤ 3 000 | squelette complet |
| LOD1 | 15 à 45 m | 3 000 à 6 000 | ≤ 1 000 | sans doigts ni visage |
| LOD2 | > 45 m | 800 à 2 000 | ≤ 300 | squelette de base |

Référence actuelle : ~15 000 à 17 000 triangles par soldat procédural.

### Matériaux
- **1 matériau pour le corps et les accessoires** (`M_body`), 1 pour l'arme ; au plus 3 matériaux par soldat.
- Matériaux et textures **partagés entre tous les soldats** : un matériau d'équipe par aspect (équipe, teint, cheveux), même programme de shader, même atlas (`src/character/teamMaterial.js`, M3).

### Couleurs d'équipe (masque)
- Un attribut de couleur de sommet (`COLOR_0`) peint avec **8 couleurs pures** indique les zones : chemise (couleur principale), teinte sombre d'équipe (panneau du dos), zones d'emblème, peau, cheveux, neutre ([ASSET-CONTRACT](ASSET-CONTRACT.md), § 8 ; D-019).
- Le matériau d'équipe (M3, fait) teinte ces zones, peintes en gris dans l'atlas : **un seul modèle et une seule texture** pour bleu et rouge, teint et cheveux de la personnalisation.
- Les emblèmes (aigle / étoile) sont des décalques interchangeables générés par le jeu, posés sur des zones carrées par une 2ᵉ carte UV.

### Squelette de production (contrat M2, non gelé : D-003, D-018)
Deux squelettes coexistent ([MASTER-ASSAULT-M2](MASTER-ASSAULT-M2.md)) :
- le **squelette de gameplay** : les 16 articulations actuelles (`hips`, `spine`, `neck`, `head`, `shoulderX`, `elbowX`, `handX`, `legX`, `kneeX`, `ankleX`), animées par l'`Animator` ; il porte hitboxes, support d'arme, bouche du canon et IK, et **ne change pas** ;
- le **squelette de production** de l'asset Blender, qui le suit par l'adaptateur (`src/character/rigAdapter.js`). Noms canoniques de type Blender, suffixe `.L` / `.R` (devenus `L` / `R` au chargement) :

| Groupe | Os requis (23) | Facultatifs |
| --- | --- | --- |
| Base | `root` (au sol, jamais animé), `hips` | |
| Colonne | `spine`, `spine1`, `chest`, `neck`, `head` | |
| Bras (×2) | `clavicle.L`, `upperArm.L`, `lowerArm.L`, `hand.L` | `thumb1-3.L`, `index1-3.L`, `fingers1-3.L` (majeur, annulaire et auriculaire regroupés) |
| Jambes (×2) | `thigh.L`, `calf.L`, `foot.L`, `toe.L` | |
| Visage | | `jaw`, `eye.L/R`, `brow.L/R` (en plus des 9 expressions) |

Positions de repos, tolérances, règles de nommage, A-pose et export : [ASSET-CONTRACT](ASSET-CONTRACT.md) (source machine : `src/character/rigContract.js`). Personnage face à +Z, gauche = +X, Y vers le haut, 1 unité = 1 m, pose de liaison en A-pose. **Ne jamais renommer un os après le gel.**

### Points d'attache (sockets)
| Point d'attache | Parent | Usage |
| --- | --- | --- |
| `socket_hand.R` / `socket_hand.L` | `hand.R` / `hand.L` | objets tenus (grenade, poignard, trousse ; chargeur au rechargement) |
| `socket_back` | `chest` | sac à dos (accessoire facultatif), arme en bandoulière |
| `socket_head` | `head` | casquette, casque, bonnet |
| `socket_face` | `head` | lunettes |
| `socket_hip.L` / `socket_hip.R` | `hips` | gourde, sacoches |
| `socket_grenade` | `hips` | grenades de ceinture |
| `socket_weapon` (facultatif) | `chest` | aperçu Blender seulement : **en jeu, l'arme reste sur le support animé par le code** (`weaponMount`) |

Les emblèmes ne sont pas des points d'attache : ce sont des zones du masque d'équipe avec leur propre carte UV. Chaque arme garde ses points de prise (`rightWrist`, `leftWrist`, `magWrist`) et sa bouche (`muzzle`) dans son propre repère (`src/character/weapons.js`) ; un futur asset d'arme les reprend (`grip_R`, `grip_L`, `magazine`, `muzzle` ; [ASSET-CONTRACT](ASSET-CONTRACT.md), § 11), la bouche du canon du gameplay restant définie par le code.

### IK
- **Mains (obligatoire)** : IK analytique à deux segments de l'épaule au poignet vers les points de prise de l'arme (même algorithme que le gameplay), avec coude orienté par le coude du gameplay ; sur le squelette de production, résolue avec **ses** longueurs de bras (adaptateur M2).
- **Pieds (optionnel)** : ajustement au relief par deux lancers de rayon et IK de jambe, seulement en LOD0 et à l'arrêt ou en marche lente.

### Animation du visage
9 morph targets aux noms fixés par le contrat (`blink`, `expr_determined`, `expr_confident`, `expr_angry`, `expr_surprised`, `expr_smile`, `expr_focus`, `expr_pain`, `expr_ko`), os du visage en complément facultatif, pilotés par le code selon l'état (visée, douleur, K.-O.). Désactivée en LOD1 et LOD2.

### LOD
Trois niveaux (voir le tableau des budgets). Changement de niveau avec hystérésis pour éviter le clignotement ; ombres portées seulement jusqu'au LOD1.

### Hitboxes
Inchangées côté gameplay : sphère de tête et capsule verticale de corps (`Soldier.hitVolumes`). La position de la tête vient de l'os `head` plus un décalage (comme `headOffset` aujourd'hui). Le nouveau modèle **ne doit pas changer** la taille des hitboxes (équité avec Artilleur et Commando).

### Ombres
Le corps projette une ombre en LOD0 et LOD1 ; pas d'accessoires fins dans l'ombre ; pas d'ombre en LOD2.

---

## 3. Animation

**Par défaut, la locomotion et la visée restent pilotées par le code** ([DECISIONS](../DECISIONS.md) D-007). Des clips produits dans un outil 3D ne sont utilisés que là où le code ne suffit pas.

| État | Source | Notes |
| --- | --- | --- |
| Repos, repos combat | code (respiration additive) | + clip de repos facultatif |
| Marche, course, sprint | code | foulée accordée à la vitesse (déjà en place) |
| Déplacements directionnels (arrière, pas chassés) | code | rotation des hanches, contre-rotation du buste |
| Pivot sur place | code | petits pas |
| Accroupi (immobile et en déplacement) | code | déjà en place ; pose clé de l'image 02 |
| Début de saut, en l'air, réception | code | réception proportionnelle à la vitesse de chute |
| Visée | code | tangage réparti bassin / buste / cou, IK des mains |
| Tir, recul | code | recul additif du support d'arme et du buste, profil par arme |
| Rechargement | **clip** (bras et mains) | le chargeur suit `socket_hand.L` pendant le clip |
| Grenade | **clip** (haut du corps) | lâcher synchronisé avec l'événement `throw` |
| Adrénaline (geste de compétence) | **clip court** ou code | ne doit pas annuler le rechargement |
| Soin | **clip court** | |
| Réactions aux impacts | code (additif directionnel) | + morph de douleur |
| Morts | **clips** (3 variantes au moins) | puis ragdoll simplifié facultatif (hors périmètre GOLD) |
| Conduite (jeep) | clip ou pose | |

- **Séparation haut / bas du corps** : les jambes suivent la locomotion, le haut du corps suit la visée et les actions ; mélange au niveau de `spine`.
- **IK de l'arme** après toutes les couches : les mains restent sur l'arme (écart < 1 cm, valeur atteinte aujourd'hui).
- Transitions : mélanges de 0,1 à 0,25 s ; aucune pose ne « saute ».

---

## 4. Compatibilité future
- **Bots** : même personnage, même état d'animation, alimenté par `BotBrain` comme aujourd'hui.
- **Véhicules** : pose assise (jeep), personnage masqué dans le char ; sockets inchangés.
- **Réseau (futur, hors périmètre)** : l'état d'animation doit pouvoir se reconstruire à partir de quelques valeurs transmises (position, vitesse, visée, action, temps d'action) ; aucune animation ne dépend d'un hasard non synchronisable sans graine.
- **Personnalisation** : teint, cheveux, accessoires via sockets et paramètres de matériau, pas via de nouveaux modèles.
- **Artilleur et Commando** : même squelette, mêmes sockets, mêmes clips ; seuls le maillage, les proportions (échelle d'os limitée) et l'équipement changent.
- **Skins** : nouvelles textures et couleurs sur le même maillage et le même masque.

---

## 5. Validation

| Test | Méthode | Seuil |
| --- | --- | --- |
| Silhouette | rendu en ombre pleine, face / profil / dos | Assaut reconnaissable ; distinct des deux autres classes |
| Vignette | rendu 64×64 et 128×128 | classe et équipe identifiables |
| Bleu / rouge | mêmes vues pour les deux équipes | équipe identifiable sans hésitation |
| Lisibilité à distance | captures en jeu à 5, 20 et 40 m | équipe et classe lisibles à 40 m |
| Éclairage | plein soleil, ombre, contre-jour, menu | pas de zone bouchée ni brûlée |
| Transitions | `tests/poses.html` et parcours en jeu | aucune pose qui saute, pieds sans glissement visible |
| Régression gameplay | `npm test` | tout vert |
| Caméra | `test:camera` + captures en visée | le personnage ne masque pas le centre de l'écran |
| Performance 16v16 | mesures de [PERFORMANCE](../systems/PERFORMANCE.md) | pas de régression par rapport au personnage actuel |
| Conformité aux références | vues face, 3/4, profil, dos (`fiche.html`, `shots turn`) à côté de l'image 01 ; capture en visée à côté de l'image 03 | écarts listés et acceptés par le propriétaire |
| Comparaison A/B | captures identiques ancien / nouveau personnage | le nouveau est meilleur sur chaque vue, validé par un humain |

## 6. Critères GOLD du Master Assault
Le Master Assault est GOLD quand **tous** les points suivants sont vrais :
1. Toutes les lignes du tableau de validation passent, preuves (captures, mesures) jointes au rapport.
2. ≤ 4 appels de rendu par soldat en LOD0 ; budgets de triangles et de matériaux respectés.
3. En 16v16 : logique < 4 ms par image, ≤ 250 appels de rendu en vue de jeu, aucune image > 16 ms sur 2 minutes.
4. Bleu et rouge produits depuis un seul modèle et une seule texture (masque).
5. Toutes les animations de la section 3 présentes ; mains sur l'arme à < 1 cm dans toutes les poses tenues.
6. Hitboxes identiques à l'actuel ; `npm test` vert ; aucune erreur console.
7. Squelette et points d'attache documentés dans [ASSET-CONTRACT](ASSET-CONTRACT.md), puis **gelés** (D-003 passe à LOCKED).
8. Validation visuelle par le propriétaire du projet (comparaison A/B et conformité aux images 01 à 03), **après un aperçu jouable** (M5a, D-020) où il a essayé le personnage en partie.
