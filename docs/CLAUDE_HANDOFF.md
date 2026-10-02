# Passation Claude — Frontline Legends

Mémoire pour une session Claude Code reprenant le projet.

**Mis à jour :** 2026-10-02

## Résumé du projet

**Frontline Legends** est un jeu de tir cartoon à la 3ᵉ personne jouable dans un navigateur web.

- **Engine :** Three.js + Vite (pas de moteur)
- **Plateforme :** navigateur web (ordinateur + tactile)
- **État :** jouable, jalon MAP 1 GOLD en cours (environnement / production du niveau)
- **Dépôt :** https://github.com/adam84140/Projet-Battle (public)
- **Branche de travail :** `claude/dazzling-cray-gn1bg5`
- **Dernier commit stable :** `123e7d9` (docs sur kit et findings Google Drive)
- **Point de contrôle pré-Master-Character :** `05827b4807c67959e125c9681b5ffa953b113a29` (D-004)

### Gameplay

- **Mode :** Conquête, 3 drapeaux (tickets)
- **Équipes :** 2 (Les Aigles bleu, La Légion rouge)
- **Classes :** 3 (Assaut, Artilleur, Commando) + 3 compétences chacune
- **Combat :** hitscan, grenades, roquettes, obus, explosions
- **Bots :** 8v8 ou 16v16, 3 difficultés, IA tactique, rôles (attaque/défense/contournement/soutien)
- **Véhicules :** jeep et char avec suspension, destruction, réapparition

### État du jeu — ce qui fonctionne

✅ **Menu principal** : sélection de classe/équipe, déploiement  
✅ **Carte 1** (*Castelmare*, village méditerranéen) : entièrement procédurale  
✅ **Personnages** : procéduraux, rendu M1 par défaut (1 SkinnedMesh par soldat), repli legacy  
✅ **Animations** : procédurales avec IK des mains  
✅ **Armes** : 4 armes (fusil, mitrailleuse, sniper, poignard)  
✅ **Compétences** : grenades, roquettes, obus, adrénaline, blindage, camouflage, etc.  
✅ **Caméra 3ᵉ personne** : ne traverse jamais murs/feuillages  
✅ **Son** : synthétisé + spatialisé (Web Audio)  
✅ **Effets** : traçantes, impacts, poussière, explosions  
✅ **HUD** : tickets, drapeaux, mini-carte, fil d'éliminations, scores, dégâts flottants  
✅ **Tactile** : joystick, visée au doigt, boutons (téléphone/tablette)  
✅ **Fiche personnage** : rendue en direct depuis le modèle de jeu (`fiche.html`)

### Jalon actuel : MAP 1 GOLD

**Priorité active :** ENVIRONNEMENT / PRODUCTION DU NIVEAU (D-024)

**État :**
- Infrastructure de registre sémantique : ✅ créée (`src/environment/catalog.js`, `registry.js`)
- Outils de kit (ingestion, inventaire) : ✅ créés et testés
- Kit tiers (Medieval Village MegaKit) : ❌ bloqué (transfert Google Drive non fiable)
- Liaison au jeu : ❌ pas commencée (attente kit + accord propriétaire)
- Planche visuelle pour revue : ❌ pas créée (kit nécessaire)
- Décision D-025 (architecture) : ⏳ en attente du propriétaire

**Prochaines étapes (dans cet ordre) :**
1. Récupérer le kit fiablement ([MAP1-ENVIRONMENT-PLAN](map1/MAP1-ENVIRONMENT-PLAN.md), § 6.1)
2. Ingérer et inventorier
3. Planche visuelle pour revue du propriétaire
4. Accord du propriétaire
5. Liaison au jeu (étapes E3+)

Voir [MAP1-ENVIRONMENT-PLAN](map1/MAP1-ENVIRONMENT-PLAN.md), [SESSION-HANDOFF](SESSION-HANDOFF.md).

### Master Character : EN PAUSE (D-023)

**État :**
- M0–M3 : ✅ terminées, infrastructure en place (tests, adaptateur, matériau d'équipe)
- M4 point A : ✅ ébauche technique, ❌ non approuvée visuellement
- M4 production artistique (points B/C/D) : ❌ arrêtée
- M5a : ❌ non commencée

**Raison :** La modélisation par script dans Blender n'atteint pas la qualité visuelle requise.

**Plan de reprise :**
1. Attendre un asset GLB/glTF de production externe
2. Valider avec le contrat existant (`npm run check:glb`)
3. Intégrer rapidement en jeu (M5a) pour tester le feeling
4. Procédure complète : [MASTER-ASSAULT-M4](characters/MASTER-ASSAULT-M4.md), § 8

**NE PAS continuer M4 points B/C/D.** Infrastructure M0–M3 doit être préservée.

## Architecture clé

### Source de vérité

- **Code du jeu :** `src/`
- **Configuration (game design) :** `src/config.js` — TOUT le chiffré (dégâts, cadences, vitesses, tickets, compétences)
- **Tests de régression :** `tests/` et `npm test`
- **Documentation technique :** `docs/` (INDEX.md → lire en premier)

### Pas d'actifs externes en production

**Actuellement :** Le jeu est entièrement procédural. Aucun fichier 3D (.glTF, .obj), image (.png, .jpg) ni son (.wav, .mp3) n'est chargé par le jeu.

**Futurs :**
- Kit Medieval Village MegaKit (bloqué)
- Master Character GLB (bloqué)

### Struktur des dossiers importants

```
src/
├── main.js                    # point d'entrée
├── config.js                  # configuration du jeu (game design)
├── game/
│   ├── Game.js               # boucle principale, gestion d'état
│   ├── World.js              # génération procédurale de la carte
│   ├── map.js                # géographie, spawns, objectifs
│   ├── physics/              # moteur physique maison
│   ├── bot/                  # IA des bots
│   ├── Vehicle.js            # jeep et char
│   ├── Combat.js             # dégâts, projectiles, explosions
│   └── ...
├── character/
│   ├── Character.js          # classe personnage principal
│   ├── renderPath.js         # M1 (SkinnedMesh) vs legacy (fusion par os)
│   ├── rigAdapter.js         # M2 adaptateur squelette
│   ├── rigContract.js        # M2 contrat asset + validateur
│   ├── teamMaterial.js       # M3 masque couleurs d'équipe
│   ├── animation.js          # animation procédurale + IK
│   └── ...
├── environment/
│   ├── catalog.js            # registre sémantique (35 identifiants)
│   ├── registry.js           # résolution par paquet
│   ├── kits/                 # définitions de paquets (medieval-village-megakit.js)
│   ├── EnvAssetLibrary.js    # chargeur (non branché)
│   └── ...
├── ui/
│   ├── HUD.js                # affichage en jeu (tickets, dégâts, compétences)
│   ├── Menu.js               # menu principal, écrans
│   └── ...
└── sheet/
    └── fiche.js              # génération de la fiche personnage
```

### Dépendances (très minimalistes)

- `three` (0.186.1) : moteur 3D
- `vite` : bundler
- `playwright` : tests d'intégration (dev seulement)

Aucune dépendance Obsidian, aucune librairie lourde.

## Conventions techniques à respecter

1. **Character :** face à +Z, droite = −X, noms d'os en camelCase avec suffixe `L`/`R`
2. **Décor :** générateur à graine fixe, **JAMAIS changer l'ordre des tirages** dans `World.js`
3. **Config :** TOUT le chiffré du game design doit être dans `src/config.js`
4. **Assets tiers :** toujours remplaçables, jamais dépendre d'un chemin fournisseur
   - Identifiant sémantique → registre → kit actuel
   - Collision du gameplay : du catalogue, jamais du maillage
5. **Objets retirés de scène :** libérer les géométries (`disposeTree`, marquer les partagées avec `markShared`)
6. **Sauvegardes utilisateur :** clé localStorage `frontline-legends-settings-v1`, doit rester compatible

## Problèmes connus

**Confirmés et documentés :**
1. Blocages temporaires de bots (~0,5–1,6 % des cas), jusqu'à 8 s
2. Pics de 40–65 ms en 16v16 lors de réapparition avec réserve vide
3. Arme au-dessus du sol dans la mort « en vrille »
4. Bots ne conduisent pas les véhicules
5. Pas de verticalité ni d'intérieurs sur la carte
6. Chevauchement forcé si plongé entre 2 obstacles très proches (1 cas / ~7000)
7. Sphère de tête ne suit pas l'inclinaison (écart jusqu'à ~12 cm)
8. Visée accroupie : arme ~15° sous la ligne de visée
9. Main gauche : 7–37 mm du garde-main selon situation
10. `test:material` : échec ponctuel 1/2 en 2026-09-30 (cause inconnue)
11. FPS réel sur GPU jamais mesuré (conteneur Cloud sans GPU)

Voir [CURRENT-STATE.md](CURRENT-STATE.md), section « Problèmes connus ».

## Tests et validation

### Suites de test de régression

```bash
npm run test:smoke      # menu → partie complète → victoire (48/48)
npm run test:touch      # jeu tactile (12/12)
npm run test:camera     # caméra jamais dans murs/feuillages (6/6)
npm run test:bots       # partie simulée 3 min (8/8)
npm run test:character  # personnages, rendus (72/72)
npm run test:rig        # contrat squelette, adaptateur (31/31)
npm run test:material   # masque d'équipe (18/18)
npm run test:env        # carte 1, registre, kit (22/22)
npm test                # toutes les 8 suites
```

**Objectif :** Tous les tests verts avant tout commit.

### Validation visuelle

```bash
npm run shots -- label [type]
```

Capture avant/après, à examiner visuellement. Procédure : [visual-validation skill](../CLAUDE.md).

### Commandes de vérification rapide

```bash
npm run build           # OK/FAIL
npm test                # ✓ ou ✗
git status              # arbre propre ?
git log -5 --oneline    # commits vérifiés ?
```

## Procédures et skills

**À utiliser comme premier réflexe :**
- `gameplay-regression` : avant tout commit (build + tests complets)
- `visual-validation` : pour tout changement visible
- `threejs-performance` : avant tout commit touchant performance
- `map1-level-design` : pour travail sur la carte 1
- `character-production` : pour travail sur le personnage
- `frontline-art-direction` : pour art direction

**Règles dans [CLAUDE.md](../CLAUDE.md) :**
- Préserver ce qui fonctionne, améliorer par petites étapes
- Changement risqué → STOP et proposer (avant de coder)
- Aucune affirmation « terminé » sans preuve
- Pas de réécriture inutile
- Working tree toujours clean (avant de modifier)

## État Git

```
Branche       : claude/dazzling-cray-gn1bg5
Remote        : origin https://github.com/adam84140/Projet-Battle
Working tree  : clean
Fichiers      : 160 en Git
Taille        : node_modules ignorés, dist/ ignoré, test-results ignoré
Secrets       : aucun détecté
```

**À faire à la reprise :**
```bash
git status -sb
git log --oneline -5
npm install
npm run build
npm test
```

## Commandes recommandées pour reprendre

```bash
# Démarrage
git pull origin claude/dazzling-cray-gn1bg5
npm install
npm run build
npm test

# Développement
npm run dev                  # lancer le jeu

# Avant commit
npm run build
npm test
npm run test:smoke           # rapide
npm run test:character       # personnage

# Captures visuelles (avant/après)
npm run shots -- mon-label before
# [faire le changement]
npm run shots -- mon-label after

# Commit + push
git add [fichiers]
git commit -m "type(scope): résumé"
git push -u origin claude/dazzling-cray-gn1bg5
```

## Prochaines tâches (par priorité)

1. **Récupérer le kit Medieval Village** (bloquant)
   - Méthode C recommandée : zip minimal des .gltf/.bin
   - Voir [MAP1-ENVIRONMENT-PLAN](map1/MAP1-ENVIRONMENT-PLAN.md), § 6.1

2. **Ingérer et inventorier le kit**
   - `node tools/env-kit/ingest.mjs --from <folder> --pack medieval-village-megakit`
   - `node tools/env-kit/inventory.mjs --pack medieval-village-megakit`

3. **Créer planche visuelle d'assets**
   - Pour revue du propriétaire (style vs image 03)
   - Étape E2

4. **Attendre accord propriétaire**
   - Décision D-025 (architecture de la liaison)
   - Étapes E3+ (liaison au jeu)

5. **Master Character**
   - Bloquer sur attente asset GLB de production
   - NE PAS continuer M4 B/C/D scriptés

## Repères historiques

| Commit | Date | Étape | Notes |
| --- | --- | --- | --- |
| `05827b4` | 2026-09-21 | M0–M3 complet | point de contrôle stable pré-Master-Character |
| `29a22aa` | 2026-09-28 | M4 point A fin | pause Master Character, début préparation carte 1 |
| `123e7d9` | 2026-10-02 | docs | kit license et findings, handoff |

**Jalon :** MAP 1 GOLD, priorité **ENVIRONNEMENT / PRODUCTION DU NIVEAU**

## Ressources

- **Base de connaissances :** `docs/INDEX.md`
- **État actuel :** `docs/CURRENT-STATE.md`
- **Décisions :** `docs/DECISIONS.md`
- **Roadmap :** `docs/ROADMAP.md`
- **Plan carte 1 :** `docs/map1/MAP1-ENVIRONMENT-PLAN.md`
- **Références visuelles :** `docs/product/VISUAL-REFERENCES.md`
- **Règles permanentes :** `CLAUDE.md`

## Questions typiques

**Q: Quoi faire ensuite ?**  
A: [SESSION-HANDOFF.md](SESSION-HANDOFF.md), section « Objectif exact de la prochaine session ». Actuellement : récupérer le kit Medieval Village.

**Q: Le Master Character, c'est bloqué ?**  
A: Oui, en attente d'asset GLB externe. Ne pas continuer la modélisation scriptée.

**Q: Je peux modifier le gameplay ?**  
A: Tout le chiffré est dans `src/config.js`. Pour changements architecturaux : lire [DECISIONS.md](DECISIONS.md) et [CLAUDE.md](../CLAUDE.md).

**Q: Comment lancer le jeu rapidement ?**  
A: `npm run dev`, puis ouvrir http://localhost:5173.

**Q: Un test échoue, que faire ?**  
A: Relancer : `npm run build` puis le test spécifique. Consulter [CURRENT-STATE.md](CURRENT-STATE.md) section « Problèmes connus ».

**Q: Je dois mettre à jour la doc ?**  
A: OUI, dans le même commit que le code. Mets à jour `CURRENT-STATE.md` et `SESSION-HANDOFF.md` à la fin de ta session.

---

**Bon courage, et bienvenue dans Frontline Legends ! 🎮**

Toute question ? Lire d'abord [docs/INDEX.md](INDEX.md), puis consulter la section pertinente.
