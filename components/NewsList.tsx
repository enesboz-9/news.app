"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsItem } from "@/lib/news";
import type { Sentiment } from "@/lib/sentiment";
import NewsCard from "./NewsCard";

const PAGE = 15;
const COMPACT_FROM = 9; // bu sıradan sonraki haberler sıkı (görselsiz) kart olarak gösterilir
const HIDDEN_KEY = "haberai:gizli-kaynaklar";

const FILTERS: { v: Sentiment | "hepsi"; l: string }[] = [
  { v: "hepsi", l: "Tümü" },
  { v: "pozitif", l: "Olumlu" },
  { v: "negatif", l: "Olumsuz" },
  { v: "nötr", l: "Nötr" },
];
type Lang = "hepsi" | "tr" | "yabanci";
const LANGS: { v: Lang; l: string }[] = [
  { v: "hepsi", l: "Tüm diller" },
  { v: "tr", l: "Sadece Türkçe" },
  { v: "yabanci", l: "Yabancı" },
];

type Props = { items: NewsItem[]; categoryName: string; categoryEmoji: string; aiEnabled: boolean; showSentiment: boolean };

// Önem puanı: kaç kaynağın verdiği, görseli olması. Eşitlikte daha yeni (listede önde olan) kazanır.
function pickFeatured(list: NewsItem[]): number {
  let best = 0;
  let bestScore = -1;
  list.slice(0, 15).forEach((it, i) => {
    const score = (it.related?.length ?? 0) * 2 + (it.image ? 1 : 0);
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return best;
}

export default function NewsList({ items, categoryName, categoryEmoji, aiEnabled, showSentiment }: Props) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Sentiment | "hepsi">("hepsi");
  const [lang, setLang] = useState<Lang>("hepsi");
  const [hidden, setHidden] = useState<string[]>([]);
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  // Gizlenen kaynaklar tarayıcıda saklanır (hidrasyon uyuşmazlığı olmaması için yüklemeden sonra okunur).
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
      if (Array.isArray(v)) setHidden(v.filter((x) => typeof x === "string"));
    } catch { /* depolama kapalı olabilir */ }
  }, []);
  function updateHidden(next: string[]) {
    setHidden(next);
    setShown(PAGE);
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)); } catch { /* yok say */ }
  }

  const sources = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.source, (m.get(i.source) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const list = useMemo(() => {
    const t = q.trim().toLocaleLowerCase("tr");
    const filtered = items.filter(
      (i) =>
        (f === "hepsi" || i.sentiment === f) &&
        (lang === "hepsi" || (lang === "tr" ? i.lang === "tr" : i.lang !== "tr")) &&
        !hidden.includes(i.source) &&
        (!t || `${i.title} ${i.summary} ${i.source}`.toLocaleLowerCase("tr").includes(t))
    );
    // Arama/filtre yokken en önemli haber en üstte "öne çıkan" olur.
    if (!t && filtered.length > 3) {
      const k = pickFeatured(filtered);
      if (k > 0) return [filtered[k], ...filtered.slice(0, k), ...filtered.slice(k + 1)];
    }
    return filtered;
  }, [items, q, f, lang, hidden]);

  const hasMore = shown < list.length;

  // Sonsuz kaydırma: sayfa sonuna yaklaşınca yeni haberler eklenir (düğme yedek olarak durur).
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) setShown((s) => s + PAGE); }, { rootMargin: "500px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown]);

  const reset = () => setShown(PAGE);

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder={`${categoryName} haberlerinde ara`}
          aria-label="Haberlerde ara"
          value={q}
          onChange={(e) => { setQ(e.target.value); reset(); }}
        />
        <div className="filters">
          {showSentiment && (
            <div className="seg" role="group" aria-label="Piyasa etkisine göre filtrele">
              {FILTERS.map((x) => (
                <button key={x.v} className={`seg-btn${f === x.v ? " on" : ""}`} aria-pressed={f === x.v} onClick={() => { setF(x.v); reset(); }}>
                  {x.l}
                </button>
              ))}
            </div>
          )}
          <div className="seg" role="group" aria-label="Dile göre filtrele">
            {LANGS.map((x) => (
              <button key={x.v} className={`seg-btn${lang === x.v ? " on" : ""}`} aria-pressed={lang === x.v} onClick={() => { setLang(x.v); reset(); }}>
                {x.l}
              </button>
            ))}
          </div>
          <details className="src-filter">
            <summary>Kaynaklar{hidden.length > 0 ? ` (${hidden.length} gizli)` : ""}</summary>
            <div className="src-panel">
              {sources.map(([s, n]) => {
                const off = hidden.includes(s);
                return (
                  <label key={s}>
                    <input
                      type="checkbox"
                      checked={!off}
                      onChange={() => updateHidden(off ? hidden.filter((x) => x !== s) : [...hidden, s])}
                    />
                    <span>{s}</span>
                    <small>{n}</small>
                  </label>
                );
              })}
              {hidden.length > 0 && (
                <button className="btn" onClick={() => updateHidden([])}>Tüm kaynakları göster</button>
              )}
            </div>
          </details>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="empty">Seçtiğiniz ölçütlere uyan haber yok.</p>
      ) : (
        <>
          <div className="news-list">
            {list.slice(0, shown).map((item, n) => (
              <NewsCard
                key={item.link}
                item={item}
                categoryName={categoryName}
                categoryEmoji={categoryEmoji}
                aiEnabled={aiEnabled}
                showSentiment={showSentiment}
                variant={n === 0 && list.length > 3 && !q.trim() ? "featured" : n >= COMPACT_FROM ? "compact" : undefined}
                onHideSource={(s) => updateHidden([...hidden, s])}
              />
            ))}
          </div>
          {hasMore && (
            <div className="more" ref={sentinel}>
              <button className="btn" onClick={() => setShown(shown + PAGE)}>Daha fazla göster ({list.length - shown} haber)</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
