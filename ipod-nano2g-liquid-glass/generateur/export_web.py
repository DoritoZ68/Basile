#!/usr/bin/env python3
"""
Exporte les images du thème pour l'émulateur web (../emulateur/assets).

Les fonds viennent des fichiers déjà générés par build.py (installer/) ; les
éléments transparents (icônes, pile, île, commandes) sont redessinés en RGBA
avec les mêmes fonctions, puisque le navigateur, lui, sait mélanger l'alpha.

Usage : python3 build.py && python3 export_web.py
"""

import json
import os

import numpy as np
from PIL import Image

import build as b

DEST = os.path.join(b.HERE, "..", "emulateur", "assets")
COVERS = os.path.join(b.HERE, "pochettes-demo")


def save(name, arr):
    arr = np.clip(np.round(np.asarray(arr, np.float64)), 0, 255).astype(np.uint8)
    mode = "RGBA" if arr.shape[2] == 4 else "RGB"
    Image.fromarray(arr, mode).save(os.path.join(DEST, name), optimize=True)


def main():
    os.makedirs(DEST, exist_ok=True)
    rb = b.OUT

    variants = []
    for name, desc, _, _ in b.WALLPAPERS:
        theme = "%s-%s" % (b.FAMILY, name)
        Image.open(os.path.join(rb, "backdrops", theme + ".bmp")).save(
            os.path.join(DEST, "menu-%s.png" % name), optimize=True)
        Image.open(os.path.join(rb, "wps", theme, "wps-backdrop.bmp")).save(
            os.path.join(DEST, "wps-%s.png" % name), optimize=True)
        variants.append({"name": name, "theme": theme, "desc": desc})

    icons = b.make_iconset()
    save("icons.png", icons)
    pill = b.pill()
    save("pill.png", pill)
    save("icons-selected.png", b.selected_icons(pill))

    levels = [None] + list(range(0, 101, 10))
    save("battery.png", b.strip([b.battery_frame(l, False) for l in levels]))
    save("battery-charge.png", b.strip([b.battery_frame(l, True) for l in levels]))
    save("lock.png", b.lock_icon())
    save("island.png", b.strip([b.island_frame("stop"), b.island_frame("play", 0),
                                b.island_frame("play", 1), b.island_frame("play", 2),
                                b.island_frame("pause"), b.island_frame("seek")]))
    save("playstate.png", b.strip([b.transport_icon(k) for k in
                                   ("play", "pause", "stop", "next", "prev")]))
    save("prev.png", b.transport_icon("prev", (22, 20)))
    save("next.png", b.transport_icon("next", (22, 20)))
    save("shuffle.png", b.strip([b.shuffle_icon(on) for on in (True, False)]))
    save("repeat.png", b.strip([b.repeat_icon(m) for m in ("off", "all", "one", "shuffle", "ab")]))
    save("vol-low.png", b.speaker(False))
    save("vol-high.png", b.speaker(True))

    covers = []
    if os.path.isdir(COVERS):
        for f in sorted(os.listdir(COVERS)):
            if f.endswith(".jpg"):
                Image.open(os.path.join(COVERS, f)).convert("RGB").resize((160, 160), Image.LANCZOS) \
                    .save(os.path.join(DEST, "cover-" + f.replace(".jpg", ".png")), optimize=True)
                covers.append(f[:-4])

    layout = {
        "W": b.W, "H": b.H, "variants": variants,
        "TITLE_VP": b.TITLE_VP, "LIST_VP": b.LIST_VP, "ROW_H": b.ROW_H, "ROWS": b.ROWS,
        "PILL": b.PILL, "TEXT_X": b.TEXT_X, "TEXT_W": b.TEXT_W, "TEXT_Y": b.TEXT_Y,
        "ICON_X": b.ICON_X, "ICON_Y": b.ICON_Y, "ICON_SIZE": b.ICON,
        "SCROLL_VP": b.SCROLL_VP, "CLOCK_VP": b.CLOCK_VP, "BATT_POS": b.BATT_POS,
        "BATT_PCT_VP": b.BATT_PCT_VP, "LOCK_POS": b.LOCK_POS, "ISLAND_RECT": b.ISLAND_RECT,
        "ART": b.ART, "ART_R": b.ART_R, "INFO_X": b.INFO_X, "INFO_W": b.INFO_W,
        "TIME_L_VP": b.TIME_L_VP, "TIME_R_VP": b.TIME_R_VP, "PB_VP": b.PB_VP,
        "CTRL_VP": b.CTRL_VP, "VOL_VP": b.VOL_VP,
        "CTRL": {"shuffle": b.SHUF_X, "prev": b.PREV_X, "play": b.PLAY_X,
                 "next": b.NEXT_X, "repeat": b.REP_X},
        "CTRL_Y": {"small": b.CTRL_Y_SMALL, "skip": b.CTRL_Y_SKIP, "play": b.CTRL_Y_PLAY},
        "VOLBAR_X": b.VOLBAR_X, "VOLBAR_Y": b.VOLBAR_Y, "VOLBAR_W": b.VOLBAR_W,
        "VOLBAR_H": b.VOLBAR_H, "VOL_LOW_X": b.VOL_LOW_X, "VOL_HIGH_X": b.VOL_HIGH_X,
        "VOL_ICON_Y": b.VOL_ICON_Y,
        "WPS_LINES": {"title": b.WPS_TITLE[0], "artist": b.WPS_ARTIST[0], "album": b.WPS_ALBUM[0],
                      "nextLabel": b.WPS_NEXT_LBL[0], "next": b.WPS_NEXT[0]},
        "SCROLL_THUMB": int(b.scroll_thumb().shape[0]),
        "COLORS": {"text": b.hexcol(b.TEXT), "text2": b.hexcol(b.TEXT2),
                   "text3": b.hexcol(b.TEXT3), "white": "FFFFFF", "pill": b.hexcol(b.PILL_BODY)},
        "ICON": {"coverflow": b.COVERFLOW_ICON, "wallpaper": b.WALLPAPER_ICON},
        "covers": covers,
    }
    with open(os.path.join(DEST, "layout.json"), "w") as f:
        json.dump(layout, f, ensure_ascii=False, indent=1)
    print("assets :", os.path.normpath(DEST))


if __name__ == "__main__":
    main()
