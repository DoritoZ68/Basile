#!/usr/bin/env python3
"""Réseau routier et cyclable complet + tous les bâtiments de la zone de jeu
(pour le mode libre). Source : IGN BD TOPO (Licence Ouverte 2.0).

Sorties (après fetch_data.py) :
  data/network.bin    tronçons de route, rue, piste cyclable, route empierrée
  data/network.json   noms des voies
  data/buildings.bin  emprises et hauteurs de tous les bâtiments

Format de network.bin (petit-boutiste) : uint32 nombre de tronçons, puis
pour chacun : uint8 classe, uint8 largeur (dm), uint16 nom (0xFFFF = aucun),
uint8 drapeaux (1 voie verte, 2 pont, 4 tunnel, 8 en agglomération), uint16 nb de points,
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
        w = r["largeur_d"] or (3.0 if "VOIE VERTE" in ame else 2.5)
        segs.append({"cls": 2, "w": max(2.0, min(5.0, w)), "ni": 0xFFFF, "flags": 1 if "VOIE VERTE" in ame else 0, "xz": xz})
    print("pistes cyclables / voies vertes :", len(segs))
    return segs


def densify(xz, step):
    out = [xz[0]]
    for a, c in zip(xz, xz[1:]):
        d = math.hypot(c[0] - a[0], c[1] - a[1])
        k = max(1, int(math.ceil(d / step)))
        for j in range(1, k + 1):
            out.append((a[0] + (c[0] - a[0]) * j / k, a[1] + (c[1] - a[1]) * j / k))
    return out


def drop_road_duplicates(roads, cycles):
    """Pistes cyclables d'OpenStreetMap déjà présentes dans la BD TOPO :
    - tracées sur la chaussée d'une rue ou d'une route (aménagement attaché à
      la voie) : retirées, elles doublaient la route ;
    - confondues avec un chemin empierré ou une petite route de la BD TOPO
      (voie verte, chemin de halage) : ce tronçon devient piste cyclable ;
    on garde les pistes en site propre."""
    from shapely.geometry import LineString, Point
    from shapely.strtree import STRtree
    geoms = [LineString(r["xz"]) for r in roads]
    tree = STRtree(geoms)
    kept, converted = [], 0
    for c in cycles:
        line = LineString(c["xz"])
        idx = list(tree.query(line.buffer(8)))
        if not idx:
            kept.append(c)
            continue
        near = [geoms[i] for i in idx]
        pts = densify(c["xz"], 10)
        on = sum(1 for x, z in pts if any(g.distance(Point(x, z)) < 4.5 for g in near))
        if on / len(pts) < 0.5:
            kept.append(c)
            continue
        # tronçons BD TOPO qui suivent la piste sur la majeure partie de leur longueur
        buf = line.buffer(5)
        for i in idx:
            r = roads[i]
            if r["cls"] in (1, 3) and geoms[i].length > 0 and geoms[i].intersection(buf).length / geoms[i].length > 0.7 and not (r["flags"] & 8 and r["cls"] == 1):
                r["cls"] = 2
                r["flags"] |= c["flags"] & 1
                r["w"] = min(r["w"], 3.5)
                converted += 1
    print("pistes cyclables : en site propre", len(kept), "/", len(cycles), "· tronçons BD TOPO devenus pistes :", converted)
    return kept


def main():
    with open(os.path.join(F.OUT, "world.json")) as f:
        meta = json.load(f)["meta"]
    proj = F.Proj(meta["lat0"], meta["lon0"])
    names, name_idx = [], {}
    segs = []
    seen = set()
    props = "nature,importance,largeur_de_chaussee,nom_voie_ban_gauche,nom_collaboratif_gauche,cpx_numero,position_par_rapport_au_sol,etat_de_l_objet,urbain"
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
            if p.get("urbain"):
                flags |= 8
            for line in lines:
                xz = [proj.xz(c[1], c[0]) for c in line]
                if len(xz) > 1:
                    segs.append({"cls": cls, "w": width, "ni": ni, "flags": flags, "xz": xz})
    segs += drop_road_duplicates(segs, cycleways(meta, proj))
    # Altitudes : les Z de la BD TOPO contiennent des valeurs aberrantes (jusqu'à
    # 600 m d'écart) ; on prend le relief IGN RGE ALTI sous l'axe, un point tous
    # les 10 m, lissé. Les ponts gardent un tablier droit entre leurs culées.
    for sg in segs:
        sg["xz"] = densify(sg["xz"], 10)
    allp = [proj.ll(x, z) for sg in segs for x, z in sg["xz"]]
    print("altitudes à calculer :", len(allp))
    hs = F.elevations(allp)
    k = 0
    for sg in segs:
        n = len(sg["xz"])
        ys = hs[k:k + n]
        k += n
        if sg["flags"] & 2 and n > 1:
            ys = [ys[0] + (ys[-1] - ys[0]) * i / (n - 1) for i in range(n)]
        else:
            ys = [sum(ys[max(0, i - 2):i + 3]) / len(ys[max(0, i - 2):i + 3]) for i in range(n)]
        sg["pts"] = [(round(x * 10), round(z * 10), max(1, min(65535, round(y * 10)))) for (x, z), y in zip(sg["xz"], ys)]
    # découpe si un écart dépasse l'int16 (ne devrait pas arriver après densification)
    out_segs = []
    for sg in segs:
        out_segs.append((sg["cls"], round(sg["w"] * 10), sg["ni"], sg["flags"], sg["pts"]))
    segs = out_segs
    out = bytearray(struct.pack("<I", len(segs)))
    total = 0
    for cls, w, ni, flags, pts in segs:
        out += struct.pack("<BBHBHiiH", cls, min(255, w), ni, flags, len(pts), pts[0][0], pts[0][1], pts[0][2])
        for a, b in zip(pts, pts[1:]):
            out += struct.pack("<hhh", b[0] - a[0], b[1] - a[1], max(-32000, min(32000, b[2] - a[2])))
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
