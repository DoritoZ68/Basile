#!/bin/bash
# Double-cliquez sur ce fichier (Mac) pour lancer le serveur Vosges Vélo.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé : https://nodejs.org (voir LISEZMOI.txt)"
  read -n 1 -s -r -p "Appuyez sur une touche pour fermer"
  exit 1
fi
node server.cjs
read -n 1 -s -r -p "Serveur arrêté. Appuyez sur une touche pour fermer"
