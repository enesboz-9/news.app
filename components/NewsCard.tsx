"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news";
import { SENTIMENT_LABEL } from "@/lib/sentiment";
import { formatIst } from "@/lib/format";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

type Props = { item: NewsItem; categoryName: string; categoryEmoji: string; aiEnabled: boolean; showSentiment?: boolean };

export default function NewsCard({ item, categoryName, categoryEmoji, aiEnabled, showSentiment = false }: Props) {
  const [showOrig, setShowOrig] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [fav, setFav] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setFav(isFavorite(item.link)), [item.link]);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && !!navigator.share), []);

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.titleOriginal ?? item.title, summary: item.summaryOriginal ?? item.summary, foreign: item.lang !== "tr" }),
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
      {item.image && (
        <a className="thumb" href={item.link} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.parentElement?.setAttribute("hidden", "")} />
        </a>
      )}
      <div className="news-meta">
        <span className="src">{item.source}</span>
        <time dateTime={item.published}>{formatIst(item.published)}</time>
        {showSentiment && <span className={`badge s-${item.sentiment === "nötr" ? "notr" : item.sentiment}`}>{SENTIMENT_LABEL[item.sentiment]}</span>}
        <span className="badge lang">{item.titleOriginal ? "İngilizceden çevrildi" : item.lang === "tr" ? "Türkçe" : "İngilizce"}</span>
      </div>
      <h3 className="news-title">{showOrig && item.titleOriginal ? item.titleOriginal : item.title}</h3>
      {(showOrig ? item.summaryOriginal : item.summary) && <p className="news-summary">{showOrig ? item.summaryOriginal : item.summary}</p>}
      {item.related && item.related.length > 0 && (
        <p className="also">
          <strong>+{item.related.length} kaynak daha:</strong>{" "}
          {item.related.slice(0, 4).map((r, n) => (
            <span key={r.link}>
              {n > 0 && ", "}
              <a href={r.link} target="_blank" rel="noopener noreferrer">{r.source}</a>
            </span>
          ))}
          {item.related.length > 4 && ` ve ${item.related.length - 4} kaynak`}
        </p>
      )}
      <div className="news-actions">
        <a className="btn primary" href={item.link} target="_blank" rel="noopener noreferrer">Habere git</a>
        <button
          className="btn"
          onClick={() => setFav(toggleFavorite({ ...item, category: categoryName, emoji: categoryEmoji }))}
          aria-pressed={fav}
        >
          {fav ? "Favoriden çıkar" : "Favorilere ekle"}
        </button>
        {canShare && (
          <button className="btn" onClick={() => navigator.share({ title: item.title, url: item.link }).catch(() => {})}>Paylaş</button>
        )}
        {item.titleOriginal && (
          <button className="btn" onClick={() => setShowOrig(!showOrig)}>{showOrig ? "Çeviriyi göster" : "Orijinalini göster"}</button>
        )}
        {aiEnabled && (
          <button className="btn" onClick={analyze} disabled={busy}>
            {busy ? "Analiz ediliyor…" : "AI analizi"}
          </button>
        )}
      </div>
      {analysis && (
        <div className="ai-box">
          <h4>AI analizi</h4>
          <p>{analysis}</p>
        </div>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </article>
  );
}
