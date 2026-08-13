import { articles } from "@/lib/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const items = [...articles]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .map((article) => {
      const url = `${SITE_URL}/actu/${article.slug}`;
      const points = article.points.map((p) => `<li>${escapeXml(p)}</li>`).join("");
      return `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(`${article.publishedAt}T08:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(article.dek)}</description>
      <content:encoded><![CDATA[<p>${article.dek}</p><ul>${points}</ul>]]></content:encoded>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>L'actualité de l'Olympique de Marseille, résumée en 3 points chaque semaine.</description>
    <language>fr</language>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
