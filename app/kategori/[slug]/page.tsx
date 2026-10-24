import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getCategoryNews } from "@/lib/news";
import { dailyDigest, marketImpact, translateItems } from "@/lib/groq";
import { formatIstLong } from "@/lib/format";
import { SITE_NAME, siteUrl } from "@/lib/site";
import NewsList from "@/components/NewsList";

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

  let items = await getCategoryNews(cat);
  const [translated, digest] = await Promise.all([translateItems(items, 20), dailyDigest(items.map((i) => i.title), cat.name)]);
  items = translated;
  // Ekonomi kategorilerinde etiket, haberin piyasalara ve emtialara olası etkisine göre yapay zekâ ile verilir.
  let showSentiment = false;
  if (cat.market) {
    items = items.slice(0, 30);
    const labels = await marketImpact(items.map((i) => i.title));
    if (labels) {
      items = items.map((i, n) => ({ ...i, sentiment: labels[n] }));
      showSentiment = true;
    }
  }
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
      <nav className="crumbs" aria-label="Sayfa yolu"><a href="/">{SITE_NAME}</a> / {cat.name}</nav>
      <section className="hero">
        <h1>{cat.name} haberleri</h1>
        <p>{cat.description} Son güncelleme: {formatIstLong()} (İstanbul saati).</p>
      </section>

      {digest && (
        <section className="digest" aria-labelledby="ozet">
          <h2 id="ozet">Günün özeti</h2>
          <ul>{digest.map((d, i) => <li key={i}>{d}</li>)}</ul>
          <p className="muted small">Bu özet yapay zekâ ile haber başlıklarından üretilmiştir ve hata içerebilir.</p>
        </section>
      )}

      {items.length === 0 ? (
        <p className="empty">Şu an bu kategoride haber bulunamadı. Birazdan tekrar deneyin.</p>
      ) : (
        <section aria-label="Haber listesi">
          <NewsList items={items} categoryName={cat.name} categoryEmoji={cat.emoji} aiEnabled={aiEnabled} showSentiment={showSentiment} />
        </section>
      )}
    </>
  );
}
