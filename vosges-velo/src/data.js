// Chargement des données intégrées au fichier HTML (voir tools/build.mjs).

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function gunzip(b64) {
  const stream = new Blob([b64ToBytes(b64)]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

export async function loadData(onProgress) {
  const raw = window.__VV_DATA__;
  onProgress(0.05, "Lecture des routes…");
  const world = JSON.parse(new TextDecoder().decode(await gunzip(raw.world)));
  onProgress(0.2, "Relief IGN RGE ALTI…");
  const terrain = new Uint16Array(await gunzip(raw.terrain));
  onProgress(0.35, "Bâtiments BD TOPO…");
  const buildings = JSON.parse(new TextDecoder().decode(await gunzip(raw.buildings)));
  onProgress(0.5, "Photographies aériennes…");
  const [ortho, orthoSmall, vegetation] = await Promise.all([
    loadImage(raw.ortho),
    loadImage(raw.orthoSmall),
    loadImage(raw.vegetation),
  ]);
  // la carte de végétation est lue pixel par pixel pour planter les arbres
  const c = document.createElement("canvas");
  c.width = vegetation.width;
  c.height = vegetation.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(vegetation, 0, 0);
  const veg = { w: c.width, h: c.height, px: ctx.getImageData(0, 0, c.width, c.height).data };
  return { ...world, terrain, buildings, ortho, orthoSmall, veg };
}
