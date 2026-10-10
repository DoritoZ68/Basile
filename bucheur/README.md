# Bûcheur

Application iOS (et Android) de suivi des révisions pour les étudiants et lycéens.
Développée avec [Expo](https://expo.dev) (React Native), elle se construit et se publie **sans Mac**.

## Fonctionnalités

- **Focus** : minuteur de révision (15, 25, 45 ou 60 min) par matière. La séance est enregistrée
  automatiquement à la fin, même si l'app a été fermée, et une notification prévient l'utilisateur.
- **Série 🔥** : nombre de jours consécutifs avec au moins une séance.
- **Objectif du jour** et **compte à rebours** jusqu'au prochain examen (J-12…).
- **Matières** : couleur et objectif hebdomadaire, avec la progression de la semaine.
- **Examens** : liste des examens à venir et passés.
- **Stats** : graphique de la semaine, répartition par matière, meilleure série, historique.

Toutes les données restent sur le téléphone (AsyncStorage) : aucun serveur, aucun coût d'hébergement.

## Tester sur ton iPhone (gratuit, depuis Linux)

1. Installe **Expo Go** depuis l'App Store sur ton iPhone.
2. Sur l'ordinateur :
   ```bash
   cd bucheur
   npm install
   npx expo start --tunnel
   ```
3. Scanne le QR code affiché avec l'appareil photo de l'iPhone.

Pour un aperçu rapide dans le navigateur : `npx expo start --web`.

## Vérifications

```bash
npm run lint
npm run typecheck   # lancer `npx expo start` une fois avant, pour générer expo-env.d.ts
npx expo-doctor
```

## Publier sur l'App Store (sans Mac)

1. Inscris-toi à l'**Apple Developer Program** (99 €/an), puis crée un compte gratuit sur [expo.dev](https://expo.dev).
2. Vérifie que l'identifiant `ios.bundleIdentifier` dans `app.json` (`com.bucheur.app`) est libre ;
   sinon remplace-le, par exemple par `com.tonnom.bucheur`.
3. Remplace l'icône (`assets/expo.icon`, `assets/images/icon.png`) et l'image de lancement par celles de l'app.
4. Compile et envoie l'app avec EAS (offre gratuite) :
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build:configure
   npx eas-cli@latest build --platform ios --profile production
   npx eas-cli@latest submit --platform ios
   ```
5. Dans [App Store Connect](https://appstoreconnect.apple.com), ajoute les captures d'écran, la description,
   une URL de politique de confidentialité (« aucune donnée collectée ») et envoie l'app en vérification.

## Structure

```
src/app/            écrans (un fichier = un onglet) : index (Focus), matieres, examens, stats
src/components/     composants d'interface (ui.tsx) et barre d'onglets
src/lib/store.tsx   état de l'app et sauvegarde locale
src/lib/stats.ts    calculs : séries, semaines, comptes à rebours, formats
```
