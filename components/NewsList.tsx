"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsItem } from "@/lib/news";
import { byScore } from "@/lib/rank";
import type { Sentiment } from "@/lib/sentiment";
import NewsCard from "./NewsCard";
import { OTHER_TOPIC, TIME_ORDER, TOPICS, timeBucket, topicOf } from "@/lib/topics";

const PAGE = 15;
const COMPACT_FROM = 9; // bu sıradan sonraki haberler sıkı (görselsiz) kart olarak gösterilir
const HIDDEN_KEY = "haberai:gizli-kaynaklar";
const VIEW_KEY = "haberai:gorunum";
const GROUP_PAGE = 6; // gruplu görünümde her başlık altında ilk gösterilen haber sayısı

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

type View = "akis" | "konu" | "zaman";
const VIEWS: { v: View; l: string }[] = [
  { v: "akis", l: "Öne çıkanlar" },
  { v: "konu", l: "Konulara göre" },
  { v: "zaman", l: "Zamana göre" },
];

type Props = { items: NewsItem[]; categoryName: string; categoryEmoji: string; aiEnabled: boolean; showSentiment: boolean };

export default function NewsList({ items, categoryName, categoryEmoji, aiEnabled, showSentiment }: Props) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Sentiment | "hepsi">("hepsi");
  const [lang, setLang] = useState<Lang>("hepsi");
  const [hidden, setHidden] = useState<string[]>([]);
  const [shown, setShown] = useState(PAGE);
  const [view, setView] = useState<View>("akis");
  const [open, setOpen] = useState<Record<string, number>>({});
  const sentinel = useRef<HTMLDivElement>(null);

  // Gizlenen kaynaklar tarayıcıda saklanır (hidrasyon uyuşmazlığı olmaması için yüklemeden sonra okunur).
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
      if (Array.isArray(v)) setHidden(v.filter((x) => typeof x === "string"));
    } catch { /* depolama kapalı olabilir */ }
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "konu" || v === "zaman") setView(v);
    } catch { /* yok say */ }
  }, []);
  function changeView(v: View) {
    setView(v);
    setOpen({});
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* yok say */ }
  }
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

  const filtered = useMemo(() => {
    const t = q.trim().toLocaleLowerCase("tr");
    return items.filter(
      (i) =>
        (f === "hepsi" || i.sentiment === f) &&
        (lang === "hepsi" || (lang === "tr" ? i.lang === "tr" : i.lang !== "tr")) &&
        !hidden.includes(i.source) &&
        (!t || `${i.title} ${i.summary} ${i.source}`.toLocaleLowerCase("tr").includes(t))
    );
  }, [items, q, f, lang, hidden]);

  // Akış görünümü önem puanına göre dizilir; en önemli haber (arama yokken) "öne çıkan" olarak büyük gösterilir.
  const list = useMemo(() => [...filtered].sort(byScore), [filtered]);

  // Konu başlıklarının gösterilmesi için en az 2 farklı konu bulunmalı; yoksa seçenek gizlenir.
  const topicGroups = useMemo(() => {
    const m = new Map<string, NewsItem[]>();
    for (const it of filtered) {
      const k = topicOf(it.title);
      (m.get(k) ?? m.set(k, []).get(k)!).push(it);
    }
    const order = [...TOPICS.map((t) => t.name), OTHER_TOPIC];
    return order.filter((k) => m.has(k)).map((k) => ({ name: k, items: m.get(k)!.sort(byScore) }));
  }, [filtered]);
  const topicsUseful = topicGroups.filter((g) => g.name !== OTHER_TOPIC).length >= 2;

  const timeGroups = useMemo(() => {
    if (view !== "zaman") return [];
    const now = Date.now();
    const m = new Map<string, NewsItem[]>();
    for (const it of filtered) {
      const k = timeBucket(it.published, now);
      (m.get(k) ?? m.set(k, []).get(k)!).push(it);
    }
    return TIME_ORDER.filter((k) => m.has(k)).map((k) => ({ name: k, items: m.get(k)!.sort((x, y) => Date.parse(y.published) - Date.parse(x.published)) }));
  }, [filtered, view]);

  const activeView: View = view === "konu" && !topicsUseful ? "akis" : view;
  const groups = activeView === "konu" ? topicGroups : activeView === "zaman" ? timeGroups : null;

  const hasMore = !groups && shown < list.length;

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
          <div className="seg" role="group" aria-label="Görünüm">
            {VIEWS.filter((x) => x.v !== "konu" || topicsUseful).map((x) => (
              <button key={x.v} className={`seg-btn${activeView === x.v ? " on" : ""}`} aria-pressed={activeView === x.v} onClick={() => changeView(x.v)}>
                {x.l}
              </button>
            ))}
          </div>
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
      {filtered.length === 0 ? (
        <p className="empty">Seçtiğiniz ölçütlere uyan haber yok.</p>
      ) : groups ? (
        <div className="groups">
          {groups.map((g) => {
            const n = open[g.name] ?? GROUP_PAGE;
            return (
              <section key={g.name} className="group" aria-labelledby={`g-${g.name}`}>
                <h2 id={`g-${g.name}`} className="group-title">
                  {g.name} <span>{g.items.length}</span>
                </h2>
                <div className="news-list">
                  {g.items.slice(0, n).map((item, i) => (
                    <NewsCard
                      key={item.link}
                      item={item}
                      categoryName={categoryName}
                      categoryEmoji={categoryEmoji}
                      aiEnabled={aiEnabled}
                      showSentiment={showSentiment}
                      variant={i >= 3 ? "compact" : undefined}
                      onHideSource={(s) => updateHidden([...hidden, s])}
                    />
                  ))}
                </div>
                {n < g.items.length && (
                  <div className="more">
                    <button className="btn" onClick={() => setOpen({ ...open, [g.name]: n + GROUP_PAGE })}>
                      {g.name}: {g.items.length - n} haber daha
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
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
