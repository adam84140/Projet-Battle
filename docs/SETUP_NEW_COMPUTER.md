# Installation sur un nouvel ordinateur

Guide étape par étape pour récupérer et lancer **Frontline Legends** depuis GitHub.

## Prérequis

- **Git** : version 2.20+
- **Node.js** : version 20 ou plus récent (LTS recommandée)
- **Navigateur moderne** : Chrome, Firefox, Edge, Safari (WebGL requis)
- **Espace disque** : ~1 GB (dépôt + node_modules)
- **Aucun logiciel supplémentaire n'est requis pour jouer** (pas de Unity, Blender, etc.)

Vérifiez les versions installées :
```bash
git --version
node --version
npm --version
```

## Étape 1 : Cloner le dépôt

Choisissez un dossier de destination et clonez le dépôt :

```bash
cd ~/Projets                    # ou votre chemin préféré
git clone https://github.com/adam84140/Projet-Battle.git
cd Projet-Battle
```

Vérifiez que vous êtes sur la bonne branche :

```bash
git branch --show-current
# Attendu : claude/dazzling-cray-gn1bg5
```

## Étape 2 : Installer les dépendances

```bash
npm install
```

Cela crée le dossier `node_modules/` (~100 MB).

## Étape 3 : Vérifier l'installation

Lancez les tests de régression :

```bash
npm run build
npm test
```

**Attendu :** 
- `build` : ✓ OK, génère `dist/`
- `test` : tous les tests verts (smoke 48/48, touch 12/12, camera 6/6, bots 8/8, character 72/72, rig 31/31, material 18/18, env 22/22)

Si l'un des tests échoue, consultez la section « Dépannage » ci-dessous.

## Étape 4 : Lancer le jeu en développement

```bash
npm run dev
```

Ouvrez votre navigateur à l'adresse affichée (généralement http://localhost:5173).

### Commandes clavier/souris (ordinateur)

| Action | Touche |
| --- | --- |
| Se déplacer | `Z` `Q` `S` `D` (AZERTY) ou `W` `A` `S` `D` (QWERTY) |
| Viser | Souris |
| Tirer | Clic gauche |
| Viser au fusil | Clic droit |
| Sprinter | `Maj` |
| Sauter | `Espace` |
| Accroupir | `C` ou `Ctrl` |
| Recharger | `R` |
| Compétences | `1` `2` `3` |
| Véhicule (monter/descendre) | `E` |
| Pause | `Échap` |
| Scores | `Tab` |

## Étape 5 : Consulter la documentation

Tous les détails techniques et décisions du projet sont dans `docs/` :

- **[docs/INDEX.md](INDEX.md)** : table des matières (lire en premier)
- **[docs/CURRENT-STATE.md](CURRENT-STATE.md)** : état exact du jeu, ce qui fonctionne, bugs connus
- **[docs/ROADMAP.md](ROADMAP.md)** : prochaines étapes
- **[docs/DECISIONS.md](DECISIONS.md)** : décisions importantes verrouillées ou en attente
- **[docs/SESSION-HANDOFF.md](SESSION-HANDOFF.md)** : résumé pour une reprise de session Claude Code
- **[CLAUDE.md](../CLAUDE.md)** : règles de travail permanentes et conventions du projet

## Étape 6 : Récupérer les actifs externes (si nécessaire)

Aucun actif externe n'est actuellement nécessaire pour jouer. Cependant, les travaux futurs dépendent du **Medieval Village MegaKit**.

Si vous avez accès au kit tiers, consultez [docs/EXTERNAL_ASSETS.md](EXTERNAL_ASSETS.md) et [docs/map1/MAP1-ENVIRONMENT-PLAN.md](map1/MAP1-ENVIRONMENT-PLAN.md), § 6 pour les instructions de transfert.

## Étape 7 (optionnel) : Générer des captures visuelles

Pour vérifier visuellement le rendu :

```bash
npm run shots -- test-visuel-[votre-label] game
```

Les captures sont sauvegardées dans `test-results/shots/test-visuel-[votre-label]/`.

Consultez [docs/systems/VISUAL-VALIDATION](systems/VISUAL-VALIDATION.md) pour plus de détails.

## Dépannage

### Les tests échouent

**Symptôme :** Un ou plusieurs tests failent (par exemple, `test:smoke`, `test:bots`).

**Solutions:**
1. Vérifiez que `npm install` a réussi (check `node_modules/` existe).
2. Relancez : `npm run build` puis `npm test`.
3. Consultez le détail de l'erreur en relançant la suite spécifique (ex. `npm run test:bots`).
4. Si le problème persiste, vérifiez :
   - Node.js version : `node --version` (doit être 20+)
   - Git à jour : `git pull origin claude/dazzling-cray-gn1bg5`
   - Disque : au moins 1 GB libre

### Le jeu ne s'ouvre pas dans le navigateur

**Symptôme :** Erreur réseau, page blanche, ou le serveur Vite ne démarre pas.

**Solutions:**
1. Vérifiez que `npm run dev` s'exécute sans erreur.
2. Essayez un autre navigateur (Chrome, Firefox).
3. Allez sur http://localhost:5173 (le port peut différer si 5173 est occupé).
4. Si l'erreur persiste : arrêtez le serveur (`Ctrl+C`) et relancez.

### Le jeu lance mais les bots ou le rendu se bugent

**Symptôme :** Bots bloqués, caméra cassée, personnages invisibles, FPS très bas.

**Solutions:**
1. Consultez [docs/CURRENT-STATE.md](CURRENT-STATE.md), section « Problèmes connus ».
2. Certains bugs sont connus et documentés.
3. Essayez une partie 8v8 au lieu de 16v16 (moins de charge).
4. Videz le cache du navigateur (`Ctrl+Shift+Del`) et rechargez.

### Erreur de build ou d'import

**Symptôme :** Erreur lors de `npm run build`, par exemple « cannot find module ».

**Solutions:**
1. Supprimez `node_modules/` et `package-lock.json`, puis relancez `npm install`.
2. Assurez-vous que Git a bien récupéré tous les fichiers : `git status` (doit montrer un arbre propre).
3. Relancez `npm run build`.

## Commandes utiles

```bash
npm run dev              # serveur de développement (port 5173)
npm run build            # construit dist/ pour production
npm run preview          # sert dist/ en local pour vérification pré-déploiement

npm test                 # tous les tests de régression
npm run test:smoke       # menu → déploiement → partie
npm run test:touch       # jeu sur téléphone émulé
npm run test:camera      # caméra jamais dans un mur
npm run test:bots        # partie simulée 3 min
npm run test:character   # personnages, chemins de rendu
npm run test:rig         # contrat de squelette, adaptateur
npm run test:material    # matériau d'équipe, masque
npm run test:env         # carte 1, registre d'assets, kit

npm run shots -- label [turns|poses|sheet|game|fx|ui|all]  # captures visuelles

npm run check:glb -- fichier.glb           # valide un asset GLB
```

## Pour développer (contributeurs)

Consultez [CLAUDE.md](../CLAUDE.md) pour les règles de travail, les procédures de test et les skills disponibles.

Commandes supplémentaires pour le développement :

```bash
RENDU=legacy npm test    # teste le chemin de rendu de repli (si actif)
npm run shots -- mon-test all  # toutes les captures
```

## Fichiers importants

```
Projet-Battle/
├── README.md                     # accueil
├── CLAUDE.md                     # règles permanentes du projet
├── package.json                  # scripts npm
├── vite.config.js                # config Vite
├── index.html                    # page du jeu
├── fiche.html                    # fiche personnage
├── src/                          # code source
│   ├── main.js                   # point d'entrée
│   ├── config.js                 # équilibre du jeu (game design)
│   ├── game/                     # logique de jeu
│   ├── character/                # personnage procédural
│   ├── environment/              # carte 1
│   ├── ui/                       # HUD, menus
│   └── sheet/                    # fiche personnage
├── tests/                        # suites de test
├── tools/                        # outils développement (Blender, env-kit)
├── art/                          # assets artistiques (Blender)
├── docs/                         # documentation technique
└── dist/                         # sortie build (généré)
```

## Besoin d'aide ?

- **Documentation générale :** [docs/INDEX.md](docs/INDEX.md)
- **État du jeu :** [docs/CURRENT-STATE.md](docs/CURRENT-STATE.md)
- **Problèmes connus :** [docs/CURRENT-STATE.md](docs/CURRENT-STATE.md), section « Problèmes connus »
- **Skills et procédures :** [CLAUDE.md](../CLAUDE.md)

Bonne chance, et bon jeu ! 🎮
