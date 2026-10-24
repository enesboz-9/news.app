import type { Metadata } from "next";
import FavoritesView from "@/components/FavoritesView";

export const metadata: Metadata = {
  title: "Favorilerim",
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return (
    <>
      <section className="hero">
        <h1>⭐ Favorilerim</h1>
        <p>Favoriler yalnızca bu tarayıcıda saklanır; hesap gerekmez.</p>
      </section>
      <FavoritesView />
    </>
  );
}
