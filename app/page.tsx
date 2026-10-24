import Link from "next/link";
import { CATEGORIES, HOME_SLUGS, getCategory } from "@/lib/categories";
import { getCategoryNews } from "@/lib/news";
import { formatIst } from "@/lib/format";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";

export const revalidate = 1800;

export default async function Home() {
  const cats = HOME_SLUGS.map((s) => getCategory(s)!).filter(Boolean);
  const blocks = await Promise.all(cats.map(async (c) => ({ c, items: (await getCategoryNews(c)).slice(0, 5) })));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: ["haber AI", SITE_TAGLINE],
    url: siteUrl(),
    inLanguage: "tr",
    publisher: { "@type": "Organization", name: "B-Novative", url: "https://bnovative.com.tr/" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="hero">
        <h1>⚡ {SITE_NAME}</h1>
        <p>{SITE_TAGLINE}. Son 24 saatin haberleri, kategori bazlı yapay zekâ özetiyle.</p>
      </section>

      {blocks.map(({ c, items }) => (
        <section key={c.slug} className="home-block">
          <div className="block-head">
            <h2>{c.emoji} {c.name}</h2>
            <Link href={`/kategori/${c.slug}`}>Tümü →</Link>
          </div>
          {items.length === 0 ? (
            <p className="muted">Şu an haber alınamadı.</p>
          ) : (
            <ul className="headline-list">
              {items.map((i) => (
                <li key={i.link}>
                  <a href={i.link} target="_blank" rel="noopener noreferrer">{i.title}</a>
                  <span className="muted"> — {i.source}, {formatIst(i.published)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="home-block">
        <div className="block-head"><h2>Tüm kategoriler</h2></div>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/kategori/${c.slug}`}>{c.emoji} {c.name}</Link>
          ))}
        </div>
      </section>
    </>
  );
}
