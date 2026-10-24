import Link from "next/link";
import CatNav from "./CatNav";

export default function Header() {
  return (
    <header className="site-header">
      <div className="wrap head-row">
        <Link href="/" className="logo" aria-label="haberAI ana sayfa">haber<span>AI</span></Link>
        <nav aria-label="Ana menü" className="top-nav">
          <Link href="/">Ana sayfa</Link>
          <Link href="/favoriler">Favoriler</Link>
          <Link href="/hakkinda">Hakkında</Link>
        </nav>
      </div>
      <CatNav />
    </header>
  );
}
