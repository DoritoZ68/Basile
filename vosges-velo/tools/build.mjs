// Assemble le jeu en un seul fichier HTML autonome : dist/vosges-velo.html
// (code, données IGN/OSM et images intégrés -> s'ouvre d'un double-clic, sans serveur).
import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const watch = process.argv.includes("--watch");

const b64 = (buf) => Buffer.from(buf).toString("base64");
const gz = (file) => b64(gzipSync(readFileSync(join(root, "data", file)), { level: 9 }));
const img = (file, mime) => `data:${mime};base64,${b64(readFileSync(join(root, "data", file)))}`;

function dataScript() {
  const data = {
    world: gz("world.json"),
    terrain: gz("terrain.bin"),
    outer: gz("outer.bin"),
    outerImg: img("outer.jpg", "image/jpeg"),
    buildings: gz("buildings.bin"),
    network: gz("network.bin"),
    networkNames: gz("network.json"),
    ortho: img("ortho.jpg", "image/jpeg"),
    orthoSmall: img("ortho-1k.jpg", "image/jpeg"),
    vegetation: img("vegetation.png", "image/png"),
  };
  return `window.__VV_DATA__=${JSON.stringify(data)};`;
}

async function assemble(js) {
  const html = readFileSync(join(root, "src", "index.html"), "utf8");
  const css = readFileSync(join(root, "src", "style.css"), "utf8");
  const out = html
    .replace("/*__STYLE__*/", () => css)
    .replace("/*__DATA__*/", () => dataScript())
    .replace("/*__APP__*/", () => js.replace(/<\/script/g, "<\\/script"));
  mkdirSync(join(root, "dist"), { recursive: true });
  writeFileSync(join(root, "dist", "vosges-velo.html"), out);
  // variante sans squelette de document, pour la publication en ligne (Artifact)
  const art = out
    .replace(/<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset[^>]*>\s*<meta name="viewport"[^>]*>/i, "")
    .replace(/<\/head>\s*<body>/i, "")
    .replace(/<\/body>\s*<\/html>\s*$/i, "");
  writeFileSync(join(root, "dist", "vosges-velo.artifact.html"), art);
  console.log(`dist/vosges-velo.html  ${(out.length / 1e6).toFixed(1)} Mo`);
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
