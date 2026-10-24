import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <h1>404</h1>
      <p>Aradığınız sayfa bulunamadı. <Link href="/">Ana sayfaya dön</Link></p>
    </section>
  );
}
