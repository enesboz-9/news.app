"use client";

import { useEffect, useState } from "react";
import { FavItem, clearFavorites, loadFavorites, removeFavorite } from "@/lib/favorites";
import { formatIst } from "@/lib/format";

export default function FavoritesView() {
  const [items, setItems] = useState<FavItem[] | null>(null);

  useEffect(() => setItems(loadFavorites()), []);

  if (items === null) return <p className="muted">Yükleniyor…</p>;
  if (items.length === 0) {
    return <p className="empty">[ HENÜZ FAVORİ YOK — HABER KARTLARINDAKİ ☆ FAVORİ DÜĞMESİNİ KULLANIN ]</p>;
  }

  return (
    <>
      <div className="news-actions" style={{ marginBottom: 16 }}>
        <button className="btn" onClick={() => { clearFavorites(); setItems([]); }}>🗑️ Favorileri temizle</button>
      </div>
      {items.map((f) => (
        <article className="news-card fav" key={f.link}>
          <div className="news-meta">
            {f.emoji} {f.category} | {f.source} | {formatIst(f.published)} İST
          </div>
          <h3 className="news-title">{f.title}</h3>
          <div className="news-actions">
            <a className="btn" href={f.link} target="_blank" rel="noopener noreferrer">↗ Habere git</a>
            <button className="btn" onClick={() => { removeFavorite(f.link); setItems(loadFavorites()); }}>✕ Kaldır</button>
          </div>
        </article>
      ))}
    </>
  );
}
