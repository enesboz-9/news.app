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
  related?: { source: string; link: string }[]; // aynı olayı veren diğer kaynaklar
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

// --- İçerik kalitesi yardımcıları ---

// Gündem dışı / tıklama tuzağı başlıklar (burç, astroloji, magazin, "deprem mi oldu?" SEO başlıkları).
const JUNK_RE = /(^|[^\p{L}])(burç(lar|ları|ların)?|astroloji|astrolog|falı|magazin|yıldız falı)(?![\p{L}])|mi oldu\?|mu oldu\?|son depremler listesi/iu;
// "burcu" özel isim de olabilir (Burcu Esmersoy); yalnızca küçük harfli kullanım burç anlamında sayılır.
const JUNK_BURCU = /(^|[^\p{L}])burcu(?![\p{L}])/u;
const JUNK_TITLE = { test: (t: string) => JUNK_RE.test(t) || JUNK_BURCU.test(t) };

// Bilgi taşımayan, yer tutucu veya afiş görselleri.
const BAD_IMAGE = /placeholder|default|logo|noimage|no-image|no_image|dummy|blank|spacer|sprite|avatar|favicon|son[-_]?dakika|breaking|\.svg(\?|$)|\.gif(\?|$)/i;

const STOP = new Set(["için", "ile", "ama", "fakat", "gibi", "daha", "çok", "son", "dakika", "bir", "bu", "şu", "ve", "veya", "the", "and", "for", "with", "from", "that", "this", "after", "over", "new"]);

function tokens(title: string): Set<string> {
  const out = new Set<string>();
  for (const w of title.toLocaleLowerCase("tr").split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 3 || STOP.has(w)) continue;
    out.add(w.slice(0, 5)); // Türkçe ekleri tolere etmek için basit kök (ilk 5 harf)
  }
  return out;
}

function similar(a: Set<string>, b: Set<string>): boolean {
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  if (shared < 3) return false;
  return shared / (a.size + b.size - shared) >= 0.5;
}

// Özeti temizler: başlığı tekrar ediyorsa veya anahtar kelime yığını gibiyse boş döner, aksi halde en fazla ~2 cümleye kısaltır.
export function tidySummary(summary: string, title: string): string {
  const s = summary.trim();
  if (!s) return "";
  const norm = (x: string) => x.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const ns = norm(s);
  const nt = norm(title);
  if (ns === nt || ns.startsWith(nt) && ns.length < nt.length + 25) return "";
  if ((s.match(/\?/g) ?? []).length >= 3) return ""; // "Deprem mi oldu? Son deprem nerede?" tarzı SEO yığını
  const sentences = s.match(/[^.!?…]+[.!?…]+(\s|$)/g);
  let out = sentences ? sentences.slice(0, 2).join("").trim() : s;
  if (out.length > 200) out = out.slice(0, 200).replace(/\s+\S*$/, "") + "…";
  return out;
}

// Besleme öğesinden görsel adresi bulur: enclosure, media:content/thumbnail ya da içerikteki ilk <img>.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickImage(e: any): string | undefined {
  const enc = e.enclosure?.url && (e.enclosure.type?.startsWith("image") || /\.(jpe?g|png|webp)/i.test(e.enclosure.url)) ? e.enclosure.url : undefined;
  const html: string = e["content:encoded"] ?? e.content ?? "";
  const cands = [enc, e.mediaContent?.$?.url, e.mediaThumb?.$?.url, /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1]];
  const u = cands.find((x) => typeof x === "string" && isHttp(x) && !BAD_IMAGE.test(x));
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
      const summary = google ? "" : tidySummary(clean(e.contentSnippet || e.content || e.summary, 600), title);
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
    if (cat.exclude?.test(it.title)) continue;
    if (cat.slug !== "kultur-sanat" && JUNK_TITLE.test(it.title)) continue;
    seen.add(it.link);
    merged.push(it);
  }
  merged.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));

  // Aynı olayı veren haberleri tek kartta topla: en yeni haber kalır, diğer kaynaklar "related" olarak eklenir.
  const groups: { rep: NewsItem; tok: Set<string> }[] = [];
  for (const it of merged) {
    const tok = tokens(it.title);
    const g = groups.find((x) => similar(x.tok, tok));
    if (!g) {
      groups.push({ rep: { ...it }, tok });
      continue;
    }
    if (!g.rep.image && it.image) g.rep.image = it.image;
    if (!g.rep.summary && it.summary) g.rep.summary = it.summary;
    const rel = g.rep.related ?? (g.rep.related = []);
    if (it.source !== g.rep.source && !rel.some((r) => r.source === it.source)) rel.push({ source: it.source, link: it.link });
  }
  return groups.map((g) => g.rep).slice(0, 60);
}
