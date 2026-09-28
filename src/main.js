import { loadSettings, saveSettings } from './config.js';
import { Game } from './game/Game.js';
import { HUD } from './ui/HUD.js';
import { UI } from './ui/Screens.js';

// Point d'entrée : chargement du monde, puis menu principal.

const settings = loadSettings();

function fail(err) {
  console.error(err);
  const t = document.querySelector('#loading .loading-text');
  if (t) t.textContent = "Impossible de lancer le jeu : WebGL n'est pas disponible sur cet appareil ou ce navigateur.";
  document.querySelector('#loading .loading-bar')?.remove();
}

// On laisse le navigateur afficher l'écran de chargement avant de construire la carte
requestAnimationFrame(() =>
  setTimeout(() => {
    try {
      const game = new Game(document.getElementById('app'), settings);
      const hud = new HUD(game, document.getElementById('hud'));
      game.hud = hud;
      const ui = new UI(game, document.getElementById('ui'), settings, () => saveSettings(settings));
      document.getElementById('loading').classList.remove('on');
      ui.show('menu');
      window.__game = game;
    } catch (err) {
      fail(err);
    }
  }, 30),
);
