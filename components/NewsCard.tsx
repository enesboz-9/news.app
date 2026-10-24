"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news";
import { SENTIMENT_LABEL } from "@/lib/sentiment";
import { formatIst } from "@/lib/format";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

type Props = { item: NewsItem; categoryName: string; categoryEmoji: string; aiEnabled: boolean };

export default function NewsCard({ item, categoryName, categoryEmoji, aiEnabled }: Props) {
  const [fav, setFav] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setFav(isFavorite(item.link)), [item.link]);

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.title, summary: item.summary, foreign: item.lang !== "tr" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analiz yapılamadı");
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analiz yapılamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="news-card">
      <div className="news-meta">
        <span className="src">{categoryEmoji} {item.source}</span>
        <span> | </span>
        <time dateTime={item.published}>{formatIst(item.published)} İST</time>
        <span className={`badge s-${item.sentiment === "nötr" ? "notr" : item.sentiment}`}>{SENTIMENT_LABEL[item.sentiment]}</span>
        <span className="badge lang">{item.lang === "tr" ? "🇹🇷 TR" : "🇬🇧 EN"}</span>
      </div>
      <h3 className="news-title">{item.title}</h3>
      {item.summary && <p className="news-summary">{item.summary}</p>}
      <div className="news-actions">
        <a className="btn" href={item.link} target="_blank" rel="noopener noreferrer">↗ Habere git</a>
        <button
          className="btn"
          onClick={() => setFav(toggleFavorite({ ...item, category: categoryName, emoji: categoryEmoji }))}
          aria-pressed={fav}
        >
          {fav ? "★ Kaldır" : "☆ Favori"}
        </button>
        {aiEnabled && (
          <button className="btn" onClick={analyze} disabled={busy}>
            {busy ? "Analiz ediliyor…" : "🤖 AI Analiz"}
          </button>
        )}
      </div>
      {analysis && (
        <div className="ai-box">
          <h4>◈ AI ANALİZİ</h4>
          <p>{analysis}</p>
        </div>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </article>
  );
}
