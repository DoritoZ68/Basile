// Chargement des données : intégrées au fichier HTML unique (__VV_DATA__,
// compressées en base64), ou fichiers séparés de la version web
// (__VV_FILES__, téléchargés et mis en cache par le navigateur). Voir
// tools/build.mjs.

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

// voir tools/fetch_network.py pour le format
function decodeNetwork(dv, names) {
  const out = [];
  let o = 0;
  const n = dv.getUint32(o, true); o += 4;
  for (let s = 0; s < n; s++) {
    const cls = dv.getUint8(o), w = dv.getUint8(o + 1) / 10, ni = dv.getUint16(o + 2, true), flags = dv.getUint8(o + 4), np = dv.getUint16(o + 5, true);
    let x = dv.getInt32(o + 7, true), z = dv.getInt32(o + 11, true), y = dv.getUint16(o + 15, true);
    o += 17;
    const xs = new Float32Array(np), zs = new Float32Array(np), ys = new Float32Array(np);
    xs[0] = x / 10; zs[0] = z / 10; ys[0] = y ? y / 10 : NaN;
    let known = y > 0;
    for (let k = 1; k < np; k++) {
      x += dv.getInt16(o, true); z += dv.getInt16(o + 2, true);
      const dy = dv.getInt16(o + 4, true);
      o += 6;
      if (dy === -32768) known = false; else if (known) y += dy;
      xs[k] = x / 10; zs[k] = z / 10; ys[k] = known && y > 0 ? y / 10 : NaN;
    }
    out.push({ cls, w, name: ni === 0xffff ? "" : names[ni], flags, x: xs, z: zs, y: ys });
  }
  return out;
}

function decodeBuildings(dv) {
  const out = [];
  let o = 0;
  const n = dv.getUint32(o, true); o += 4;
  for (let s = 0; s < n; s++) {
    const h = dv.getUint8(o) / 4, kind = dv.getUint8(o + 1), np = dv.getUint8(o + 2);
    let x = dv.getInt32(o + 3, true), z = dv.getInt32(o + 7, true);
    o += 11;
    const flat = new Array(np * 2);
    flat[0] = x / 10; flat[1] = z / 10;
    for (let k = 1; k < np; k++) {
      x += dv.getInt16(o, true); z += dv.getInt16(o + 2, true);
      o += 4;
      flat[k * 2] = x / 10; flat[k * 2 + 1] = z / 10;
    }
    out.push([h, kind, flat]);
  }
  return out;
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
  const raw = window.__VV_DATA__ || window.__VV_FILES__;
  // octets d'un fichier de données, quelle que soit la forme du jeu
  const bytes = window.__VV_DATA__ ? (k) => gunzip(raw[k]) : async (k) => {
    const r = await fetch(raw[k]);
    if (!r.ok) throw new Error(`${raw[k]} introuvable`);
    return r.arrayBuffer();
  };
  const text = async (k) => new TextDecoder().decode(await bytes(k));
  onProgress(0.05, "Lecture des routes…");
  const world = JSON.parse(await text("world"));
  onProgress(0.2, "Relief IGN RGE ALTI…");
  const terrain = new Uint16Array(await bytes("terrain"));
  const outer = new Uint16Array(await bytes("outer"));
  onProgress(0.3, "Réseau routier et cyclable…");
  const network = decodeNetwork(new DataView(await bytes("network")), JSON.parse(await text("networkNames")));
  onProgress(0.4, "Bâtiments BD TOPO…");
  const buildings = decodeBuildings(new DataView(await bytes("buildings")));
  onProgress(0.5, "Photographies aériennes…");
  const [ortho, orthoSmall, vegetation, outerImg] = await Promise.all([
    loadImage(raw.ortho),
    loadImage(raw.orthoSmall),
    loadImage(raw.vegetation),
    loadImage(raw.outerImg),
  ]);
  // la carte de végétation est lue pixel par pixel pour planter les arbres
  const c = document.createElement("canvas");
  c.width = vegetation.width;
  c.height = vegetation.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(vegetation, 0, 0);
  const veg = { w: c.width, h: c.height, px: ctx.getImageData(0, 0, c.width, c.height).data };
  return { ...world, outerMeta: world.outer, terrain, outer, outerImg, buildings, network, ortho, orthoSmall, veg, vegImage: vegetation };
}
