import Link from "next/link";
import { CATEGORIES, HOME_SLUGS, getCategory } from "@/lib/categories";
import { getCategoryNews } from "@/lib/news";
import { translateItems } from "@/lib/groq";
import { formatIst } from "@/lib/format";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";

export const revalidate = 1800;

export default async function Home() {
  const cats = HOME_SLUGS.map((s) => getCategory(s)!).filter(Boolean);
  const blocks = await Promise.all(cats.map(async (c) => ({ c, items: await translateItems((await getCategoryNews(c)).slice(0, 5), 5) })));

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
        <h1>Son 24 saatin haberleri, tek sayfada.</h1>
        <p>{SITE_NAME}: {SITE_TAGLINE}. Her kategori için yapay zekâ ile hazırlanmış günlük özet.</p>
      </section>

      <div className="home-grid">
      {blocks.map(({ c, items }) => (
        <section key={c.slug} className="home-block">
          <div className="block-head">
            <h2>{c.name}</h2>
            <Link href={`/kategori/${c.slug}`}>Tümünü gör</Link>
          </div>
          {items.length === 0 ? (
            <p className="muted">Şu an haber alınamadı. Birazdan tekrar deneyin.</p>
          ) : (
            <>
              <a className="lead" href={items[0].link} target="_blank" rel="noopener noreferrer">
                {items[0].image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="lead-img" src={items[0].image} alt="" loading="lazy" referrerPolicy="no-referrer" />
                )}
                <span className="lead-title">{items[0].title}</span>
                <span className="lead-meta">{items[0].source} · {formatIst(items[0].published)}</span>
              </a>
              <ul className="headline-list">
                {items.slice(1).map((i) => (
                  <li key={i.link}>
                    <a href={i.link} target="_blank" rel="noopener noreferrer">{i.title}</a>
                    <span className="headline-meta">{i.source} · {formatIst(i.published)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
      </div>

      <section>
        <h2 className="section-title">Tüm kategoriler</h2>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/kategori/${c.slug}`}>{c.emoji} {c.name}</Link>
          ))}
        </div>
      </section>
    </>
  );
}
