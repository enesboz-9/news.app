"use client";

import { useMemo, useState } from "react";
import type { NewsItem } from "@/lib/news";
import type { Sentiment } from "@/lib/sentiment";
import NewsCard from "./NewsCard";

const PAGE = 20;
const FILTERS: { v: Sentiment | "hepsi"; l: string }[] = [
  { v: "hepsi", l: "Tümü" },
  { v: "pozitif", l: "Olumlu" },
  { v: "negatif", l: "Olumsuz" },
  { v: "nötr", l: "Nötr" },
];

type Props = { items: NewsItem[]; categoryName: string; categoryEmoji: string; aiEnabled: boolean; showSentiment: boolean };

export default function NewsList({ items, categoryName, categoryEmoji, aiEnabled, showSentiment }: Props) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Sentiment | "hepsi">("hepsi");
  const [shown, setShown] = useState(PAGE);

  const list = useMemo(() => {
    const t = q.trim().toLocaleLowerCase("tr");
    return items.filter(
      (i) =>
        (f === "hepsi" || i.sentiment === f) &&
        (!t || `${i.title} ${i.summary} ${i.source}`.toLocaleLowerCase("tr").includes(t))
    );
  }, [items, q, f]);

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder={`${categoryName} haberlerinde ara`}
          aria-label="Haberlerde ara"
          value={q}
          onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
        />
        {showSentiment && (
          <div className="seg" role="group" aria-label="Piyasa etkisine göre filtrele">
            {FILTERS.map((x) => (
              <button key={x.v} className={`seg-btn${f === x.v ? " on" : ""}`} aria-pressed={f === x.v} onClick={() => { setF(x.v); setShown(PAGE); }}>
                {x.l}
              </button>
            ))}
          </div>
        )}
      </div>
      {list.length === 0 ? (
        <p className="empty">Seçtiğiniz ölçütlere uyan haber yok.</p>
      ) : (
        <>
          <div className="news-list">
            {list.slice(0, shown).map((item) => (
              <NewsCard key={item.link} item={item} categoryName={categoryName} categoryEmoji={categoryEmoji} aiEnabled={aiEnabled} showSentiment={showSentiment} />
            ))}
          </div>
          {shown < list.length && (
            <div className="more">
              <button className="btn" onClick={() => setShown(shown + PAGE)}>Daha fazla göster ({list.length - shown} haber)</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
