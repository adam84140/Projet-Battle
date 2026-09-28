import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // Chemins relatifs : le build fonctionne aussi sur GitHub Pages (sous-dossier)
  base: './',
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: root + 'index.html',
        fiche: root + 'fiche.html',
      },
      output: {
        // three.js dans un fichier séparé (mis en cache entre le jeu et la fiche)
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
});
