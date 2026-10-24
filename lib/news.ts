import Parser from "rss-parser";
import { Category } from "./categories";
import { detectLang } from "./lang";
import { quickSentiment, Sentiment } from "./sentiment";
import { byScore } from "./rank";

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
  score?: number; // önem puanı (yüksek = daha önemli)
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

// Besleme başlığı yerine okunur kısa kaynak adı (filtre listesi ve kartlarda daha temiz görünür).
const HOST_NAMES: Record<string, string> = {
  "feeds.bbci.co.uk": "BBC", "techcrunch.com": "TechCrunch", "rss.nytimes.com": "New York Times", "theguardian.com": "The Guardian",
  "aljazeera.com": "Al Jazeera", "rss.dw.com": "DW", "france24.com": "France 24", "feeds.npr.org": "NPR", "rss.cnn.com": "CNN",
  "feeds.skynews.com": "Sky News", "feeds.washingtonpost.com": "Washington Post", "lemonde.fr": "Le Monde", "spiegel.de": "Der Spiegel",
  "independent.co.uk": "The Independent", "cnbc.com": "CNBC", "feeds.content.dowjones.io": "MarketWatch", "economist.com": "The Economist",
  "finance.yahoo.com": "Yahoo Finance", "feeds.arstechnica.com": "Ars Technica", "arstechnica.com": "Ars Technica", "wired.com": "Wired",
  "theverge.com": "The Verge", "engadget.com": "Engadget", "technologyreview.com": "MIT Technology Review", "sciencedaily.com": "ScienceDaily",
  "newscientist.com": "New Scientist", "phys.org": "Phys.org", "hnrss.org": "Hacker News", "theregister.com": "The Register",
  "github.blog": "GitHub Blog", "stackoverflow.blog": "Stack Overflow", "feed.infoq.com": "InfoQ", "venturebeat.com": "VentureBeat",
  "openai.com": "OpenAI", "blog.google": "Google", "huggingface.co": "Hugging Face", "blogs.nvidia.com": "NVIDIA", "nasa.gov": "NASA",
  "universetoday.com": "Universe Today", "esa.int": "ESA", "space.com": "Space.com", "spacenews.com": "SpaceNews", "pcgamer.com": "PC Gamer",
  "gamespot.com": "GameSpot", "polygon.com": "Polygon", "carbonbrief.org": "Carbon Brief", "defensenews.com": "Defense News",
  "twz.com": "The War Zone", "breakingdefense.com": "Breaking Defense", "ign.com": "IGN", "kotaku.com": "Kotaku", "eurogamer.net": "Eurogamer",
  "cleantechnica.com": "CleanTechnica", "medicalnewstoday.com": "Medical News Today", "webmd.com": "WebMD", "feeds.webmd.com": "WebMD",
};
function hostName(url: string): string | undefined {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return HOST_NAMES[h] ?? HOST_NAMES[h.split(".").slice(-2).join(".")];
  } catch {
    return undefined;
  }
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
    const source = hostName(url) ?? (clean(feed.title, 60) || new URL(url).hostname);
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

// --- Önem puanı ---
// Çok sayıda kaynağın verdiği, büyük olay içeren, yeni haberler öne çıkar; tarif, rehber gibi hafif içerik ve yerel kaza haberleri geriye düşer.
const BIG = /(deprem.{0,40}büyüklüğünde|büyüklüğünde.{0,40}deprem)|ateşkes|savaş ilan|faiz kararı|faizi (sabit|artırdı|indirdi)|kabine toplantısı|enflasyon (rakam|verisi)|seçim sonuç|istifa etti|olağanüstü hal|ceasefire|rate decision|state of emergency|resigns?/iu;
const BOOST = /açıkladı|açıklandı|duyurdu|imzalandı|onaylandı|anlaşma|zirve|rekor|operasyon|atandı|yasa teklifi|cumhurbaşkan|merkez bankası|announces?|launch(es|ed)?|record|agreement|deal|breakthrough/iu;
const SOFT = /tarifi|tarif |nasıl yapılır|ipucu|püf noktası|önerileri|listesi|rehberi|diyet|güzellik|indirim|kampanya|fırsat|galeri|horoskop|quiz|how to |best .{0,20} (deals|to buy)|recipe/iu;
const LOCAL_INCIDENT = /kaza|çarpıştı|devrildi|yaralandı|gözaltına|tutuklandı|cinayet|kavga|crash|stabbing/iu;

function scoreItem(it: NewsItem, now: number): number {
  let s = 0;
  s += (it.related?.length ?? 0) * 3; // aynı olayı veren her ek kaynak
  if (BIG.test(it.title)) s += 4;
  if (BOOST.test(it.title)) s += 2;
  if (SOFT.test(it.title)) s -= 4;
  if (LOCAL_INCIDENT.test(it.title) && !BIG.test(it.title)) s -= 2;
  if (/\d{2,}\s*(kişi|can)\s*(hayatını kaybetti|öldü)|\d{2,}\s*ölü/iu.test(it.title)) s += 4; // çok sayıda can kaybı
  if (it.image) s += 0.5;
  const ageH = Math.max(0, (now - Date.parse(it.published)) / 3600_000);
  s -= Math.min(ageH, 48) * 0.12; // taze haber avantajlı
  return Math.round(s * 100) / 100;
}

// En yüksek puanlı n haberi seçer; tek kaynağın listeyi doldurmaması için kaynak başına en fazla 2 haber alınır.
export function pickTop(items: NewsItem[], n: number): NewsItem[] {
  const sorted = [...items].sort(byScore);
  const used = new Map<string, number>();
  const out: NewsItem[] = [];
  for (const it of sorted) {
    if (out.length >= n) break;
    const c = used.get(it.source) ?? 0;
    if (c >= 2) continue;
    used.set(it.source, c + 1);
    out.push(it);
  }
  for (const it of sorted) if (out.length < n && !out.includes(it)) out.push(it);
  return out;
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
  const now = Date.now();
  return groups.map((g) => ({ ...g.rep, score: scoreItem(g.rep, now) })).slice(0, 80);
}
