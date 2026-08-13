/** Builds a sized Unsplash CDN URL from a photo id (e.g. "photo-152277...-d647f0596c20"). */
export function unsplashUrl(id: string, width: number): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`;
}
