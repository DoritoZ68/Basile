import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Page HTML de la version web, générée au moment de l'export (Node.js, sans accès au navigateur).
// Les balises Apple permettent d'ajouter Bûcheur à l'écran d'accueil de l'iPhone depuis Safari :
// l'app s'ouvre alors en plein écran, avec son icône, comme une app installée.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <title>Bûcheur</title>
        <meta name="description" content="Révise, un cerne à la fois." />
        <meta name="theme-color" content="#F7F6F3" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#111312" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Bûcheur" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
