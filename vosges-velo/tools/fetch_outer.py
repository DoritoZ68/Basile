#!/usr/bin/env python3
"""Relief et image du grand paysage autour de la zone de jeu (horizon
visible depuis les sommets : plaine d'Alsace, Forêt-Noire, Sundgau).

  - Altitudes : IGN RGE ALTI, complété hors de France par EU-DEM 25 m
    (Copernicus, via opentopodata.org)
  - Image : IGN ORTHOIMAGERY.ORTHOPHOTOS à petite échelle
Usage : python3 tools/fetch_outer.py   (après fetch_data.py)
"""
import io
import json
import os
import struct
import sys
import time
import urllib.parse

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_data as F  # noqa: E402

LAT_MIN, LAT_MAX = 47.45, 48.30
LON_MIN, LON_MAX = 6.55, 8.15
NX, NZ = 241, 190  # ~500 m


def main():
    pts = []
    for j in range(NZ):
        lat = LAT_MAX - (LAT_MAX - LAT_MIN) * j / (NZ - 1)
        for i in range(NX):
            lon = LON_MIN + (LON_MAX - LON_MIN) * i / (NX - 1)
            pts.append((lat, lon))
    hs = F.elevations(pts, fill=False)
    missing = [k for k, h in enumerate(hs) if h is None or h < -1000]
    print("trous IGN à combler :", len(missing))
    for a in range(0, len(missing), 100):
        chunk = missing[a:a + 100]
        locs = "|".join(f"{pts[k][0]:.5f},{pts[k][1]:.5f}" for k in chunk)
        url = "https://api.opentopodata.org/v1/eudem25m?locations=" + urllib.parse.quote(locs, safe=",|.")
        raw = F.cached(f"otd_{chunk[0]}_{len(chunk)}.json", lambda: (time.sleep(1.1), F.get(url))[1])
        for k, res in zip(chunk, json.loads(raw)["results"]):
            hs[k] = res["elevation"] if res["elevation"] is not None else 150.0
        if a % 2000 == 0:
            print("  eudem", a, "/", len(missing))
    with open(os.path.join(F.OUT, "outer.bin"), "wb") as f:
        f.write(struct.pack(f"<{len(hs)}H", *[max(0, min(65535, int(round(h * 10)))) for h in hs]))
    url = ("https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap"
           "&LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&CRS=EPSG:4326&STYLES=&FORMAT=image/jpeg"
           f"&BBOX={LAT_MIN},{LON_MIN},{LAT_MAX},{LON_MAX}&WIDTH=2048&HEIGHT=2048")
    im = Image.open(io.BytesIO(F.cached("outer_2048.jpg", lambda: F.get(url, timeout=300)))).convert("RGB")
    im.save(os.path.join(F.OUT, "outer.jpg"), quality=80, optimize=True)
    world_p = os.path.join(F.OUT, "world.json")
    with open(world_p) as f:
        w = json.load(f)
    m = w["meta"]
    proj = F.Proj(m["lat0"], m["lon0"])
    x0, _ = proj.xz(m["lat0"], LON_MIN)
    x1, _ = proj.xz(m["lat0"], LON_MAX)
    _, z0 = proj.xz(LAT_MAX, m["lon0"])
    _, z1 = proj.xz(LAT_MIN, m["lon0"])
    w["outer"] = {"nx": NX, "nz": NZ, "x_min": x0, "x_max": x1, "z_min": z0, "z_max": z1}
    with open(world_p, "w") as f:
        json.dump(w, f, ensure_ascii=False, separators=(",", ":"))
    print("ok")


if __name__ == "__main__":
    main()
