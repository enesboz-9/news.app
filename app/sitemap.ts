import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    ...CATEGORIES.map((c) => ({
      url: `${base}/kategori/${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    { url: `${base}/hakkinda`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
