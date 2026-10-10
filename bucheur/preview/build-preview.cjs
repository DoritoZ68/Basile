/**
 * Construit l'aperçu interactif : une seule page HTML qui contient toute l'app web
 * (code, styles, polices), dans un cadre de téléphone avec un panneau d'outils de test.
 *
 *   node preview/build-preview.cjs        →  dist-preview/bucheur-apercu.html
 *
 * L'app est exportée avec EXPO_PUBLIC_PREVIEW=1 : l'achat de Bûcheur Pro y est simulé.
 * La page suit le format des Artifacts claude.ai (pas de <html>/<head>/<body>, tout en ligne).
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist-preview');
const OUT = path.join(DIST, 'bucheur-apercu.html');

execSync('npx expo export --platform web --clear --output-dir dist-preview', {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, CI: '1', EXPO_PUBLIC_PREVIEW: '1' },
});

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const pick = (re) => {
  const m = html.match(re);
  if (!m) throw new Error(`Introuvable dans index.html : ${re}`);
  return m[1];
};

const MIME = { '.ttf': 'font/ttf', '.png': 'image/png', '.otf': 'font/otf', '.woff2': 'font/woff2' };
/** Remplace chaque chemin "/assets/…" par une URI data:, pour que la page n'ait besoin d'aucun fichier. */
const inlineAssets = (text) =>
  text.replace(/\/assets\/[^"')\s]+?\.(ttf|otf|woff2|png)/g, (url) => {
    const file = path.join(DIST, url);
    if (!fs.existsSync(file)) return url;
    const mime = MIME[path.extname(file)];
    return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  });
// Empêche le code de fermer la balise <script> qui le contient.
const safeScript = (js) => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

const reset = pick(/<style id="expo-reset">([\s\S]*?)<\/style>/);
const fonts = inlineAssets(pick(/<style id="expo-generated-fonts">([\s\S]*?)<\/style>/));
const globalCss = fs.readFileSync(
  path.join(DIST, pick(/<link rel="stylesheet" href="([^"]+)"/)),
  'utf8',
);
const bundle = safeScript(
  inlineAssets(fs.readFileSync(path.join(DIST, pick(/<script src="([^"]+)" defer><\/script>/)), 'utf8')),
);
const shell = fs.readFileSync(path.join(__dirname, 'shell.html'), 'utf8');

const page = shell
  .replace('/*EXPO_RESET*/', () => reset)
  .replace('/*GLOBAL_CSS*/', () => globalCss)
  .replace('/*FONTS*/', () => fonts)
  .replace('/*APP_BUNDLE*/', () => bundle);

fs.writeFileSync(OUT, page);
console.log(`✓ ${path.relative(ROOT, OUT)} (${(page.length / 1024 / 1024).toFixed(1)} Mo)`);
