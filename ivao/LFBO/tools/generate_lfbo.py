#!/usr/bin/env python3
"""
LFBO Toulouse-Blagnac : plateforme sol pour IVAO Aurora + modèle 3D (glTF).

Génère, à partir des données OpenStreetMap :
  - aurora/LFBO.isc                    secteur de test autonome
  - aurora/Include/LFBO/LFBO.tfl       polygones remplis (herbe, aires, taxiways, pistes, marquages, bâtiments)
  - aurora/Include/LFBO/LFBO.geo       lignes axiales taxiways, contours de piste, barres d'arrêt
  - aurora/Include/LFBO/LFBO.apr       lignes d'entrée des postes de stationnement
  - aurora/Include/LFBO/LFBO.gts       postes de stationnement
  - aurora/Include/LFBO/LFBO.txi       étiquettes taxiways
  - aurora/Include/LFBO/LFBO.apt       ligne [AIRPORT]
  - aurora/Include/LFBO/LFBO.rw        ligne [RUNWAY]
  - 3d/LFBO.glb                        modèle 3D (sol + bâtiments extrudés + balisage)
  - 3d/LFBO-3D.html                    visionneuse 3D autonome (le .glb y est embarqué)

Usage :
  pip install -r requirements.txt
  python generate_lfbo.py              # télécharge OSM (mis en cache) puis génère
  python generate_lfbo.py --offline    # réutilise le cache sans réseau

Données © contributeurs OpenStreetMap, licence ODbL 1.0 (https://www.openstreetmap.org/copyright).
"""

import argparse
import base64
import datetime as dt
import json
import math
import os
import struct
import sys
import time
import unicodedata
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict

import mapbox_earcut
import numpy as np
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import linemerge, split, unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

ICAO = "LFBO"
NAME = "Toulouse Blagnac"
# Point de référence (origine locale des coordonnées) : 43°38'06"N 001°22'04"E, altitude 499 ft
ARP_LAT = 43 + 38 / 60 + 6 / 3600
ARP_LON = 1 + 22 / 60 + 4 / 3600
ELEV_FT = 499
TRANSITION_ALT = 5000
# Déclinaison magnétique WMM2025 au 1er octobre 2026 : +1.9° (Est)
MAGVAR = 1.9

BBOX = (1.325, 43.605, 1.405, 43.6575)  # lon_min, lat_min, lon_max, lat_max
OSM_API = "https://api.openstreetmap.org/api/0.6/map?bbox={:.5f},{:.5f},{:.5f},{:.5f}"
USER_AGENT = "LFBO-Aurora-generator/1.0 (IVAO ground layout)"

TAXIWAY_WIDTH = 23.0
TAXILANE_WIDTH = 15.0
RUNWAY_WIDTH = 45.0

# Couleurs Aurora (TFL) : fond sombre, contrastes proches des secteurs IVAO
C_GRASS = "#1D2B22"
C_APRON = "#3A3D40"
C_TAXIWAY = "#4A4D50"
C_STOPWAY = "#2E2C28"
C_RUNWAY = "#1F1F1F"
C_MARKING = "#BDBDBD"
C_BUILDING = "#111418"
C_TERMINAL = "#1F3347"


# --------------------------------------------------------------------------
# Téléchargement / lecture OSM
# --------------------------------------------------------------------------

def download_tile(bbox, cache_dir, name, depth=0):
    path = os.path.join(cache_dir, name + ".osm")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return [path]
    url = OSM_API.format(*bbox)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = resp.read()
            with open(path, "wb") as f:
                f.write(data)
            print(f"  {name}: {len(data) / 1e6:.1f} Mo")
            return [path]
        except urllib.error.HTTPError as e:
            if e.code == 400 and depth < 4:
                # Trop de nœuds : on découpe la tuile en 4
                lon0, lat0, lon1, lat1 = bbox
                lonm, latm = (lon0 + lon1) / 2, (lat0 + lat1) / 2
                out = []
                for i, sub in enumerate([(lon0, lat0, lonm, latm), (lonm, lat0, lon1, latm),
                                         (lon0, latm, lonm, lat1), (lonm, latm, lon1, lat1)]):
                    out += download_tile(sub, cache_dir, f"{name}_{i}", depth + 1)
                return out
            if attempt == 3:
                raise
        except urllib.error.URLError:
            if attempt == 3:
                raise
        time.sleep(2 ** (attempt + 1))
    return []


def download(cache_dir):
    os.makedirs(cache_dir, exist_ok=True)
    lon0, lat0, lon1, lat1 = BBOX
    nx, ny = 4, 3
    files = []
    for j in range(ny):
        for i in range(nx):
            b = (lon0 + (lon1 - lon0) * i / nx, lat0 + (lat1 - lat0) * j / ny,
                 lon0 + (lon1 - lon0) * (i + 1) / nx, lat0 + (lat1 - lat0) * (j + 1) / ny)
            files += download_tile(b, cache_dir, f"t{j}{i}")
    return files


def load_osm(cache_dir):
    nodes, ways, rels = {}, {}, {}
    files = sorted(f for f in os.listdir(cache_dir) if f.endswith(".osm"))
    if not files:
        sys.exit(f"Aucun fichier .osm dans {cache_dir} : relancer sans --offline.")
    for f in files:
        for _, el in ET.iterparse(os.path.join(cache_dir, f)):
            if el.tag == "node":
                tags = {t.get("k"): t.get("v") for t in el.findall("tag")}
                nodes[int(el.get("id"))] = (float(el.get("lat")), float(el.get("lon")), tags)
                el.clear()
            elif el.tag == "way":
                ways[int(el.get("id"))] = ([int(n.get("ref")) for n in el.findall("nd")],
                                           {t.get("k"): t.get("v") for t in el.findall("tag")})
                el.clear()
            elif el.tag == "relation":
                rels[int(el.get("id"))] = ([(m.get("type"), int(m.get("ref")), m.get("role")) for m in el.findall("member")],
                                           {t.get("k"): t.get("v") for t in el.findall("tag")})
                el.clear()
    return nodes, ways, rels


# --------------------------------------------------------------------------
# Projection locale (mètres, x = Est, y = Nord) centrée sur l'ARP
# --------------------------------------------------------------------------

PHI0 = math.radians(ARP_LAT)
M_LAT = 111132.954 - 559.822 * math.cos(2 * PHI0) + 1.175 * math.cos(4 * PHI0)
M_LON = 111412.84 * math.cos(PHI0) - 93.5 * math.cos(3 * PHI0)


def to_xy(lat, lon):
    return ((lon - ARP_LON) * M_LON, (lat - ARP_LAT) * M_LAT)


def to_ll(x, y):
    return (ARP_LAT + y / M_LAT, ARP_LON + x / M_LON)


def dms(value, pos, neg):
    h = pos if value >= 0 else neg
    v = abs(value)
    d = int(v)
    m = int((v - d) * 60)
    s = round((v - d - m / 60) * 3600, 3)
    if s >= 60:
        s -= 60
        m += 1
    if m >= 60:
        m -= 60
        d += 1
    return f"{h}{d:03d}.{m:02d}.{s:06.3f}"


def fmt_ll(lat, lon):
    return f"{dms(lat, 'N', 'S')};{dms(lon, 'E', 'W')};"


def fmt_xy(x, y):
    return fmt_ll(*to_ll(x, y))


# --------------------------------------------------------------------------
# Géométries OSM
# --------------------------------------------------------------------------

class OSM:
    def __init__(self, nodes, ways, rels):
        self.nodes, self.ways, self.rels = nodes, ways, rels

    def xy(self, nid):
        la, lo, _ = self.nodes[nid]
        return to_xy(la, lo)

    def has_nodes(self, nds):
        return all(n in self.nodes for n in nds)

    def line(self, wid):
        nds = self.ways[wid][0]
        if not self.has_nodes(nds) or len(nds) < 2:
            return None
        return LineString([self.xy(n) for n in nds])

    def poly(self, wid):
        nds = self.ways[wid][0]
        if not self.has_nodes(nds) or len(nds) < 4 or nds[0] != nds[-1]:
            return None
        p = Polygon([self.xy(n) for n in nds])
        return p if p.is_valid else p.buffer(0)

    def rings(self, way_ids):
        """Assemble des morceaux de chemins en anneaux fermés."""
        segs = [list(self.ways[w][0]) for w in way_ids if w in self.ways and self.has_nodes(self.ways[w][0])]
        rings = []
        while segs:
            cur = segs.pop(0)
            while cur[0] != cur[-1]:
                for i, s in enumerate(segs):
                    if s[0] == cur[-1]:
                        cur += s[1:]
                    elif s[-1] == cur[-1]:
                        cur += s[::-1][1:]
                    elif s[-1] == cur[0]:
                        cur = s + cur[1:]
                    elif s[0] == cur[0]:
                        cur = s[::-1] + cur[1:]
                    else:
                        continue
                    segs.pop(i)
                    break
                else:
                    break
            if cur[0] == cur[-1] and len(cur) >= 4:
                rings.append(Polygon([self.xy(n) for n in cur]))
        return rings

    def multipolygon(self, rid):
        members, _ = self.rels[rid]
        outers = self.rings([r for t, r, role in members if t == "way" and role in ("outer", "")])
        inners = self.rings([r for t, r, role in members if t == "way" and role == "inner"])
        if not outers:
            return None
        shape = unary_union([o.buffer(0) for o in outers])
        if inners:
            shape = shape.difference(unary_union([i.buffer(0) for i in inners]))
        return shape


def polys_of(geom):
    if geom is None or geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        return [geom]
    if isinstance(geom, MultiPolygon):
        return list(geom.geoms)
    return [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon)]


def without_holes(poly, depth=0):
    """Aurora (TFL) ne gère pas les trous : on découpe le polygone jusqu'à ce qu'il n'en ait plus."""
    if not poly.interiors or depth > 40:
        return [poly]
    hole = Polygon(poly.interiors[0])
    cx = hole.representative_point().x + 0.013
    minx, miny, maxx, maxy = poly.bounds
    cut = LineString([(cx, miny - 10), (cx, maxy + 10)])
    out = []
    for piece in split(poly, cut).geoms:
        if isinstance(piece, Polygon) and piece.area > 0.5:
            out += without_holes(piece, depth + 1)
    return out


def rect(origin, along, right, r0, r1, a0, a1):
    """Rectangle dans un repère local (right, along) d'origine origin."""
    ox, oy = origin
    pts = []
    for r, a in ((r0, a0), (r1, a0), (r1, a1), (r0, a1)):
        pts.append((ox + right[0] * r + along[0] * a, oy + right[1] * r + along[1] * a))
    return Polygon(pts)


# Police à 7 segments pour les numéros de piste (unités : largeur 1, hauteur 2)
SEGMENTS = {
    "a": ((0, 2), (1, 2)), "b": ((1, 1), (1, 2)), "c": ((1, 0), (1, 1)), "d": ((0, 0), (1, 0)),
    "e": ((0, 0), (0, 1)), "f": ((0, 1), (0, 2)), "g": ((0, 1), (1, 1)),
}
GLYPHS = {
    "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd",
    "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "L": "fed", "C": "afed", "R": "abfeg",
}


def glyph_polys(ch, origin, along, right, r_left, a_base, width, height, stroke):
    """Polygones d'un caractère ; r_left = bord gauche, a_base = pied du caractère."""
    sx, sy = width, height / 2
    polys = []
    for s in GLYPHS.get(ch, ""):
        (x0, y0), (x1, y1) = SEGMENTS[s]
        polys.append(_seg(origin, along, right, r_left + x0 * sx, a_base + y0 * sy, r_left + x1 * sx, a_base + y1 * sy, stroke))
    if ch == "R":
        # jambe oblique du R
        polys.append(_seg(origin, along, right, r_left + 0.35 * sx, a_base + sy, r_left + sx, a_base, stroke))
    return polys


def _seg(origin, along, right, r0, a0, r1, a1, stroke):
    ox, oy = origin
    p0 = (ox + right[0] * r0 + along[0] * a0, oy + right[1] * r0 + along[1] * a0)
    p1 = (ox + right[0] * r1 + along[0] * a1, oy + right[1] * r1 + along[1] * a1)
    return LineString([p0, p1]).buffer(stroke / 2, cap_style="square", join_style="mitre")


def bearing(p0, p1):
    return (math.degrees(math.atan2(p1[0] - p0[0], p1[1] - p0[1])) + 360) % 360


# --------------------------------------------------------------------------
# Extraction des éléments de l'aérodrome
# --------------------------------------------------------------------------

def building_kind(tags):
    aw = tags.get("aeroway")
    if aw == "terminal" or tags.get("building") == "transportation":
        return "terminal"
    if aw == "hangar" or tags.get("building") in ("hangar", "manufacture"):
        return "hangar"
    return "building"


def building_height(tags, kind):
    h = tags.get("height")
    if h:
        try:
            return float(h.replace("m", "").strip())
        except ValueError:
            pass
    lv = tags.get("building:levels")
    if lv:
        try:
            return max(3.5, float(lv) * 3.5 + 1.0)
        except ValueError:
            pass
    return {"hangar": 18.0, "terminal": 14.0}.get(kind, 8.0)


def extract(osm):
    ways, nodes, rels = osm.ways, osm.nodes, osm.rels
    F = {}

    ad = next(w for w, (_, t) in ways.items() if t.get("aeroway") == "aerodrome" and t.get("icao") == ICAO)
    F["aerodrome"] = osm.poly(ad)
    area = F["aerodrome"]
    near = area.buffer(150)

    # Pistes
    runways = []
    thresholds = {t.get("ref"): osm.xy(n) for n, (_, _, t) in nodes.items()
                  if t.get("aeroway") == "threshold" and t.get("ref") and n in nodes}
    for wid, (nds, t) in ways.items():
        if t.get("aeroway") != "runway" or "/" not in t.get("ref", ""):
            continue
        ln = osm.line(wid)
        if ln is None or not near.contains(ln.centroid):
            continue
        a, b = ln.coords[0], ln.coords[-1]
        d1, d2 = t["ref"].split("/")
        # l'extrémité « a » doit être le seuil du premier QFU (cap a->b ≈ numéro * 10)
        brg = bearing(a, b)
        if abs(((brg - int(d1[:2]) * 10) + 180) % 360 - 180) > 90:
            a, b = b, a
        width = float(t.get("width", RUNWAY_WIDTH))
        L = math.dist(a, b)
        u = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
        # seuil décalé éventuel (nœud aeroway=threshold)
        s_a = s_b = 0.0
        for des, end, sign in ((d1, a, 1), (d2, b, -1)):
            if des in thresholds:
                tx, ty = thresholds[des]
                off = (tx - end[0]) * u[0] * sign + (ty - end[1]) * u[1] * sign
                if 20 < off < L / 3:
                    if sign == 1:
                        s_a = off
                    else:
                        s_b = off
        runways.append(dict(ref=t["ref"], d1=d1, d2=d2, a=a, b=b, u=u, L=L, width=width, s_a=s_a, s_b=s_b,
                            poly=LineString([a, b]).buffer(width / 2, cap_style="flat"),
                            brg=bearing(a, b)))
    F["runways"] = sorted(runways, key=lambda r: r["ref"])

    F["stopways"] = [LineString(osm.line(w).coords).buffer(float(t.get("width", RUNWAY_WIDTH)) / 2, cap_style="flat")
                     for w, (_, t) in ways.items() if t.get("aeroway") == "stopway" and osm.line(w) is not None]

    # Taxiways
    taxi = []
    for wid, (nds, t) in ways.items():
        if t.get("aeroway") in ("taxiway", "taxilane"):
            ln = osm.line(wid)
            if ln is None or not near.intersects(ln):
                continue
            w = TAXILANE_WIDTH if t["aeroway"] == "taxilane" else TAXIWAY_WIDTH
            if t.get("width"):
                try:
                    w = float(t["width"])
                except ValueError:
                    pass
            taxi.append(dict(id=wid, ref=t.get("ref"), line=ln, width=w, nds=nds))
    F["taxiways"] = taxi
    taxi_area = [tw["line"].buffer(tw["width"] / 2, quad_segs=4) for tw in taxi]
    taxi_area += [osm.poly(w) for w, (_, t) in ways.items() if t.get("area:aeroway") == "taxiway" and osm.poly(w)]
    F["taxi_area"] = unary_union(taxi_area).simplify(0.3)

    # Aires de trafic
    aprons = [osm.poly(w) for w, (_, t) in ways.items() if t.get("aeroway") == "apron" and osm.poly(w)]
    aprons += [osm.multipolygon(r) for r, (_, t) in rels.items() if t.get("aeroway") == "apron"]
    F["apron"] = unary_union([a for a in aprons if a is not None and near.intersects(a)]).simplify(0.3)

    # Postes de stationnement
    taxi_lines = unary_union([tw["line"] for tw in taxi])
    stands = []
    for wid, (nds, t) in ways.items():
        if t.get("aeroway") != "parking_position":
            continue
        ln = osm.line(wid)
        if ln is None or not area.contains(ln.centroid):
            continue
        p0, p1 = Point(ln.coords[0]), Point(ln.coords[-1])
        stop = p0 if p0.distance(taxi_lines) > p1.distance(taxi_lines) else p1
        stands.append(dict(ref=t.get("ref"), line=ln, stop=(stop.x, stop.y)))
    for nid, (la, lo, t) in nodes.items():
        if t.get("aeroway") == "parking_position" and t.get("ref"):
            x, y = to_xy(la, lo)
            if area.contains(Point(x, y)):
                stands.append(dict(ref=t["ref"], line=None, stop=(x, y)))
    F["stands"] = stands

    # Points d'arrêt (barres d'arrêt sur les voies menant aux pistes)
    node_to_taxi = defaultdict(list)
    for tw in taxi:
        for i, n in enumerate(tw["nds"]):
            node_to_taxi[n].append((tw, i))
    stopbars = []
    for nid, (la, lo, t) in nodes.items():
        if t.get("aeroway") != "holding_position":
            continue
        if t.get("holding_position:type", "runway") not in ("runway", "ILS", "ils"):
            continue
        if nid not in node_to_taxi:
            continue
        tw, i = node_to_taxi[nid][0]
        coords = tw["line"].coords
        pa = coords[max(0, i - 1)]
        pb = coords[min(len(coords) - 1, i + 1)]
        d = math.dist(pa, pb)
        if d == 0:
            continue
        ux, uy = (pb[0] - pa[0]) / d, (pb[1] - pa[1]) / d
        x, y = to_xy(la, lo)
        half = tw["width"] / 2 + 1.5
        stopbars.append(LineString([(x - uy * half, y + ux * half), (x + uy * half, y - ux * half)]))
    F["stopbars"] = stopbars

    # Bâtiments (dans l'emprise de l'aérodrome)
    buildings = []
    seen = set()
    for wid, (nds, t) in ways.items():
        if not ("building" in t or t.get("aeroway") in ("terminal", "hangar", "control_center")):
            continue
        if t.get("building:part"):
            continue
        p = osm.poly(wid)
        if p is None or p.is_empty or not area.contains(p.representative_point()):
            continue
        kind = building_kind(t)
        buildings.append(dict(id=wid, name=t.get("name"), kind=kind, shape=p, h=building_height(t, kind), tags=t))
        seen.add(wid)
    for rid, (members, t) in rels.items():
        if t.get("type") != "multipolygon" or not ("building" in t or t.get("aeroway") in ("terminal", "hangar")):
            continue
        shape = osm.multipolygon(rid)
        if shape is None or shape.is_empty or not area.contains(shape.representative_point()):
            continue
        kind = building_kind(t)
        buildings.append(dict(id=rid, name=t.get("name"), kind=kind, shape=shape, h=building_height(t, kind), tags=t))
    F["buildings"] = buildings

    # Tour de contrôle (building:part aeroway=tower)
    tower = None
    for wid, (nds, t) in ways.items():
        if t.get("aeroway") == "tower" and osm.poly(wid) is not None and area.contains(osm.poly(wid).centroid):
            p = osm.poly(wid)
            levels = float(t.get("building:levels", 10))
            tower = dict(shape=p, shaft=levels * 3.5, cab=5.0)
    F["tower"] = tower

    # Balisage lumineux
    lights = defaultdict(list)
    for nid, (la, lo, t) in nodes.items():
        if t.get("aeroway") == "navigationaid":
            x, y = to_xy(la, lo)
            if near.contains(Point(x, y)) or t.get("navigationaid") == "als":
                lights[t.get("navigationaid")].append((x, y))
    F["lights"] = lights
    return F


def runway_markings(rw):
    """Marquages OACI d'une piste de 45 m : seuil, numéros, zone de toucher, point de visée, axe, bords."""
    polys = []
    a, b, u, L, W = rw["a"], rw["b"], rw["u"], rw["L"], rw["width"]
    half = W / 2
    for des, end, s, sign in ((rw["d1"], a, rw["s_a"], 1), (rw["d2"], b, rw["s_b"], -1)):
        along = (u[0] * sign, u[1] * sign)
        right = (along[1], -along[0])
        T = (end[0] + along[0] * s, end[1] + along[1] * s)
        # bandes de seuil (12 bandes de 1.8 m, longueur 30 m)
        for k in range(6):
            c = 2.7 + 3.6 * k
            for sgn in (1, -1):
                polys.append(rect(T, along, right, sgn * c - 0.9, sgn * c + 0.9, 6, 36))
        # lettre (la plus proche du seuil) puis numéro, hauteur 9 m
        num, letter = des[:2], des[2:]
        base = 48.0
        if letter:
            polys += glyph_polys(letter, T, along, right, -2.0, base, 4.0, 9.0, 1.1)
            base += 15.0
        polys += glyph_polys(num[0], T, along, right, -5.5, base, 4.0, 9.0, 1.1)
        polys += glyph_polys(num[1], T, along, right, 1.5, base, 4.0, 9.0, 1.1)
        # zone de toucher des roues + point de visée
        for dist, bars in ((150, 3), (300, 3), (600, 2), (750, 2), (900, 1)):
            for k in range(bars):
                r0 = 10.5 + k * 3.3
                for sgn in (1, -1):
                    polys.append(rect(T, along, right, sgn * r0, sgn * (r0 + 1.8), dist, dist + 22.5))
        for sgn in (1, -1):
            polys.append(rect(T, along, right, sgn * 10.5, sgn * 19.5, 400, 460))
    # axe : tirets 30 m / 20 m entre les zones de numéros
    right = (u[1], -u[0])
    start, end = rw["s_a"] + 90, L - rw["s_b"] - 90
    d = start
    while d + 30 <= end:
        polys.append(rect(a, u, right, -0.45, 0.45, d, d + 30))
        d += 50
    # bandes latérales
    polys.append(rect(a, u, right, half - 1.4, half - 0.5, 0, L))
    polys.append(rect(a, u, right, -half + 0.5, -half + 1.4, 0, L))
    return unary_union([p for p in polys if p.is_valid and not p.is_empty])


# --------------------------------------------------------------------------
# Sorties Aurora
# --------------------------------------------------------------------------

def header(title):
    today = dt.date.today().isoformat()
    return (
        "//////////////////////////////////////////////////////////////\n"
        f"// {ICAO} {NAME} - {title}\n"
        f"// Généré le {today} par tools/generate_lfbo.py\n"
        "// Données (c) contributeurs OpenStreetMap - licence ODbL 1.0\n"
        "// Usage simulation uniquement (IVAO) - ne pas utiliser pour la navigation réelle\n"
        "//////////////////////////////////////////////////////////////\n\n"
    )


def tfl_block(comment, shapes, color, flt=None, simplify=0.0):
    out = []
    head = f"STATIC;{color};1;{color};" + (f"0;{flt};" if flt else "")
    for shp in shapes:
        for p in polys_of(shp):
            if simplify:
                p = p.simplify(simplify)
            for piece in without_holes(p):
                piece = orient(piece, 1.0)
                coords = list(piece.exterior.coords)[:-1]
                if len(coords) < 3:
                    continue
                out.append(f"//{comment}")
                out.append(head)
                out += [fmt_xy(x, y) for x, y in coords]
    return out


def geo_lines(comment, lines, color):
    out = []
    for ln in lines:
        coords = list(ln.coords)
        if len(coords) < 2:
            continue
        out.append(f"//{comment}")
        for (x0, y0), (x1, y1) in zip(coords, coords[1:]):
            out.append(fmt_xy(x0, y0) + fmt_xy(x1, y1)[:-1] + f";{color};")
    return out


def write(path, text):
    """Fichiers Aurora : ASCII pur (accents retirés)."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="ascii", newline="\n") as f:
        f.write(text)


def write_aurora(F, out_dir):
    inc = os.path.join(out_dir, "Include", ICAO)
    markings = [runway_markings(rw) for rw in F["runways"]]
    F["markings"] = markings

    # TFL : ordre de dessin = ordre du fichier
    tfl = [header("Plateforme sol (polygones)")]
    tfl += tfl_block("Emprise aerodrome", [F["aerodrome"]], C_GRASS, simplify=1.0)
    tfl += tfl_block("Aire de trafic", [F["apron"]], C_APRON, "APRON")
    tfl += tfl_block("Taxiway", [F["taxi_area"]], C_TAXIWAY, "TAXIWAY")
    tfl += tfl_block("Prolongement d'arret", F["stopways"], C_STOPWAY, "RUNWAY")
    for rw in F["runways"]:
        tfl += tfl_block(f"Piste {rw['ref']}", [rw["poly"]], C_RUNWAY, "RUNWAY")
    for rw, mk in zip(F["runways"], markings):
        tfl += tfl_block(f"Marquage piste {rw['ref']}", [mk], C_MARKING, "RUNWAY")
    for b in F["buildings"]:
        color = C_TERMINAL if b["kind"] == "terminal" else C_BUILDING
        label = b["name"] or {"terminal": "Aerogare", "hangar": "Hangar"}.get(b["kind"], "Batiment")
        tfl += tfl_block(label.replace(";", ","), [b["shape"]], color, "BUILDING", simplify=0.3)
    write(os.path.join(inc, f"{ICAO}.tfl"), "\n".join(tfl) + "\n")

    # GEO : axes taxiways, contours de piste, barres d'arrêt
    geo = [header("Axes taxiways, pistes, barres d'arret")]
    geo += geo_lines("Axe taxiway", [tw["line"].simplify(0.2) for tw in F["taxiways"]], "TAXI_CENTER")
    for rw in F["runways"]:
        geo += geo_lines(f"Piste {rw['ref']}", [LineString(orient(rw["poly"], 1.0).exterior.coords)], "RUNWAY")
    geo += geo_lines("Barre d'arret", F["stopbars"], "STOPBAR")
    write(os.path.join(inc, f"{ICAO}.geo"), "\n".join(geo) + "\n")

    # APR : lignes d'entrée des postes
    apr = [header("Lignes d'entree des postes")]
    apr += geo_lines("Poste", [s["line"].simplify(0.2) for s in F["stands"] if s["line"] is not None], "APRON")
    write(os.path.join(inc, f"{ICAO}.apr"), "\n".join(apr) + "\n")

    # GTS : postes de stationnement
    gts = [header("Postes de stationnement")]
    done = set()
    for s in sorted(F["stands"], key=lambda s: natural_key(s["ref"] or "")):
        if not s["ref"] or s["ref"] in done:
            continue
        done.add(s["ref"])
        gts.append(f"{s['ref'][:20]};{ICAO};{fmt_xy(*s['stop'])}")
    F["stand_count"] = len(done)
    write(os.path.join(inc, f"{ICAO}.gts"), "\n".join(gts) + "\n")

    # TXI : étiquettes taxiways (une par tronçon continu)
    txi = [header("Etiquettes taxiways")]
    by_ref = defaultdict(list)
    for tw in F["taxiways"]:
        if tw["ref"]:
            by_ref[tw["ref"]].append(tw["line"])
    labels = []
    for ref in sorted(by_ref, key=natural_key):
        merged = linemerge(by_ref[ref])
        parts = list(merged.geoms) if hasattr(merged, "geoms") else [merged]
        for part in parts:
            if part.length < 40:
                continue
            p = part.interpolate(0.5, normalized=True)
            labels.append((ref, p.x, p.y))
            txi.append(f"{ref};{ICAO};{fmt_xy(p.x, p.y)}")
    F["taxi_labels"] = labels
    write(os.path.join(inc, f"{ICAO}.txi"), "\n".join(txi) + "\n")

    # APT / RW
    apt = header("Aerodrome") + f"{ICAO};{ELEV_FT};{TRANSITION_ALT};{fmt_ll(ARP_LAT, ARP_LON)}{NAME};\n"
    write(os.path.join(inc, f"{ICAO}.apt"), apt)
    rwl = [header("Pistes")]
    for rw in F["runways"]:
        ta = (rw["a"][0] + rw["u"][0] * rw["s_a"], rw["a"][1] + rw["u"][1] * rw["s_a"])
        tb = (rw["b"][0] - rw["u"][0] * rw["s_b"], rw["b"][1] - rw["u"][1] * rw["s_b"])
        m1 = round((rw["brg"] - MAGVAR) % 360)
        m2 = (m1 + 180) % 360
        rw["qfu"] = (m1, m2)
        rwl.append(f"{ICAO};{rw['d1']};{rw['d2']};{ELEV_FT};{ELEV_FT};{m1:03d};{m2:03d};{fmt_xy(*ta)}{fmt_xy(*tb)}")
    write(os.path.join(inc, f"{ICAO}.rw"), "\n".join(rwl) + "\n")

    # Secteur de test autonome
    isc = [
        header("Secteur de test autonome").rstrip("\n"), "",
        "[INFO]",
        dms(ARP_LAT, "N", "S"),
        dms(ARP_LON, "E", "W"),
        "60",
        f"{60 * math.cos(PHI0):.1f}",
        f"{MAGVAR}",
        ICAO,
        "",
        "[AIRPORT]",
        f"F;{ICAO}.apt",
        "",
        "[RUNWAY]",
        f"F;{ICAO}.rw",
        "",
        "[GEO]",
        f"F;{ICAO}.geo",
        "",
    ]
    write(os.path.join(out_dir, f"{ICAO}.isc"), "\n".join(isc) + "\n")


def natural_key(s):
    import re
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s)]


# --------------------------------------------------------------------------
# Modèle 3D (glTF binaire)
# --------------------------------------------------------------------------

class Mesh:
    def __init__(self, name, color, emissive=None, mode=4, roughness=0.9):
        self.name, self.color, self.emissive, self.mode, self.roughness = name, color, emissive, mode, roughness
        self.pos, self.nrm, self.idx = [], [], []

    def add_flat(self, shape, h):
        for p in polys_of(shape):
            p = orient(p, 1.0)
            rings = [list(p.exterior.coords)[:-1]] + [list(r.coords)[:-1] for r in p.interiors]
            rings = [r for r in rings if len(r) >= 3]
            if not rings:
                continue
            verts = np.array([pt for r in rings for pt in r], dtype=np.float64)
            ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
            tri = mapbox_earcut.triangulate_float64(verts, ends).reshape(-1, 3)
            base = len(self.pos)
            for x, y in verts:
                self.pos.append((x, h, -y))
                self.nrm.append((0.0, 1.0, 0.0))
            for i, j, k in tri:
                (x0, y0), (x1, y1), (x2, y2) = verts[i], verts[j], verts[k]
                if (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0) < 0:
                    j, k = k, j
                self.idx += [base + int(i), base + int(j), base + int(k)]

    def add_prism(self, shape, z0, z1, top=True):
        if top:
            self.add_flat(shape, z1)
        for p in polys_of(shape):
            p = orient(p, 1.0)
            for ring in [p.exterior] + list(p.interiors):
                c = list(ring.coords)
                for (ax, ay), (bx, by) in zip(c, c[1:]):
                    L = math.hypot(bx - ax, by - ay)
                    if L < 1e-6:
                        continue
                    nx, ny = (by - ay) / L, -(bx - ax) / L
                    n = (nx, 0.0, -ny)
                    base = len(self.pos)
                    self.pos += [(ax, z0, -ay), (bx, z0, -by), (bx, z1, -by), (ax, z1, -ay)]
                    self.nrm += [n] * 4
                    self.idx += [base, base + 1, base + 2, base, base + 2, base + 3]

    def add_points(self, pts, h):
        for x, y in pts:
            self.idx.append(len(self.pos))
            self.pos.append((x, h, -y))


def write_glb(meshes, extras, path):
    blob = bytearray()
    views, accessors, gl_meshes, materials, nodes = [], [], [], [], []

    def add_view(data, target):
        while len(blob) % 4:
            blob.append(0)
        views.append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(data), "target": target})
        blob.extend(data)
        return len(views) - 1

    for m in meshes:
        if not m.pos:
            continue
        pos = np.array(m.pos, dtype=np.float32)
        attrs = {}
        v = add_view(pos.tobytes(), 34962)
        accessors.append({"bufferView": v, "componentType": 5126, "count": len(pos), "type": "VEC3",
                          "min": pos.min(axis=0).tolist(), "max": pos.max(axis=0).tolist()})
        attrs["POSITION"] = len(accessors) - 1
        if m.nrm:
            nrm = np.array(m.nrm, dtype=np.float32)
            v = add_view(nrm.tobytes(), 34962)
            accessors.append({"bufferView": v, "componentType": 5126, "count": len(nrm), "type": "VEC3"})
            attrs["NORMAL"] = len(accessors) - 1
        idx = np.array(m.idx, dtype=np.uint32)
        v = add_view(idx.tobytes(), 34963)
        accessors.append({"bufferView": v, "componentType": 5125, "count": len(idx), "type": "SCALAR"})
        mat = {"name": m.name, "pbrMetallicRoughness": {"baseColorFactor": list(m.color), "metallicFactor": 0.0,
                                                        "roughnessFactor": m.roughness}}
        if m.emissive:
            mat["emissiveFactor"] = list(m.emissive)
        materials.append(mat)
        gl_meshes.append({"name": m.name, "primitives": [{"attributes": attrs, "indices": len(accessors) - 1,
                                                          "material": len(materials) - 1, "mode": m.mode}]})
        nodes.append({"name": m.name, "mesh": len(gl_meshes) - 1})

    while len(blob) % 4:
        blob.append(0)
    gltf = {
        "asset": {"version": "2.0", "generator": "LFBO generate_lfbo.py",
                  "copyright": "Données (c) contributeurs OpenStreetMap, ODbL 1.0"},
        "scene": 0,
        "scenes": [{"name": ICAO, "nodes": list(range(len(nodes))), "extras": extras}],
        "nodes": nodes, "meshes": gl_meshes, "materials": materials,
        "accessors": accessors, "bufferViews": views, "buffers": [{"byteLength": len(blob)}],
    }
    js = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    while len(js) % 4:
        js += b" "
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A))
        f.write(js)
        f.write(struct.pack("<II", len(blob), 0x004E4942))
        f.write(blob)
    return total


def srgb(hexcol, a=1.0):
    h = hexcol.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, a)


def build_3d(F, out_dir):
    M = {k: Mesh(k, srgb(c)) for k, c in [
        ("grass", "#5B7A4A"), ("apron", "#9A9C9E"), ("taxiway", "#7C7F82"), ("stopway", "#6B665E"),
        ("runway", "#4A4B4D"), ("markings", "#F2F2F2"), ("taxi_lines", "#F2B233"), ("stand_lines", "#E8C35A"),
        ("stopbars", "#D93A2F"), ("buildings", "#C9C4BA"), ("hangars", "#B8BEC4"), ("terminals", "#D8DDE2"),
        ("tower", "#EDEDED")]}
    M["tower_glass"] = Mesh("tower_glass", srgb("#23445E"), emissive=srgb("#0B2238")[:3], roughness=0.2)
    lights_def = {
        "lights_white": (("rwe", "rwc", "als", "tdz", "papi"), "#FFF4D6"),
        "lights_green": (("txc", "rwt"), "#4DFF7A"),
        "lights_blue": (("txe",), "#4D8BFF"),
        "lights_amber": (("rgl",), "#FFB02E"),
    }
    for name, (_, col) in lights_def.items():
        M[name] = Mesh(name, srgb(col), emissive=srgb(col)[:3], mode=0)

    M["grass"].add_flat(F["aerodrome"].simplify(0.5), 0.0)
    M["apron"].add_flat(F["apron"], 0.08)
    M["taxiway"].add_flat(F["taxi_area"], 0.14)
    for s in F["stopways"]:
        M["stopway"].add_flat(s, 0.18)
    for rw in F["runways"]:
        M["runway"].add_flat(rw["poly"], 0.22)
    for mk in F["markings"]:
        M["markings"].add_flat(mk, 0.28)
    tl = unary_union([tw["line"].buffer(0.35, cap_style="flat", quad_segs=2) for tw in F["taxiways"]])
    rw_all = unary_union([rw["poly"] for rw in F["runways"]])
    M["taxi_lines"].add_flat(tl.difference(rw_all).simplify(0.05), 0.28)
    M["stand_lines"].add_flat(unary_union([s["line"].buffer(0.3, cap_style="flat", quad_segs=2)
                                           for s in F["stands"] if s["line"] is not None]).simplify(0.05), 0.28)
    M["stopbars"].add_flat(unary_union([sb.buffer(0.6, cap_style="flat") for sb in F["stopbars"]]), 0.3)

    for b in F["buildings"]:
        shape = b["shape"].simplify(0.3)
        key = {"terminal": "terminals", "hangar": "hangars"}.get(b["kind"], "buildings")
        M[key].add_prism(shape, 0.0, b["h"])

    labels = []
    if F["tower"]:
        t = F["tower"]
        c = t["shape"].centroid
        # fût sans dalle supérieure : depuis la vigie, le plancher ne masque pas le premier plan
        M["tower"].add_prism(t["shape"], 0.0, t["shaft"], top=False)
        cab = t["shape"].buffer(1.8, join_style="mitre")
        M["tower_glass"].add_prism(cab, t["shaft"], t["shaft"] + t["cab"])
        M["tower"].add_prism(cab.buffer(0.6, join_style="mitre"), t["shaft"] + t["cab"], t["shaft"] + t["cab"] + 1.2)
        eye_h = t["shaft"] + 1.7
        F["tower_eye"] = (c.x, c.y, eye_h)
        labels.append({"k": "bld", "t": "TWR", "x": c.x, "y": t["shaft"] + t["cab"] + 8, "z": -c.y})

    for name, (types, _) in lights_def.items():
        pts = [p for ty in types for p in F["lights"].get(ty, [])]
        M[name].add_points(pts, 0.6)

    for s in F["stands"]:
        if s["ref"]:
            labels.append({"k": "stand", "t": s["ref"], "x": s["stop"][0], "y": 6, "z": -s["stop"][1]})
    for ref, x, y in F["taxi_labels"]:
        labels.append({"k": "twy", "t": ref, "x": x, "y": 3, "z": -y})
    for rw in F["runways"]:
        for des, end, s, sign in ((rw["d1"], rw["a"], rw["s_a"], 1), (rw["d2"], rw["b"], rw["s_b"], -1)):
            p = (end[0] + rw["u"][0] * sign * (s + 60), end[1] + rw["u"][1] * sign * (s + 60))
            labels.append({"k": "rwy", "t": des, "x": p[0], "y": 4, "z": -p[1]})
    for b in F["buildings"]:
        if b["name"] and b["name"].startswith("Hall"):
            c = b["shape"].representative_point()
            labels.append({"k": "bld", "t": b["name"], "x": c.x, "y": b["h"] + 8, "z": -c.y})

    extras = {
        "icao": ICAO, "name": NAME, "elevation_ft": ELEV_FT, "magvar": MAGVAR,
        "origin": {"lat": ARP_LAT, "lon": ARP_LON},
        "runways": [{"ref": rw["ref"], "length_m": round(rw["L"]), "width_m": rw["width"],
                     "qfu": list(rw["qfu"]),
                     "a": [rw["a"][0], 0, -rw["a"][1]], "b": [rw["b"][0], 0, -rw["b"][1]]} for rw in F["runways"]],
        "tower_eye": [F["tower_eye"][0], F["tower_eye"][2], -F["tower_eye"][1]] if F.get("tower_eye") else None,
        "labels": labels,
    }
    os.makedirs(os.path.join(out_dir), exist_ok=True)
    size = write_glb(list(M.values()), extras, os.path.join(out_dir, f"{ICAO}.glb"))
    return size, extras


def build_viewer(out_dir):
    tpl = os.path.join(HERE, "viewer_template.html")
    with open(tpl, encoding="utf-8") as f:
        html = f.read()
    with open(os.path.join(out_dir, f"{ICAO}.glb"), "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    html = html.replace("__GLB_BASE64__", b64)
    page = ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + html + "</html>\n")
    with open(os.path.join(out_dir, f"{ICAO}-3D.html"), "w", encoding="utf-8") as f:
        f.write(page)


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cache", default=os.path.join(HERE, ".osm-cache"), help="dossier de cache OSM")
    ap.add_argument("--offline", action="store_true", help="ne pas télécharger, utiliser le cache")
    ap.add_argument("--out", default=ROOT, help="dossier de sortie (par défaut : ivao/LFBO)")
    args = ap.parse_args()

    if not args.offline:
        print("Téléchargement OpenStreetMap…")
        download(args.cache)
    print("Lecture des données…")
    osm = OSM(*load_osm(args.cache))
    F = extract(osm)

    print("Écriture des fichiers Aurora…")
    write_aurora(F, os.path.join(args.out, "aurora"))
    print("Construction du modèle 3D…")
    size, extras = build_3d(F, os.path.join(args.out, "3d"))
    build_viewer(os.path.join(args.out, "3d"))

    print(f"\n{ICAO} {NAME}")
    for rw in F["runways"]:
        print(f"  Piste {rw['ref']:8s} {rw['L']:6.0f} m x {rw['width']:.0f} m  QFU {rw['qfu'][0]:03d}/{rw['qfu'][1]:03d}"
              f"  (vrai {rw['brg']:.1f}°)  seuils décalés {rw['s_a']:.0f}/{rw['s_b']:.0f} m")
    print(f"  Taxiways : {len(F['taxiways'])} tronçons, {len(F['taxi_labels'])} étiquettes")
    print(f"  Postes   : {F['stand_count']} nommés ({len(F['stands'])} au total)")
    print(f"  Barres d'arrêt : {len(F['stopbars'])}")
    print(f"  Bâtiments : {len(F['buildings'])}")
    if F.get("tower_eye"):
        x, y, h = F["tower_eye"]
        la, lo = to_ll(x, y)
        print(f"  Œil tour : {fmt_ll(la, lo)} {h:.0f} m sol ({h * 3.28084 + ELEV_FT:.0f} ft AMSL)")
    print(f"  Modèle 3D : {size / 1e6:.2f} Mo")


if __name__ == "__main__":
    main()
