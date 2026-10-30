# Vosges Vélo

Jeu de cyclisme dans le navigateur sur les vraies routes du Haut-Rhin :
le Grand Ballon, le Vieil Armand (Hartmannswillerkopf), la Route des Crêtes
et les villages du piémont (Cernay, Uffholtz, Wattwiller, Soultz, Guebwiller,
Thann, Willer-sur-Thur…).

## Jouer

Ouvrir `dist/vosges-velo.html` d'un double-clic après le build (voir plus
bas). Le fichier contient tout : code, relief, photos aériennes, bâtiments.
Il marche hors ligne, sans serveur, dans Chrome, Edge, Firefox ou Safari
récents. Les graphismes en mode « Auto » baissent la résolution en continu
pour rester fluides sur un petit portable.

### Commandes

| Touche | Action |
| --- | --- |
| E / A ou ↑ ↓ (molette) | Augmenter / baisser l'effort, en watts |
| ← → ou Q D | Pencher le vélo pour tourner : plus on maintient, plus on se penche ; relâché, le vélo se redresse en douceur |
| Maj | Attaquer (puise dans la réserve anaérobie) |
| S ou Espace | Freiner |
| X | Position de descente |
| C | Changer de caméra : poursuite, première personne, moto TV, drone |
| Souris | Regarder autour (clic pour capturer la souris, Échap pour la libérer) |
| R / double-clic | Recentrer le regard |
| Échap / P | Pause |
| M | Son |

Manette : gâchette droite pour l'effort, gauche pour freiner, stick pour
l'inclinaison, A pour attaquer. Sur écran tactile, des boutons s'affichent.

## Parcours

| Parcours | Distance | D+ |
| --- | --- | --- |
| Le Vieil Armand (Cernay → Uffholtz → monument national) | 11,9 km | 639 m |
| Le Grand Ballon par Willer-sur-Thur (D13B6 par Goldbach) | 15,8 km | 974 m |
| La Route des Crêtes (Cernay → Vieil Armand → Col Amic → Grand Ballon) | 22,7 km | 1 180 m |
| Le Grand Ballon par le Markstein (Guebwiller → Lautenbach → Lac de la Lauch) | 32,3 km | 1 132 m |
| Les villages du piémont (Thann → Cernay → Soultz → Guebwiller) | 22,5 km | 183 m |

Chaque parcours se joue aussi en sens inverse (descentes).

Modes : course contre 5 adversaires, contre-la-montre face au fantôme de son
record, balade libre. Options : poids, puissance seuil (FTP), maillot,
niveau des adversaires, heure (matin, midi, soir), météo
(dont le brouillard qui s'épaissit sur les crêtes), vent, temps accéléré.

## Ce qui est réel

- **Routes** : tracés OpenStreetMap, calculés par le routeur OSRM entre les
  points de passage, avec les noms et numéros de route (D 431, D 13B6…).
- **Altitude** : IGN RGE ALTI, un point tous les 5 m le long des routes,
  et une grille de 30 m pour le relief (22 × 23 km).
- **Paysage lointain** : relief à 500 m sur 120 × 95 km (IGN, et EU-DEM
  Copernicus hors de France) pour voir la Forêt-Noire depuis les crêtes.
- **Sol** : photographies aériennes IGN (environ 5 m par pixel).
- **Forêts** : BD TOPO de l'IGN, qui distingue sapins, feuillus, forêts
  mixtes et vignes ; les arbres sont plantés selon ces zones.
- **Bâtiments** : 28 000 emprises BD TOPO avec leur hauteur.
- **Lieux** : radar et monument des Diables Bleus au Grand Ballon, croix
  sommitale et nécropole du Silberloch au Vieil Armand, panneaux de cols,
  bornes kilométriques façon panneaux de col, panneaux d'agglomération.

Conduite : aucune aide pour suivre la route. Le vélo va où on le dirige ;
l'inclinaison impose le rayon du virage (tan φ = v² / g·R). Au-delà de
l'adhérence (asphalte, accotement, herbe), la roue glisse et c'est la chute.

Physique : puissance → vitesse avec gravité, résistance au roulement,
traînée aérodynamique (densité de l'air selon l'altitude, vent selon
l'orientation de chaque portion de route), aspiration dans la roue,
réserve anaérobie W′ (modèle de Skiba), fréquence cardiaque, braquets
50/34 × 11-32, vitesse limite en virage selon la courbure réelle.

## Développer

```bash
npm install
```

```bash
npm run build
```

`npm run build` produit `dist/vosges-velo.html` (et une variante sans
squelette HTML pour la publication en ligne). `npm run dev` reconstruit à
chaque modification des fichiers JavaScript.

Les données sont déjà dans `data/`. Pour les télécharger de nouveau
(Python 3 et Pillow requis, quelques minutes) :

```bash
python3 tools/fetch_data.py
```

```bash
python3 tools/fetch_outer.py
```

Pour ajouter un parcours, ajouter une entrée dans `ROUTES` de
`tools/fetch_data.py` (points de passage dans `P`), relancer les deux
scripts puis le build.

## Sources et licences des données

- Altitudes, orthophotographies, bâtiments et végétation : © IGN,
  Licence Ouverte 2.0 (Géoplateforme, data.geopf.fr)
- Tracés routiers : © contributeurs OpenStreetMap, ODbL
- Relief hors de France : EU-DEM v1.1, © Copernicus
