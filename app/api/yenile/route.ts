import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { CATEGORIES } from "@/lib/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Zamanlanmış yenileme: sayfayı önbellekten düşürür ve hemen yeniden üretir; böylece ziyaretçi beklemez.
// Yetki: CRON_SECRET ortam değişkeni. Vercel Cron bu değeri "Authorization: Bearer ..." başlığıyla kendisi gönderir.
//   /api/yenile?liste=1    -> yenilenebilecek sayfa adlarını listeler
//   /api/yenile?slug=ana   -> ana sayfayı yeniler ("ana" ya da bir kategori adı)
//   /api/yenile            -> tüm sayfaları sırayla yeniler (süre sınırına kadar)
const SLUGS = ["ana", ...CATEGORIES.map((c) => c.slug)];
const pathOf = (slug: string) => (slug === "ana" ? "/" : `/kategori/${slug}`);

async function refresh(slug: string, origin: string) {
  const path = pathOf(slug);
  const t0 = Date.now();
  revalidatePath(path);
  try {
    // Sayfa burada yeniden üretilir (yapay zekâ çevirisi ve özetleri dahil); sonuç önbelleğe yazılır.
    const res = await fetch(origin + path, { cache: "no-store", signal: AbortSignal.timeout(55_000), headers: { "User-Agent": "haberAI-yenile" } });
    return { slug, status: res.status, ms: Date.now() - t0 };
  } catch (e) {
    return { slug, status: 0, ms: Date.now() - t0, error: e instanceof Error ? e.message : "hata" };
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET tanımlı değil" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const url = new URL(req.url);
  if (url.searchParams.get("liste")) return NextResponse.json({ slugs: SLUGS });

  const slug = url.searchParams.get("slug");
  if (slug) {
    if (!SLUGS.includes(slug)) return NextResponse.json({ error: "Bilinmeyen sayfa" }, { status: 404 });
    return NextResponse.json(await refresh(slug, url.origin));
  }

  const started = Date.now();
  const done = [];
  for (const s of SLUGS) {
    if (Date.now() - started > 40_000) break; // süre sınırı: kalanlar bir sonraki çalıştırmada
    done.push(await refresh(s, url.origin));
  }
  return NextResponse.json({ yenilenen: done.length, toplam: SLUGS.length, done });
}
