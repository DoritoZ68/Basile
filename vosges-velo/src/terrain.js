// Relief IGN (grille ~30 m) découpé en dalles avec niveaux de détail,
// texturé par la photographie aérienne IGN + texture de détail procédurale.
import * as THREE from "three";

export class Heightfield {
  constructor(meta, raw) {
    this.meta = meta;
    this.nx = meta.nx;
    this.nz = meta.nz;
    this.x0 = meta.x_min;
    this.z0 = meta.z_min;
    this.w = meta.x_max - meta.x_min;
    this.d = meta.z_max - meta.z_min;
    this.cx = this.w / (this.nx - 1);
    this.cz = this.d / (this.nz - 1);
    this.h = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) this.h[i] = raw[i] / 10;
  }

  at(i, j) {
    i = i < 0 ? 0 : i >= this.nx ? this.nx - 1 : i;
    j = j < 0 ? 0 : j >= this.nz ? this.nz - 1 : j;
    return this.h[j * this.nx + i];
  }

  height(x, z) {
    const fx = (x - this.x0) / this.cx, fz = (z - this.z0) / this.cz;
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j;
    const a = this.at(i, j), b = this.at(i + 1, j), c = this.at(i, j + 1), d = this.at(i + 1, j + 1);
    // même découpage en triangles que le maillage
    if (tx + tz <= 1) return a + (b - a) * tx + (c - a) * tz;
    return d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
  }

  // Aplanit le relief sous les routes (déblais / remblais) pour que la
  // chaussée épouse le terrain.
  flattenRoads(routes) {
    // R0 couvre tout triangle de la grille (30 m) qui touche la chaussée :
    // dessous, le sol est exactement au niveau de la route
    const R0 = 34, R1 = 80, RMIN = 34;
    const n = this.h.length;
    const dist = new Float32Array(n).fill(1e9);
    const rh = new Float32Array(n);
    // altitude de la route la plus basse à proximité : dans les lacets, le
    // relief ne doit jamais dépasser la chaussée inférieure
    const minH = new Float32Array(n).fill(1e9);
    const ri = Math.ceil(R1 / this.cx) + 1, rj = Math.ceil(R1 / this.cz) + 1;
    for (const r of routes) {
      for (let k = 0; k < r.x.length; k++) {
        const x = r.x[k], z = r.z[k], y = r.y[k];
        const ci = Math.round((x - this.x0) / this.cx), cj = Math.round((z - this.z0) / this.cz);
        for (let j = cj - rj; j <= cj + rj; j++) {
          if (j < 0 || j >= this.nz) continue;
          const vz = this.z0 + j * this.cz;
          for (let i = ci - ri; i <= ci + ri; i++) {
            if (i < 0 || i >= this.nx) continue;
            const vx = this.x0 + i * this.cx;
            const d = Math.hypot(vx - x, vz - z);
            const idx = j * this.nx + i;
            if (d < dist[idx]) { dist[idx] = d; rh[idx] = y; }
            if (d < RMIN && y < minH[idx]) minH[idx] = y;
          }
        }
      }
    }
    this.roadMask = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const d = dist[i];
      if (d >= R1) continue;
      this.roadMask[i] = 1;
      let w = (d - R0) / (R1 - R0);
      w = w <= 0 ? 0 : w * w * (3 - 2 * w);
      const base = Math.min(rh[i], minH[i]) - 0.05;
      this.h[i] = base * (1 - w) + this.h[i] * w;
      if (d < RMIN) this.h[i] = Math.min(this.h[i], minH[i] - 0.05);
      if (d < R0) this.roadMask[i] = 2;
    }
  }

  // hauteur d'un sommet pour un niveau de détail grossier : près des routes,
  // on prend le point le plus bas du bloc pour ne pas couper la chaussée
  lodHeight(i, j, stride) {
    if (stride === 1 || !this.roadMask) return this.at(i, j);
    const r = stride >> 1;
    let road = false, lo = 1e9;
    for (let b = j - r; b <= j + r; b++) {
      for (let a = i - r; a <= i + r; a++) {
        const ai = Math.min(this.nx - 1, Math.max(0, a)), bj = Math.min(this.nz - 1, Math.max(0, b));
        const k = bj * this.nx + ai;
        // on ne garde que les points au niveau de la route, pas les creux voisins
        if (this.roadMask[k] === 2) { road = true; if (this.h[k] < lo) lo = this.h[k]; }
      }
    }
    return road ? Math.min(lo, this.at(i, j)) : this.at(i, j);
  }
}

function makeDetailTexture() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const img = g.createImageData(S, S);
  // bruit de valeur multi-octaves, périodique
  const rnd = (x, y, p) => {
    x = ((x % p) + p) % p; y = ((y % p) + p) % p;
    let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x, y, p) => {
    const xi = Math.floor(x), yi = Math.floor(y), tx = x - xi, ty = y - yi;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = rnd(xi, yi, p), b = rnd(xi + 1, yi, p), cc = rnd(xi, yi + 1, p), d = rnd(xi + 1, yi + 1, p);
    return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy;
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0, amp = 0.5, f = 8;
      for (let o = 0; o < 5; o++) { v += noise((x / S) * f, (y / S) * f, f) * amp; amp *= 0.5; f *= 2; }
      const k = (y * S + x) * 4;
      const val = Math.max(0, Math.min(255, 128 + (v - 0.47) * 230));
      img.data[k] = val; img.data[k + 1] = val; img.data[k + 2] = val; img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function makeTerrainMaterial(orthoImage, maxSize, renderer) {
  let src = orthoImage;
  if (orthoImage.width > maxSize) {
    const c = document.createElement("canvas");
    c.width = c.height = maxSize;
    c.getContext("2d").drawImage(orthoImage, 0, 0, maxSize, maxSize);
    src = c;
  }
  const tex = new THREE.Texture(src);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  const detail = makeDetailTexture();
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.detailMap = { value: detail };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <fog_vertex>", "#include <fog_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nuniform sampler2D detailMap;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        {
          float camD = length(vWPos - cameraPosition);
          float near = 1.0 - smoothstep(30.0, 600.0, camD);
          float d1 = texture2D(detailMap, vWPos.xz * 0.21).r;
          float d2 = texture2D(detailMap, vWPos.xz * 0.023).r;
          float d3 = texture2D(detailMap, vWPos.xz * 0.0021).r;
          float det = mix(1.0, (d1 * 0.5 + d2 * 0.5) * 2.0, near * 0.7) * mix(1.0, d3 * 2.0, 0.2);
          vec3 c = diffuseColor.rgb;
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(vec3(l), c, 1.35);
          diffuseColor.rgb = max(c, 0.0) * det * (1.45 - 0.55 * l);
        }`,
      );
  };
  return mat;
}

const CHUNK = 64;

export class Terrain {
  constructor(hf, material) {
    this.hf = hf;
    this.material = material;
    this.group = new THREE.Group();
    this.chunks = [];
    const cnx = Math.ceil((hf.nx - 1) / CHUNK), cnz = Math.ceil((hf.nz - 1) / CHUNK);
    for (let cj = 0; cj < cnz; cj++) {
      for (let ci = 0; ci < cnx; ci++) {
        const i0 = ci * CHUNK, j0 = cj * CHUNK;
        const i1 = Math.min(hf.nx - 1, i0 + CHUNK), j1 = Math.min(hf.nz - 1, j0 + CHUNK);
        const cx = hf.x0 + ((i0 + i1) / 2) * hf.cx, cz = hf.z0 + ((j0 + j1) / 2) * hf.cz;
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = true;
        this.group.add(mesh);
        this.chunks.push({ i0, j0, i1, j1, cx, cz, half: (CHUNK * hf.cx) / 2, mesh, lod: -1, geos: {} });
      }
    }
  }

  buildGeometry(c, stride) {
    const hf = this.hf;
    const cols = Math.floor((c.i1 - c.i0) / stride) + 1, rows = Math.floor((c.j1 - c.j0) / stride) + 1;
    const nIn = cols * rows, nSkirt = 4 * (cols + rows);
    const pos = new Float32Array((nIn + nSkirt) * 3);
    const nor = new Float32Array((nIn + nSkirt) * 3);
    const uv = new Float32Array((nIn + nSkirt) * 2);
    let p = 0;
    const put = (i, j, drop) => {
      const x = hf.x0 + i * hf.cx, z = hf.z0 + j * hf.cz;
      pos[p * 3] = x; pos[p * 3 + 1] = hf.lodHeight(i, j, stride) - drop; pos[p * 3 + 2] = z;
      const s = stride;
      const nx = (hf.at(i - s, j) - hf.at(i + s, j)) / (2 * s * hf.cx);
      const nz = (hf.at(i, j - s) - hf.at(i, j + s)) / (2 * s * hf.cz);
      const l = Math.hypot(nx, 1, nz);
      nor[p * 3] = nx / l; nor[p * 3 + 1] = 1 / l; nor[p * 3 + 2] = nz / l;
      uv[p * 2] = (x - hf.x0) / hf.w; uv[p * 2 + 1] = 1 - (z - hf.z0) / hf.d;
      return p++;
    };
    const idxAt = (a, b) => b * cols + a;
    for (let b = 0; b < rows; b++) for (let a = 0; a < cols; a++) put(c.i0 + a * stride, c.j0 + b * stride, 0);
    const idx = [];
    for (let b = 0; b < rows - 1; b++) {
      for (let a = 0; a < cols - 1; a++) {
        const i00 = idxAt(a, b), i10 = idxAt(a + 1, b), i01 = idxAt(a, b + 1), i11 = idxAt(a + 1, b + 1);
        idx.push(i00, i01, i10, i10, i01, i11);
      }
    }
    // jupes pour masquer les fissures entre niveaux de détail
    const drop = 4 * stride;
    const edge = (list) => {
      for (let k = 0; k < list.length - 1; k++) {
        const [a0, b0] = list[k], [a1, b1] = list[k + 1];
        const t0 = idxAt(a0, b0), t1 = idxAt(a1, b1);
        const s0 = put(c.i0 + a0 * stride, c.j0 + b0 * stride, drop);
        const s1 = put(c.i0 + a1 * stride, c.j0 + b1 * stride, drop);
        idx.push(t0, s0, t1, t1, s0, s1, t0, t1, s0, t1, s1, s0);
      }
    };
    const top = [], bottom = [], left = [], right = [];
    for (let a = 0; a < cols; a++) { top.push([a, 0]); bottom.push([a, rows - 1]); }
    for (let b = 0; b < rows; b++) { left.push([0, b]); right.push([cols - 1, b]); }
    edge(top); edge(bottom); edge(left); edge(right);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos.subarray(0, p * 3), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor.subarray(0, p * 3), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv.subarray(0, p * 2), 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }

  // lodScale : 1 = élevé, 0,6 = bas
  update(camPos, lodScale = 1) {
    for (const c of this.chunks) {
      const dx = Math.max(0, Math.abs(camPos.x - c.cx) - c.half);
      const dz = Math.max(0, Math.abs(camPos.z - c.cz) - c.half);
      const d = Math.hypot(dx, dz) / lodScale;
      const stride = d < 1300 ? 1 : d < 3500 ? 2 : d < 7000 ? 4 : 8;
      if (stride !== c.lod) {
        // une seule géométrie par dalle en mémoire graphique
        if (c.geos[c.lod]) { c.geos[c.lod].dispose(); delete c.geos[c.lod]; }
        c.lod = stride;
        c.geos[stride] = this.buildGeometry(c, stride);
        c.mesh.geometry = c.geos[stride];
      }
    }
  }

  dispose() {
    for (const c of this.chunks) for (const g of Object.values(c.geos)) g.dispose();
  }
}

// Grand paysage autour de la zone de jeu (~120 x 95 km, maille 500 m).
// À l'intérieur de la zone détaillée, il passe juste sous le relief fin.
export function buildOuterTerrain(meta, raw, hf, material) {
  const { nx, nz } = meta;
  const w = meta.x_max - meta.x_min, d = meta.z_max - meta.z_min;
  const pos = new Float32Array(nx * nz * 3);
  const uv = new Float32Array(nx * nz * 2);
  const h = new Float32Array(nx * nz);
  const inside = (x, z, m) => x > hf.x0 + m && x < hf.x0 + hf.w - m && z > hf.z0 + m && z < hf.z0 + hf.d - m;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const x = meta.x_min + (w * i) / (nx - 1), z = meta.z_min + (d * j) / (nz - 1);
      h[k] = inside(x, z, 0) ? hf.height(x, z) - (inside(x, z, 400) ? 60 : 12) : raw[k] / 10;
      pos[k * 3] = x; pos[k * 3 + 1] = h[k]; pos[k * 3 + 2] = z;
      uv[k * 2] = i / (nx - 1); uv[k * 2 + 1] = 1 - j / (nz - 1);
    }
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.matrixAutoUpdate = false;
  return m;
}
