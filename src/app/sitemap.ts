import type { MetadataRoute } from "next";
import { courses } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/formations`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/packs`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/a-propos`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/cgv`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.1 },
  ];
  return [
    ...pages,
    ...courses.map((c) => ({
      url: `${SITE_URL}/formations/${c.slug}`,
      lastModified: `${c.updated}-01`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
