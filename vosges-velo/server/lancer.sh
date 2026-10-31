#!/bin/bash
# Linux : lancer le serveur Vosges Vélo (double-clic > « Lancer dans un terminal », ou ./lancer.sh)
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé : sudo apt install nodejs"
  read -n 1 -s -r -p "Appuyez sur une touche pour fermer"
  exit 1
fi
node server.cjs
read -n 1 -s -r -p "Serveur arrêté. Appuyez sur une touche pour fermer"
