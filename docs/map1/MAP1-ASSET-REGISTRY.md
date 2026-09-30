# Carte 1 — registre sémantique des assets d'environnement

**Statut : implémenté et testé (`npm run test:env`), non branché dans le jeu ; aucune liaison vers le kit tant qu'il n'est pas livré.** Règle : [D-024](../DECISIONS.md). Architecture : [MAP1-ENVIRONMENT-PLAN](MAP1-ENVIRONMENT-PLAN.md). Ingestion et inventaire du kit : [MAP1-ASSET-INVENTORY](MAP1-ASSET-INVENTORY.md).

## 1. Principe
```
identifiant sémantique            registre                       paquet d'assets actuel
HOUSE_SMALL_A          ─────►  catalog.js : ce dont la     ─►  kits/medieval-village-megakit.js :
                               carte a besoin (emprise,         HOUSE_SMALL_A → fichier(s) du kit
                               hauteur, couvert, collision)     (plus tard : paquet Frontline Legends,
                                                                 priorité plus haute, même identifiant)
```
- Le **gameplay** (disposition, collisions, navigation, objectifs) ne connaît que des **identifiants** et les données du catalogue. Il ne connaît jamais un nom de fichier.
- Le **catalogue** ne connaît aucun fournisseur.
- Seuls les **paquets** (`src/environment/kits/`) nomment des fichiers.
- Remplacer un asset ne change **qu'une liaison**.

| Fichier | Rôle |
| --- | --- |
| `src/environment/catalog.js` | vocabulaire (familles, étiquettes, types) et **catalogue** des identifiants de la carte 1 |
| `src/environment/registry.js` | `createRegistry(catalogue, paquets)` : `resolve(id)`, `list(filtre)`, `validate()` ; `validateCatalog`, `validatePack` |
| `src/environment/kits/index.js` | paquets connus du jeu (`ENV_PACKS`) |
| `src/environment/kits/medieval-village-megakit.js` | paquet du kit village : racine, licence, priorité 10, **liaisons vides** (kit non livré) |
| `src/environment/EnvAssetLibrary.js` | chargeur : `preload(ids)`, `instantiate(id)` (instance ou `null` si non lié), `dispose()` ; **non branché** |
| `tests/env.mjs` | contrôles : catalogue, cas refusés, priorité, garde des chemins, chargeur, empreinte de la carte 1 |

## 2. Identifiants
- Forme **`FAMILLE_SOUSTYPE[_…]_VARIANTE`**, en majuscules, variante d'une lettre : `HOUSE_SMALL_A`, `COVER_SANDBAG_LINE_A`, `VEGETATION_TREE_TALL_A`. L'identifiant commence par sa famille.
- Il décrit un **rôle dans la carte**, pas un objet d'un kit : `VEGETATION_TREE_TALL_A` est « un arbre haut et étroit » (aujourd'hui un cyprès), quel que soit le fichier qui le représentera.
- Une nouvelle variante (`_B`) s'ajoute quand la carte a besoin d'une **autre emprise ou d'un autre rôle**, pas pour une simple variation de couleur (qui relève des paramètres).
- Un identifiant n'est jamais renommé ni réutilisé pour autre chose : la disposition de la carte en dépend.

## 3. Champs d'un enregistrement
| Champ | Sens |
| --- | --- |
| `id`, `family`, `subtype` | identité ; familles : `HOUSE`, `TOWER`, `LANDMARK`, `WALL`, `FENCE`, `ARCH`, `STAIRS`, `ROOF`, `BALCONY`, `FLOOR`, `DOOR`, `WINDOW`, `PROP`, `COVER`, `VEGETATION`, `DECOR` |
| `kind` | `prefab` : posé par la disposition de la carte ; `module` : pièce d'un prefab (toit, balcon, porte…), jamais posé seul par le gameplay |
| `tags` | étiquettes d'un vocabulaire fermé (§ 4) |
| `footprint { w, d }`, `heightM` | emprise et hauteur **visées**, en mètres (w selon x, d selon z, rotation 0). Un asset doit y tenir ; la collision en vient. `heightCategory` est calculée : `ground` (< 0,45 m, on l'enjambe), `low` (< 1,2 m, couvert accroupi), `medium` (< 2,2 m), `high` (< 6 m), `tall` |
| `params` | dimensions variables d'un prefab paramétrique (maisons, murets, lignes de sacs de sable, clôtures) |
| `coverType` | `none`, `low`, `high`, `full` (bâtiment : coupe la vue), `soft` (masque la vue, les balles passent : clôtures, buissons) |
| `traversalType` | `blocking`, `step` (≤ 0,45 m), `passable` (sans collision), `walkable` (sol en hauteur), `climbable` (escalier) |
| `collision { shape, tag, camera }` | indication pour l'assemblage. Formes : `box`, `boxes` (plusieurs boîtes, ex. fontaine, pieds du château d'eau), `trunk` (tronc seul), `none`. Étiquettes de `Physics.addBox` : `solid`, `cover` (les bots s'en servent), `nobullet`. `camera` : boîtes « caméra seule » (feuillage, balcon) |
| `fallback` | constructeur de `World.js` qui dessine l'équivalent **aujourd'hui** (repli si l'identifiant n'est pas lié) ; `null` pour un identifiant prévu |
| `map1Use` | usage vérifié dans la carte 1, ou « prévu » |
| `replacementIntent` | `custom` (asset Frontline Legends visé à terme), `kit` (un asset de kit peut rester), `procedural` (reste construit par le code) |
| `notes` | précisions de gameplay ou de production |

## 4. Étiquettes (vocabulaire fermé)
- **Nature** : `structural`, `exterior`, `interior`, `corner`, `straight`, `decorative`, `landmark` (repère à ne jamais masquer), `foliage`, `natural`, `animated`, `team` (porte un emblème d'équipe posé par le code), `parametric`.
- **Gameplay** : `low-cover`, `high-cover`, `full-cover`, `soft-cover`, `vehicle-safe` (admis dans le couloir d'une route : aucune collision bloquante), `infantry-only` (crée un passage réservé à l'infanterie : jamais sur une route de véhicules), `verticality` (demande une décision sur la verticalité).
- **Zones de la carte 1** : `plaza`, `village-center`, `rural`, `farm`, `mill`, `base`, `roadside`, `backdrop`.

Une étiquette hors de ce vocabulaire est refusée par `validateCatalog`. Pour en ajouter une : l'ajouter à `ENV_TAGS` et à cette page.

## 5. Paquets et liaisons
```js
export default {
  id: 'medieval-village-megakit', name: 'Medieval Village MegaKit',
  root: 'kits/medieval-village-megakit/',   // relatif à la base du site (fichiers dans public/kits/…)
  priority: 10,                              // kit tiers : bas ; paquet Frontline Legends : plus haut
  license: { file: 'License_Standard.txt', summary: null, redistributionInPublicRepo: null },
  bindings: {
    // COVER_CRATE_A: { path: '<chemin relatif du modèle>', scale?, rotY?, offset?: [x, y, z] },
    // HOUSE_SMALL_A: { parts: [{ id: 'ROOF_TILE_MEDIUM_A', p: [0, 3, 0], rotY: 0 }, …] },
  },
};
```
- **`path`** : fichier glTF ou GLB relatif à `root`. Refusés : chemin absolu, adresse externe, « .. », autre extension.
- **`parts`** : un prefab assemblé de **modules** liés dans le même paquet. C'est le cas des maisons d'un kit modulaire ; un paquet Frontline Legends pourra au contraire lier `HOUSE_SMALL_A` à un seul fichier.
- **Priorité** : pour chaque identifiant, le paquet de priorité la plus haute qui le lie gagne. Les autres identifiants restent fournis par le kit. Le remplacement se fait donc identifiant par identifiant, sans toucher au catalogue ni à la disposition.
- **Non lié** : `resolve(id).status === 'unbound'` ; le chargeur renvoie `null` et le décor actuel (`fallback`) est gardé.

## 6. Contrôles automatiques (`npm run test:env`)
- **Catalogue** valide : identifiants, familles, étiquettes, emprise, hauteur, couvert, franchissement, collision, usage ; chaque identifiant utilisé a un constructeur de repli existant.
- **Cas refusés** (12) : identifiant hors convention ou en double, étiquette inconnue, emprise manquante, liaison vers un identifiant inconnu, chemin absolu, adresse externe, « .. », fichier qui n'est pas un modèle, pièce non liée, prefab utilisé comme pièce, paquet sans licence.
- **Priorité** : un paquet de priorité haute remplace le kit pour ses identifiants seulement.
- **Garde D-024** : aucun nom de fichier `.gltf` / `.glb` ni chemin `kits/` dans le code du jeu, et aucun import direct d'un paquet hors de `src/environment/`. Le personnage garde son propre contrat (`docs/characters/`). Essai de mutation fait : un chemin ajouté dans `World.js` est détecté.
- **Chargeur** (kit d'essai synthétique) :
  - identifiant → glTF avec tampon et texture externes ;
  - échelle de la liaison appliquée, géométrie partagée entre instances ;
  - assemblage de modules ;
  - `null` si non lié, erreur si inconnu ;
  - libération complète.

## 7. Procédures
- **Lier un asset du kit** (après l'inventaire) :
  1. choisir le fichier dans `docs/map1/inventories/<paquet>.md` ;
  2. ajouter `ID: { path }` dans le paquet ;
  3. vérifier que ses dimensions tiennent dans l'emprise du catalogue (tolérance à fixer à l'étape E3) ;
  4. `npm run test:env`.
- **Nouvel identifiant** : l'ajouter à `catalog.js` avec tous ses champs, un besoin réel de la carte (`map1Use`) et son repli ; mettre à jour le tableau ci-dessous.
- **Remplacer par un asset Frontline Legends** :
  1. créer le paquet `frontline-legends` (priorité plus haute, fichiers dans `public/models/env/` par exemple) ;
  2. lier l'identifiant ;
  3. le kit continue de fournir tous les autres identifiants.
- **Retirer le kit** : supprimer son paquet de `kits/index.js`. Les identifiants redeviennent non liés et le décor actuel revient.

## 8. Identifiants de la carte 1
*Tableau généré depuis `src/environment/catalog.js` (35 identifiants : 28 prefabs, 7 modules ; 29 remplacent un élément existant, 6 sont prévus pour les faiblesses connues de la carte).*

| Identifiant | Rôle | Emprise (m) | Hauteur | Couvert | Franchissement | Collision | Repli actuel | Usage carte 1 | Visé |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `HOUSE_SMALL_A` | prefab | 7 × 6 | 6,5 m (tall) | full | blocking | box solid | `house` | maisons à un étage : 10 (village, moulin, ferme), 6 × 5 à 9 × 7 m | custom |
| `HOUSE_MEDIUM_A` | prefab | 8 × 7 | 9,5 m (tall) | full | blocking | box solid | `house` | maisons à deux étages : 13 (village, ferme), 6 × 7 à 9 × 9 m | custom |
| `HOUSE_LARGE_A` | prefab | 12 × 8 | 10 m (tall) | full | blocking | box solid | `house` | grande maison près du clocher (19,5 ; 31) | custom |
| `HOUSE_TOWER_A` | prefab | 5 × 5 | 12 m (tall) | full | blocking | box solid | — | prévu | custom |
| `TOWER_BELL_A` | prefab | 5 × 5 | 19 m (tall) | full | blocking | box solid | `bellTower` | clocher du village (10 ; 30), repère de B | custom |
| `LANDMARK_WINDMILL_A` | prefab | 6 × 6 | 14 m (tall) | full | blocking | box solid | `buildWindmill` | moulin du drapeau A (-75 ; -3), ailes animées | custom |
| `LANDMARK_BARN_A` | prefab | 14 × 9 | 10 m (tall) | full | blocking | box solid | `buildFarm` | grange du drapeau C (76 ; 20) | custom |
| `LANDMARK_WATER_TOWER_A` | prefab | 3 × 3 | 10 m (tall) | soft | blocking | boxes solid | `buildFarm` | château d'eau de la ferme (58 ; -2) : 4 pieds | kit |
| `LANDMARK_FOUNTAIN_A` | prefab | 5 × 5 | 2,6 m (high) | low | blocking | boxes solid | `fountain` | fontaine au centre de B (0 ; 2) ; le mât du drapeau B est décalé à cause d'elle | custom |
| `ROOF_TILE_MEDIUM_A` | module | 8 × 7 | 2,6 m (high) | none | blocking | aucune | `gableRoof` | toits à deux pans en tuiles des maisons | kit |
| `BALCONY_STRAIGHT_A` | module | 1,8 × 0,75 | 0,9 m (low) | none | blocking | caméra seule | `house` | balcon en fer forgé au-dessus de la porte (maisons à étage) | kit |
| `BALCONY_CORNER_A` | module | 1,8 × 1,8 | 0,9 m (low) | none | blocking | caméra seule | — | prévu | kit |
| `DOOR_WOOD_A` | module | 1,5 × 0,2 | 2,5 m (high) | none | blocking | aucune | `house` | portes des maisons (fermées, décor) | kit |
| `WINDOW_SHUTTER_A` | module | 1,9 × 0,15 | 1,3 m (medium) | none | blocking | aucune | `house` | fenêtres à volets des maisons | kit |
| `PROP_CHIMNEY_A` | module | 0,9 × 0,9 | 1,8 m (medium) | none | blocking | aucune | `house` | cheminées (≈ 60 % des maisons) | kit |
| `FLOOR_TERRACE_A` | module | 4 × 4 | 0,3 m (ground) | none | walkable | box solid | — | prévu | kit |
| `WALL_LOW_STONE_A` | prefab | 2 × 0,7 | 0,9 m (low) | low | blocking | box solid | `stoneWall` | murets de pierre entre les champs et devant A et C (segments de 2 m) | kit |
| `WALL_HIGH_STONE_A` | prefab | 2 × 0,6 | 2,4 m (high) | full | blocking | box solid | — | prévu | kit |
| `ARCH_SMALL_A` | prefab | 3 × 0,8 | 3,2 m (high) | full | passable | boxes solid | — | prévu | kit |
| `FENCE_WOOD_A` | prefab | 2,2 × 0,2 | 1,2 m (medium) | soft | blocking | box nobullet | `fence` | clôtures de la ferme (les balles passent) | kit |
| `STAIRS_EXTERIOR_STRAIGHT_A` | prefab | 1,2 × 3,5 | 3 m (high) | none | climbable | boxes solid | — | prévu | kit |
| `COVER_SANDBAG_LINE_A` | prefab | 4 × 0,7 | 0,95 m (low) | low | blocking | box cover | `sandbags` | sacs de sable (place, A, C, bases) : étiquette « cover » utilisée par les bots | custom |
| `COVER_CRATE_A` | prefab | 1,1 × 1,1 | 1,1 m (low) | low | blocking | box solid | `crate` | caisses (place, moulin, ferme, bases), empilables | kit |
| `COVER_BARREL_A` | prefab | 0,85 × 0,85 | 1,1 m (low) | low | blocking | box solid | `barrel` | tonneaux (place, ferme, bases) | kit |
| `COVER_HAYBALE_A` | prefab | 1,5 × 1,3 | 1,5 m (medium) | high | blocking | box solid | `hayBale` | bottes de foin (moulin, ferme) | kit |
| `PROP_MARKET_STALL_A` | prefab | 3 × 1,2 | 2,6 m (high) | low | blocking | box solid | `stall` | étals du marché sur la place (B), collision à 1 m | kit |
| `PROP_TABLE_PARASOL_A` | prefab | 1 × 1 | 2,8 m (high) | none | blocking | box solid | `parasolTable` | tables à parasol de la place (B), collision à 0,8 m | kit |
| `PROP_TROUGH_A` | prefab | 3 × 1 | 0,8 m (low) | low | blocking | box solid | `buildFarm` | abreuvoir de la ferme (72 ; -2) | kit |
| `PROP_TENT_A` | prefab | 5,2 × 5 | 2,6 m (high) | full | blocking | box solid | `buildBase` | tentes des bases, emblème d'équipe | custom |
| `VEGETATION_TREE_ROUND_A` | prefab | 3 × 3 | 4 m (high) | soft | blocking | trunk solid + caméra | `oliveTree` | oliviers (≈ 120, dispersés à graine fixe) | kit |
| `VEGETATION_TREE_TALL_A` | prefab | 2 × 2 | 8 m (tall) | none | blocking | trunk solid + caméra | `cypress` | cyprès (allées des routes nord et sud, dispersés) | kit |
| `VEGETATION_BUSH_A` | prefab | 1,6 × 1,6 | 0,9 m (low) | soft | passable | aucune | `bush` | buissons (sans collision) | kit |
| `VEGETATION_BACKDROP_TREE_A` | prefab | 7 × 7 | 8 m (tall) | none | passable | aucune | `buildScatter` | arbres hors limites (décor lointain) | kit |
| `DECOR_ROCK_A` | prefab | 2 × 1,6 | 0,8 m (low) | low | blocking | box solid | `rock` | rochers (collision seulement au-delà d'1 m) | kit |
| `DECOR_VEHICLE_PAD_A` | prefab | 6,8 × 6,8 | 0,12 m (ground) | none | step | aucune | `buildBase` | plateformes des véhicules des bases | procedural |
