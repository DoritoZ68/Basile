#!/usr/bin/env python3
"""Réseau routier et cyclable complet + tous les bâtiments de la zone de jeu
(pour le mode libre). Source : IGN BD TOPO (Licence Ouverte 2.0).

Sorties (après fetch_data.py) :
  data/network.bin    tronçons de route, rue, piste cyclable, route empierrée
  data/network.json   noms des voies
  data/buildings.bin  emprises et hauteurs de tous les bâtiments

Format de network.bin (petit-boutiste) : uint32 nombre de tronçons, puis
pour chacun : uint8 classe, uint8 largeur (dm), uint16 nom (0xFFFF = aucun),
uint8 drapeaux (1 voie verte, 2 pont, 4 tunnel), uint16 nb de points,
int32 x0, int32 z0 (dm), uint16 y0 (dm, 0 = inconnue),
puis (n - 1) x [int16 dx, int16 dz, int16 dy] (dm).

Format de buildings.bin : uint32 nombre, puis pour chacun : uint8 hauteur
(0,25 m), uint8 type, uint8 nb de points, int32 x0, int32 z0 (dm), puis
(n - 1) x [int16 dx, int16 dz] (dm).

Pistes cyclables et voies vertes : Base nationale des aménagements cyclables
(export OpenStreetMap, ODbL) téléchargée dans .cache/bnac.parquet ; lecture
avec pyarrow (pip install pyarrow), altitudes IGN RGE ALTI.
"""
import json
import math
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_data as F  # noqa: E402

# classes : 0 route principale, 1 rue / route locale, 2 piste cyclable,
# 3 route empierrée
NATURES = {
    "Route à 2 chaussées": 0,
    "Bretelle": 0,
    "Route à 1 chaussée": 1,
    "Rond-point": 1,
    "Piste cyclable": 2,
    "Route empierrée": 3,
}


BNAC_URL = "https://static.data.gouv.fr/resources/amenagements-cyclables-france-metropolitaine/20261001-030505/france-20261001.parquet"
SEPARATE = {"PISTE CYCLABLE", "VOIE VERTE", "AMENAGEMENT MIXTE PIETON VELO HORS VOIE VERTE"}


def cycleways(meta, proj):
    path = os.path.join(F.CACHE, "bnac.parquet")
    if not os.path.exists(path):
        with open(path, "wb") as f:
            f.write(F.get(BNAC_URL, timeout=900))
    import pyarrow.parquet as pq  # dépendance facultative, outil seulement
    b = meta["bbox"]
    t = pq.read_table(path, columns=["code_com_d", "code_com_g", "ame_d", "ame_g", "largeur_d", "revet_d", "geometry"])
    rows = t.to_pylist()
    segs = []
    for r in rows:
        com = (r["code_com_d"] or r["code_com_g"] or "")
        if not com.startswith("68"):
            continue
        ame = {r["ame_d"], r["ame_g"]} & SEPARATE
        if not ame:
            continue
        wkb = r["geometry"]
        # LineString WKB petit-boutiste uniquement
        if wkb[0] != 1 or struct.unpack_from("<I", wkb, 1)[0] != 2:
            continue
        n = struct.unpack_from("<I", wkb, 5)[0]
        pts = [struct.unpack_from("<dd", wkb, 9 + 16 * i) for i in range(n)]
        if not any(b["lon_min"] < lon < b["lon_max"] and b["lat_min"] < lat < b["lat_max"] for lon, lat in pts):
            continue
        xz = [proj.xz(lat, lon) for lon, lat in pts]
        # points tous les 10 m au plus pour l'altitude
        dense = [xz[0]]
        for a, c in zip(xz, xz[1:]):
            d = math.hypot(c[0] - a[0], c[1] - a[1])
            k = max(1, int(d // 10))
            for j in range(1, k + 1):
                dense.append((a[0] + (c[0] - a[0]) * j / k, a[1] + (c[1] - a[1]) * j / k))
        segs.append({"xz": dense, "green": "VOIE VERTE" in ame, "w": r["largeur_d"]})
    allp = [proj.ll(x, z) for s in segs for x, z in s["xz"]]
    hs = F.elevations(allp) if allp else []
    out, k = [], 0
    for s in segs:
        pts = []
        for x, z in s["xz"]:
            pts.append((round(x * 10), round(z * 10), max(0, min(65535, round(hs[k] * 10)))))
            k += 1
        w = s["w"] or (3.0 if s["green"] else 2.5)
        out.append((2, round(max(2.0, min(5.0, w)) * 10), 0xFFFF, 1 if s["green"] else 0, pts))
    print("pistes cyclables / voies vertes :", len(out))
    return out


def main():
    with open(os.path.join(F.OUT, "world.json")) as f:
        meta = json.load(f)["meta"]
    proj = F.Proj(meta["lat0"], meta["lon0"])
    names, name_idx = [], {}
    segs = []
    seen = set()
    props = "nature,importance,largeur_de_chaussee,nom_voie_ban_gauche,nom_collaboratif_gauche,cpx_numero,position_par_rapport_au_sol,etat_de_l_objet"
    for t in F.tiles(meta, 5):
        for f in F.wfs_all("BDTOPO_V3:troncon_de_route", t, props):
            fid = f.get("id")
            if fid in seen or not f.get("geometry"):
                continue
            seen.add(fid)
            p = f["properties"]
            cls = NATURES.get(p.get("nature"))
            if cls is None or p.get("etat_de_l_objet") not in (None, "En service"):
                continue
            imp = p.get("importance")
            if cls == 1 and imp in ("1", "2", "3"):
                cls = 0
            g = f["geometry"]
            lines = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
            num = p.get("cpx_numero") or ""
            nom = p.get("nom_voie_ban_gauche") or (p.get("nom_collaboratif_gauche") or "").title()
            label = " · ".join(x for x in (num, nom) if x)
            ni = 0xFFFF
            if label:
                if label not in name_idx:
                    name_idx[label] = len(names)
                    names.append(label)
                ni = name_idx[label]
            width = p.get("largeur_de_chaussee") or {0: 6.5, 1: 5.0, 2: 2.6, 3: 3.0}[cls]
            width = max(2.0, min(14.0, float(width)))
            flags = 0
            pos = str(p.get("position_par_rapport_au_sol") or "0")
            if pos.startswith("-"):
                flags |= 4
            elif pos not in ("0", ""):
                flags |= 2
            if flags & 4:
                continue  # tunnels : non roulables ici
            for line in lines:
                pts = []
                for c in line:
                    x, z = proj.xz(c[1], c[0])
                    y = c[2] if len(c) > 2 and c[2] > -100 else 0
                    pts.append((round(x * 10), round(z * 10), max(0, min(65535, round(y * 10)))))
                # découpe si un écart dépasse l'int16
                cur = [pts[0]]
                for q in pts[1:]:
                    a = cur[-1]
                    if abs(q[0] - a[0]) > 32000 or abs(q[1] - a[1]) > 32000:
                        if len(cur) > 1:
                            segs.append((cls, round(width * 10), ni, flags, cur))
                        cur = [q]
                    else:
                        cur.append(q)
                if len(cur) > 1:
                    segs.append((cls, round(width * 10), ni, flags, cur))
    segs += cycleways(meta, proj)
    out = bytearray(struct.pack("<I", len(segs)))
    total = 0
    for cls, w, ni, flags, pts in segs:
        out += struct.pack("<BBHBHiiH", cls, min(255, w), ni, flags, len(pts), pts[0][0], pts[0][1], pts[0][2])
        for a, b in zip(pts, pts[1:]):
            dy = max(-32000, min(32000, b[2] - a[2])) if a[2] and b[2] else 0
            out += struct.pack("<hhh", b[0] - a[0], b[1] - a[1], dy if b[2] else -32768)
            total += 1
    with open(os.path.join(F.OUT, "network.bin"), "wb") as f:
        f.write(out)
    with open(os.path.join(F.OUT, "network.json"), "w") as f:
        json.dump(names, f, ensure_ascii=False, separators=(",", ":"))
    by = {}
    for s in segs:
        by[s[0]] = by.get(s[0], 0) + 1
    print("tronçons :", len(segs), "points :", total, "classes :", by, "noms :", len(names), "taille :", len(out))

    # ---- tous les bâtiments
    bout = bytearray()
    n = 0
    seenb = set()
    for t in F.tiles(meta, 3):
        for f in F.wfs_all("BDTOPO_V3:batiment", t, "nature,usage_1,hauteur,nombre_d_etages"):
            fid = f.get("id")
            if fid in seenb or not f.get("geometry"):
                continue
            seenb.add(fid)
            g = f["geometry"]
            poly = (g["coordinates"][0] if g["type"] == "MultiPolygon" else g["coordinates"])[0]
            xs = [proj.xz(c[1], c[0]) for c in poly]
            if len(xs) > 1 and xs[0] == xs[-1]:
                xs = xs[:-1]
            if len(xs) < 3 or len(xs) > 255:
                continue
            area = 0.5 * abs(sum(xs[i][0] * xs[(i + 1) % len(xs)][1] - xs[(i + 1) % len(xs)][0] * xs[i][1] for i in range(len(xs))))
            if area < 12:
                continue
            p = f["properties"]
            h = p.get("hauteur") or ((p.get("nombre_d_etages") or 0) * 3 or None) or 6.0
            nat = p.get("nature") or ""
            kind = 0
            if nat in ("Église", "Chapelle"):
                kind = 1
            elif "industriel" in (p.get("usage_1") or "").lower() or nat == "Industriel, agricole ou commercial":
                kind = 2
            elif nat in ("Monument", "Tour, donjon", "Fort, blockhaus, casemate"):
                kind = 3
            q = [(round(x * 10), round(z * 10)) for x, z in xs]
            bout += struct.pack("<BBBii", max(1, min(255, round(float(h) * 4))), kind, len(q), q[0][0], q[0][1])
            for a, b in zip(q, q[1:]):
                bout += struct.pack("<hh", max(-32000, min(32000, b[0] - a[0])), max(-32000, min(32000, b[1] - a[1])))
            n += 1
    with open(os.path.join(F.OUT, "buildings.bin"), "wb") as f:
        f.write(struct.pack("<I", n) + bout)
    print("bâtiments :", n, "taille :", len(bout))


if __name__ == "__main__":
    main()
