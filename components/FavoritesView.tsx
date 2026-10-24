"use client";

import { useEffect, useState } from "react";
import { FavItem, clearFavorites, loadFavorites, removeFavorite } from "@/lib/favorites";
import { formatIst } from "@/lib/format";

export default function FavoritesView() {
  const [items, setItems] = useState<FavItem[] | null>(null);

  useEffect(() => setItems(loadFavorites()), []);

  if (items === null) return <p className="muted">Yükleniyor…</p>;
  if (items.length === 0) {
    return <p className="empty">Henüz favori haberiniz yok. Haber kartlarındaki “Favorilere ekle” düğmesiyle buraya ekleyebilirsiniz.</p>;
  }

  return (
    <>
      <div className="news-actions" style={{ marginBottom: 16 }}>
        <button className="btn" onClick={() => { clearFavorites(); setItems([]); }}>Favorileri temizle</button>
      </div>
      <div className="news-list">
      {items.map((f) => (
        <article className="news-card fav" key={f.link}>
          <div className="news-meta">
            <span className="src">{f.source}</span>
            <span>{f.category}</span>
            <time dateTime={f.published}>{formatIst(f.published)}</time>
          </div>
          <h3 className="news-title">{f.title}</h3>
          <div className="news-actions">
            <a className="btn primary" href={f.link} target="_blank" rel="noopener noreferrer">Habere git</a>
            <button className="btn" onClick={() => { removeFavorite(f.link); setItems(loadFavorites()); }}>Favoriden çıkar</button>
          </div>
        </article>
      ))}
      </div>
    </>
  );
}
