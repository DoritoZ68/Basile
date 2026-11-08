#!/usr/bin/env python3
"""Guebwiller en détail : chaque bâtiment de la ville avec ses vraies
hauteurs (BD TOPO : sol, égout du toit, faîtage, étages), la couleur réelle de
son toit (mesurée sur les orthophotos IGN à 40 cm) et, pour les monuments,
leur nom et leur emprise OpenStreetMap.

Sortie : data/guebwiller.json
  bbox : [x0, z0, x1, z1] (repère local du jeu) couverte en détail
  b    : bâtiments [x, z, x, z, ...] + attributs
  lm   : monuments (identifiant -> index dans b)

Sources : IGN BD TOPO et orthophotos (Licence Ouverte 2.0),
contributeurs OpenStreetMap (ODbL).
"""
import io
import json
import math
import os
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(__file__))
import fetch_data as F  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

LAT0, LAT1, LON0, LON1 = 47.899, 47.919, 7.193, 7.232
Z = 18  # tuiles d'orthophoto : ~0,4 m par pixel

# monuments : nom OSM -> identifiant du modèle dans le jeu
LANDMARKS = {
    "Église Saint-Léger": "stleger",
    "Église Notre-Dame": "notredame",
    "Mairie de Guebwiller": "mairie",
    "Ancienne Église des Dominicains": "dominicains",
    "Chapelle Notre-Dame-du-Saering": "saering",
    "Château de la Neuenbourg": "neuenbourg",
    "Musée Théodore Deck": "deck",
    "Temple": "temple",
}


def osm_buildings():
    """bâtiments nommés d'OpenStreetMap (emprises), par tuiles de l'API"""
    out = []
    la = LAT0
    while la < LAT1:
        lo = LON0
        while lo < LON1:
            url = f"https://api.openstreetmap.org/api/0.6/map?bbox={lo:.3f},{la:.3f},{lo + 0.006:.3f},{la + 0.004:.3f}"
            raw = F.cached(f"osm_gueb_{la:.3f}_{lo:.3f}.xml", lambda: F.get(url, timeout=120))
            root = ET.fromstring(raw)
            nodes = {n.get("id"): (float(n.get("lat")), float(n.get("lon"))) for n in root.iter("node")}
            for w in root.iter("way"):
                t = {g.get("k"): g.get("v") for g in w.iter("tag")}
                if "building" not in t or "name" not in t:
                    continue
                pts = [nodes[nd.get("ref")] for nd in w.iter("nd") if nd.get("ref") in nodes]
                if len(pts) >= 3:
                    out.append((t["name"], pts))
            lo += 0.006
        la += 0.004
    return out


def ortho_mosaic():
    """mosaïque des tuiles d'orthophoto couvrant la zone"""
    def t2(lat, lon):
        n = 2 ** Z
        x = (lon + 180) / 360 * n
        r = math.radians(lat)
        y = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n
        return x, y
    x0, y0 = t2(LAT1, LON0)
    x1, y1 = t2(LAT0, LON1)
    tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
    img = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    total = (tx1 - tx0 + 1) * (ty1 - ty0 + 1)
    k = 0
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            url = ("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS"
                   f"&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={Z}&TILEROW={ty}&TILECOL={tx}&FORMAT=image/jpeg")
            raw = F.cached(f"ortho_z{Z}_{tx}_{ty}.jpg", lambda: F.get(url, timeout=60))
            try:
                img.paste(Image.open(io.BytesIO(raw)).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
            except Exception:
                pass
            k += 1
            if k % 100 == 0:
                print(f"  orthophotos {k}/{total}")

    def px(lat, lon):
        x, y = t2(lat, lon)
        return (x - tx0) * 256, (y - ty0) * 256
    return img, px


def roof_colour(img, px, ll):
    """couleur médiane du toit : pixels de l'emprise réduite de 15 % vers le
    centre (bords, gouttières et ombres portées exclus)"""
    pts = [px(la, lo) for la, lo in ll]
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    pts = [(cx + (x - cx) * 0.85, cy + (y - cy) * 0.85) for x, y in pts]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    bx0, by0, bx1, by1 = int(min(xs)), int(min(ys)), int(max(xs)) + 1, int(max(ys)) + 1
    if bx1 - bx0 < 2 or by1 - by0 < 2:
        return None
    crop = img.crop((bx0, by0, bx1, by1))
    mask = Image.new("L", crop.size, 0)
    ImageDraw.Draw(mask).polygon([(x - bx0, y - by0) for x, y in pts], fill=255)
    pix = [p for p, m in zip(crop.get_flattened_data() if hasattr(crop, 'get_flattened_data') else crop.getdata(), mask.get_flattened_data() if hasattr(mask, 'get_flattened_data') else mask.getdata()) if m]
    # ombres très sombres et reflets blancs écartés
    pix = [p for p in pix if 45 < sum(p) / 3 < 235]
    if len(pix) < 6:
        return None
    med = [sorted(c)[len(c) // 2] for c in zip(*pix)]
    return "#%02x%02x%02x" % tuple(med)


def inside(pt, poly):
    x, y = pt
    c = False
    for i in range(len(poly)):
        x0, y0 = poly[i]
        x1, y1 = poly[i - 1]
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0 + 1e-12) + x0:
            c = not c
    return c


def main():
    world = json.load(open(os.path.join(F.OUT, "world.json")))
    proj = F.Proj(world["meta"]["lat0"], world["meta"]["lon0"])
    print("Bâtiments BD TOPO…")
    props = "nature,usage_1,hauteur,nombre_d_etages,altitude_minimale_sol,altitude_minimale_toit,altitude_maximale_toit,materiaux_de_la_toiture"
    feats = []
    seen = set()
    for la in (LAT0, (LAT0 + LAT1) / 2):
        for lo in (LON0, (LON0 + LON1) / 2):
            b = (la, lo, la + (LAT1 - LAT0) / 2, lo + (LON1 - LON0) / 2)
            for f in F.wfs_all("BDTOPO_V3:batiment", b, props):
                if f.get("id") in seen or not f.get("geometry"):
                    continue
                seen.add(f["id"])
                feats.append(f)
    print(" ", len(feats))
    print("Monuments OpenStreetMap…")
    named = osm_buildings()
    print(" ", len(named), "bâtiments nommés")
    print("Orthophotos IGN (couleur des toits)…")
    img, px = ortho_mosaic()

    out = []
    lm = {}
    for f in feats:
        g = f["geometry"]
        ring = (g["coordinates"][0] if g["type"] == "MultiPolygon" else g["coordinates"])[0]
        ll = [(c[1], c[0]) for c in ring]
        if len(ll) > 1 and ll[0] == ll[-1]:
            ll = ll[:-1]
        if len(ll) < 3:
            continue
        xz = [proj.xz(la, lo) for la, lo in ll]
        area = 0.5 * abs(sum(xz[i][0] * xz[i - 1][1] - xz[i - 1][0] * xz[i][1] for i in range(len(xz))))
        if area < 8:
            continue
        p = f["properties"]
        sol = p.get("altitude_minimale_sol")
        tmin, tmax = p.get("altitude_minimale_toit"), p.get("altitude_maximale_toit")
        h = p.get("hauteur") or ((p.get("nombre_d_etages") or 0) * 3) or 6
        if sol is None or tmin is None or tmax is None or tmax < tmin or tmin <= sol:
            eave, ridge = h, h
        else:
            eave, ridge = tmin - sol, tmax - sol
        eave = max(2.5, min(60, eave))
        ridge = max(eave, min(eave + 20, ridge))
        rec = {
            "p": [round(v, 1) for pt in xz for v in pt],
            "y": round(sol, 1) if sol is not None else None,
            "e": round(eave, 1), "r": round(ridge, 1),
            "f": p.get("nombre_d_etages") or 0,
            "n": p.get("nature") or "", "u": p.get("usage_1") or "",
        }
        c = roof_colour(img, px, ll)
        if c:
            rec["c"] = c
        out.append(rec)
        # monument : un point de l'emprise OSM nommée dans ce bâtiment (ou l'inverse)
        for name, pts in named:
            if name not in LANDMARKS:
                continue
            cla = sum(q[0] for q in pts) / len(pts)
            clo = sum(q[1] for q in pts) / len(pts)
            if inside((cla, clo), ll) or inside((sum(q[0] for q in ll) / len(ll), sum(q[1] for q in ll) / len(ll)), pts):
                key = LANDMARKS[name]
                # plusieurs bâtiments BD TOPO pour un monument : on garde le plus grand
                if key not in lm or area > lm[key][1]:
                    lm[key] = (len(out) - 1, area)
    # monuments à emprise concave (centre hors du polygone) : bâtiment dont le
    # centre est le plus proche, à moins de 20 m
    cent = [(sum(b["p"][0::2]) / (len(b["p"]) / 2), sum(b["p"][1::2]) / (len(b["p"]) / 2)) for b in out]
    for name, pts in named:
        key = LANDMARKS.get(name)
        if not key or key in lm:
            continue
        x, z = proj.xz(sum(q[0] for q in pts) / len(pts), sum(q[1] for q in pts) / len(pts))
        d, i = min((math.hypot(c[0] - x, c[1] - z), i) for i, c in enumerate(cent))
        if d < 20:
            lm[key] = (i, 0)
    xs = [proj.xz(la, lo) for la, lo in ((LAT0, LON0), (LAT1, LON1))]
    data = {
        "bbox": [round(min(xs[0][0], xs[1][0])), round(min(xs[0][1], xs[1][1])), round(max(xs[0][0], xs[1][0])), round(max(xs[0][1], xs[1][1]))],
        "b": out,
        "lm": {k: v[0] for k, v in lm.items()},
    }
    with open(os.path.join(F.OUT, "guebwiller.json"), "w") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
    roofs = sum(1 for b in out if "c" in b)
    print(f"guebwiller.json : {len(out)} bâtiments, {roofs} toits colorés, monuments : {sorted(data['lm'])}")


if __name__ == "__main__":
    main()
