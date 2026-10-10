# Bûcheur

Application iOS (et Android) de suivi des révisions pour les étudiants et lycéens.
Développée avec [Expo](https://expo.dev) (React Native), elle se construit et se publie **sans Mac**.

## Fonctionnalités

**La signature : les cernes.** Chaque séance terminée ajoute un cerne au tronc du jour, dans la couleur
de la matière ; son épaisseur dépend de la durée. Le tronc grandit jusqu'au cercle en pointillés de
l'objectif quotidien, et pendant une séance on voit le nouveau cerne se dessiner.

- **Focus** : minuteur de révision (15, 25, 45 ou 60 min) par matière, avec un anneau de progression.
  Pendant la séance, l'écran passe en mode immersif (rien d'autre à l'écran, écran maintenu allumé).
  La séance est enregistrée automatiquement à la fin, même si l'app a été fermée, et une notification
  prévient l'utilisateur.
- **Pause** : à la fin d'une séance, l'app propose une pause de 5 minutes, puis la séance suivante.
- **Série** : nombre de jours consécutifs avec au moins une séance.
- **Objectif du jour** et **compte à rebours** jusqu'au prochain examen (J-12…).
- **Matières** : couleur et objectif hebdomadaire, avec la progression de la semaine.
- **Examens** : liste des examens à venir et passés.
- **Stats** : « ta semaine en rondelles » (un tronc par jour), répartition par matière, record, historique.

**Design iOS 26.** Barre d'onglets, boutons, puces, sélecteurs et cartes en Liquid Glass
(`expo-glass-effect`) sur un fond d'ambiance aux couleurs de l'essence choisie. Sur les iOS plus anciens,
Android et le web, `src/components/glass.tsx` affiche un verre dépoli équivalent.

Toutes les données restent sur le téléphone (AsyncStorage) : aucun serveur, aucun coût d'hébergement.

## Bûcheur Pro (4,99 €, achat unique)

| Gratuit | Pro |
|---|---|
| 4 matières, 2 examens à venir | Matières et examens illimités |
| Séances de 5 à 60 min | Séances jusqu'à 2 h |
| Semaine en cours | Tout l'historique, semaine par semaine |
| Essence « Sauge » | Essences Chêne, Érable, Bois de nuit |

Sur 4,99 € TTC, il reste environ **3,50 €** par vente (TVA puis 15 % de commission Apple avec le
Small Business Program) : une trentaine de ventes remboursent le compte développeur.

Les achats passent par [RevenueCat](https://www.revenuecat.com) (gratuit jusqu'à 2 500 $ de revenus par
mois), qui vérifie les reçus Apple et gère la restauration des achats. Le code est dans `src/lib/pro.tsx`
et l'écran d'achat dans `src/components/paywall.tsx`.

### Mise en place

1. **App Store Connect** › ton app › *Achats intégrés* : crée un achat **non consommable**,
   identifiant `bucheur_pro_lifetime`, prix 4,99 €, avec un nom et une capture de l'écran Pro.
2. **RevenueCat** : crée un projet et ajoute l'app iOS (bundle `com.bucheur.app`) avec la clé
   d'achats intégrés d'App Store Connect. Puis :
   - *Entitlements* : crée `pro` et rattache-lui le produit `bucheur_pro_lifetime` ;
   - *Offerings* : dans l'offre `default`, ajoute un package **Lifetime** avec ce produit.
3. Copie la clé publique iOS (`appl_…`) :
   - en local : `cp .env.example .env.local` puis colle la clé ;
   - pour les builds EAS :
     `npx eas-cli@latest env:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_… --environment production --visibility plaintext`
4. Envoie l'achat intégré en vérification **avec** la version de l'app qui l'utilise.
5. Dans la fiche de confidentialité App Store, déclare « Achats » (historique d'achats, non lié à l'identité).

### Tester

- **Expo Go, sans clé** : l'achat est simulé, pour vérifier les écrans et les fonctions Pro.
- **Vrai achat (bac à sable)** : il faut un build de développement
  (`npx eas-cli@latest build --profile development --platform ios`) et un testeur *Sandbox*
  créé dans App Store Connect › Utilisateurs et accès.

## Publier gratuitement et vendre Bûcheur Pro (sans compte Apple)

La version web se publie sans rien payer, et Bûcheur Pro (4,99 €) se vend sur **Gumroad** :
pas d'abonnement, Gumroad prend une commission sur chaque vente (10 % + 0,50 $) et gère la TVA.
L'acheteur reçoit une **clé de licence** par e-mail et la colle dans l'app (Réglages › Bûcheur Pro).
Une clé fonctionne sur 5 appareils au maximum, et un achat remboursé désactive Pro.

### 1. Créer le produit sur Gumroad
1. Crée un compte sur [gumroad.com](https://gumroad.com) (au nom d'un adulte) et ajoute ton compte
   bancaire dans *Settings › Payments*.
2. *Products › New product* › **Digital product**, nom « Bûcheur Pro », prix **4,99 €**
   (choisis l'euro comme devise).
3. Dans le produit, active **« Generate a unique license key per sale »**.
4. Dans le contenu du produit, écris par exemple : « Ouvre Bûcheur › Réglages › Bûcheur Pro et colle
   ta clé de licence. »
5. Publie le produit, puis note :
   - l'**ID du produit** (affiché dans la section *License key* du produit) ;
   - l'**adresse de la page**, du type `https://ton-pseudo.gumroad.com/l/bucheur`.

### 2. Configurer l'app
```bash
cd bucheur
cp .env.example .env.local
nano .env.local      # colle l'ID du produit et l'adresse de la page Gumroad
```

### 3. Construire et mettre en ligne (gratuit)
```bash
npm run build:web
```
Le dossier `bucheur/dist` contient tout le site. Pour le publier sans ligne de commande :
1. Crée un compte gratuit sur [netlify.com](https://www.netlify.com).
2. Ouvre [app.netlify.com/drop](https://app.netlify.com/drop) et **glisse le dossier `dist`** dans la page.
3. Netlify donne une adresse (renomme le site, par exemple `bucheur.netlify.app`).

Pour une mise à jour : relance `npm run build:web` et glisse de nouveau `dist` dans
*Deploys* sur Netlify.

Sur iPhone, les élèves ouvrent l'adresse dans Safari puis **Partager › Sur l'écran d'accueil**.

À savoir : les revenus doivent être déclarés (en France, par exemple en micro-entreprise).

## Tester sur ton iPhone sans Expo Go (Safari)

Aucun compte n'est nécessaire : l'ordinateur sert l'app et l'iPhone l'ouvre dans Safari, sur le même Wi-Fi.

```bash
cd bucheur
npm install
npm run iphone
```

1. Note l'adresse IP de l'ordinateur avec `hostname -I` (par exemple `192.168.1.12`).
2. Sur Linux Mint, autorise le port une fois : `sudo ufw allow 3000/tcp`.
3. Sur l'iPhone, ouvre Safari à l'adresse `http://192.168.1.12:3000`.
4. Touche **Partager › Sur l'écran d'accueil** : Bûcheur s'ouvre ensuite en plein écran, avec son icône.

C'est la version web : le verre est une imitation (pas le Liquid Glass natif), et il n'y a ni notification de fin
de séance ni vibration. L'achat de Bûcheur Pro y est simulé.

## Tester sur ton iPhone (gratuit, depuis Linux) avec Expo Go

1. Installe **Expo Go** depuis l'App Store sur ton iPhone.
2. Sur l'ordinateur :
   ```bash
   cd bucheur
   npm install
   npx expo start --tunnel
   ```
3. Scanne le QR code affiché avec l'appareil photo de l'iPhone.

Pour un aperçu rapide dans le navigateur : `npx expo start --web`.

### Aperçu interactif à partager

`node preview/build-preview.cjs` construit `dist-preview/bucheur-apercu.html` : une seule page qui contient
toute l'app web dans un cadre de téléphone, avec un panneau pour charger des données de démo, terminer une
séance sans attendre et réinitialiser. L'achat de Bûcheur Pro y est simulé (`EXPO_PUBLIC_PREVIEW=1`).

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
3. Compile et envoie l'app avec EAS (offre gratuite) :
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build:configure
   npx eas-cli@latest build --platform ios --profile production
   npx eas-cli@latest submit --platform ios
   ```
4. Dans [App Store Connect](https://appstoreconnect.apple.com), remplis la fiche avec le contenu du dossier
   `store/` et envoie l'app en vérification :
   - `store/fiche-app-store.md` : nom, sous-titre, description, mots-clés, achat intégré, confidentialité,
     notes pour la vérification et liste de vérification finale ;
   - `store/screenshots/` : captures iPhone 6,9" (1290 × 2796) et capture de l'achat intégré ;
   - `store/politique-de-confidentialite.md` : à publier en ligne (GitHub Pages, Notion…) pour obtenir l'URL demandée.

   Pour refaire les captures après une modification : `node store/generate-screenshots.cjs`.

## Structure

```
src/app/            écrans (un fichier = un onglet) : index (Focus), matieres, examens, stats
src/components/     composants d'interface (ui.tsx) et barre d'onglets
src/lib/store.tsx   état de l'app et sauvegarde locale
src/lib/stats.ts    calculs : séries, semaines, comptes à rebours, formats
src/lib/rings.ts    tracé des cernes (partagé par l'app et l'icône)
assets/icon/        sources SVG de l'icône et de l'écran de lancement
```
