# Héberger Vosges Vélo chez soi (DuckDNS + redirection de port)

Le serveur sert le jeu (dossier `web/` : page, styles, code et données en fichiers séparés) à une adresse internet du type
`http://monvelo.duckdns.org:8080` et fait passer les messages des parties
multijoueur. Vos amis ouvrent simplement cette adresse dans leur
navigateur : pas de code à échanger, pas de logiciel à installer chez eux.

Il faut un ordinateur allumé chez vous pendant que vous jouez (votre Mac
convient), branché à votre box.

## 1. Installer Node.js (une seule fois)

- Linux Mint, Ubuntu, Debian : dans un terminal

```bash
sudo apt update && sudo apt install -y nodejs
```

- Mac récent (macOS 10.15 ou plus) ou PC Windows : télécharger la version
  « LTS » sur https://nodejs.org et l'installer.
- iMac de 2011 (macOS High Sierra 10.13 au plus) : prendre Node.js 16, la
  dernière version compatible :
  https://nodejs.org/dist/v16.20.2/node-v16.20.2.pkg

Vérifier dans le Terminal (Applications > Utilitaires) :

```bash
node -v
```

## 2. Créer l'adresse DuckDNS (gratuit, une seule fois)

1. Aller sur https://www.duckdns.org et se connecter (compte Google,
   GitHub, Reddit…).
2. Dans « sub domain », taper un nom libre, par exemple `monvelo`, puis
   « add domain ». L'adresse sera `monvelo.duckdns.org`.
3. Noter le **token** affiché en haut de la page (une longue suite de
   lettres et de chiffres). Ne le donnez à personne.

## 3. Configurer le serveur

Dans le dossier `vosges-velo-serveur`, dupliquer `config.example.json`,
renommer la copie en `config.json` et l'ouvrir avec TextEdit (Mac) ou le
Bloc-notes (Windows) :

```json
{
  "port": 8080,
  "duckdnsDomain": "monvelo",
  "duckdnsToken": "le-token-copié-sur-duckdns"
}
```

Le serveur met lui-même à jour DuckDNS avec l'adresse IP de votre box au
démarrage puis toutes les 5 minutes : rien d'autre à installer.

## 4. Donner une adresse fixe à l'ordinateur sur le réseau local

1. Trouver l'adresse locale de l'ordinateur :
   - Linux : `hostname -I` dans un terminal (la première adresse, du type
     `192.168.1.23`).
   - Mac : Préférences Système > Réseau > Wi-Fi (ou Ethernet) : « Adresse
     IP », du type `192.168.1.23`.
   - Windows : Paramètres > Réseau et Internet > Propriétés : « Adresse
     IPv4 ».
   Le serveur l'affiche aussi au démarrage (« réseau local »).
2. Dans l'interface de la box, réserver cette adresse pour cet ordinateur
   (« bail DHCP statique », « réservation d'adresse », « IP fixe »), pour
   qu'elle ne change pas.

## 5. Ouvrir le port dans la box (redirection de port)

Créer une règle : **TCP, port externe 8080 → port interne 8080, vers
l'adresse locale de l'ordinateur** (étape 4).

- **Freebox** : http://mafreebox.freebox.fr > Paramètres de la Freebox >
  Mode avancé > Gestion des ports > Ajouter une redirection. Si la
  redirection est refusée ou ne marche pas, votre ligne est peut-être en
  « IPv4 partagée » : dans l'espace abonné Free, Ma Freebox > « Demander
  une adresse IP fixe V4 full-stack » (gratuit, actif après
  redémarrage de la box).
- **Livebox (Orange)** : http://192.168.1.1 > Paramètres avancés > Réseau
  > NAT/PAT : ajouter la règle ; l'onglet DHCP permet la réservation
  d'adresse.
- **Box SFR** : http://192.168.1.1 > Réseau v4 > NAT > Translation de
  ports.
- **Bbox (Bouygues)** : https://mabbox.bytel.fr > Services de la box >
  Redirection de ports.
- Autre box : chercher « redirection de port », « NAT » ou « port
  forwarding » dans son interface.

## 6. Lancer le serveur

- Linux : dans un terminal, `cd` dans le dossier puis `./lancer.sh` (ou
  double-clic sur `lancer.sh` > « Lancer dans un terminal »). Si le
  pare-feu est activé (Linux Mint : « Configuration du pare-feu ») :

```bash
sudo ufw allow 8080/tcp
```

- Mac : double-cliquer sur `LANCER.command`. La première fois, macOS peut
  refuser un fichier téléchargé : clic droit (ou Ctrl+clic) > Ouvrir >
  Ouvrir. Si macOS demande d'accepter les connexions entrantes pour
  « node », cliquer sur **Autoriser**.
- Windows : double-cliquer sur `lancer.bat`, et autoriser l'accès dans la
  fenêtre du pare-feu Windows (réseaux privés et publics).

La fenêtre affiche les adresses et, si DuckDNS est bien configuré :
« DuckDNS : monvelo.duckdns.org pointe sur cette box ». Laisser la fenêtre
ouverte pendant la partie ; la fermer (ou Ctrl+C) arrête le serveur.

Penser à empêcher la mise en veille de l'ordinateur pendant la partie
(Linux Mint : Paramètres système > Gestion de l'alimentation ; Mac :
Préférences Système > Économiseur d'énergie).

### Linux : démarrage automatique (facultatif)

Pour que le serveur tourne en permanence, même après un redémarrage
(remplacer `/home/moi/vosges-velo-serveur` par le vrai dossier et `moi`
par votre nom d'utilisateur) :

```bash
sudo tee /etc/systemd/system/vosges-velo.service >/dev/null <<'FIN'
[Unit]
Description=Serveur Vosges Vélo
After=network-online.target
Wants=network-online.target

[Service]
User=moi
WorkingDirectory=/home/moi/vosges-velo-serveur
ExecStart=/usr/bin/node server.cjs
Restart=on-failure

[Install]
WantedBy=multi-user.target
FIN
```

```bash
sudo systemctl enable --now vosges-velo
```

Voir les messages du serveur : `journalctl -u vosges-velo -f` ; l'arrêter :
`sudo systemctl disable --now vosges-velo`.

## 7. Jouer

- Vous, sur l'ordinateur serveur : http://localhost:8080
- Vos amis, de chez eux : `http://monvelo.duckdns.org:8080` (avec votre
  nom de domaine)
- Quelqu'un chez vous, sur le même Wi-Fi : utiliser l'adresse « réseau
  local » affichée par le serveur (certaines box ne savent pas renvoyer
  l'adresse DuckDNS vers l'intérieur de la maison).

Dans le jeu : onglet **Multijoueur** > **Créer un salon**. Vos amis voient
le salon dans leur liste et cliquent sur **Rejoindre** (4 joueurs par
salon). Le créateur du salon choisit le parcours, le mode et la météo,
puis **Partir** : tout le monde part ensemble.

## Dépannage

- **Ça marche sur l'ordinateur serveur mais pas pour vos amis** :
  vérifier la redirection de port (TCP 8080 vers la bonne adresse
  locale), l'IPv4 full-stack chez Free, et le message DuckDNS au
  démarrage. Tester depuis un téléphone en 4G/5G (Wi-Fi coupé) avec
  l'adresse DuckDNS.
- **« DuckDNS a répondu KO »** : domaine ou token mal recopié dans
  `config.json` (le domaine s'écrit sans `.duckdns.org`).
- **Port 8080 bloqué par le fournisseur** : choisir un autre port (par
  exemple 8443) dans `config.json` et dans la redirection de la box, puis
  utiliser `http://monvelo.duckdns.org:8443`.
- **Le jeu met du temps à s'ouvrir chez vos amis** : il fait 9 Mo
  compressés, envoyés par la connexion montante de votre box (une minute
  environ en ADSL, quelques secondes en fibre). Le navigateur le garde
  ensuite en cache.

## Sécurité

Le serveur ne fait que deux choses : envoyer le fichier du jeu et relayer
les messages entre joueurs d'un même salon (taille limitée, 20 salons au
plus). Il ne lit ni n'écrit aucun autre fichier de votre ordinateur.
Arrêtez-le quand vous ne jouez pas, et retirez la redirection de port si
vous n'hébergez plus.
