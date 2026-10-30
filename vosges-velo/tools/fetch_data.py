#!/usr/bin/env python3
"""Télécharge les données réelles du secteur Grand Ballon / Vieil Armand.

Sources (données ouvertes) :
  - Tracés routiers : OpenStreetMap via le routeur OSRM public (ODbL)
  - Altitudes : IGN RGE ALTI (Géoplateforme, Licence Ouverte 2.0)
  - Photographies aériennes : IGN BD ORTHO (Licence Ouverte 2.0)
  - Bâtiments et végétation : IGN BD TOPO (Licence Ouverte 2.0)

Usage : python3 tools/fetch_data.py   (écrit dans data/)
"""
import concurrent.futures as cf
import io
import json
import math
import os
import struct
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data")
CACHE = os.path.join(ROOT, ".cache")
os.makedirs(OUT, exist_ok=True)
os.makedirs(CACHE, exist_ok=True)

UA = {"User-Agent": "vosges-velo-data/1.0"}

# Points de passage (lat, lon). Le routeur suit les vraies routes entre eux.
P = {
    "cernay": (47.8087, 7.1788),
    "uffholtz": (47.8202, 7.1794),
    "wattwiller": (47.8372, 7.1805),
    "hwk": (47.8588, 7.1501),
    "col_amic": (47.8755, 7.1273),
    "col_gb": (47.9037, 7.1033),
    "willer": (47.8437, 7.0706),
    "thann": (47.8101, 7.1021),
    "vieux_thann": (47.8071, 7.1217),
    "hartmannswiller": (47.8626, 7.2137),
    "soultz": (47.8870, 7.2288),
    "guebwiller": (47.9095, 7.2113),
    "lautenbach": (47.9413, 7.1590),
    "lac_lauch": (47.9360, 7.0456),
    "markstein": (47.9233, 7.0318),
    "wuenheim": (47.8747, 7.2074),
}

ROUTES = [
    {
        "id": "vieil-armand",
        "name": "Le Vieil Armand",
        "subtitle": "Cernay → Uffholtz → Hartmannswillerkopf",
        "via": ["cernay", "hwk"],
    },
    {
        "id": "grand-ballon-willer",
        "name": "Le Grand Ballon par Willer-sur-Thur",
        "subtitle": "Willer-sur-Thur → Goldbach-Altenbach → Col du Grand Ballon",
        "via": ["willer", "col_gb"],
    },
    {
        "id": "route-des-cretes",
        "name": "La Route des Crêtes",
        "subtitle": "Cernay → Vieil Armand → Col Amic → Grand Ballon",
        "via": ["cernay", "hwk", "col_amic", "col_gb"],
    },
    {
        "id": "grand-ballon-markstein",
        "name": "Le Grand Ballon par le Markstein",
        "subtitle": "Guebwiller → Lautenbach → Lac de la Lauch → Markstein → Grand Ballon",
        "via": ["guebwiller", "lautenbach", "lac_lauch", "markstein", "col_gb"],
    },
    {
        "id": "piemont",
        "name": "Les villages du piémont",
        "subtitle": "Thann → Cernay → Wattwiller → Soultz → Guebwiller",
        "via": ["thann", "cernay", "wattwiller", "soultz", "guebwiller"],
    },
]

TOWNS = [
    ("Cernay", 47.8087, 7.1788, 900),
    ("Uffholtz", 47.8202, 7.1794, 500),
    ("Wattwiller", 47.8372, 7.1805, 500),
    ("Thann", 47.8101, 7.1021, 900),
    ("Vieux-Thann", 47.8071, 7.1217, 600),
    ("Willer-sur-Thur", 47.8437, 7.0706, 650),
    ("Moosch", 47.8598, 7.0487, 600),
    ("Bitschwiller-lès-Thann", 47.8293, 7.0791, 600),
    ("Goldbach-Altenbach", 47.8739, 7.1045, 450),
    ("Geishouse", 47.8834, 7.0603, 400),
    ("Hartmannswiller", 47.8626, 7.2137, 450),
    ("Wuenheim", 47.8747, 7.2074, 450),
    ("Soultz-Haut-Rhin", 47.8870, 7.2288, 900),
    ("Guebwiller", 47.9095, 7.2113, 1100),
    ("Jungholtz", 47.8854, 7.1967, 400),
    ("Berrwiller", 47.8497, 7.2177, 450),
    ("Steinbach", 47.8211, 7.1534, 400),
    ("Buhl", 47.9283, 7.1836, 600),
    ("Lautenbach", 47.9413, 7.1590, 550),
    ("Lautenbach-Zell", 47.9411, 7.1501, 450),
    ("Linthal", 47.9481, 7.1288, 500),
    ("Le Markstein", 47.9233, 7.0318, 350),
]

# Lieux remarquables (lat, lon, type)
LANDMARKS = [
    ("Grand Ballon · 1424 m", 47.9008, 7.0984, "summit"),
    ("Radar du Grand Ballon", 47.9010, 7.0981, "radar"),
    ("Monument des Diables Bleus", 47.9002, 7.0991, "memorial"),
    ("Col du Grand Ballon · 1325 m", 47.9037, 7.1033, "pass"),
    ("Col Amic · 825 m", 47.8755, 7.1273, "pass"),
    ("Hartmannswillerkopf · 956 m", 47.8609, 7.1610, "summit"),
    ("Monument national du Vieil Armand", 47.8588, 7.1501, "hwk"),
    ("Nécropole du Silberloch", 47.8591, 7.1515, "cemetery"),
    ("Col du Haag · 1238 m", 47.9051, 7.0904, "pass"),
    ("Le Markstein · 1183 m", 47.9233, 7.0318, "pass"),
    ("Lac de la Lauch", 47.9353, 7.0429, "lake"),
]


def get(url, data=None, headers=None, tries=5, timeout=120):
    h = dict(UA)
    if headers:
        h.update(headers)
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                raise
            print("  retry", i + 1, e, file=sys.stderr)
            time.sleep(2 ** (i + 1))


def cached(name, fn):
    p = os.path.join(CACHE, name)
    if os.path.exists(p):
        with open(p, "rb") as f:
            return f.read()
    b = fn()
    with open(p, "wb") as f:
        f.write(b)
    return b


# ---------------------------------------------------------------- géométrie
R_EARTH = 6371008.8


class Proj:
    def __init__(self, lat0, lon0):
        self.lat0, self.lon0 = lat0, lon0
        self.kx = math.cos(math.radians(lat0)) * R_EARTH * math.pi / 180
        self.kz = R_EARTH * math.pi / 180

    def xz(self, lat, lon):
        return ((lon - self.lon0) * self.kx, -(lat - self.lat0) * self.kz)

    def ll(self, x, z):
        return (self.lat0 - z / self.kz, self.lon0 + x / self.kx)


def elevations(points, resource="ign_rge_alti_wld"):
    """points: liste de (lat, lon) -> altitudes (m)."""
    chunks = [points[i:i + 2000] for i in range(0, len(points), 2000)]

    def one(ch):
        body = json.dumps({
            "lon": "|".join(f"{p[1]:.6f}" for p in ch),
            "lat": "|".join(f"{p[0]:.6f}" for p in ch),
            "resource": resource,
            "zonly": "true",
        }).encode()
        key = "alti_%08x_%d.json" % (abs(hash(body)) & 0xFFFFFFFF, len(ch))
        raw = cached(key, lambda: get(
            "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json",
            data=body, headers={"Content-Type": "application/json"}))
        return json.loads(raw)["elevations"]

    out = []
    with cf.ThreadPoolExecutor(6) as ex:
        for i, res in enumerate(ex.map(one, chunks)):
            out.extend(res)
            if i % 20 == 0:
                print(f"  altitudes {len(out)}/{len(points)}")
    # trous éventuels (-99999) : on reprend la valeur voisine
    for i, z in enumerate(out):
        if z is None or z < -1000:
            out[i] = out[i - 1] if i else 0
    return out


def resample(pts, step):
    """pts: liste de (x, z). Rééchantillonne à pas constant."""
    out = [pts[0]]
    acc = 0.0
    carry = 0.0
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        seg = math.hypot(x1 - x0, z1 - z0)
        if seg == 0:
            continue
        d = step - carry
        while d <= seg:
            t = d / seg
            out.append((x0 + (x1 - x0) * t, z0 + (z1 - z0) * t))
            d += step
        carry = seg - (d - step)
        acc += seg
    if math.hypot(out[-1][0] - pts[-1][0], out[-1][1] - pts[-1][1]) > step * 0.3:
        out.append(pts[-1])
    return out


def smooth(vals, radius):
    n = len(vals)
    pre = [0.0]
    for v in vals:
        pre.append(pre[-1] + v)
    res = []
    for i in range(n):
        a, b = max(0, i - radius), min(n, i + radius + 1)
        res.append((pre[b] - pre[a]) / (b - a))
    return res


def chaikin_xz(pts, iters=2):
    for _ in range(iters):
        new = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            new.append((0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]))
            new.append((0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]))
        new.append(pts[-1])
        pts = new
    return pts


# ---------------------------------------------------------------- étapes
def fetch_routes():
    res = []
    for r in ROUTES:
        coords = ";".join(f"{P[k][1]},{P[k][0]}" for k in r["via"])
        url = ("https://router.project-osrm.org/route/v1/driving/" + coords +
               "?overview=full&geometries=geojson&steps=true&continue_straight=true")
        raw = cached("osrm_" + r["id"] + ".json", lambda: get(url))
        d = json.loads(raw)["routes"][0]
        line = [(c[1], c[0]) for c in d["geometry"]["coordinates"]]
        # noms de route par tronçon (pour l'affichage)
        names = []
        for leg in d["legs"]:
            for s in leg["steps"]:
                g = s["geometry"]["coordinates"]
                if not g:
                    continue
                label = " · ".join(x for x in (s.get("ref", ""), s.get("name", "")) if x)
                names.append({"lat": g[0][1], "lon": g[0][0], "label": label})
        res.append({**r, "line": line, "names": names, "osrm_distance": d["distance"]})
        print(f"route {r['id']}: {d['distance']/1000:.1f} km, {len(line)} pts")
    return res


def main():
    routes = fetch_routes()
    lats = [p[0] for r in routes for p in r["line"]]
    lons = [p[1] for r in routes for p in r["line"]]
    margin_lat = 3500 / 111200
    lat_min, lat_max = min(lats) - margin_lat, max(lats) + margin_lat
    lat0 = (lat_min + lat_max) / 2
    margin_lon = 3500 / (111200 * math.cos(math.radians(lat0)))
    lon_min, lon_max = min(lons) - margin_lon, max(lons) + margin_lon
    lon0 = (lon_min + lon_max) / 2
    proj = Proj(lat0, lon0)
    x_min, _ = proj.xz(lat0, lon_min)
    x_max, _ = proj.xz(lat0, lon_max)
    _, z_min = proj.xz(lat_max, lon0)
    _, z_max = proj.xz(lat_min, lon0)
    width, depth = x_max - x_min, z_max - z_min
    print(f"emprise {width/1000:.1f} x {depth/1000:.1f} km")

    # ---- terrain : grille régulière ~30 m
    spacing = 30.0
    nx = int(round(width / spacing)) + 1
    nz = int(round(depth / spacing)) + 1
    print(f"grille terrain {nx} x {nz}")
    pts = []
    for j in range(nz):
        lat = lat_max - (lat_max - lat_min) * j / (nz - 1)
        for i in range(nx):
            lon = lon_min + (lon_max - lon_min) * i / (nx - 1)
            pts.append((lat, lon))
    hs = elevations(pts)
    with open(os.path.join(OUT, "terrain.bin"), "wb") as f:
        f.write(struct.pack(f"<{len(hs)}H", *[max(0, min(65535, int(round(h * 10)))) for h in hs]))

    # ---- routes : rééchantillonnage 5 m + altitude IGN
    out_routes = []
    for r in routes:
        xz = [proj.xz(lat, lon) for lat, lon in r["line"]]
        # dédoublonnage
        clean = [xz[0]]
        for p in xz[1:]:
            if math.hypot(p[0] - clean[-1][0], p[1] - clean[-1][1]) > 0.5:
                clean.append(p)
        clean = chaikin_xz(clean, 2)
        rs = resample(clean, 5.0)
        lls = [proj.ll(x, z) for x, z in rs]
        el = elevations(lls)
        el = smooth(el, 4)  # lissage ~40 m pour retirer le bruit du MNT
        dist = 0.0
        prof = []
        for k, (x, z) in enumerate(rs):
            if k:
                dist += math.hypot(x - rs[k - 1][0], z - rs[k - 1][1])
            prof.append(dist)
        gain = sum(max(0, b - a) for a, b in zip(el, el[1:]))
        names = []
        for nm in r["names"]:
            nxz = proj.xz(nm["lat"], nm["lon"])
            best = min(range(len(rs)), key=lambda k: (rs[k][0] - nxz[0]) ** 2 + (rs[k][1] - nxz[1]) ** 2)
            if nm["label"] and (not names or names[-1][1] != nm["label"]):
                names.append([round(prof[best]), nm["label"]])
        out_routes.append({
            "id": r["id"], "name": r["name"], "subtitle": r["subtitle"],
            "length": round(dist, 1), "gain": round(gain),
            "x": [round(p[0], 2) for p in rs],
            "z": [round(p[1], 2) for p in rs],
            "y": [round(h, 2) for h in el],
            "names": names,
        })
        print(f"  {r['id']}: {dist/1000:.2f} km, D+ {gain:.0f} m, {el[0]:.0f} → {el[-1]:.0f} m")

    towns = []
    for name, lat, lon, rad in TOWNS:
        x, z = proj.xz(lat, lon)
        towns.append({"name": name, "x": round(x, 1), "z": round(z, 1), "r": rad})
    marks = []
    for name, lat, lon, kind in LANDMARKS:
        x, z = proj.xz(lat, lon)
        marks.append({"name": name, "x": round(x, 1), "z": round(z, 1), "kind": kind})

    meta = {
        "lat0": lat0, "lon0": lon0,
        "bbox": {"lat_min": lat_min, "lat_max": lat_max, "lon_min": lon_min, "lon_max": lon_max},
        "x_min": x_min, "x_max": x_max, "z_min": z_min, "z_max": z_max,
        "nx": nx, "nz": nz,
        "attribution": "Altitudes, orthophotos, bâtiments et végétation © IGN (Licence Ouverte 2.0) · Tracés routiers © contributeurs OpenStreetMap (ODbL)",
    }
    with open(os.path.join(OUT, "world.json"), "w") as f:
        json.dump({"meta": meta, "routes": out_routes, "towns": towns, "landmarks": marks}, f,
                  ensure_ascii=False, separators=(",", ":"))

    fetch_ortho(meta)
    fetch_bdtopo(meta, proj, out_routes)
    print("terminé")


def fetch_ortho(meta):
    b = meta["bbox"]
    size = 4096
    url = ("https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap"
           "&LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&CRS=EPSG:4326&STYLES=&FORMAT=image/jpeg"
           f"&BBOX={b['lat_min']},{b['lon_min']},{b['lat_max']},{b['lon_max']}"
           f"&WIDTH={size}&HEIGHT={size}")
    raw = cached("ortho_%d.jpg" % size, lambda: get(url, timeout=300))
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    im.save(os.path.join(OUT, "ortho.jpg"), quality=78, optimize=True, progressive=True)
    im.resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, "ortho-1k.jpg"), quality=82)
    print("orthophoto", im.size)


def wfs_all(typename, b, props):
    feats = []
    start = 0
    while True:
        url = ("https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature"
               f"&TYPENAMES={typename}&outputFormat=application/json&COUNT=5000&STARTINDEX={start}"
               f"&BBOX={b[0]},{b[1]},{b[2]},{b[3]},urn:ogc:def:crs:EPSG::4326"
               f"&PROPERTYNAME=geometrie,{props}&SORTBY=cleabs")
        raw = cached(f"wfs_{typename.split(':')[1]}_{b[0]:.3f}_{b[1]:.3f}_{start}.json", lambda: get(url, timeout=300))
        d = json.loads(raw)
        fs = d.get("features", [])
        feats.extend(fs)
        if len(fs) < 5000:
            break
        start += 5000
    return feats


def tiles(meta, n):
    b = meta["bbox"]
    for j in range(n):
        for i in range(n):
            la0 = b["lat_min"] + (b["lat_max"] - b["lat_min"]) * j / n
            la1 = b["lat_min"] + (b["lat_max"] - b["lat_min"]) * (j + 1) / n
            lo0 = b["lon_min"] + (b["lon_max"] - b["lon_min"]) * i / n
            lo1 = b["lon_min"] + (b["lon_max"] - b["lon_min"]) * (i + 1) / n
            yield (la0, lo0, la1, lo1)


def fetch_bdtopo(meta, proj, routes):
    # --- végétation -> carte 1024 px : R = conifères, G = feuillus, B = vigne/vergers
    size = 1024
    img = Image.new("RGB", (size, size), (0, 0, 0))
    dr = ImageDraw.Draw(img)
    b = meta["bbox"]

    def to_px(lon, lat):
        return ((lon - b["lon_min"]) / (b["lon_max"] - b["lon_min"]) * size,
                (b["lat_max"] - lat) / (b["lat_max"] - b["lat_min"]) * size)

    colors = {
        "Forêt fermée de conifères": (255, 0, 0),
        "Forêt fermée mixte": (150, 150, 0),
        "Forêt fermée de feuillus": (0, 255, 0),
        "Forêt ouverte": (60, 90, 0),
        "Bois": (60, 200, 0),
        "Peupleraie": (0, 200, 0),
        "Haie": (0, 160, 0),
        "Lande ligneuse": (0, 50, 0),
        "Vigne": (0, 0, 255),
        "Verger": (0, 60, 120),
    }
    count = 0
    for t in tiles(meta, 3):
        for f in wfs_all("BDTOPO_V3:zone_de_vegetation", t, "nature"):
            c = colors.get(f["properties"].get("nature"))
            g = f["geometry"]
            if not c or not g:
                continue
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            for poly in polys:
                ring = [to_px(p[0], p[1]) for p in poly[0]]
                if len(ring) >= 3:
                    dr.polygon(ring, fill=c)
                for hole in poly[1:]:
                    hr = [to_px(p[0], p[1]) for p in hole]
                    if len(hr) >= 3:
                        dr.polygon(hr, fill=(0, 0, 0))
            count += 1
    img.save(os.path.join(OUT, "vegetation.png"), optimize=True)
    print("végétation :", count, "zones")

    # --- bâtiments à moins de 400 m d'un parcours
    cell = 100.0
    grid = set()
    for r in routes:
        for x, z in zip(r["x"][::4], r["z"][::4]):
            for dx in range(-4, 5):
                for dz in range(-4, 5):
                    grid.add((int(math.floor(x / cell)) + dx, int(math.floor(z / cell)) + dz))
    seen = set()
    out = []
    for t in tiles(meta, 3):
        for f in wfs_all("BDTOPO_V3:batiment", t, "nature,usage_1,hauteur,nombre_d_etages"):
            fid = f.get("id")
            if fid in seen or not f["geometry"]:
                continue
            seen.add(fid)
            g = f["geometry"]
            poly = (g["coordinates"][0] if g["type"] == "MultiPolygon" else g["coordinates"])[0]
            xs = [proj.xz(p[1], p[0]) for p in poly]
            cx = sum(p[0] for p in xs) / len(xs)
            cz = sum(p[1] for p in xs) / len(xs)
            if (int(math.floor(cx / cell)), int(math.floor(cz / cell))) not in grid:
                continue
            if len(xs) > 1 and xs[0] == xs[-1]:
                xs = xs[:-1]
            if len(xs) < 3:
                continue
            area = 0.5 * abs(sum(xs[i][0] * xs[(i + 1) % len(xs)][1] - xs[(i + 1) % len(xs)][0] * xs[i][1] for i in range(len(xs))))
            if area < 12:
                continue
            p = f["properties"]
            h = p.get("hauteur") or ((p.get("nombre_d_etages") or 0) * 3 or None) or 6.0
            kind = 0
            nat = (p.get("nature") or "")
            if nat in ("Église", "Chapelle"):
                kind = 1
            elif "industriel" in (p.get("usage_1") or "").lower() or nat == "Industriel, agricole ou commercial":
                kind = 2
            elif nat in ("Monument", "Tour, donjon", "Fort, blockhaus, casemate"):
                kind = 3
            flat = []
            for x, z in xs:
                flat += [round(x, 1), round(z, 1)]
            out.append([round(float(h), 1), kind, flat])
    with open(os.path.join(OUT, "buildings.json"), "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print("bâtiments :", len(out))


if __name__ == "__main__":
    main()
