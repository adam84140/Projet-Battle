# Master Character — Assaut

**Statut : spécification. Rien n'est implémenté.** Le personnage en jeu est encore le personnage procédural décrit dans [CURRENT-STATE](../CURRENT-STATE.md) et [ANIMATION](../systems/ANIMATION.md).

Le Master Assault est le **personnage de référence de production** ([DECISIONS](../DECISIONS.md) D-002). Il fixe l'architecture que réutiliseront Artilleur, Commando, les skins et la personnalisation. Chemin de production : [CHARACTER-PIPELINE](CHARACTER-PIPELINE.md).

---

## 1. Art

### Rôle
Le héros de la jaquette : l'Assaut bleu à l'aigle ailé de la planche de référence (voir [ART-DIRECTION](../product/ART-DIRECTION.md)). Il doit être reconnaissable en vignette, lisible en combat et assez sympathique pour porter l'identité du jeu.

### Proportions (hauteur totale ≈ 1,80 m, unités en mètres)
- Environ 6,5 têtes de haut (tête ≈ 1,13 × une tête « réaliste »).
- Épaules larges (≈ 0,55 m d'un deltoïde à l'autre), taille fine, bassin étroit : torse en V.
- Avant-bras épais et lisibles, mains légèrement surdimensionnées, gantées.
- Jambes solides, bottes légèrement exagérées avec semelle marquée.
- Posture droite, menton volontaire.

### Silhouette
- Lisible en ombre chinoise pleine : sac à dos, grenades à la ceinture, fusil compact.
- Différente de l'Artilleur (plus massif, casque, épaulières) et du Commando (plus fin, bonnet, écharpe).

### Visage et cheveux
- Visage stylisé, grands traits : sourcils épais, yeux lisibles, bouche expressive.
- Cheveux en quelques volumes nets (mèche avant marquée), sans fils ni transparence.
- Expressions nécessaires : neutre, déterminé, confiant, concentré (visée), douleur (impact), K.-O. (mort).

### Lisibilité d'équipe
- Maillot et manches aux couleurs d'équipe, dominants sur le haut du corps.
- Emblème poitrine et dos (aigle ailé / étoile), bande colorée sur le sac, couleur visible de dos.
- Bleu `#2F5BB7` / rouge `#B2382C` ; gilet `#29344A` / `#4A2C27` ; pantalon olive / gris-vert (voir [ART-DIRECTION](../product/ART-DIRECTION.md)).

### Équipement
Gilet porte-chargeurs avec sangles, ceinture et poches, 2 grenades, gourde, sac à dos (bande d'équipe, emblème), genouillères, gants mi-doigts, bottes lacées. Pas d'accessoire qui masque le visage par défaut.

### Langage des armes
Fusil d'assaut FL-4 : compact, épais, crosse et garde-main tan `#8B7A57`, viseur à point rouge, chargeur courbe bien visible (il se retire au rechargement). Échelle ×1,12 (cartoon).

### Matériaux et textures
- Rendu stylisé : couleurs unies, léger dégradé peint, contours lisibles. **Pas de PBR réaliste, pas de salissure.**
- Un **atlas partagé** de textures (couleur de base) pour tout le personnage, avec des zones peintes à la main pour le visage et les détails.
- Couleurs d'équipe par **masque**, pas par duplication de textures (voir la partie technique).

---

## 2. Technique

### Maillage
- **Un seul `SkinnedMesh` pour le corps** (tête comprise), plus des objets rigides attachés aux sockets : arme, sac, casque ou bonnet, accessoires amovibles.
- Objectif : **≤ 4 appels de rendu par soldat** en LOD0 (corps, arme, sac, accessoire), contre 24 maillages aujourd'hui.

### Budgets de géométrie
| LOD | Distance | Triangles corps | Triangles arme | Os animés |
| --- | --- | --- | --- | --- |
| LOD0 | < 15 m (et menu, fiche) | 12 000 à 18 000 | ≤ 3 000 | squelette complet |
| LOD1 | 15 à 45 m | ≈ 5 000 | ≤ 1 000 | sans doigts ni visage |
| LOD2 | > 45 m | ≈ 1 500 | ≤ 300 | squelette de base |

Référence actuelle : ~15 000 à 17 000 triangles par soldat procédural.

### Matériaux
- **1 matériau pour le corps**, 1 pour l'arme ; au plus 3 matériaux par soldat avec accessoires.
- Matériaux et textures **partagés entre tous les soldats** (instances de matériau par équipe seulement si le masque ne suffit pas).

### Couleurs d'équipe (masque)
- Une texture masque (ou un canal d'attribut de sommet) indique les zones « couleur d'équipe primaire » (maillot), « secondaire » (bandes, sac) et « emblème ».
- Le shader remplace ces zones par les couleurs de l'équipe : **un seul modèle et une seule texture** pour bleu et rouge.
- Les emblèmes (aigle / étoile) sont des décalques interchangeables.

### Squelette canonique (proposition, gel en attente : D-003)
Reprend les 16 articulations actuelles pour garder la compatibilité avec l'animateur procédural, et ajoute ce qui manque pour la qualité de production :

| Groupe | Os |
| --- | --- |
| Base | `root` (au sol, porte le déplacement), `hips` |
| Colonne | `spine`, `spine1`, `chest`, `neck`, `head` |
| Bras (×2, suffixe `L`/`R`) | `clavicleX`, `shoulderX` (bras), `elbowX` (avant-bras), `handX` |
| Doigts (×2) | `thumb1-3X`, `index1-3X`, `fingers1-3X` (majeur, annulaire et auriculaire regroupés) |
| Jambes (×2) | `legX` (cuisse), `kneeX` (tibia), `ankleX` (pied), `toeX` |
| Visage | `jaw`, `eyeL`, `eyeR`, `browL`, `browR` (ou morph targets, voir plus bas) |

Règles :
- Noms en anglais, en camelCase, suffixe `L`/`R` : **ce sont les noms utilisés par le code**. Ne jamais les renommer après le gel.
- Personnage face à +Z, droite = −X, Y vers le haut, 1 unité = 1 m, pose de liaison en A-pose.
- Les os existants (`hips`, `spine`, `neck`, `head`, `shoulderX`, `elbowX`, `handX`, `legX`, `kneeX`, `ankleX`) gardent leur rôle actuel.

### Sockets (os ou objets vides nommés)
| Socket | Parent | Usage |
| --- | --- | --- |
| `socket_weapon` | `chest` (ou `spine1`) | support d'arme animé par le code (remplace `weaponMount`) |
| `socket_hand_R` / `socket_hand_L` | `handR` / `handL` | objets tenus (couteau, grenade, trousse) |
| `socket_back` | `chest` | sac à dos, arme en bandoulière |
| `socket_head` | `head` | casque, bonnet, casquette |
| `socket_face` | `head` | lunettes |
| `socket_hip_L` / `socket_hip_R` | `hips` | grenades, étui, gourde |
| `socket_emblem_chest` / `socket_emblem_back` | `chest` | décalques d'équipe |

Chaque arme définit ses points de prise (`gripR`, `gripL`, `magazine`) et sa bouche (`muzzle`) dans son propre repère, comme aujourd'hui (`rightWrist`, `leftWrist`, `magWrist`, `muzzle` dans `src/character/weapons.js`).

### IK
- **Mains (obligatoire)** : IK analytique à deux segments de l'épaule au poignet vers les points de prise de l'arme (conserver l'algorithme actuel `solveTwoBone`), avec coude orienté par un vecteur de pôle.
- **Pieds (optionnel)** : ajustement au relief par deux lancers de rayon et IK de jambe, seulement en LOD0 et à l'arrêt ou en marche lente.

### Animation du visage
Morph targets (clignement, sourcils, bouche : 6 à 10 cibles) ou os du visage, pilotés par le code selon l'état (visée, douleur, K.-O.). Désactivée en LOD1 et LOD2.

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
| Début de saut, en l'air, réception | code | réception proportionnelle à la vitesse de chute |
| Visée | code | tangage réparti bassin / buste / cou, IK des mains |
| Tir, recul | code | recul additif du support d'arme et du buste, profil par arme |
| Rechargement | **clip** (bras et mains) | le chargeur suit `socket_hand_L` pendant le clip |
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
| Comparaison A/B | captures identiques ancien / nouveau personnage | le nouveau est meilleur sur chaque vue, validé par un humain |

## 6. Critères GOLD du Master Assault
Le Master Assault est GOLD quand **tous** les points suivants sont vrais :
1. Toutes les lignes du tableau de validation passent, preuves (captures, mesures) jointes au rapport.
2. ≤ 4 appels de rendu par soldat en LOD0 ; budgets de triangles et de matériaux respectés.
3. En 16v16 : logique < 4 ms par image, ≤ 250 appels de rendu en vue de jeu, aucune image > 16 ms sur 2 minutes.
4. Bleu et rouge produits depuis un seul modèle et une seule texture (masque).
5. Toutes les animations de la section 3 présentes ; mains sur l'arme à < 1 cm dans toutes les poses tenues.
6. Hitboxes identiques à l'actuel ; `npm test` vert ; aucune erreur console.
7. Squelette et sockets documentés ici, puis **gelés** (D-003 passe à LOCKED).
8. Validation visuelle par le propriétaire du projet (comparaison A/B).
