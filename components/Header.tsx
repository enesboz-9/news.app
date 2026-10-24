import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { SITE_NAME } from "@/lib/site";

export default function Header() {
  return (
    <header className="site-header">
      <div className="wrap head-row">
        <Link href="/" className="logo">{SITE_NAME}</Link>
        <nav aria-label="Ana menü" className="top-nav">
          <Link href="/">Ana sayfa</Link>
          <Link href="/favoriler">⭐ Favoriler</Link>
        </nav>
      </div>
      <nav aria-label="Kategoriler" className="cat-nav wrap">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/kategori/${c.slug}`}>{c.emoji} {c.name}</Link>
        ))}
      </nav>
    </header>
  );
}
