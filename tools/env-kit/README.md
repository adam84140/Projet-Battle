# Outils des kits d'environnement

Scripts Node sans dépendance nouvelle, pour faire entrer un kit tiers dans la carte 1 **sans lier le jeu au fournisseur** (D-024).

| Script | Rôle |
| --- | --- |
| `ingest.mjs` | `--from <dossier> --pack <id> [--dest] [--license] [--force]` : copie les glTF et les fichiers qu'ils référencent, chemins intacts, octet pour octet, dans `public/kits/<id>/`, avec la licence (obligatoire) et `kit-manifest.json` |
| `inventory.mjs` | `--pack <id> [--kit] [--out]` : mesure et classe chaque modèle, puis écrit `docs/map1/inventories/<id>.md` et `.json` |
| `gltf-inspect.mjs` | lecture d'un glTF ou GLB : bornes (nœuds compris), triangles, matériaux, références, extensions à décodeur |
| `families.mjs` | famille (d'après le nom) et rôle (d'après le nom et les dimensions) |

Procédure et règles : [MAP1-ASSET-INVENTORY](../../docs/map1/MAP1-ASSET-INVENTORY.md). Registre : [MAP1-ASSET-REGISTRY](../../docs/map1/MAP1-ASSET-REGISTRY.md). Tests : `npm run test:env`, sur un kit d'essai synthétique.
