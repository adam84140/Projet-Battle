// Paquet d'assets tiers « Medieval Village MegaKit » (ou kit de village modulaire équivalent) :
// échafaudage TEMPORAIRE et REMPLAÇABLE de la carte 1 (D-024).
//
// SEUL endroit du jeu où apparaissent des chemins de ce kit (avec son inventaire généré).
// Le gameplay, les objectifs, les collisions et la navigation n'y font jamais référence.
//
// État : KIT NON LIVRÉ. Aucune liaison n'est écrite tant que les fichiers réels n'ont pas été
// ingérés (tools/env-kit/ingest.mjs) puis inventoriés (tools/env-kit/inventory.mjs) :
// on ne devine pas le contenu d'un kit. Procédure : docs/map1/MAP1-ASSET-INVENTORY.md.
export default {
  id: 'medieval-village-megakit',
  name: 'Medieval Village MegaKit',
  // fichiers du fournisseur, arborescence intacte, servis tels quels (public/kits/…)
  root: 'kits/medieval-village-megakit/',
  // kit tiers : priorité basse ; un paquet d'assets Frontline Legends aura une priorité plus haute
  priority: 10,
  status: 'non livré',
  license: {
    file: 'License_Standard.txt',
    // à remplir à l'ingestion, après lecture du fichier de licence (dépôt PUBLIC : la
    // redistribution des fichiers doit être autorisée, sinon arrêt)
    summary: null,
    redistributionInPublicRepo: null,
  },
  // identifiant sémantique (catalog.js) → { path } ou { parts }, relatif à `root`
  bindings: {},
};
