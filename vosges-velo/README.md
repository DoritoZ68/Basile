# Vosges Vélo

Jeu de cyclisme dans le navigateur sur les vraies routes du Haut-Rhin :
le Grand Ballon, le Vieil Armand (Hartmannswillerkopf), la Route des Crêtes
et les villages du piémont (Cernay, Uffholtz, Wattwiller, Soultz, Guebwiller,
Thann, Willer-sur-Thur…).

## Jouer

Ouvrir `dist/vosges-velo.html` d'un double-clic après le build (voir plus
bas). Le fichier contient tout : code, relief, photos aériennes, bâtiments.
Il marche hors ligne, sans serveur, dans Chrome, Edge, Firefox ou Safari
récents. En mode « Auto », le jeu reconnaît les cartes graphiques anciennes
ou à 512 Mo (Radeon HD 6000, Intel HD 3000/4000…) et passe en qualité
« Bas » : textures réduites, pas d'ombres, végétation et bâtiments limités
aux abords du parcours, horizon plus proche. Il baisse ensuite la
résolution, puis la qualité, si l'image n'est pas fluide.

### Commandes

| Touche | Action |
| --- | --- |
| E / A ou ↑ ↓ | Augmenter / baisser l'effort de 20 W par pression |
| ← → ou Q D | Pencher le vélo pour tourner : plus on maintient, plus on se penche ; relâché, le vélo se redresse en douceur |
| Maj | Attaquer (puise dans la réserve anaérobie) |
| S ou Espace | Freiner |
| X | Position de descente |
| C | Changer de caméra : poursuite, première personne, moto TV, drone |
| Souris | Regarder autour (clic pour capturer la souris, Échap pour la libérer) |
| R / double-clic | Recentrer le regard |
| Molette | Zoomer / dézoomer (chaque caméra garde son zoom) |
| Échap / P | Pause |
| 1 / 2 / 3 | Manger une barre / prendre un gel / boire une gorgée |
| V | Course : appeler la voiture d'équipe (bidons pleins, barre, gel) |
| F | Attraper une musette dans la zone de ravitaillement ; en mode libre, remplir ses bidons à la fontaine d'un village (à l'arrêt) |
| M | Carte : petite → grande → masquée (molette pour zoomer, glisser pour se déplacer ; en mode libre, double-clic pour s'y téléporter) |

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

Modes : **course** en peloton (10, 40 ou 80 coureurs de 10 équipes fictives, avec voiture de direction, motos, voitures d'équipe et voiture-balai ; les groupes et les écarts s'affichent en haut de l'écran), contre-la-montre face au fantôme de son
record, balade sur un parcours, et mode **libre** : on choisit son point de
départ sur la carte (zoom à la molette ou aux boutons, déplacement en glissant, clic à l'endroit exact) ou par village, et on roule où l'on veut sur les
24 000 tronçons de routes, rues, routes empierrées, pistes cyclables et
voies vertes de la zone ; rues, arbres et bâtiments se construisent autour
du cycliste au fil du trajet. Pause > « Changer de lieu » pour repartir
ailleurs.

Vélos : **route** (7,4 kg, cintre à drops, roues à rayons, maniable) ou
**contre-la-montre** (8,6 kg, tubes profilés, prolongateurs, roue
lenticulaire, casque profilé ; position allongée qui réduit la traînée
d'environ 25 %, mais moins maniable en virage et moins efficace dans les
fortes pentes).

Ravitaillement : réserve de glycogène (environ 380 g au départ, consommée
selon l'intensité, l'intestin n'en absorbe que ~75 g/h) et hydratation
(0,4 à 1,4 L de sueur par heure selon l'effort et la chaleur). Poches :
barres (40 g), gels (25 g, plus rapides), deux bidons de 500 mL de boisson
isotonique. Sans manger : fringale, puissance en chute ; sans boire,
au-delà de 2 % du poids perdu, la puissance baisse aussi. En course, zone
de ravitaillement à mi-parcours et voiture d'équipe à la demande.

Options : poids, puissance seuil (FTP), maillot,
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

Peloton : chaque coureur a son poids, son seuil et son tempérament. Un
groupe roule au train médian de ses membres, chacun s'aligne sur la tête
de son groupe et profite de l'aspiration ; au-dessus de son seuil, il puise
dans sa réserve et lâche prise quand elle est vide. Attaques en montée et
sprint final. Les coureurs proches sont animés en détail, les autres sont
dessinés en une seule fois.

Physique : puissance → vitesse avec gravité, résistance au roulement,
traînée aérodynamique (densité de l'air selon l'altitude, vent selon
l'orientation de chaque portion de route), aspiration dans la roue,
réserve anaérobie W′ (modèle de Skiba), fréquence cardiaque, braquets
50/34 × 11-32, vitesse limite en virage selon la courbure réelle.

## Rendu

- Le relief IGN est une grille de 30 m, trop grossière pour une chaussée de
  6 m. Un ruban de sol fin (une section tous les 5 m, ±30 m de part et
  d'autre) accompagne donc chaque route et la raccorde au relief réel ;
  sous ce ruban, la grille grossière est masquée par le shader
  (`src/ground.js`).
- Arbres en deux niveaux de détail (≈50 triangles près, 8 à 10 loin),
  coureurs fusionnés en deux maillages chacun, relief en dalles de ~3 km
  avec niveaux de détail : une image courante demande une centaine
  d'appels de dessin et ~400 000 triangles en qualité « Bas ».

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

```bash
python3 tools/fetch_network.py
```

`fetch_network.py` (réseau complet et tous les bâtiments, pour le mode
libre) lit aussi la Base nationale des aménagements cyclables au format
Parquet : il faut `pip install pyarrow`.

Pour ajouter un parcours, ajouter une entrée dans `ROUTES` de
`tools/fetch_data.py` (points de passage dans `P`), relancer les deux
scripts puis le build.

## Sources et licences des données

- Altitudes, orthophotographies, bâtiments et végétation : © IGN,
  Licence Ouverte 2.0 (Géoplateforme, data.geopf.fr)
- Tracés des parcours : © contributeurs OpenStreetMap, ODbL
- Réseau routier (mode libre) : IGN BD TOPO, Licence Ouverte 2.0
- Pistes cyclables et voies vertes : Base nationale des aménagements
  cyclables (export OpenStreetMap, data.gouv.fr), ODbL
- Relief hors de France : EU-DEM v1.1, © Copernicus
