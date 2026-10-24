import Parser from "rss-parser";
import { Category } from "./categories";
import { detectLang } from "./lang";
import { quickSentiment, Sentiment } from "./sentiment";

export type NewsItem = {
  title: string;
  link: string;
  summary: string;
  source: string;
  published: string; // ISO
  sentiment: Sentiment;
  lang: "tr" | "en";
  titleOriginal?: string; // çevrilmişse özgün başlık
  summaryOriginal?: string;
  image?: string; // haber görseli (https)
};

const REVALIDATE_SECONDS = 1800; // 30 dk
const parser = new Parser({
  customFields: { item: [["media:content", "mediaContent"], ["media:thumbnail", "mediaThumb"]] },
});

function clean(text: string | undefined, max = 300): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isHttp(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

// Besleme öğesinden görsel adresi bulur: enclosure, media:content/thumbnail ya da içerikteki ilk <img>.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickImage(e: any): string | undefined {
  const enc = e.enclosure?.url && (e.enclosure.type?.startsWith("image") || /\.(jpe?g|png|webp)/i.test(e.enclosure.url)) ? e.enclosure.url : undefined;
  const html: string = e["content:encoded"] ?? e.content ?? "";
  const cands = [enc, e.mediaContent?.$?.url, e.mediaThumb?.$?.url, /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1]];
  const u = cands.find((x) => typeof x === "string" && isHttp(x));
  return u?.replace(/^http:\/\//i, "https://");
}

async function fetchFeed(url: string, cutoff: number): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "haberAI/1.0 (+https://bnovative.com.tr/haber-platformu.html)" },
    });
    if (!res.ok) return [];
    const feed = await parser.parseString(await res.text());
    const source = clean(feed.title, 60) || new URL(url).hostname;
    const items: NewsItem[] = [];
    for (const e of (feed.items ?? []).slice(0, 20)) {
      const ts = e.isoDate ? Date.parse(e.isoDate) : e.pubDate ? Date.parse(e.pubDate) : NaN;
      if (!Number.isFinite(ts) || ts < cutoff) continue;
      const link = e.link ?? "";
      if (!isHttp(link)) continue; // yalnızca http/https bağlantılar
      let title = clean(e.title, 300) || "Başlık yok";
      let src = source;
      const google = url.includes("news.google.com");
      // Google Haberler başlıkları "Başlık - Yayıncı" biçimindedir
      if (google) {
        const k = title.lastIndexOf(" - ");
        if (k > 0) { src = title.slice(k + 3).trim() || source; title = title.slice(0, k).trim(); }
      }
      const summary = google ? "" : clean(e.contentSnippet || e.content || e.summary);
      items.push({
        title,
        link,
        summary,
        source: src,
        published: new Date(ts).toISOString(),
        sentiment: quickSentiment(title),
        lang: detectLang(`${title} ${summary}`),
        image: pickImage(e),
      });
    }
    return items;
  } catch {
    return [];
  }
}

export async function getCategoryNews(cat: Category): Promise<NewsItem[]> {
  const cutoff = Date.now() - (cat.windowHours ?? 24) * 60 * 60 * 1000;
  const lists = await Promise.all(cat.feeds.map((u) => fetchFeed(u, cutoff)));
  const seen = new Set<string>();
  const merged: NewsItem[] = [];
  for (const it of lists.flat()) {
    if (seen.has(it.link)) continue;
    seen.add(it.link);
    merged.push(it);
  }
  merged.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  return merged.slice(0, 60);
}
