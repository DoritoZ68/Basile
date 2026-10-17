#!/usr/bin/env python3
"""
Liquid Glass — thème Rockbox pour iPod nano 2G (écran 176x132, 16 bits).

Adaptation de la version nano 3G (320x240) : mêmes dessins, réduits, et une
mise en page refaite pour le petit écran.

Ce script fabrique tout le thème à partir de zéro :
  - le fond d'écran (fond-ios27.png) et les panneaux de verre (flou, réfraction des bords,
    reflet spéculaire, ombre portée), pré-calculés car Rockbox ne sait pas
    flouter en temps réel ;
  - les icônes façon iOS (tuiles colorées 14x14) ;
  - les images de l'écran de lecture et de la barre d'état ;
  - les fichiers .wps / .sbs / .cfg, dont les coordonnées viennent des mêmes
    constantes que les images.

Usage : python3 build.py   (écrit dans ../installer/.rockbox)

Dépendances : Python 3, Pillow, numpy.
"""

import math
import os
import struct

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 176, 132
NAME = "LiquidGlass"          # remplacé par variante (LiquidGlass-Papier…)
FAMILY = "LiquidGlass"        # fichiers partagés : icônes

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "installer", ".rockbox")
SKIN_DIR = os.path.join(OUT, "wps", NAME)

SS = 4  # suréchantillonnage pour l'anticrénelage des formes vectorielles

# Les dessins (icônes, pile, île, commandes) sont tracés dans les mêmes
# coordonnées que la version nano 3G, puis réduits par ces facteurs.
K = W / 320.0                  # échelle générale (flou, ombres, réfraction)
ICON = 14                      # icônes de liste 14x14 (20x20 sur le nano 3G)
BATT_K = 0.72                  # pile 25x11 -> 18x8
LOCK_K = 0.70                  # cadenas 10x13 -> 7x9
ISLAND_K = 44 / 68.0           # île 68x17 -> 44x11
CTRL_K = 0.60                  # lecture/pause, précédent/suivant, haut-parleurs
SMALL_K = 0.65                 # aléatoire / répétition

# ---------------------------------------------------------------------------
# Géométrie partagée par les images et les fichiers de skin
# ---------------------------------------------------------------------------

# Barre d'état (menus et lecture)
CLOCK_VP = (8, 1, 44, 12)
BATT_POS = (151, 3)            # pile 18x8
BATT_SIZE = (18, 8)
BATT_PCT_VP = (114, 2, 34, 10)
LOCK_POS = (106, 2)            # cadenas 7x9
LOCK_SIZE = (7, 9)
ISLAND_RECT = (66, 1, 44, 11)  # « Dynamic Island » quand la musique joue

# Menus
TITLE_VP = (9, 13, 158, 17)
PANEL = (4, 31, 168, 97)        # x, y, largeur, hauteur du panneau de liste
PANEL_R = 11
ROW_H = 18
ROWS = 5
LIST_VP = (8, 34, 160, ROW_H * ROWS)  # marge interne de 3-4 px dans le panneau
PILL = (0, 1, 157, 17)          # dans une ligne (relatif à LIST_VP)
TEXT_X = 21
TEXT_W = 127
TEXT_H = 13                     # hauteur de la police des listes (12 px)
TEXT_Y = 3                      # haut du texte dans une ligne
PILL_EDGE = 2                   # lignes de reflet / d'ombre en haut et en bas de la pastille
ICON_X = 3
ICON_Y = (ROW_H - ICON) // 2
SCROLL_VP = (166, 38, 2, 82)

# Écran de lecture
ART = (8, 18, 66, 66)
ART_R = 6
INFO_X = 82
INFO_W = 88
PLAYER = (6, 92, 164, 36)       # panneau de verre du lecteur
PLAYER_R = 13
TIME_L_VP = (12, 96, 30, 10)
TIME_R_VP = (134, 96, 30, 10)
PB_VP = (44, 99, 88, 4)
CTRL_VP = (12, 108, 152, 18)
VOL_VP = (18, 108, 140, 18)

# Lignes de texte de l'écran de lecture : (y, hauteur, police)
WPS_TITLE = (20, 15, 2)
WPS_ARTIST = (37, 13, 5)
WPS_ALBUM = (50, 13, 5)
WPS_NEXT_LBL = (66, 11, 4)
WPS_NEXT = (76, 13, 3)

# Couleurs
WHITE = (255, 255, 255)
TEXT = (242, 244, 250)
TEXT2 = (220, 224, 240)
TEXT3 = (178, 184, 212)
BLUE = (10, 132, 255)


# ---------------------------------------------------------------------------
# Outils : RGB565, BMP, tracés anticrénelés
# ---------------------------------------------------------------------------

def q565(rgb):
    """Arrondit une couleur à la valeur exacte affichable en RGB565."""
    r, g, b = [int(round(c)) for c in rgb]
    r5 = (r * 31 + 127) // 255
    g6 = (g * 63 + 127) // 255
    b5 = (b * 31 + 127) // 255
    return ((r5 << 3) | (r5 >> 2), (g6 << 2) | (g6 >> 4), (b5 << 3) | (b5 >> 2))


def hexcol(rgb):
    return "%02X%02X%02X" % tuple(rgb)


def quantize(arr):
    """Quantification RGB565 sans tramage (tableau float HxWx3 0..255)."""
    a = np.clip(np.rint(arr), 0, 255).astype(np.int32)
    r = (a[..., 0] * 31 + 127) // 255
    g = (a[..., 1] * 63 + 127) // 255
    b = (a[..., 2] * 31 + 127) // 255
    return np.stack([(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)], -1).astype(np.uint8)


def dither565(arr):
    """Tramage Floyd-Steinberg vers RGB565 : supprime les bandes des dégradés."""
    a = arr.astype(np.float64).copy()
    h, w, _ = a.shape
    levels = np.array([31.0, 63.0, 31.0])
    out = np.zeros((h, w, 3), np.uint8)
    for y in range(h):
        row = a[y]
        for x in range(w):
            old = np.clip(row[x], 0, 255)
            q = np.rint(old * levels / 255.0)
            new = q * 255.0 / levels
            err = old - new
            out[y, x] = np.rint(new)
            if x + 1 < w:
                row[x + 1] += err * 7 / 16
            if y + 1 < h:
                if x > 0:
                    a[y + 1, x - 1] += err * 3 / 16
                a[y + 1, x] += err * 5 / 16
                if x + 1 < w:
                    a[y + 1, x + 1] += err * 1 / 16
    return quantize(out.astype(np.float64))


def write_bmp(path, arr):
    """BMP non compressé : 24 bits (RGB) ou 32 bits avec alpha (RGBA)."""
    arr = np.asarray(arr)
    h, w, c = arr.shape
    bpp = 32 if c == 4 else 24
    row = w * (bpp // 8)
    pad = (4 - row % 4) % 4
    data = bytearray()
    for y in range(h - 1, -1, -1):
        px = arr[y]
        if c == 4:
            bgra = px[:, [2, 1, 0, 3]]
        else:
            bgra = px[:, [2, 1, 0]]
        data += bgra.astype(np.uint8).tobytes() + b"\0" * pad
    header = struct.pack("<2sIHHI", b"BM", 54 + len(data), 0, 0, 54)
    info = struct.pack("<IiiHHIIiiII", 40, w, h, 1, bpp, 0, len(data), 2835, 2835, 0, 0)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(header + info + data)


def sdf_round_rect(w, h, rect, r, scale=1.0):
    """Distance signée (pixels) à un rectangle arrondi, échantillonnée au centre des pixels."""
    x, y, rw, rh = rect
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float64)
    px = (xs + 0.5) / scale
    py = (ys + 0.5) / scale
    cx, cy = x + rw / 2.0, y + rh / 2.0
    bx, by = rw / 2.0 - r, rh / 2.0 - r
    qx = np.abs(px - cx) - bx
    qy = np.abs(py - cy) - by
    outside = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
    inside = np.minimum(np.maximum(qx, qy), 0)
    return outside + inside - r


def coverage(d):
    return np.clip(0.5 - d, 0.0, 1.0)


def over(dst, src_rgb, alpha):
    """Composite src sur dst (tableaux float), alpha en HxW."""
    a = alpha[..., None]
    return dst * (1 - a) + np.asarray(src_rgb, np.float64) * a


def gaussian(arr, sigma):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(sigma)), np.float64)


def bilinear(arr, sx, sy):
    h, w, _ = arr.shape
    sx = np.clip(sx, 0, w - 1.001)
    sy = np.clip(sy, 0, h - 1.001)
    x0 = np.floor(sx).astype(int)
    y0 = np.floor(sy).astype(int)
    fx = (sx - x0)[..., None]
    fy = (sy - y0)[..., None]
    a = arr[y0, x0] * (1 - fx) + arr[y0, x0 + 1] * fx
    b = arr[y0 + 1, x0] * (1 - fx) + arr[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy


# ---------------------------------------------------------------------------
# Fonds d'écran : un thème Rockbox est généré pour chacun
# ---------------------------------------------------------------------------

WALLPAPER = os.path.join(HERE, "fond-ios27.png")


def photo_wallpaper(path):
    """Image fournie, recadrée en 4:3 au centre."""
    src = Image.open(path).convert("RGB")
    sw, sh = src.size
    cw = min(sw, round(sh * W / H))
    left = (sw - cw) // 2
    src = src.crop((left, 0, left + cw, sh)).resize((W, H), Image.LANCZOS)
    return np.asarray(src, np.float64)


def procedural_wallpaper(top, bottom, blobs, ribbons):
    """Taches et rubans lumineux sur un dégradé, façon fond iOS."""
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float64)
    u, v = xs / W, ys / H
    img = np.zeros((H, W, 3))
    img[:] = (np.array(top, np.float64) * (1 - v[..., None])
              + np.array(bottom, np.float64) * v[..., None])

    light = np.zeros_like(img)
    for cx, cy, rx, ry, color, k in blobs:
        d = ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2
        light += np.exp(-d)[..., None] * np.array(color, np.float64) * k
    for y0, amp, freq, phase, width, c1, c2, k in ribbons:
        yc = y0 + amp * np.sin(freq * u * 2 * math.pi + phase)
        d = (v - yc) / width
        t = u[..., None]
        col = np.array(c1, np.float64) * (1 - t) + np.array(c2, np.float64) * t
        core = np.exp(-d ** 2)[..., None]
        sheen = np.exp(-(d * 3.2) ** 2)[..., None] * 0.55
        light += (core + sheen) * col * k
    img = img + light * (1.0 - 0.35 * np.exp(-(v / 0.25) ** 2))[..., None]
    # tonalité douce pour éviter la saturation brutale
    img = 255 * (1 - np.exp(-img / 255 * 1.35)) / (1 - math.exp(-1.35))
    return gaussian(img, 1.2 * K)


# nom, description, fonction qui dessine le fond, force du voile en haut
WALLPAPERS = [
    ("Papier", "fond iOS 27 fourni (vagues de papier)",
     lambda: photo_wallpaper(WALLPAPER), 0.42),
    ("Aurore", "rubans bleu, violet et rose sur bleu nuit (fond d'origine)",
     lambda: procedural_wallpaper(
         (8, 10, 32), (18, 10, 46),
         [(0.18, 0.95, 0.55, 0.45, (40, 70, 255), 0.85),
          (0.92, 0.18, 0.40, 0.42, (150, 60, 255), 0.70),
          (0.70, 1.05, 0.45, 0.35, (255, 70, 150), 0.55)],
         [(0.62, 0.10, 0.75, 0.6, 0.11, (30, 120, 255), (190, 80, 255), 0.95),
          (0.80, 0.08, 0.55, 2.4, 0.08, (255, 90, 170), (255, 160, 80), 0.75),
          (0.38, 0.12, 0.60, 4.1, 0.07, (40, 220, 230), (80, 120, 255), 0.45)]), 0.45),
    ("Ocean", "vagues turquoise et bleu profond",
     lambda: procedural_wallpaper(
         (2, 14, 30), (0, 22, 40),
         [(0.15, 0.90, 0.55, 0.45, (0, 140, 200), 0.85),
          (0.90, 0.25, 0.40, 0.40, (0, 90, 220), 0.60),
          (0.60, 1.05, 0.50, 0.35, (0, 200, 170), 0.55)],
         [(0.60, 0.09, 0.70, 1.2, 0.10, (0, 180, 220), (60, 120, 255), 0.95),
          (0.78, 0.07, 0.50, 3.0, 0.07, (40, 230, 200), (0, 160, 255), 0.70),
          (0.40, 0.10, 0.55, 5.0, 0.06, (120, 220, 255), (0, 120, 200), 0.40)]), 0.45),
    ("Crepuscule", "coucher de soleil orange, rose et pourpre",
     lambda: procedural_wallpaper(
         (24, 8, 30), (40, 10, 24),
         [(0.20, 0.95, 0.55, 0.45, (255, 110, 40), 0.85),
          (0.90, 0.20, 0.40, 0.42, (170, 40, 170), 0.65),
          (0.65, 1.05, 0.45, 0.35, (255, 60, 110), 0.60)],
         [(0.62, 0.10, 0.70, 0.3, 0.11, (255, 150, 50), (255, 70, 140), 0.95),
          (0.80, 0.08, 0.55, 2.2, 0.08, (255, 90, 90), (190, 70, 220), 0.75),
          (0.40, 0.11, 0.60, 4.4, 0.06, (255, 210, 120), (255, 120, 80), 0.40)]), 0.45),
    ("Graphite", "gris anthracite et reflets argentés, très sobre",
     lambda: procedural_wallpaper(
         (10, 10, 12), (18, 18, 22),
         [(0.20, 0.95, 0.55, 0.45, (80, 84, 96), 0.80),
          (0.90, 0.20, 0.40, 0.42, (60, 62, 72), 0.60)],
         [(0.62, 0.10, 0.70, 0.8, 0.10, (150, 155, 170), (110, 115, 130), 0.80),
          (0.80, 0.08, 0.55, 2.6, 0.07, (190, 192, 200), (120, 124, 140), 0.50)]), 0.40),
]

CURRENT = WALLPAPERS[0]  # variante en cours de génération


def wallpaper(variant="menu"):
    img = CURRENT[2]().copy()
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float64)
    u, v = xs / W, ys / H
    # Voile sombre en haut : l'heure et le grand titre blancs restent lisibles.
    img *= (1.0 - CURRENT[3] * np.clip(1 - v / 0.30, 0, 1) ** 1.3)[..., None]
    if variant == "wps":
        # plus sombre partout, et davantage derrière le texte (colonne de droite)
        img *= (0.70 - 0.22 * np.exp(-(((u - 0.74) / 0.30) ** 2 + ((v - 0.40) / 0.30) ** 2)))[..., None]
    return img


# ---------------------------------------------------------------------------
# Panneau Liquid Glass
# ---------------------------------------------------------------------------

def glass(bg, rect, r, tint=(12, 16, 34), tint_a=0.40, blur=9.0 * K,
          refract=7.0 * K, rim=1.0, shadow=0.40, lift=0.10):
    """Pose un panneau de verre sur bg et renvoie la nouvelle image."""
    h, w, _ = bg.shape
    out = bg.copy()

    # Ombre portée douce, décalée vers le bas.
    x, y, rw, rh = rect
    ds = sdf_round_rect(w, h, (x, y + 3 * K, rw, rh), r)
    sh = shadow * np.exp(-np.maximum(ds, 0) / (5.0 * K)) * (ds > -r)
    out = over(out, (0, 0, 8), np.clip(sh, 0, 1) * (1 - coverage(sdf_round_rect(w, h, rect, r))))

    d = sdf_round_rect(w, h, rect, r)
    cov = coverage(d)
    gy, gx = np.gradient(d)
    norm = np.hypot(gx, gy) + 1e-9
    nx, ny = gx / norm, gy / norm

    # Réfraction : près du bord, le verre « aspire » ce qui est derrière.
    soft = gaussian(bg, blur)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float64)
    inside = np.clip(-d, 0, None)
    band = np.clip(1 - inside / (12.0 * K), 0, 1) ** 2
    sample = bilinear(soft, xs + nx * band * refract, ys + ny * band * refract)

    # Vibrance : le verre iOS renforce légèrement les couleurs du fond.
    grey = sample.mean(-1, keepdims=True)
    sample = grey + (sample - grey) * 1.25
    body = sample * (1 - tint_a) + np.array(tint, np.float64) * tint_a

    # Lumière interne en haut du panneau.
    t = np.clip((ys - y) / (rh * 0.55), 0, 1)
    body = over(body, WHITE, lift * (1 - t) ** 2)

    # Bord spéculaire : fort en haut à gauche, rappel en bas à droite.
    lx, ly = -0.55, -0.83
    dot = nx * lx + ny * ly
    ring = np.clip(1 - np.abs(d + 0.9) / 1.1, 0, 1)
    spec = (0.18 + 0.62 * np.clip(dot, 0, 1) ** 1.5 + 0.28 * np.clip(-dot, 0, 1) ** 2) * rim
    body = over(body, WHITE, np.clip(ring * spec, 0, 1))
    inner = np.clip(1 - np.abs(d + 1.8) / 1.0, 0, 1) * 0.10 * np.clip(dot, 0, 1)
    body = over(body, WHITE, inner)

    a = cov[..., None]
    return out * (1 - a) + body * a


# ---------------------------------------------------------------------------
# Dessin vectoriel suréchantillonné (icônes, glyphes)
# ---------------------------------------------------------------------------

class Canvas:
    """Toile RGBA suréchantillonnée, réduite en fin de tracé."""

    def __init__(self, w, h, unit=1.0):
        """unit agrandit les coordonnées (pour dessiner un glyphe 20x20 en grand)."""
        self.w, self.h, self.unit = round(w * unit), round(h * unit), unit
        self.img = Image.new("RGBA", (self.w * SS, self.h * SS), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)

    def s(self, v):
        return v * SS * self.unit

    def box(self, x0, y0, x1, y1):
        return [self.s(x0), self.s(y0), self.s(x1), self.s(y1)]

    def rrect(self, x0, y0, x1, y1, r, fill):
        self.d.rounded_rectangle(self.box(x0, y0, x1, y1), radius=self.s(r), fill=fill)

    def ellipse(self, x0, y0, x1, y1, fill=None, outline=None, width=1):
        self.d.ellipse(self.box(x0, y0, x1, y1), fill=fill, outline=outline,
                       width=int(self.s(width)) if outline else 0)

    def poly(self, pts, fill):
        self.d.polygon([(self.s(x), self.s(y)) for x, y in pts], fill=fill)

    def line(self, pts, fill, width):
        self.d.line([(self.s(x), self.s(y)) for x, y in pts], fill=fill,
                    width=int(self.s(width)), joint="curve")
        r = self.s(width) / 2
        for x, y in (pts[0], pts[-1]):
            self.d.ellipse([self.s(x) - r, self.s(y) - r, self.s(x) + r, self.s(y) + r], fill=fill)

    def arc(self, x0, y0, x1, y1, a0, a1, fill, width):
        self.d.arc(self.box(x0, y0, x1, y1), a0, a1, fill=fill, width=int(self.s(width)))

    def text(self, x, y, txt, size, fill, font="Inter-Bold"):
        f = ImageFont.truetype("/usr/share/fonts/opentype/inter/%s.otf" % font, int(self.s(size)))
        self.d.text((self.s(x), self.s(y)), txt, font=f, fill=fill, anchor="mm")

    def result(self):
        return np.asarray(self.img.resize((self.w, self.h), Image.LANCZOS), np.float64)


def gradient_tile(c, top, bottom, size=20, r=5.0):
    """Tuile iOS : dégradé vertical, reflet doux en haut."""
    big = size * SS
    ys = np.linspace(0, 1, big)[:, None, None]
    col = np.array(top, np.float64) * (1 - ys) + np.array(bottom, np.float64) * ys
    col = np.broadcast_to(col, (big, big, 3))
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, big - 1, big - 1], radius=r * SS, fill=255)
    rgba = np.dstack([col, np.asarray(mask, np.float64)])
    tile = Image.fromarray(rgba.astype(np.uint8), "RGBA")
    c.img.alpha_composite(tile)
    # liseré clair en haut, comme le verre
    hl = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    ImageDraw.Draw(hl).rounded_rectangle([0, 0, big - 1, big - 1], radius=r * SS,
                                         outline=(255, 255, 255, 70), width=SS)
    fade = np.asarray(hl, np.float64)
    fade[..., 3] *= np.clip(1.2 - np.linspace(0, 1, big)[:, None] * 2.0, 0, 1)
    c.img.alpha_composite(Image.fromarray(fade.astype(np.uint8), "RGBA"))


# Glyphes blancs (coordonnées dans une tuile 20x20)
WH = (255, 255, 255, 255)


def g_note(c):
    c.ellipse(4.2, 12.2, 9.2, 16.4, fill=WH)
    c.ellipse(10.8, 10.6, 15.8, 14.8, fill=WH)
    c.poly([(7.6, 14), (9.2, 14), (9.2, 6.2), (7.6, 6.6)], WH)
    c.poly([(14.2, 12.6), (15.8, 12.6), (15.8, 4.2), (14.2, 4.6)], WH)
    c.poly([(7.6, 5.4), (15.8, 3.2), (15.8, 6.0), (7.6, 8.2)], WH)


def g_folder(c):
    c.rrect(3.5, 5.5, 10, 9, 1.5, WH)
    c.rrect(3.5, 7.0, 16.5, 15.5, 2, WH)


def g_playlist(c):
    for yy in (6, 9.5):
        c.line([(4, yy), (11, yy)], WH, 1.6)
    c.line([(4, 13), (8.5, 13)], WH, 1.6)
    c.ellipse(9.8, 12.6, 13.6, 15.8, fill=WH)
    c.poly([(12.4, 14), (13.6, 14), (13.6, 6.5), (12.4, 6.8)], WH)
    c.poly([(12.4, 6.0), (16.2, 5.0), (16.2, 7.4), (12.4, 8.4)], WH)


def g_chev_r(c, x=8.0):
    c.line([(x, 5), (x + 5, 10), (x, 15)], WH, 2.0)


def g_chev_l(c):
    c.line([(12, 5), (7, 10), (12, 15)], WH, 2.0)


def g_palette(c):
    c.ellipse(3.5, 3.5, 16.5, 16.5, fill=WH)
    c.ellipse(11.4, 10.6, 15.4, 14.6, fill=(0, 0, 0, 0))
    for (x, y), col in (((6.2, 7.8), (255, 69, 58, 255)), ((9.6, 5.4), (255, 214, 10, 255)),
                        ((13.4, 6.6), (48, 209, 88, 255)), ((6.8, 11.8), (10, 132, 255, 255))):
        c.ellipse(x - 1.4, y - 1.4, x + 1.4, y + 1.4, fill=col)


def g_coverflow(c):
    """Trois pochettes en perspective, comme Cover Flow."""
    side = (255, 255, 255, 150)
    c.poly([(2.5, 6.5), (6.5, 5), (6.5, 15), (2.5, 13.5)], side)
    c.poly([(17.5, 6.5), (13.5, 5), (13.5, 15), (17.5, 13.5)], side)
    c.rrect(6.2, 4, 13.8, 13.2, 1.2, WH)
    c.rrect(6.2, 13.8, 13.8, 16.4, 0.8, (255, 255, 255, 90))  # reflet


def g_chip(c):
    c.rrect(6, 6, 14, 14, 1.5, WH)
    for k in (8, 10, 12):
        c.line([(k, 3.5), (k, 5.5)], WH, 1.0)
        c.line([(k, 14.5), (k, 16.5)], WH, 1.0)
        c.line([(3.5, k), (5.5, k)], WH, 1.0)
        c.line([(14.5, k), (16.5, k)], WH, 1.0)


def g_font(c):
    c.text(10, 10.4, "Aa", 10.5, WH)


def g_globe(c):
    c.ellipse(4, 4, 16, 16, outline=WH, width=1.4)
    c.ellipse(7.3, 4, 12.7, 16, outline=WH, width=1.2)
    c.line([(4.5, 10), (15.5, 10)], WH, 1.2)


def g_gear(c, teeth=8):
    cx = cy = 10
    pts = []
    for i in range(teeth * 2):
        a = math.pi * 2 * i / (teeth * 2)
        rr = 6.8 if i % 2 == 0 else 5.2
        for da in (-0.17, 0.17):
            pts.append((cx + rr * math.cos(a + da), cy + rr * math.sin(a + da)))
    c.poly(pts, WH)
    c.ellipse(7.6, 7.6, 12.4, 12.4, fill=(0, 0, 0, 0))


def g_grid(c):
    for x0 in (4.5, 10.8):
        for y0 in (4.5, 10.8):
            c.rrect(x0, y0, x0 + 4.7, y0 + 4.7, 1.4, WH)


def g_bookmark(c):
    c.poly([(6, 4), (14, 4), (14, 16), (10, 12.6), (6, 16)], WH)


def g_star(c):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = 6.6 if i % 2 == 0 else 2.8
        pts.append((10 + rr * math.cos(a), 10.6 + rr * math.sin(a)))
    c.poly(pts, WH)


def g_queue(c):
    for yy in (6, 10):
        c.line([(4, yy), (11, yy)], WH, 1.6)
    c.line([(4, 14), (9, 14)], WH, 1.6)
    c.line([(14, 9.5), (14, 16)], WH, 1.6)
    c.line([(10.8, 12.8), (17.2, 12.8)], WH, 1.6)


def g_move(c):
    c.line([(7, 15), (7, 5)], WH, 1.6)
    c.line([(4.5, 7.5), (7, 5), (9.5, 7.5)], WH, 1.6)
    c.line([(13, 5), (13, 15)], WH, 1.6)
    c.line([(10.5, 12.5), (13, 15), (15.5, 12.5)], WH, 1.6)


def g_keyboard(c):
    c.rrect(3, 6, 17, 14.5, 2, WH)
    hole = (0, 0, 0, 0)
    for row, yy in enumerate((7.8, 10.2)):
        for k in range(5):
            c.rrect(4.6 + k * 2.4, yy, 5.9 + k * 2.4, yy + 1.4, 0.3, hole)
    c.rrect(6.5, 12.4, 13.5, 13.4, 0.3, hole)


def g_question(c):
    c.text(10, 10.6, "?", 13, WH)


def g_switch(c):
    c.rrect(3.5, 6.5, 16.5, 13.5, 3.5, WH)
    c.ellipse(10.2, 7.3, 15.7, 12.7, fill=(52, 199, 89, 255))


def g_bolt(c):
    c.poly([(11.5, 3.5), (5.5, 11), (9.6, 11), (8.5, 16.5), (14.5, 9), (10.4, 9)], WH)


def g_rec(c):
    c.ellipse(5, 5, 15, 15, fill=WH)
    c.ellipse(7.2, 7.2, 12.8, 12.8, fill=(255, 59, 48, 255))


def g_bubble(c):
    c.rrect(3.5, 4.5, 16.5, 13.5, 4, WH)
    c.poly([(6, 12), (9, 13), (5, 16.5)], WH)


def g_info(c):
    c.ellipse(9, 4.4, 11.2, 6.6, fill=WH)
    c.rrect(8.9, 8, 11.1, 15.6, 1.0, WH)


def g_playback(c):
    c.poly([(5, 5), (12, 10), (5, 15)], WH)
    c.arc(9, 5.5, 18, 14.5, -55, 55, WH, 1.4)


def g_sun(c):
    c.ellipse(7, 7, 13, 13, fill=WH)
    for i in range(8):
        a = i * math.pi / 4
        c.line([(10 + 4.8 * math.cos(a), 10 + 4.8 * math.sin(a)),
                (10 + 6.6 * math.cos(a), 10 + 6.6 * math.sin(a))], WH, 1.3)


def g_radio(c):
    c.ellipse(8.6, 8.6, 11.4, 11.4, fill=WH)
    for rr, wd in ((4.2, 1.4), (7.0, 1.4)):
        c.arc(10 - rr, 10 - rr, 10 + rr, 10 + rr, -45, 45, WH, wd)
        c.arc(10 - rr, 10 - rr, 10 + rr, 10 + rr, 135, 225, WH, wd)


def g_eq(c):
    for x, yk in ((6, 12), (10, 7), (14, 10.5)):
        c.line([(x, 4.5), (x, 15.5)], (255, 255, 255, 140), 1.2)
        c.rrect(x - 2.0, yk - 1.3, x + 2.0, yk + 1.3, 1.2, WH)


def g_rockbox(c):
    c.ellipse(4, 4, 16, 16, outline=WH, width=1.6)
    c.text(10.2, 10.3, "R", 9, WH)


# (couleur haut, couleur bas, glyphe) dans l'ordre des icônes Rockbox
ICONS = [
    ((255, 94, 126), (255, 45, 85), g_note),          # Audio
    ((90, 176, 255), (10, 122, 255), g_folder),       # Folder
    ((255, 184, 64), (255, 140, 10), g_playlist),     # Playlist
    (None, None, g_chev_r),                           # Cursor
    ((100, 210, 255), (60, 120, 255), g_palette),     # Wps (thèmes)
    ((152, 152, 160), (110, 110, 118), g_chip),       # Firmware
    ((126, 124, 250), (88, 86, 214), g_font),         # Font
    ((96, 214, 236), (40, 170, 210), g_globe),        # Language
    ((152, 152, 160), (99, 99, 106), g_gear),         # Config
    ((206, 120, 250), (175, 82, 222), g_grid),        # Plugin
    ((255, 105, 97), (255, 59, 48), g_bookmark),      # Bookmark
    ((255, 224, 64), (255, 190, 10), g_star),         # Preset
    ((255, 184, 64), (255, 140, 10), g_queue),        # Queued
    ((90, 176, 255), (10, 122, 255), g_move),         # Moving
    ((152, 152, 160), (99, 99, 106), g_keyboard),     # Keyboard
    (None, None, g_chev_l),                           # Reverse_Cursor
    ((152, 152, 160), (99, 99, 106), g_question),     # Questionmark
    ((152, 152, 160), (99, 99, 106), g_switch),       # Menu_setting
    ((90, 176, 255), (10, 122, 255), g_bolt),         # Menu_functioncall
    ((120, 124, 140), (84, 88, 102), g_chev_r),       # Submenu
    ((152, 152, 160), (99, 99, 106), g_gear),         # Submenu_Entered (= « Réglages » du menu principal)
    ((255, 105, 97), (230, 40, 40), g_rec),           # Recording
    ((92, 230, 128), (40, 190, 80), g_bubble),        # Voice
    ((152, 152, 160), (99, 99, 106), g_gear),         # General_settings_menu
    ((120, 124, 140), (72, 76, 92), g_info),          # System_menu
    ((255, 94, 126), (255, 45, 85), g_playback),      # Playback_menu
    ((90, 176, 255), (10, 122, 255), g_sun),          # Display_menu
    ((255, 120, 90), (230, 40, 110), g_coverflow),    # Remote_Display_menu -> Cover Flow
                                                      # (pas de télécommande sur le nano)
    ((255, 184, 64), (255, 140, 10), g_radio),        # Radio_screen
    ((90, 176, 255), (10, 122, 255), g_folder),       # file_view_menu
    ((255, 94, 126), (255, 45, 85), g_eq),            # EQ
    ((126, 124, 250), (60, 120, 255), g_rockbox),     # Rockbox
]


def selected_icons(pill_rgba):
    """Icônes pré-composées sur la pastille bleue (ligne choisie)."""
    icons = make_iconset()
    ox, oy = ICON_X - PILL[0], ICON_Y - PILL[1]
    under = pill_rgba[oy:oy + ICON, ox:ox + ICON].astype(np.float64)
    frames = []
    for i in range(len(ICONS)):
        ic = icons[i * ICON:(i + 1) * ICON]
        a1, a2 = ic[..., 3:4] / 255.0, under[..., 3:4] / 255.0
        a = a1 + a2 * (1 - a1)
        rgb = (ic[..., :3] * a1 + under[..., :3] * a2 * (1 - a1)) / np.maximum(a, 1e-6)
        frames.append(np.dstack([quantize(rgb), np.round(a[..., 0] * 255)]))
    return np.concatenate(frames, 0)


def make_iconset():
    tiles = []
    for spec in ICONS:
        top, bottom, glyph = spec
        c = Canvas(20, 20, unit=ICON / 20.0)
        if top is not None:
            gradient_tile(c, top, bottom, size=ICON, r=5.0 * ICON / 20.0)
            g = Canvas(20, 20, unit=ICON / 20.0)
            glyph(g)
            # glyphe blanc par-dessus la tuile, les « trous » restent colorés
            c.img.alpha_composite(g.img)
        else:
            glyph(c)
        tiles.append(c.result())
    return np.concatenate(tiles, 0)


# ---------------------------------------------------------------------------
# Petits éléments : pile, cadenas, île, commandes de lecture
# ---------------------------------------------------------------------------

def battery_frame(level, charging):
    """Pile iOS (dessinée en 25x11, réduite à BATT_SIZE) ; level None = inconnu."""
    c = Canvas(25, 11, unit=BATT_K)
    assert (c.w, c.h) == BATT_SIZE
    c.d.rounded_rectangle(c.box(0.5, 0.5, 22.5, 10.5), radius=c.s(3),
                          outline=(255, 255, 255, 110), width=int(c.s(1)))
    c.rrect(23.2, 3.6, 24.6, 7.4, 0.7, (255, 255, 255, 110))
    if level is not None:
        fill_w = 19.0 * level / 100.0
        if level <= 20 and not charging:
            col = (255, 69, 58, 255)
        elif charging:
            col = (48, 209, 88, 255)
        else:
            col = (255, 255, 255, 255)
        if fill_w > 0.4:
            c.rrect(2, 2, 2 + max(fill_w, 1.2), 9, 1.6, col)
    else:
        c.text(11.5, 5.6, "?", 8, WH)
    if charging:
        c.poly([(12.8, 1.2), (8.6, 6.2), (11.4, 6.2), (10.4, 9.8), (14.6, 4.8), (11.8, 4.8)],
               (255, 255, 255, 255))
    return c.result()


def lock_icon():
    c = Canvas(10, 13, unit=LOCK_K)
    assert (c.w, c.h) == LOCK_SIZE
    c.d.arc(c.box(2, 0.8, 8, 7.6), 180, 360, fill=WH, width=int(c.s(1.5)))
    c.line([(2.75, 4.2), (2.75, 6.5)], WH, 1.5)
    c.line([(7.25, 4.2), (7.25, 6.5)], WH, 1.5)
    c.rrect(0.8, 6, 9.2, 12.6, 1.6, WH)
    return c.result()


def island_frame(kind, phase=0):
    """Capsule noire en haut de l'écran ; kind = stop|play|pause|seek."""
    w, h = 68, 17  # coordonnées de dessin, réduites à ISLAND_RECT
    c = Canvas(w, h, unit=ISLAND_K)
    assert (c.w, c.h) == tuple(ISLAND_RECT[2:])
    if kind == "stop":
        return c.result()
    c.rrect(0, 0, w, h, h / 2, (0, 0, 0, 255))
    # vignette d'album stylisée
    c.rrect(5, 3, 16, 14, 3, (255, 70, 120, 255))
    c.ellipse(8.2, 8.6, 11.4, 11.8, fill=WH)
    c.poly([(10.6, 10.2), (11.4, 10.2), (11.4, 5.2), (10.6, 5.4)], WH)
    accent = (255, 120, 160, 255)
    if kind == "play":
        heights = [(3, 7, 5, 8, 4), (6, 4, 8, 5, 7), (8, 6, 3, 7, 5)][phase]
        for i, hh in enumerate(heights):
            xx = 45 + i * 4
            c.rrect(xx, 8.5 - hh / 2, xx + 2.2, 8.5 + hh / 2, 1.1, accent)
    elif kind == "pause":
        c.rrect(52, 4.5, 54.6, 12.5, 1, (255, 255, 255, 230))
        c.rrect(57, 4.5, 59.6, 12.5, 1, (255, 255, 255, 230))
    else:  # avance/retour rapide
        c.poly([(47, 4.5), (53, 8.5), (47, 12.5)], (255, 255, 255, 230))
        c.poly([(53, 4.5), (59, 8.5), (53, 12.5)], (255, 255, 255, 230))
    return c.result()


def transport_icon(kind, size=(28, 28), col=WH):
    """Dessiné en 28x28 (lecture) ou 22x20 (précédent/suivant), réduit par CTRL_K."""
    w, h = size
    c = Canvas(w, h, unit=CTRL_K)
    if kind == "play":
        c.poly([(9, 5.5), (22.5, 14), (9, 22.5)], col)
    elif kind == "pause":
        c.rrect(8, 6, 12, 22, 1.4, col)
        c.rrect(16, 6, 20, 22, 1.4, col)
    elif kind == "stop":
        c.rrect(8, 8, 20, 20, 2.4, col)
    elif kind == "next":
        c.poly([(4, 5), (12, 10), (4, 15)], col)
        c.poly([(12, 5), (20, 10), (12, 15)], col)
        c.rrect(20, 5, 22, 15, 0.6, col)
    elif kind == "prev":
        c.poly([(18, 5), (10, 10), (18, 15)], col)
        c.poly([(10, 5), (2, 10), (10, 15)], col)
        c.rrect(0, 5, 2, 15, 0.6, col)
    return c.result()


def shuffle_icon(on):
    col = (10, 132, 255, 255) if on else (255, 255, 255, 120)
    c = Canvas(20, 18, unit=SMALL_K)
    c.line([(2, 5), (6, 5), (13, 13), (16, 13)], col, 1.6)
    c.line([(2, 13), (6, 13), (13, 5), (16, 5)], col, 1.6)
    c.poly([(15.5, 2.4), (19, 5), (15.5, 7.6)], col)
    c.poly([(15.5, 10.4), (19, 13), (15.5, 15.6)], col)
    return c.result()


def repeat_icon(mode):
    """mode : off, all, one, shuffle, ab."""
    on = mode != "off"
    col = (10, 132, 255, 255) if on else (255, 255, 255, 120)
    c = Canvas(20, 18, unit=SMALL_K)
    c.line([(3, 9), (3, 6), (5, 4), (15, 4)], col, 1.6)
    c.poly([(14.5, 1.4), (18, 4), (14.5, 6.6)], col)
    c.line([(17, 9), (17, 12), (15, 14), (5, 14)], col, 1.6)
    c.poly([(5.5, 11.4), (2, 14), (5.5, 16.6)], col)
    if mode == "one":
        c.text(10, 9.2, "1", 7, col)
    elif mode == "ab":
        c.text(10, 9.2, "AB", 5.5, col)
    elif mode == "shuffle":
        c.text(10, 9.2, "S", 6, col)
    return c.result()


def speaker(loud, size=(20, 16)):
    c = Canvas(*size, unit=CTRL_K)
    col = (255, 255, 255, 170)
    c.poly([(2, 6), (5, 6), (9, 2.5), (9, 13.5), (5, 10), (2, 10)], col)
    if loud:
        c.arc(6, 4, 14, 12, -50, 50, col, 1.3)
        c.arc(4, 1, 18, 15, -50, 50, col, 1.3)
    return c.result()


def capsule(w, h, rgba):
    c = Canvas(w, h)
    c.rrect(0, 0, w, h, h / 2.0, rgba)
    return c.result()


def place(back, rgba, x, y):
    """Pré-compose une image RGBA sur le fond (opaque, exacte en RGB565)."""
    h, w = rgba.shape[:2]
    crop = back[y:y + h, x:x + w].astype(np.float64)
    a = rgba[..., 3:4] / 255.0
    return quantize(crop * (1 - a) + rgba[..., :3] * a)


def strip(frames):
    return np.concatenate(frames, 0)


# ---------------------------------------------------------------------------
# Fonds
# ---------------------------------------------------------------------------

def menu_backdrop():
    bg = wallpaper("menu")
    bg = glass(bg, PANEL, PANEL_R)
    return dither565(bg)


def wps_backdrop():
    bg = wallpaper("wps")
    # ombre de la pochette
    x, y, w, h = ART
    d = sdf_round_rect(W, H, (x, y + 2, w, h), ART_R)
    sh = 0.55 * np.exp(-np.maximum(d, 0) / 4.0) * (d > -ART_R)
    bg = over(bg, (0, 0, 6), np.clip(sh, 0, 1))
    bg = glass(bg, PLAYER, PLAYER_R, tint_a=0.36, lift=0.12)
    # Sans pochette, c'est le fond qui se voit : on y peint la tuile de remplacement.
    bg = art_placeholder(bg)
    return dither565(bg)


def art_placeholder(back):
    """Pochette absente : tuile de verre avec une note, peinte dans le fond."""
    x, y, w, h = ART
    tile = glass(back, ART, ART_R, tint=(40, 46, 90), tint_a=0.55, shadow=0.0, lift=0.16)
    g = Canvas(20, 20, unit=w / 20.0)
    g_note(g)
    note = g.result()
    a = note[..., 3:4] / 255.0 * 0.55
    out = tile.copy()
    out[y:y + h, x:x + w] = tile[y:y + h, x:x + w] * (1 - a) + 255 * a
    return out


def art_trims(back):
    """Rogne les coins de la pochette avec de fines bandes opaques.

    Rockbox mélange l'alpha d'une image avec le FOND (backdrop), pas avec
    l'écran : un masque semi-transparent effacerait donc la pochette. On
    recouvre seulement les pixels situés hors de l'arrondi, ligne par ligne,
    avec la couleur du fond. Renvoie [(x, y, pixels 1xNx3)] relatifs à ART.
    """
    x, y, w, h = ART
    inside = coverage(sdf_round_rect(w, h, (0, 0, w, h), ART_R)) >= 0.5
    trims = []
    for row in list(range(ART_R)) + list(range(h - ART_R, h)):
        n = int(np.argmax(inside[row])) if inside[row].any() else w // 2
        if n:
            trims.append((0, row, back[y + row, x:x + n][None]))
            trims.append((w - n, row, back[y + row, x + w - n:x + w][None]))
    return trims


# ---------------------------------------------------------------------------
# Liste : pastille de sélection et séparateur
# ---------------------------------------------------------------------------

PILL_BODY = q565(BLUE)


def pill():
    pw, ph = PILL[2], PILL[3]
    # dégradé vertical : reflet en haut, corps uni (zone du texte), ombre en bas
    rows = []
    e = PILL_EDGE
    for yy in range(ph):
        if yy < e:
            t = yy / float(e)
            col = np.array((120, 190, 255)) * (1 - t) + np.array(PILL_BODY) * t
        elif yy >= ph - e:
            t = (yy - (ph - e) + 1) / float(e)
            col = np.array(PILL_BODY) * (1 - t) + np.array((0, 92, 214)) * t
        else:
            col = np.array(PILL_BODY, np.float64)
        rows.append(col)
    rows = np.array(rows)
    d = sdf_round_rect(pw, ph, (0, 0, pw, ph), ph / 2.0)
    alpha = coverage(d)
    rgb = np.broadcast_to(rows[:, None, :], (ph, pw, 3)).copy()
    # liseré spéculaire en haut à gauche
    ring = np.clip(1 - np.abs(d + 0.7) / 0.9, 0, 1)
    ys = np.mgrid[0:ph, 0:pw][0]
    top = np.clip(1 - ys / (ph * 0.6), 0, 1)
    rgb = over(rgb, WHITE, ring * (0.25 + 0.5 * top))
    # le corps du texte doit rester EXACTEMENT de la couleur du dégradé %Vg
    # (le texte de la ligne choisie occupe les lignes TEXT_Y..TEXT_Y+TEXT_H)
    assert e <= TEXT_Y - PILL[1] and TEXT_Y - PILL[1] + TEXT_H <= ph - e
    body_rows = slice(e, ph - e)
    inner = (d < -1.6)
    assert inner[body_rows][:, TEXT_X - PILL[0]:TEXT_X + TEXT_W - PILL[0]].all(), \
        "le texte déborde des arrondis de la pastille"
    rgb[body_rows][inner[body_rows]] = PILL_BODY
    out = np.dstack([quantize(rgb), np.round(alpha * 255)])
    return out


def separator():
    w = PILL[0] + PILL[2] - TEXT_X
    arr = np.zeros((1, w, 4))
    arr[..., :3] = 255
    arr[..., 3] = 34
    return arr


def scroll_thumb():
    return capsule(SCROLL_VP[2], 16, (255, 255, 255, 150))


# ---------------------------------------------------------------------------
# Fichiers de skin
# ---------------------------------------------------------------------------

def vp(rect, font="-"):
    x, y, w, h = rect
    return "%%V(%d,%d,%d,%d,%s)" % (x, y, w, h, font)


STATUS_LINES = r"""# --- Barre d'état -------------------------------------------------------
# Heure (si l'horloge est réglée)
{clock}%Vf({white})
%?cc<%?St(time format)<%cH|%cI>:%cM|>
#
# Niveau de batterie en texte
{pct}%Vf({white})
%ar%bl%%
#
# Pile (12 vignettes : inconnu, 0 %, 10 % ... 100 %)
{batt}
%?bc<%xd(C,%bl)|%xd(B,%bl)>
#
# Verrou (bouton Hold)
{lock}
%?mh<%xd(K)|>
"""


def status_images(skin):
    """Images de la barre d'état, pré-composées sur le fond de chaque skin."""
    return ("%xl(B,battery-{s}.bmp,0,0,12)\n%xl(C,battery-charge-{s}.bmp,0,0,12)\n"
            "%xl(K,lock-{s}.bmp,0,0)\n").format(s=skin)


def status_block():
    bx, by = BATT_POS
    lx, ly = LOCK_POS
    return STATUS_LINES.format(
        clock=vp(CLOCK_VP, 3), pct=vp(BATT_PCT_VP, 4), white=hexcol(WHITE),
        batt=vp((bx, by) + BATT_SIZE), lock=vp((lx, ly) + LOCK_SIZE))


def write_sbs():
    lx, ly, lw, lh = LIST_VP
    ix, iy, iw, ih = ISLAND_RECT
    sx, sy, sw, sh = SCROLL_VP
    px, py, pw, ph = PILL
    text = r"""# Liquid Glass — barre d'état et menus ({W}x{H}x16)
# Généré par generateur/build.py : modifier le script plutôt que ce fichier.
#
%Fl(2,15-InterDisplay-Bold.fnt)
%Fl(3,10-Inter-SemiBold.fnt)
%Fl(4,9-Inter-Medium.fnt)
#
%xl(P,pill.bmp,{px},{py})
%xl(S,sep.bmp,{tx},{sepy})
%xl(I,__list_icons__,0,0)
%xl(J,icons-selected.bmp,0,0,{nicons})
{status_images}%xl(D,island.bmp,0,0,6)
%xl(T,thumb.bmp,0,0)
#
# --- Zone des menus : le panneau de verre est dans le fond d'écran -------
%Vi(-,{lx},{ly},{lw},{lh},1)
%Lb(l,{lw},{rowh})
#
# Chaque ligne de liste = 3 viewports « l » superposés :
# 1. pastille bleue si la ligne est choisie, sinon un fin séparateur
%Vl(l,0,0,{lw},{rowh},-)
%?Lc<%xd(P)|%xd(S)>
# 2. icône
%Vl(l,{icx},{icy},{icw},{ich},1)
# (Rockbox mélange l'alpha avec le fond : sur la pastille il faut des icônes
#  déjà composées sur le bleu, sinon leurs coins laissent voir le panneau.)
%?Lc<%xd(J,%LI,1)|%xd(I,%LI,2)>
# 3. texte ; la ligne choisie défile et se peint du bleu exact de la pastille
%Vl(l,{tx},{ty},{tw},{th},1)%Vf({text})%Vg({body},{body},{white})
%?Lc<%Vs(gradient)%s%LT|%LT>
#
# --- Grand titre façon iOS ------------------------------------------------
{title}%Vf({white})
%s%?Lt<%Lt|Rockbox>
#
# --- Indicateur de défilement ------------------------------------------
%V({sx},{sy},{sw},{sh},-)
%?LB<%LB(0,0,{sw},{sh},vertical,invert,nobar,slider,T)|>
#
# --- « Dynamic Island » : visible pendant la lecture ----------------------
%V({ix},{iy},{iw},{ih},-)
%t(0.4)%?mp<%xd(Da)|%xd(Db)|%xd(De)|%xd(Df)|%xd(Df)|%xd(Da)>;%t(0.4)%?mp<%xd(Da)|%xd(Dc)|%xd(De)|%xd(Df)|%xd(Df)|%xd(Da)>;%t(0.4)%?mp<%xd(Da)|%xd(Dd)|%xd(De)|%xd(Df)|%xd(Df)|%xd(Da)>
#
""".format(px=px, py=py, tx=TEXT_X, sepy=ROW_H - 1, lx=lx, ly=ly, lw=lw, lh=lh,
           rowh=ROW_H, icx=ICON_X, icy=ICON_Y, icw=ICON, ich=ICON + 1,
           ty=TEXT_Y, tw=TEXT_W, th=TEXT_H, W=W, H=H,
           text=hexcol(TEXT), body=hexcol(PILL_BODY), white=hexcol(WHITE),
           title=vp(TITLE_VP, 2), sx=sx, sy=sy, sw=sw, sh=sh,
           ix=ix, iy=iy, iw=iw, ih=ih, status_images=status_images("sbs"),
           nicons=len(ICONS))
    text += status_block()
    with open(os.path.join(OUT, "wps", NAME + ".sbs"), "w") as f:
        f.write(text)


def write_wps():
    ax, ay, aw, ah = ART
    cx, cy, cw, ch = CTRL_VP
    vx, vy, vw, vh = VOL_VP
    text = r"""# Liquid Glass — écran de lecture ({W}x{H}x16)
# Généré par generateur/build.py : modifier le script plutôt que ce fichier.
#
%wd
%X(wps-backdrop.bmp)
%Fl(2,13-InterDisplay-SemiBold.fnt)
%Fl(3,10-Inter-SemiBold.fnt)
%Fl(4,9-Inter-Medium.fnt)
%Fl(5,11-Inter-Regular.fnt)
#
{corners}{status_images}%xl(F,pb-fill.bmp,0,0)
%xl(R,pb-track.bmp,0,0)
%xl(G,vol-fill.bmp,0,0)
%xl(H,vol-track.bmp,0,0)
%xl(Q,vol-low.bmp,{vlx},{vly})
%xl(U,vol-high.bmp,{vhx},{vly})
# vignettes « vrai/faux » : la première = activé
%xl(L,shuffle.bmp,{shx},{ty},2)
%xl(E,repeat.bmp,{rpx},{ty},5)
%xl(J,prev.bmp,{pvx},{tsy})
%xl(O,next.bmp,{nxx},{tsy})
%xl(A,playstate.bmp,{plx},{ply},5)
#
# Volume : la rangée de commandes laisse place à une jauge pendant le réglage
%?mv(2)<%Vd(v)|%Vd(c)>
#
# --- Pochette aux coins arrondis -------------------------------------------
%V({ax},{ay},{aw},{ah},-)
# Pas de conditionnelle ici : Rockbox efface la zone des images de la
# branche inactive à chaque rafraîchissement, ce qui effacerait la pochette.
# La tuile « pas de pochette » est donc peinte dans le fond.
%Cl(0,0,{aw},{ah},c,c)
%Cd
{corner_show}
#
# --- Titre, artiste, album -------------------------------------------------
{l_title}%Vf({white})
%s%?it<%it|%fn>
{l_artist}%Vf({t2})
%s%?ia<%ia|%?iA<%iA|%?d(2)<%d(2)|>>>
{l_album}%Vf({t3})
%s%?id<%id|%?d(1)<%d(1)|>>
#
# --- À suivre --------------------------------------------------------------
{l_next_lbl}%Vf({t3})
%?It<%Sx(Next Track:)|%?Fn<%Sx(Next Track:)|>>
{l_next}%Vf({t2})
%s%?It<%It|%Fn>
#
# --- Panneau du lecteur ----------------------------------------------------
{tl}%Vf({t2})
%pc
{tr}%Vf({t2})
%ar-%pr
{pb}
%pb(0,0,{pbw},{pbh},image,F,backdrop,R)
#
%Vl(c,{cx},{cy},{cw},{ch},-)
%xd(L,%ps)
%xd(J)
%?mp<%xd(Aa)|%xd(Ab)|%xd(Aa)|%xd(Ad)|%xd(Ae)|%xd(Aa)>
%xd(O)
%xd(E,%mm)
#
%Vl(v,{vx},{vy},{vw},{vh},-)
%xd(Q)
%xd(U)
%Vl(v,{vbx},{vby},{vbw},{vbh},-)
%pv(0,0,{vbw},{vbh},image,G,backdrop,H)
""".format(shx=SHUF_X, rpx=REP_X, ty=CTRL_Y_SMALL, pvx=PREV_X, nxx=NEXT_X, tsy=CTRL_Y_SKIP,
           plx=PLAY_X, ply=CTRL_Y_PLAY, W=W, H=H,
           l_title=wps_line(WPS_TITLE), l_artist=wps_line(WPS_ARTIST), l_album=wps_line(WPS_ALBUM),
           l_next_lbl=wps_line(WPS_NEXT_LBL), l_next=wps_line(WPS_NEXT),
           ax=ax, ay=ay, aw=aw, ah=ah, ix=INFO_X, iw=INFO_W,
           white=hexcol(WHITE), t2=hexcol(TEXT2), t3=hexcol(TEXT3),
           tl=vp(TIME_L_VP, 4), tr=vp(TIME_R_VP, 4), pb=vp(PB_VP),
           pbw=PB_VP[2], pbh=PB_VP[3], cx=cx, cy=cy, cw=cw, ch=ch,
           vx=vx, vy=vy, vw=vw, vh=vh,
           vbx=vx + VOLBAR_X, vby=vy + VOLBAR_Y, vbw=VOLBAR_W, vbh=VOLBAR_H,
           vlx=VOL_LOW_X, vly=VOL_ICON_Y, vhx=VOL_HIGH_X,
           status_images=status_images("wps"), corners=corner_lines(),
           corner_show="".join("%%xd(crn%02d)" % i for i in range(len(TRIMS))))
    text += status_block()
    with open(os.path.join(OUT, "wps", NAME + ".wps"), "w") as f:
        f.write(text)


def wps_line(spec):
    y, h, font = spec
    return vp((INFO_X, y, INFO_W, h), font)


def corner_lines():
    return "".join("%%xl(crn%02d,corner%d.bmp,%d,%d)\n" % (i, i, tx, ty)
                   for i, (tx, ty, _) in enumerate(TRIMS))


TRIMS = []  # rempli par main() : bandes qui arrondissent la pochette

# Positions dans la rangée de commandes (relatives à CTRL_VP) : aléatoire et
# répétition 13x12, précédent/suivant 13x12, lecture 17x17
SHUF_X, PREV_X, PLAY_X, NEXT_X, REP_X = 4, 44, 68, 95, 135
CTRL_Y_SMALL, CTRL_Y_SKIP, CTRL_Y_PLAY = 3, 3, 0
# Jauge de volume (relative à VOL_VP) et haut-parleurs 12x10
VOLBAR_X, VOLBAR_Y, VOLBAR_W, VOLBAR_H = 18, 7, 104, 4
VOL_LOW_X, VOL_HIGH_X, VOL_ICON_Y = 2, VOL_VP[2] - 14, 4


COVERFLOW_ICON = 27  # case « Remote_Display_menu », inutile ici (pas de télécommande à écran)


WALLPAPER_ICON = 4  # « Wps », dessinée en palette


def write_shortcuts():
    """Raccourcis « Cover Flow » (plugin PictureFlow) et « Fond d'écran »."""
    with open(os.path.join(OUT, "shortcuts.txt"), "w") as f:
        f.write("[shortcut]\ntype: file\nname: Cover Flow\n"
                "data: /.rockbox/rocks/demos/pictureflow.rock\n"
                "icon: %d\n\n" % COVERFLOW_ICON)
        # ouvre la liste des thèmes : un thème par fond d'écran
        f.write("[shortcut]\ntype: browse\nname: Fond d'écran\n"
                "data: /.rockbox/themes/\n"
                "icon: %d\n" % WALLPAPER_ICON)


def write_cfg():
    cfg = """# Liquid Glass — thème Rockbox pour iPod nano 2G (176x132)
# Fond « {fond} » : {desc}
# Copier le dossier .rockbox à la racine de l'iPod, puis :
# Réglages > Réglages thème > Liste des thèmes > {n}
# (Settings > Theme Settings > Browse Theme Files, en anglais)
wps: /.rockbox/wps/{n}.wps
sbs: /.rockbox/wps/{n}.sbs
fms: -
backdrop: /.rockbox/backdrops/{n}.bmp
font: /.rockbox/fonts/12-Inter-Medium.fnt
iconset: /.rockbox/icons/{fam}.bmp
viewers iconset: -
foreground color: {fg}
background color: 0B1020
selector type: bar (color)
line selector start color: {sel}
line selector end color: {sel}
line selector text color: FFFFFF
statusbar: top
scrollbar: off
show icons: on
list separator height: 0
ui viewport: -
# Raccourcis (dont Cover Flow) en tête du menu principal
root menu order: shortcuts, files, database, wps, settings, recording, playlists, plugins, system_menu
""".format(n=NAME, fam=FAMILY, fg=hexcol(TEXT), sel=hexcol(PILL_BODY), fond=CURRENT[0],
           desc=CURRENT[1])
    os.makedirs(os.path.join(OUT, "themes"), exist_ok=True)
    with open(os.path.join(OUT, "themes", NAME + ".cfg"), "w") as f:
        f.write(cfg)


# ---------------------------------------------------------------------------

def build_variant():
    os.makedirs(SKIN_DIR, exist_ok=True)

    print("fond des menus…")
    menu = menu_backdrop()
    write_bmp(os.path.join(OUT, "backdrops", NAME + ".bmp"), menu)

    print("fond de lecture…")
    wps = wps_backdrop()
    write_bmp(os.path.join(SKIN_DIR, "wps-backdrop.bmp"), wps)

    print("liste…")
    pill_img = pill()
    write_bmp(os.path.join(SKIN_DIR, "pill.bmp"), pill_img)
    write_bmp(os.path.join(SKIN_DIR, "icons-selected.bmp"), selected_icons(pill_img))
    write_bmp(os.path.join(SKIN_DIR, "sep.bmp"), separator())
    write_bmp(os.path.join(SKIN_DIR, "thumb.bmp"), np.round(scroll_thumb()))

    print("barre d'état…")
    # Rockbox mélange l'alpha des images avec le fond d'écran : on pré-compose
    # donc ces éléments, opaques et exacts en RGB565, sur le fond de chaque skin.
    bx, by = BATT_POS
    levels = [None] + list(range(0, 101, 10))
    for back, sub in ((menu, "sbs"), (wps, "wps")):
        write_bmp(os.path.join(SKIN_DIR, "battery-%s.bmp" % sub),
                  strip([place(back, battery_frame(l, False), bx, by) for l in levels]))
        write_bmp(os.path.join(SKIN_DIR, "battery-charge-%s.bmp" % sub),
                  strip([place(back, battery_frame(l, True), bx, by) for l in levels]))
        write_bmp(os.path.join(SKIN_DIR, "lock-%s.bmp" % sub), place(back, lock_icon(), *LOCK_POS))

    ix, iy = ISLAND_RECT[:2]
    frames = [island_frame("stop"), island_frame("play", 0), island_frame("play", 1),
              island_frame("play", 2), island_frame("pause"), island_frame("seek")]
    write_bmp(os.path.join(SKIN_DIR, "island.bmp"), strip([place(menu, f, ix, iy) for f in frames]))

    print("lecteur…")
    TRIMS[:] = art_trims(wps)
    for i, (_, _, px) in enumerate(TRIMS):
        write_bmp(os.path.join(SKIN_DIR, "corner%d.bmp" % i), px)

    px, py, pw, ph = PB_VP
    write_bmp(os.path.join(SKIN_DIR, "pb-fill.bmp"), place(wps, capsule(pw, ph, (255, 255, 255, 240)), px, py))
    write_bmp(os.path.join(SKIN_DIR, "pb-track.bmp"), place(wps, capsule(pw, ph, (255, 255, 255, 56)), px, py))

    vx, vy = VOL_VP[:2]
    vbx, vby = vx + VOLBAR_X, vy + VOLBAR_Y
    write_bmp(os.path.join(SKIN_DIR, "vol-fill.bmp"),
              place(wps, capsule(VOLBAR_W, VOLBAR_H, (255, 255, 255, 240)), vbx, vby))
    write_bmp(os.path.join(SKIN_DIR, "vol-track.bmp"),
              place(wps, capsule(VOLBAR_W, VOLBAR_H, (255, 255, 255, 56)), vbx, vby))
    write_bmp(os.path.join(SKIN_DIR, "vol-low.bmp"), place(wps, speaker(False), vx + VOL_LOW_X, vy + VOL_ICON_Y))
    write_bmp(os.path.join(SKIN_DIR, "vol-high.bmp"), place(wps, speaker(True), vx + VOL_HIGH_X, vy + VOL_ICON_Y))

    cx, cy = CTRL_VP[:2]
    write_bmp(os.path.join(SKIN_DIR, "shuffle.bmp"),
              strip([place(wps, shuffle_icon(on), cx + SHUF_X, cy + CTRL_Y_SMALL) for on in (True, False)]))
    write_bmp(os.path.join(SKIN_DIR, "repeat.bmp"),
              strip([place(wps, repeat_icon(m), cx + REP_X, cy + CTRL_Y_SMALL)
                     for m in ("off", "all", "one", "shuffle", "ab")]))
    write_bmp(os.path.join(SKIN_DIR, "prev.bmp"),
              place(wps, transport_icon("prev", (22, 20)), cx + PREV_X, cy + CTRL_Y_SKIP))
    write_bmp(os.path.join(SKIN_DIR, "next.bmp"),
              place(wps, transport_icon("next", (22, 20)), cx + NEXT_X, cy + CTRL_Y_SKIP))
    write_bmp(os.path.join(SKIN_DIR, "playstate.bmp"),
              strip([place(wps, transport_icon(k), cx + PLAY_X, cy + CTRL_Y_PLAY)
                     for k in ("play", "pause", "stop", "next", "prev")]))

    print("fichiers de skin…")
    write_sbs()
    write_wps()
    write_cfg()


def main():
    global CURRENT, NAME, SKIN_DIR
    print("icônes et raccourcis…")
    write_bmp(os.path.join(OUT, "icons", FAMILY + ".bmp"), np.round(make_iconset()))
    write_shortcuts()
    for wp in WALLPAPERS:
        CURRENT = wp
        NAME = "%s-%s" % (FAMILY, wp[0])
        SKIN_DIR = os.path.join(OUT, "wps", NAME)
        print("== %s ==" % NAME)
        build_variant()
    print("terminé :", os.path.normpath(OUT))


if __name__ == "__main__":
    main()
