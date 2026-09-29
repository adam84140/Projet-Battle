# Frontline Legends — instructions permanentes

Jeu de tir **cartoon à la 3ᵉ personne** jouable dans le navigateur (Three.js + Vite, sans moteur), développé avec Claude Code Cloud. Conquête 3 drapeaux, 3 classes, bots 8v8 / 16v16, jeep et char, ordinateur d'abord, tactile ensuite.

- **Le dépôt Git est la source de vérité technique.** Un rapport, une capture ou un artefact publié ne remplace jamais le dépôt.
- **Base de connaissances : [`docs/INDEX.md`](docs/INDEX.md)** (aussi utilisable comme coffre Obsidian). Ce fichier ne contient que les règles permanentes ; les détails sont dans `docs/`.
- Langue du projet : français (interface, commentaires, docs). Messages de commit : anglais, style `type(scope): résumé`.

## Jalon actuel
**MAP 1 GOLD** → sous-jalon **MASTER CHARACTER ASSAULT**. État vérifié : [`docs/CURRENT-STATE.md`](docs/CURRENT-STATE.md). Prochaine étape : [`docs/SESSION-HANDOFF.md`](docs/SESSION-HANDOFF.md).

## Règles d'or
1. **Préserver ce qui fonctionne. Améliorer par petites étapes. Ne pas élargir le périmètre. La qualité avant la quantité.**
2. **Pas de réécriture inutile.** Avant de toucher un système central (boucle de jeu, physique, animateur, personnages, IA, rendu) : comprendre, lister les dépendances, écrire ou identifier le test qui protège le comportement, puis faire le plus petit changement sûr.
3. **Changement risqué → STOP et proposer** (quoi, pourquoi, ce qui peut casser, alternative plus sûre). Pas de réécriture sans autorisation explicite.
4. **ONE MAP FIRST** : la carte 2 ne commence pas avant que la carte 1 soit GOLD ([`docs/map1/MAP1-GOLD.md`](docs/map1/MAP1-GOLD.md)). Décisions verrouillées : [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Gel du périmètre (jusqu'à MAP 1 GOLD)
Interdit sans autorisation explicite : nouvelles cartes, nouveaux modes, multijoueur, serveur, progression, passe de combat, boutique, monétisation, clans, matchmaking, grandes bibliothèques d'armes, grands systèmes de personnalisation. Autorisé : finition, correction, contenu de la carte 1, production du Master Assault.

## Aucune affirmation « terminé » sans preuve
Un travail n'est terminé que si **tout** est vrai :
- `npm run build` réussit ;
- les tests concernés passent (liste ci-dessous) et **aucune erreur console** ;
- le jeu tourne réellement (partie lancée, pas seulement des tests unitaires) ;
- validation visuelle faite (captures avant/après regardées) pour tout changement visible ;
- aucune régression connue bloquante. Sinon : dire précisément ce qui n'est pas vérifié.

## Régression gameplay (obligatoire avant chaque commit de code)
```bash
npm run build
npm run test:smoke    # parcours complet ordinateur (48 vérifications)
npm run test:touch    # téléphone émulé
npm run test:camera   # caméra jamais dans le décor
npm run test:bots     # partie simulée 3 min : blocages, combats, captures
npm test              # les quatre à la suite
```
Si un changement touche un système non couvert : ajouter une vérification au test adapté. Procédure détaillée : skill `gameplay-regression`.

## Validation visuelle
`npm run shots -- <étiquette> [turn|poses|sheet|game|fx|ui|all]` → `test-results/shots/<étiquette>/`. Faire les captures **avant** puis **après**, les regarder, comparer. Procédure : skill `visual-validation`.

## Performance (scénario de référence : 16v16)
- **Aucune régression** par rapport aux mesures de référence de [`docs/systems/PERFORMANCE.md`](docs/systems/PERFORMANCE.md) (coût logique, pics, appels de rendu, mémoire GPU stable sur 3 relances).
- Objectifs GOLD, **pas encore atteints en 16v16** : logique < 4 ms, aucune image > 16 ms sur 2 min, ≤ 250 appels de rendu en vue de jeu (le Master Assault en est le levier principal).
- Mesurer avant d'optimiser ; pas d'optimisation spéculative. Le conteneur Cloud n'a pas de GPU : les FPS réels se mesurent sur une vraie machine (à signaler comme non vérifié).
Procédure : skill `threejs-performance`.

## Conventions techniques à respecter
- Tout le game design chiffré est dans `src/config.js`.
- Personnage face à +Z, droite = −X ; noms d'os en camelCase avec suffixe `L`/`R`.
- Le décor utilise un générateur à graine fixe : **ne jamais changer l'ordre des tirages** dans `World.js` ; ajouter les éléments après `buildScatter()`.
- Les réglages sauvegardés (`localStorage`, clé `frontline-legends-settings-v1`) doivent rester compatibles.
- Objets retirés de la scène : libérer leurs géométries (`disposeTree`), les géométries partagées étant marquées par `markShared`.
- Pas de dépendance nouvelle sans raison forte ; jamais de dépendance liée à Obsidian.

## Documentation
- Mettre à jour `docs/` **dans le même commit** que le travail décrit : `CURRENT-STATE.md` (faits vérifiés seulement), `DECISIONS.md` (toute décision structurante, avec ID), `ROADMAP.md` si l'ordre change, le doc système concerné.
- Liens Markdown relatifs standard (`[Texte](chemin.md)`), lisibles sur GitHub et dans Obsidian. Images dans `docs/_attachments/`.
- Pas de fichier vide « pour la structure ». Pas d'historique de session dans ce fichier.

## Skills du projet
Dans `.claude/skills/` : `gameplay-regression`, `visual-validation`, `threejs-performance`, `frontline-art-direction`, `character-production`, `character-animation`, `map1-level-design`. Les utiliser dès que la tâche correspond ; elles pointent vers les docs de référence et ne les remplacent pas.

## Git
- Travailler sur la branche désignée par la session ; `git push -u origin <branche>` ; réessayer en cas d'erreur réseau.
- Jamais de force push, jamais de merge vers `main`, pas de pull request sans demande explicite.
- Commits petits et descriptifs ; ne jamais commiter `dist/`, `node_modules/`, `test-results/`, l'état d'espace de travail Obsidian.
- Le proxy Git Cloud refuse de pousser les tags : un point de contrôle se note par son **hash de commit** dans `docs/DECISIONS.md`.
- Point de contrôle stable avant Master Character : `05827b4807c67959e125c9681b5ffa953b113a29` (D-004).

## Démarrage d'une nouvelle session
1. `git status -sb`, `git log -5 --oneline` : vérifier la branche et un arbre propre.
2. Lire `docs/SESSION-HANDOFF.md`, puis `docs/CURRENT-STATE.md` et les docs liés à la tâche.
3. `npm install` si besoin, puis `npm run build` et `npm test` : établir l'état réel avant de modifier quoi que ce soit.
4. Si l'état réel contredit la documentation : le signaler et corriger la documentation.

## Fin de session (passation)
1. Tests verts (ou échecs documentés), build OK.
2. Mettre à jour `docs/CURRENT-STATE.md` et `docs/SESSION-HANDOFF.md` (état Git, ce qui a été fait, tests, problèmes connus, objectif exact suivant).
3. Commiter et pousser ; vérifier que la branche distante contient le dernier commit.

## Autonomie
- Avancer sans demander tant qu'aucune condition d'arrêt n'est atteinte.
- **Conditions d'arrêt (signaler avant de continuer)** : état Git incohérent ; fichiers essentiels manquants ; modifications non commitées d'origine inconnue ; réécriture d'un système central nécessaire ; risque pour la compatibilité des données sauvegardées ; régression de performance importante ; fonctionnalité cassée non réparable sans risque ; dépendance ou service externe bloquant ; décision qui change l'architecture.
- Ne demander à l'humain que ce qui lui revient : accès, autorisations, assets propriétaires, décisions irréversibles, réécriture majeure, travail sur sa machine (GPU réel, écoute du son, Blender).
