import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <h1>Sayfa bulunamadı</h1>
      <p>Adres yanlış olabilir ya da sayfa kaldırılmış. <Link href="/">Ana sayfaya dön</Link></p>
    </section>
  );
}
