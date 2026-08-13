# 3 Points

Marseille — l'OM, la ville, la culture, la mer — résumée en 3 points par
sujet, à parcourir comme des stories : on glisse, on tape, on repart avec
l'essentiel.

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

## Le principe

Chaque sujet est une **histoire** (`Story`, dans `src/lib/content.ts`) : un
titre, une catégorie (`om` / `ville` / `culture` / `mer`), une photo de
couverture et exactement 3 points courts. Publier une nouvelle histoire, c'est
ajouter un objet à la fin du tableau `stories` — rien d'autre à toucher, elle
apparaît automatiquement dans la bande de stories, la grille filtrable et la
recherche.

Sur `/histoire/[slug]`, ces 3 points se parcourent comme des stories
(`StoryViewer`) : barre de progression, tap/flèches/swipe pour naviguer,
défilement automatique, et un enchaînement direct vers l'histoire suivante en
fin de parcours.

## Structure

```
src/app/                accueil, page story ([slug]), à propos
src/components/         StoryViewer (le lecteur), StoryBubbles, StoryCard,
                         CategoryFilterGrid, recherche, header/footer
src/lib/content.ts      les histoires + catégories
src/lib/accent.ts       couleurs d'accent par catégorie
src/lib/date.ts         formatage de dates (aucune dépendance externe)
```

## Photos

Les photos (Orange Vélodrome, Vieux-Port, Mucem, Notre-Dame de la Garde,
calanques, tramway) viennent de Wikimedia Commons sous licence Creative
Commons Attribution-ShareAlike, stockées dans `public/images/`. Crédits
détaillés sur `/a-propos`.
