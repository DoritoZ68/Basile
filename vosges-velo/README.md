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
| 1 / 2 / 3 / 4 | Manger une barre / prendre un gel / boire une gorgée / gel caféiné |
| V | Course : appeler la voiture d'équipe (bidons pleins, barre, gel) |
| F | Attraper une musette dans la zone de ravitaillement ; en mode libre, remplir ses bidons à la fontaine d'un village (à l'arrêt) |
| M | Carte : petite → grande → masquée (molette pour zoomer, glisser pour se déplacer ; en mode libre, double-clic pour s'y téléporter) |
| H | Mode photo : masquer l'interface |

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

Modes : **course** en peloton (10, 40 ou 80 coureurs de 10 équipes fictives ; les groupes et les écarts s'affichent en haut de l'écran), contre-la-montre face au fantôme de son
record (moto de gendarmerie devant, voiture suiveuse derrière), balade sur un parcours, et mode **libre** : on choisit son point de
départ sur la carte (zoom à la molette ou aux boutons, déplacement en glissant, clic à l'endroit exact) ou par village, et on roule où l'on veut sur les
24 000 tronçons de routes, rues, routes empierrées, pistes cyclables et
voies vertes de la zone ; rues, arbres et bâtiments se construisent autour
du cycliste au fil du trajet. Pause > « Changer de lieu » pour repartir
ailleurs.

Caravane de course : deux motos de gendarmerie à gyrophares bleus, voiture
de direction, motos commissaire, photo, télévision (le caméraman filme assis
à l'envers) et ardoisier (son ardoise affiche l'écart de l'échappée sur le
peloton), voitures d'équipe chargées de vélos de rechange, voiture-balai
« Fin de course ». Les motos se penchent en virage, les roues tournent.

Circulation : en balade et en mode libre, des voitures roulent à droite
(50 km/h en agglomération, 80 ailleurs), passent d'une route à l'autre aux
carrefours, ralentissent derrière le cycliste et le doublent quand la voie
d'en face est libre.

Montées : chaque col ou côte du parcours (au moins 80 m de dénivelé à
3,5 %) est annoncé, puis suivi en haut à gauche (distance et pente
restantes) ; au sommet, temps de montée, VAM et record personnel (par
parcours, sens et vélo). Le bilan d'arrivée ajoute la puissance normalisée
et les temps de chaque montée.

Créateur de personnage : nom, profil (grimpeur, rouleur, sprinteur,
puncheur, complet : réserve anaérobie), taille, poids, seuil, couleur de
peau et couleurs de chaque pièce (maillot, cuissard, casque, chaussures,
cadre), avec un aperçu 3D qui tourne. Les personnages créés rejoignent le
coverflow et se modifient ou se suppriment.

Inventaire : deux porte-bidons (vide, 500 ou 750 mL ; boisson isotonique à
40 g/L ou eau), huit poches pour les barres (40 g), gels (25 g) et gels
caféinés (+3 % de puissance pendant 45 min), roues (alu, carbone 50 ou
80 mm : masse et traînée) et pneus (25 mm, tubeless 28 mm, pluie :
roulement et adhérence). Le menu calcule la masse emportée, les glucides,
la boisson et l'autonomie estimée.

Personnages : sept coureurs fictifs (grimpeuse, rouleur, sprinteur,
puncheuse, baroudeur, cyclosportif, débutante) choisis dans un coverflow
(flèches, clic, molette, glisser au doigt), chacun avec son poids, sa
puissance seuil, sa réserve anaérobie, sa taille et ses couleurs ; ou
« Personnalisé » avec ses propres réglages.

Multijoueur : jusqu'à 4 joueurs en pair à pair (WebRTC), sans serveur de
jeu ni compte. L'hôte crée un code d'invitation, l'invité le colle et
renvoie un code de réponse que l'hôte colle à son tour (codes à échanger
par message). L'hôte choisit parcours, mode et conditions et lance la
partie pour tous ; chacun simule son propre coureur et envoie sa position
10 fois par seconde. En course, le peloton est simulé chez l'hôte et
diffusé aux invités ; les joueurs profitent de l'aspiration les uns des
autres et figurent au classement. Les noms flottent au-dessus des
coureurs, les écarts s'affichent en haut de l'écran. La connexion passe
par des serveurs STUN publics pour traverser les box ; derrière certains
pare-feu d'entreprise, elle peut échouer (pas de relais TURN).

Héberger chez soi : `server/server.cjs` (Node.js, sans dépendance) sert le
jeu à une adresse DuckDNS avec une redirection de port et relaie les
parties par WebSocket (salons de 4, sans codes à échanger, à travers
toutes les box). Pas à pas : [HEBERGER.md](HEBERGER.md).

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
niveau des adversaires, heure (matin, midi, soir), météo (grand beau,
nuageux, pluie, brouillard qui s'épaissit sur les crêtes), vent, temps
accéléré.

Pluie : route sombre et brillante, gouttes autour de la caméra, adhérence
de l'enrobé réduite d'un quart, freinage limité à 4,6 m/s² (6,5 au sec),
résistance au roulement un peu plus forte, transpiration moindre ; le
peloton freine plus tôt dans les virages.

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
- **Bord de route** : balises blanches à bande noire hors agglomération,
  jalons à neige rouge et blanc au-dessus de 950 m.
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

- Qualité **Ultra** (cartes graphiques récentes, choisie d'office pour les
  RTX, Radeon RX récentes, Apple M…) : sapins à huit étages de branches,
  feuillus à cinq masses avec charpentières, route deux fois plus fine,
  ombres 4096, résolution jusqu'à 2×, végétation et bâtiments plus loin.
  La qualité automatique redescend d'un cran à la fois si l'image n'est
  pas fluide.
- **Photos aériennes HD** (Élevé et Ultra) : les orthophotos IGN à 40 cm
  par pixel sont chargées en continu autour du coureur (fenêtre de 1 km),
  avec une seconde fenêtre de 6,5 km à 1,6 m/px, comme un clipmap ; la
  photo intégrée (5 m/px) reste au-delà ou hors connexion.
- Arbres en trois niveaux de détail par case de 250 m : en Élevé et
  Ultra, les plus proches ont des rameaux et feuillages en plaques
  ajourées (texture d'aiguilles et de feuilles dessinée au démarrage,
  test alpha, autour d'un tronc et d'un cœur pleins) ; puis arbres pleins
  détaillés ; puis silhouettes de 8 à 10 triangles.
- Maisons alsaciennes : une maison basse à pignon sur trois environ à
  colombages (sablières, poteaux, écharpes), crépis clairs ; toits en
  tuiles plates dessinées tuile par tuile, rangs décalés.
- Bâtiments : avant-toits et rives débordants, cheminées, soubassement,
  encadrements de fenêtres, vitres et crépi irrégulier.

- Le relief IGN est une grille de 30 m, trop grossière pour une chaussée de
  6 m. Un ruban de sol fin (une section tous les 5 m, ±30 m de part et
  d'autre) accompagne donc chaque route et la raccorde au relief réel ;
  sous ce ruban, la grille grossière est masquée par le shader
  (`src/ground.js`).
- Ciel : dégradé, soleil et nuages calculés dans le shader de la voûte
  (bruit fractal sur un plafond), couverture selon la météo.
- Véhicules : carrosseries en sections (environ 1 000 triangles), matériau
  à reflets ; roues, gyrophares et ombres de contact de tous les véhicules
  dessinés en trois appels.
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

`npm run build` produit deux versions :

- `dist/vosges-velo.html` : un seul fichier autonome (et une variante sans
  squelette HTML pour la publication en ligne) ;
- `dist/web/` : la même chose en fichiers séparés, `index.html`,
  `css/*.css`, `js/app.js` et `data/*`, servie par `npm run serve`
  (`server/server.cjs`).

Organisation des sources :

| Dossier, fichier | Contenu |
| --- | --- |
| `src/index.html` | structure des écrans (menu, HUD, pause, résultats) |
| `src/css/` | styles par thème : base, menu, HUD, résultats, tactile, personnages, multijoueur, inventaire, créateur, parcours, petits écrans |
| `src/main.js` | démarrage, monde, simulation, caméra, HUD |
| `src/ui/` | onglets du menu : parcours, coureurs, inventaire, multijoueur |
| `src/*.js` | relief, routes, décor, coureurs, véhicules, physique, réseau… | `npm run dev` reconstruit à
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
