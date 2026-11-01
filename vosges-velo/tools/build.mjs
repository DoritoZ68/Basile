// Construit le jeu sous deux formes :
//   dist/vosges-velo.html : un seul fichier autonome (code, styles, données
//     IGN/OSM et images intégrés) qui s'ouvre d'un double-clic, sans serveur ;
//   dist/web/ : la version en fichiers séparés servie par server/server.cjs
//     (index.html, css/*.css, js/app.js, data/*), plus légère à charger et
//     mise en cache fichier par fichier par le navigateur.
import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, copyFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const watch = process.argv.includes("--watch");

// fichiers de données (dossier data/) et leur nom dans le jeu
const DATA = {
  world: "world.json", terrain: "terrain.bin", outer: "outer.bin", buildings: "buildings.bin",
  network: "network.bin", networkNames: "network.json",
};
const IMAGES = { outerImg: "outer.jpg", ortho: "ortho.jpg", orthoSmall: "ortho-1k.jpg", vegetation: "vegetation.png" };

const b64 = (buf) => Buffer.from(buf).toString("base64");
const gz = (file) => b64(gzipSync(readFileSync(join(root, "data", file)), { level: 9 }));
const mime = (f) => (f.endsWith(".png") ? "image/png" : "image/jpeg");
const img = (file) => `data:${mime(file)};base64,${b64(readFileSync(join(root, "data", file)))}`;

// styles : src/css/*.css dans l'ordre de leur numéro
const cssFiles = () => readdirSync(join(root, "src", "css")).filter((f) => f.endsWith(".css")).sort();
const css = () => cssFiles().map((f) => readFileSync(join(root, "src", "css", f), "utf8")).join("\n");

function dataScript() {
  const data = {};
  for (const [k, f] of Object.entries(DATA)) data[k] = gz(f);
  for (const [k, f] of Object.entries(IMAGES)) data[k] = img(f);
  return `window.__VV_DATA__=${JSON.stringify(data)};`;
}

async function assemble(js) {
  const html = readFileSync(join(root, "src", "index.html"), "utf8");
  mkdirSync(join(root, "dist"), { recursive: true });

  // 1. fichier unique
  const out = html
    .replace("<!--__STYLES__-->", () => `<style>${css()}</style>`)
    .replace("<!--__SCRIPTS__-->", () => `<script>${dataScript()}</script>\n<script>${js.replace(/<\/script/g, "<\\/script")}</script>`);
  writeFileSync(join(root, "dist", "vosges-velo.html"), out);
  // variante sans squelette de document, pour la publication en ligne (Artifact)
  const art = out
    .replace(/<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset[^>]*>\s*<meta name="viewport"[^>]*>/i, "")
    .replace(/<\/head>\s*<body>/i, "")
    .replace(/<\/body>\s*<\/html>\s*$/i, "");
  writeFileSync(join(root, "dist", "vosges-velo.artifact.html"), art);

  // 2. version web en fichiers séparés
  const web = join(root, "dist", "web");
  rmSync(web, { recursive: true, force: true });
  for (const d of ["css", "js", "data"]) mkdirSync(join(web, d), { recursive: true });
  for (const f of cssFiles()) copyFileSync(join(root, "src", "css", f), join(web, "css", f));
  writeFileSync(join(web, "js", "app.js"), js);
  const files = {};
  for (const [k, f] of Object.entries({ ...DATA, ...IMAGES })) { copyFileSync(join(root, "data", f), join(web, "data", f)); files[k] = `data/${f}`; }
  writeFileSync(join(web, "index.html"), html
    .replace("<!--__STYLES__-->", () => cssFiles().map((f) => `<link rel="stylesheet" href="css/${f}">`).join("\n"))
    .replace("<!--__SCRIPTS__-->", () => `<script>window.__VV_FILES__=${JSON.stringify(files)};</script>\n<script src="js/app.js"></script>`));

  console.log(`dist/vosges-velo.html  ${(out.length / 1e6).toFixed(1)} Mo · dist/web/ (${cssFiles().length} feuilles de style, app.js ${(js.length / 1e6).toFixed(1)} Mo)`);
}

const opts = {
  entryPoints: [join(root, "src", "main.js")],
  bundle: true,
  format: "iife",
  minify: !watch && !process.env.NOMINIFY,
  target: ["es2020"],
  write: false,
  legalComments: "none",
};

if (watch) {
  const ctx = await esbuild.context({
    ...opts,
    plugins: [{
      name: "assemble",
      setup(b) {
        b.onEnd(async (r) => {
          if (r.errors.length) return;
          await assemble(r.outputFiles[0].text);
        });
      },
    }],
  });
  await ctx.watch();
  console.log("surveillance des fichiers…");
} else {
  const r = await esbuild.build(opts);
  await assemble(r.outputFiles[0].text);
}
