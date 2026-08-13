/** Builds a sized Unsplash CDN URL from a photo id (e.g. "photo-152277...-d647f0596c20"). */
export function unsplashUrl(id: string, width: number): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`;
}

/**
 * Resolves an image source for the media pipeline. A leading "/" means a
 * local asset in /public (served as-is, optimized by next/image); anything
 * else is treated as an Unsplash photo id.
 */
export function resolveImageSrc(id: string, width: number): string {
  return id.startsWith("/") ? id : unsplashUrl(id, width);
}
