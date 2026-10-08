# Élan Académie

Boutique de formations numériques : les compétences les plus demandées en
2026 (IA générative, agents et automatisation, apps construites avec l'IA,
freelance, e-commerce, produits numériques, investissement, LinkedIn,
copywriting, vidéo courte, SEO/GEO, data, cybersécurité, UX/UI).

Stack : Next.js (App Router) + TypeScript + Tailwind CSS v4. Contenu 100 %
statique : tout le catalogue part d'un seul fichier de données.

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # build de production
npm run lint    # ESLint
```

## Pages

- `/` — accueil : hero, pourquoi ces sujets, thématiques, top des ventes,
  packs, fonctionnement, FAQ
- `/formations` — catalogue avec recherche, filtres (thématique, niveau) et
  tri ; `?categorie=ia|business|marketing|tech` présélectionne une thématique
- `/formations/[slug]` — fiche produit : présentation, compétences acquises,
  programme détaillé (modules, leçons, durées), projet final, public,
  prérequis, outils, carte d'achat
- `/packs` — packs thématiques et Pass intégral, avec l'économie calculée
  automatiquement par rapport à l'achat à l'unité
- `/panier` — panier (stocké en `localStorage`), détection des doublons
  (formation déjà incluse dans un pack du panier), formulaire de commande
- `/a-propos` — la méthode et les engagements

Thème clair/sombre (icône lune/soleil), basé sur des variables CSS dans
`globals.css`.

## Modifier le catalogue

Tout se passe dans `src/lib/catalog.ts` :

- ajouter une formation = ajouter un objet au tableau `courses` (slug, titre,
  prix, niveau, modules…). Le nombre de leçons et la durée sont calculés à
  partir des modules ; la formation apparaît automatiquement dans le
  catalogue, la recherche, les packs concernés et le Pass intégral ;
- `rank` règle l'ordre « Les plus populaires » et le top de l'accueil ;
- les packs listent les slugs des formations incluses : leur valeur et le
  pourcentage d'économie sont recalculés tout seuls.

## À brancher avant la mise en vente

- **Paiement** : la validation de commande est en mode démonstration (aucun
  paiement encaissé, message affiché). Remplacer `handleSubmit` dans
  `src/components/CartView.tsx` par un appel à une route serveur qui crée une
  session Stripe Checkout, ou utiliser une plateforme (Podia, Systeme.io…).
- **Hébergement des cours** (vidéos, espace élève) : non inclus.
- **Engagements commerciaux** affichés (remboursement 30 jours, paiement en
  3 fois, accès à vie) et prix : à ajuster selon votre offre réelle, ainsi que
  les CGV et mentions légales.
- `SITE_URL` et l'email de contact : `src/lib/site.ts`.
