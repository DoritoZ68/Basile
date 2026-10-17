#!/bin/sh
# Régénère les polices Rockbox (.fnt, anticrénelées 4 bits) à partir d'Inter.
#
# Inter (licence SIL OFL 1.1) est la police libre la plus proche de SF Pro.
# On compile l'outil officiel de Rockbox, convttf, à un commit figé.
#
# Dépendances : curl, un compilateur C, FreeType (pkg-config freetype2),
# et les fichiers Inter .otf (paquet « fonts-inter » sous Debian/Ubuntu,
# ou https://github.com/rsms/inter ; dossier modifiable via INTER=...).
set -e

ICI=$(cd "$(dirname "$0")" && pwd)
SORTIE="$ICI/../installer/.rockbox/fonts"
INTER=${INTER:-/usr/share/fonts/opentype/inter}
RB_COMMIT=472d4c39ab014230b2ed776364a4631ee9343354

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

curl -fsSL "https://raw.githubusercontent.com/Rockbox/rockbox/$RB_COMMIT/tools/convttf.c" -o "$TMP/convttf.c"
# shellcheck disable=SC2046
cc -O2 -o "$TMP/convttf" "$TMP/convttf.c" $(pkg-config --cflags --libs freetype2)

mkdir -p "$SORTIE"
# Tailles adaptées à l'écran 176x132 du nano 2G (deux fois plus petit que
# celui du nano 3G) ; plage U+0020..U+2122 (latin, grec, cyrillique,
# ponctuation typographique comme « … » et « ’ »)
for spec in "12 Inter-Medium" "15 InterDisplay-Bold" "10 Inter-SemiBold" \
            "13 InterDisplay-SemiBold" "11 Inter-Regular" "9 Inter-Medium"; do
    set -- $spec
    "$TMP/convttf" -p "$1" -s 32 -l 8482 -o "$SORTIE/$1-$2.fnt" "$INTER/$2.otf" >/dev/null
    echo "$1-$2.fnt"
done
