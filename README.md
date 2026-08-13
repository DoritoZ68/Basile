# Actu OM en 3 points

Média en ligne indépendant qui résume l'actualité de l'Olympique de Marseille
en 3 points par sujet — mercato, match, vestiaire, vidéos — avec une nouvelle
édition chaque semaine.

Stack : Next.js (App Router) + TypeScript + Tailwind CSS v4. Contenu 100 %
statique (pas de CMS ni de base de données) : tout part d'un seul fichier de
données, facile à faire évoluer.

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

## Comment fonctionne l'édition hebdomadaire

Chaque article a une date de publication (`publishedAt`) dans
`src/lib/content.ts`. La semaine ISO d'un article (`weekId`) en est déduite
automatiquement — il n'y a rien à synchroniser à la main.

- La page d'accueil affiche toujours la **dernière édition publiée** (le plus
  grand `weekId` présent dans les données), pas une semaine calendaire figée :
  s'il n'y a pas encore d'article pour la semaine en cours, l'accueil continue
  d'afficher la dernière édition disponible plutôt qu'une page vide.
- La page `/archives` liste automatiquement toutes les éditions passées,
  regroupées par semaine, de la plus récente à la plus ancienne.

**Publier une nouvelle édition** revient simplement à ajouter de nouveaux
objets `Article` en tête du tableau `articles` dans `src/lib/content.ts`, avec
la date du jour. Rien d'autre à toucher : l'accueil, les rubriques et les
archives se réorganisent tout seuls.

## Types de médias

Chaque article choisit un type de média (`media.kind`) dans
`src/lib/content.ts` :

- `illustration` — une des illustrations SVG maison (`src/components/illustrations.tsx`),
  sans dépendance à une image externe.
- `image` — une photo (actuellement servies depuis Unsplash, libres de droits ;
  `next.config.ts` autorise le domaine `images.unsplash.com`).
- `video` — une vignette (poster) + un lecteur ; brancher un vrai fichier vidéo
  se fait en renseignant `src` sur l'entrée `media` de l'article.

## Structure

```
src/app/                page d'accueil, page article ([slug]), archives
src/components/         composants d'UI (cartes, hero, lecteur média, illustrations SVG)
src/lib/content.ts      les articles + toute la logique de regroupement par semaine/catégorie
src/lib/date.ts         calculs de semaine ISO (aucune dépendance externe)
```
