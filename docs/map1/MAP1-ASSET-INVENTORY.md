# Carte 1 — ingestion et inventaire d'un kit d'environnement

**Statut : outils prêts et testés sur un kit d'essai synthétique. Le kit réel (Medieval Village MegaKit ou équivalent) n'est pas livré, donc aucun inventaire réel n'existe encore.** Livraison attendue : [MAP1-ENVIRONMENT-PLAN](MAP1-ENVIRONMENT-PLAN.md), § 6. Registre : [MAP1-ASSET-REGISTRY](MAP1-ASSET-REGISTRY.md). Règle : [D-024](../DECISIONS.md).

Ce qui est connu du kit à ce jour, par la description du propriétaire seulement :
- un dossier glTF de nombreux fichiers modulaires séparés, `.gltf` et `.bin`, aux préfixes `Balcony_`, `Corner_`, `Door_`, `Floor_`, `Roof_`, `Stairs_`, `Prop_`, `Overhang_`, `HoleCover_` ;
- des textures `.png` référencées par les glTF ;
- un fichier de licence (par exemple `License_Standard.txt`).

Rien d'autre n'est supposé : dimensions, échelle, pivots, nombre de fichiers et contenu seront **mesurés**.

## 1. Chaîne
```
kit livré (dossier glTF + licence)
   │  node tools/env-kit/ingest.mjs --from <dossier> --pack medieval-village-megakit
   ▼
public/kits/medieval-village-megakit/      fichiers du fournisseur, chemins relatifs intacts, octet pour octet
   ├── License_Standard.txt                licence copiée telle quelle
   ├── kit-manifest.json                   fichiers, tailles, SHA-256, références manquantes, non copiés
   └── glTF/…                              (arborescence d'origine)
   │  node tools/env-kit/inventory.mjs --pack medieval-village-megakit
   ▼
docs/map1/inventories/medieval-village-megakit.md     inventaire lisible, groupé par rôle puis famille
docs/map1/inventories/medieval-village-megakit.json   données complètes (outils, tests, liaisons)
   │  revue humaine (planche visuelle, étape E2), puis liaisons (étape E3)
   ▼
src/environment/kits/medieval-village-megakit.js      identifiant sémantique → fichier du kit
```

## 2. Ingestion (`tools/env-kit/ingest.mjs`)
- **Copie** : tous les `.gltf` / `.glb` trouvés sous `--from`, plus **chaque fichier qu'ils référencent** (tampons `.bin`, images), avec les **mêmes chemins relatifs** comptés depuis leur dossier commun. Une texture rangée dans `../Textures/` reste donc atteignable. Rien n'est renommé, aplati ni modifié : l'empreinte SHA-256 de chaque copie est notée.
- **Non copiés** : FBX, OBJ, Blend, MTL, DAE, USD, fichiers système (`__MACOSX`, `.DS_Store`…) et fichiers non référencés. Ces derniers sont listés dans le manifeste.
- **Licence obligatoire** : fichier dont le nom contient « license » ou « licence », ou `--license <fichier>`. Sans licence, **rien n'est copié**.
- **Sécurités** :
  - refus d'écraser un paquet existant sans `--force` ;
  - avertissement pour un fichier de plus de 50 Mo, arrêt au-delà de 100 Mo (limites de GitHub) ;
  - références manquantes signalées.
- **Destination** : `public/kits/<paquet>/`. Vite sert ce dossier tel quel et le copie dans le build. Les chemins relatifs `.gltf` → `.bin` → `.png` fonctionnent donc à l'exécution, y compris sous un sous-dossier (GitHub Pages).

## 3. Inventaire (`tools/env-kit/inventory.mjs`)
Pour chaque modèle, sans navigateur ni dépendance, en lisant le JSON glTF :
- **dimensions réelles** L × H × P en mètres : bornes des positions (champs `min` / `max` exigés par glTF) transformées par la hiérarchie des nœuds ;
- **triangles**, maillages, primitives, nœuds, matériaux, textures utilisées (taille des PNG), octets ;
- **placement** : pivot au sol, au milieu ou décalé ; origine au centre, sur un bord ou décalée. Ces informations servent à assembler les modules ;
- **avertissements** : fichier référencé manquant, bornes absentes, extension demandant un décodeur (Draco, meshopt, Basis) ;
- **échelle suspecte** : plus de 60 m (centimètres ?) ou moins de 2 cm.

**Famille** (d'après le nom) : le premier mot du nom, puis tout mot reconnu (`HoleCover_…` → `HOLE_COVER`, `Prop_…Wagon…` → `PROP`, mot-clé `wagon`). Familles reconnues :
- celles de la description du propriétaire : `BALCONY`, `CORNER`, `DOOR`, `FLOOR`, `ROOF`, `STAIRS`, `PROP`, `OVERHANG`, `HOLE_COVER` ;
- celles, possibles, qu'il a citées : `WALL`, `ARCH`, `WINDOW`, `SUPPORT`, `FENCE`, `CHIMNEY`, `VINE`, `WAGON`.

Tout autre nom est classé `UNKNOWN` et **signalé pour revue humaine**.

**Rôle** (d'après le nom **et** la géométrie mesurée) :
| Rôle | Règle |
| --- | --- |
| `structural` : module de bâtiment | familles `WALL`, `CORNER`, `FLOOR`, `ROOF`, `OVERHANG`, `BALCONY`, `DOOR`, `WINDOW`, `SUPPORT`, `ARCH`, `CHIMNEY` |
| `traversal` : franchissement | famille `STAIRS` |
| `filler` : bouche-trou | famille `HOLE_COVER` |
| `vegetation` | famille `VINE` ou mot `tree`, `bush`, `plant`, `flower`, `grass`, `ivy`, `hedge` |
| `cover-candidate` : couvert possible | autres familles : hauteur de 0,7 à 2 m, largeur ≥ 0,9 m, profondeur ≥ 0,3 m (hauteurs de couvert que les bots savent utiliser) |
| `prop` : grand accessoire | autres familles : plus de 2 m de haut ou plus de 3 m de long |
| `decoration` : petite décoration | le reste (candidat « sans collision ») |
| `unknown` | nom non reconnu : revue humaine |

La **grille probable des modules** est la dimension horizontale la plus fréquente des modules de structure. Elle sert à écrire les assemblages des maisons (`parts`).

Ces rôles sont des **propositions**. Le rôle de gameplay définitif (couvert, collision, franchissement) est celui du **catalogue** au moment de la liaison, jamais celui d'un fichier.

## 4. Revue humaine (étape E2)
L'inventaire ne juge pas le style. Avant toute liaison :
- une **planche visuelle** des assets par famille (captures générées), regardée par le propriétaire ;
- le style est jugé face à l'image 03 (village méditerranéen de *Castelmare*, [VISUAL-REFERENCES](../product/VISUAL-REFERENCES.md)) : les teintes se changent, l'architecture non ;
- échelle et orientation des modules sont confirmées ;
- la liste des modules nécessaires aux maisons de la carte 1 est dressée : 24 maisons, clocher, grange.

## 5. Vérifié
`npm run test:env` exécute ingestion et inventaire sur un **kit d'essai synthétique** : 9 boîtes aux noms « Fixture », textures dans `../Textures/`, un FBX, des fichiers parasites, une référence manquante, une échelle en centimètres. Ce kit est généré à chaque exécution dans `test-results/env/` et n'est pas versionné. Les dimensions, triangles, pivots, rôles, textures partagées, avertissements, copies identiques, licence et refus sont contrôlés. Voir [MAP1-ASSET-REGISTRY](MAP1-ASSET-REGISTRY.md), § 6.

**Non vérifié** : le comportement sur le kit réel (taille, extensions, particularités des fichiers du fournisseur).
