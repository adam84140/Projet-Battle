# Actifs externes — Inventaire

État : 2026-10-02

Tous les actifs du jeu peuvent être régénérés depuis le code source. Aucun actif externe n'est actuellement livré dans le dépôt GitHub.

## Actifs planifiés ou en attente

### Medieval Village MegaKit (Standard Edition)

| Propriété | Valeur |
| --- | --- |
| **État** | Identifié, licence vérifiée, fichiers **non transférés** |
| **Fonction** | Remplacer le décor procédural de la carte 1 par un village médiéval 3D |
| **Source** | [Quaternius](https://quaternius.com/), Medieval Village MegaKit Standard Edition |
| **Licence** | CC0 1.0 Universal (domaine public, redistribution autorisée) |
| **Emplacement attendu** | `public/kits/medieval-village-megakit/` |
| **Contenu** | 374 fichiers : 176 `.gltf`, 176 `.bin`, 22 `.png`, 1 `License_Standard.txt` (estimation du propriétaire du kit) |
| **Taille approx.** | ~50–100 MB (non vérifié) |
| **Peut être versionné** | OUI (licence CC0 autorise la redistribution) |
| **Action sur nouvel ordinateur** | Récupérer selon [MAP1-ENVIRONMENT-PLAN](map1/MAP1-ENVIRONMENT-PLAN.md), § 6.1 |

**Statut de transfert :** Bloqué par limites réseau du conteneur Cloud et limites du connecteur Google Drive. Voir [CURRENT-STATE](CURRENT-STATE.md), § Environnement, et [SESSION-HANDOFF](SESSION-HANDOFF.md), § Problèmes connus.

**Prochaines étapes :**
1. Récupérer le kit selon l'une des trois méthodes (A : git push depuis la machine locale ; B : archive du Drive ; C : zip minimal des fichiers glTF).
2. Ingérer avec `node tools/env-kit/ingest.mjs --from <dossier> --pack medieval-village-megakit`.
3. Inventorier avec `node tools/env-kit/inventory.mjs --pack medieval-village-megakit`.
4. Réviser visuellement avant toute liaison au jeu (procédure : [MAP1-ASSET-INVENTORY](map1/MAP1-ASSET-INVENTORY.md), § 4).

## Actifs en attente (Master Character)

### Asset de production Master Assault

| Propriété | Valeur |
| --- | --- |
| **État** | Non fourni, en attente |
| **Fonction** | Remplacer le personnage procédural par un modèle 3D de production |
| **Source** | À obtenir (modélisation externe, Blender ou autre) |
| **Format requis** | GLB ou glTF + textures `.png`, conformes au [contrat d'asset](characters/ASSET-CONTRACT.md) |
| **Emplacement attendu** | `art/master-assault-production.glb` ou équivalent, puis chargement en jeu |
| **Licence requise** | Doit permettre la redistribution sur GitHub (dépôt public) |
| **Peut être versionné** | OUI (si licence compatible) |
| **Action sur nouvel ordinateur** | Placer dans le dossier attribué ; valider avec `npm run check:glb` ; intégrer en jeu (M5a) |

**Statut :** Reprise seulement avec un asset externe. L'ébauche du point A (M4, Blender) n'a pas été approuvée visuellement (voir [CURRENT-STATE](CURRENT-STATE.md), Master Character, et [MASTER-ASSAULT-M4](characters/MASTER-ASSAULT-M4.md), § Décision finale).

**Prochaines étapes :**
1. Obtenir ou commander un asset GLB de production.
2. Valider avec le contrat et le validateur `npm run check:glb`.
3. Intégrer rapidement en jeu (M5a) pour test du feeling avant optimisation finale.
4. Procédure : [MASTER-ASSAULT-M4](characters/MASTER-ASSAULT-M4.md), § 8.

## Résumé

| Actif | État | Bloquer | URL | Licence |
| --- | --- | --- | --- | --- |
| Medieval Village MegaKit | Identifié | OUI | [Google Drive du propriétaire](https://drive.google.com/drive/folders/1B2iAdDvt2lp2AzVMn6RWLvI9JUEfSwgF) | CC0 1.0 ✓ |
| Master Assault GLB | Non fourni | OUI | — | À déterminer |

**Aucun secret ni clé API à dépôt ne est stocké ici ni ailleurs dans le dépôt.**
