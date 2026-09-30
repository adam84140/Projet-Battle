// Chargeur des assets d'environnement par identifiant sémantique (D-024).
// identifiant → registre → fichier glTF du paquet actuel → modèle chargé une fois, instances
// partageant géométries et matériaux.
//
// NON BRANCHÉ dans le jeu : la carte 1 est toujours construite par World.js. Ce module sert au
// chemin d'intégration non destructif prévu (docs/map1/MAP1-ENVIRONMENT-PLAN.md).
// Règles : jamais de nom de fichier ici ni chez l'appelant ; un identifiant non lié renvoie null
// (l'appelant garde alors le décor actuel) ; un identifiant inconnu lève une erreur.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { markShared } from '../character/parts.js';

export class EnvAssetLibrary {
  constructor(registry, { baseUrl = import.meta.env?.BASE_URL ?? './', loader = new GLTFLoader() } = {}) {
    this.registry = registry;
    this.baseUrl = baseUrl;
    this.loader = loader;
    this.templates = new Map(); // adresse du fichier → scène chargée (jamais ajoutée à la scène du jeu)
  }

  // Fichiers nécessaires à un identifiant (assemblages de modules compris)
  urlsFor(id, out = new Set()) {
    const r = this.registry.resolve(id);
    if (!r.source) return out;
    if (r.source.parts) for (const p of r.source.parts) this.urlsFor(p.id, out);
    else out.add(r.source.url);
    return out;
  }

  // Charge une fois chaque fichier utile (à faire au chargement de la carte, pas en partie)
  async preload(ids) {
    const urls = new Set();
    for (const id of ids) this.urlsFor(id, urls);
    const todo = [...urls].filter((u) => !this.templates.has(u));
    await Promise.all(
      todo.map(async (u) => {
        const gltf = await this.loader.loadAsync(this.baseUrl + u);
        gltf.scene.traverse((o) => {
          if (!o.isMesh) return;
          // géométries partagées par toutes les instances : libérées par dispose(), jamais par disposeTree
          markShared(o.geometry);
          o.castShadow = true;
          o.receiveShadow = true;
        });
        this.templates.set(u, gltf.scene);
      }),
    );
  }

  // Nouvelle instance (groupe) de l'identifiant, ou null s'il n'est lié à aucun paquet
  instantiate(id) {
    const r = this.registry.resolve(id);
    if (!r.source) return null;
    const g = new THREE.Group();
    g.name = id;
    if (r.source.parts) {
      for (const p of r.source.parts) {
        const child = this.instantiate(p.id);
        if (!child) return null;
        child.position.fromArray(p.p);
        child.rotation.y = p.rotY;
        g.add(child);
      }
    } else {
      const t = this.templates.get(r.source.url);
      if (!t) throw new Error(`${id} : fichier non préchargé (appeler preload)`);
      const c = t.clone(true);
      c.scale.multiplyScalar(r.source.scale);
      c.rotation.y = r.source.rotY;
      c.position.fromArray(r.source.offset);
      g.add(c);
    }
    g.userData.env = { id, family: r.family, pack: r.source.pack };
    return g;
  }

  stats() {
    const geos = new Set();
    for (const t of this.templates.values()) t.traverse((o) => o.isMesh && geos.add(o.geometry));
    return { files: this.templates.size, geometries: geos.size };
  }

  // Libère géométries, matériaux et textures chargés (les instances ne doivent plus être affichées)
  dispose() {
    for (const t of this.templates.values()) {
      t.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const k of Object.keys(m)) if (m[k]?.isTexture) m[k].dispose();
          m.dispose();
        }
      });
    }
    this.templates.clear();
  }
}
