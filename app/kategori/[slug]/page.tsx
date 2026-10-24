import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getCategoryNews } from "@/lib/news";
import { dailyDigest } from "@/lib/groq";
import { formatIstLong } from "@/lib/format";
import { SITE_NAME, siteUrl } from "@/lib/site";
import NewsCard from "@/components/NewsCard";

export const revalidate = 1800;
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) return {};
  const title = `${cat.name} Haberleri – Günün Özeti`;
  return {
    title,
    description: cat.description,
    alternates: { canonical: `/kategori/${cat.slug}` },
    openGraph: { title: `${cat.name} Haberleri | ${SITE_NAME}`, description: cat.description, url: `/kategori/${cat.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) notFound();

  const items = await getCategoryNews(cat);
  const digest = await dailyDigest(items.map((i) => i.title), cat.name);
  const aiEnabled = Boolean(process.env.GROQ_API_KEY);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${cat.name} Haberleri`,
    description: cat.description,
    url: `${siteUrl()}/kategori/${cat.slug}`,
    inLanguage: "tr",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: siteUrl() },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.slice(0, 10).map((i, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: i.link,
        name: i.title,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Sayfa yolu"><a href="/">{SITE_NAME}</a> › {cat.name}</nav>
      <section className="hero">
        <h1>{cat.emoji} {cat.name} Haberleri</h1>
        <p>{cat.description} · Son güncelleme: {formatIstLong()} (İstanbul)</p>
      </section>

      {digest && (
        <section className="digest" aria-labelledby="ozet">
          <h2 id="ozet">◈ Günün özeti — {cat.name}</h2>
          <ul>{digest.map((d, i) => <li key={i}>{d}</li>)}</ul>
          <p className="muted small">Bu özet yapay zekâ ile haber başlıklarından üretilmiştir ve hata içerebilir.</p>
        </section>
      )}

      {items.length === 0 ? (
        <p className="empty">[ SON 24 SAATTE HABER BULUNAMADI ]</p>
      ) : (
        <section aria-label="Haber listesi">
          {items.map((item) => (
            <NewsCard key={item.link} item={item} categoryName={cat.name} categoryEmoji={cat.emoji} aiEnabled={aiEnabled} />
          ))}
        </section>
      )}
    </>
  );
}
