// Outils communs aux tests de régression (Playwright + serveur Vite).
// Prérequis hors de ce dépôt : `npx playwright install chromium` (une fois).
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

export async function startServer() {
  const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false } });
  await server.listen();
  const url = server.resolvedUrls.local[0].replace(/\/$/, '');
  return { server, url };
}

// Chromium sans GPU : rendu logiciel (lent mais fiable en CI / conteneur)
export async function launch(options = {}) {
  const browser = await chromium.launch({
    headless: !process.env.HEADED,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info', '--js-flags=--expose-gc'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true, ...options });
  // Polices Google : chargées si le réseau répond, abandonnées sinon (une police bloquée
  // retiendrait l'événement "load" et ferait échouer le test sans rapport avec le jeu)
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route
      .fetch({ timeout: 8000 })
      .then((response) => route.fulfill({ response }))
      .catch(() => route.abort()),
  );
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('Failed to load resource')) errors.push(t);
  });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  return { browser, context, page, errors };
}

// Avance la simulation de `secs` secondes par pas fixes (le rendu logiciel est trop lent pour le temps réel)
export function step(page, secs, fn = null) {
  return page.evaluate(
    ([secs, fn]) => {
      const g = window.__game;
      const n = Math.round(secs * 30);
      let total = 0;
      for (let i = 0; i < n; i++) {
        if (fn) new Function('g', fn)(g);
        const t0 = performance.now();
        g.update(1 / 30);
        total += performance.now() - t0;
        g.input.endFrame();
      }
      g.render();
      return n ? total / n : 0;
    },
    [secs, fn],
  );
}

export function get(page, expr) {
  return page.evaluate((expr) => new Function('g', `return (${expr});`)(window.__game), expr);
}

export function run(page, code) {
  return page.evaluate((code) => new Function('g', code)(window.__game), code);
}

export class Checks {
  constructor(name) {
    this.name = name;
    this.results = [];
  }
  ok(label, cond, detail = '') {
    this.results.push({ label, pass: !!cond, detail });
    console.log(`${cond ? '  ✔' : '  ✘'} ${label}${detail !== '' ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  }
  get failed() {
    return this.results.filter((r) => !r.pass);
  }
  summary() {
    const f = this.failed.length;
    console.log(`\n${this.name} : ${this.results.length - f}/${this.results.length} vérifications réussies`);
    return f === 0;
  }
}
