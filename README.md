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

## Paiement (Stripe)

Le bouton « Payer » du panier appelle `POST /api/checkout`, qui recalcule les
prix depuis le catalogue (jamais depuis le navigateur) et crée une session
Stripe Checkout. Après paiement, Stripe renvoie vers `/commande/merci`, qui
vérifie le paiement auprès de Stripe, affiche les liens d'accès et vide le
panier. Tant que `STRIPE_SECRET_KEY` n'est pas définie, le panier indique que
le paiement en ligne n'est pas encore activé.

## Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Rôle |
|---|---|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (`sk_live_…`, ou `sk_test_…` pour tester). Active le paiement. |
| `COURSE_ACCESS_LINKS` | JSON `{"slug-formation": "https://lien-d-acces"}` : liens affichés après paiement (Notion, Drive, Podia…). Jamais dans le code, le dépôt est public. Sans lien, la page indique un envoi par email sous 24 h. |
| `NEXT_PUBLIC_SITE_URL` | Adresse publique (par défaut `https://basile-nine.vercel.app`), pour le sitemap, les URL canoniques et les images de partage. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Code « balise HTML » de Google Search Console. |

## Référencement

`/sitemap.xml`, `/robots.txt`, URL canoniques, balises Open Graph/Twitter,
images de partage générées pour le site et chaque formation, et données
structurées schema.org (`Organization`, `WebSite`, `FAQPage`, `Course` avec
prix, `BreadcrumbList`).

## Légal

`/cgv` et `/mentions-legales` lisent les informations de l'objet `LEGAL` dans
`src/lib/site.ts` : remplacer chaque valeur entre crochets (identité, SIRET,
adresse, médiateur de la consommation) avant de vendre.
