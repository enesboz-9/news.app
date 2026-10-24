import { NextRequest, NextResponse } from "next/server";
import { singleAnalysis } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 30;

// Not: Veri tabanı olmadığı için önbellek ve hız sınırı sunucu örneği başına çalışır (en iyi çaba).
const cache = new Map<string, string>();
const hits = new Map<string, { n: number; reset: number }>();
const LIMIT = 10; // IP başına dakikada
const MAX_CACHE = 500;

function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  h.n++;
  return h.n > LIMIT;
}

export async function POST(req: NextRequest) {
  // Yalnızca kendi sitemizden gelen istekler
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return NextResponse.json({ error: "Yetkisiz istek" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Yetkisiz istek" }, { status: 403 });
    }
  }

  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI şu an kapalı" }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "bilinmiyor";
  if (limited(ip)) return NextResponse.json({ error: "Çok fazla istek. Bir dakika sonra tekrar deneyin." }, { status: 429 });

  let body: { title?: unknown; summary?: unknown; foreign?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.slice(0, 300).trim() : "";
  const summary = typeof body.summary === "string" ? body.summary.slice(0, 400).trim() : "";
  const foreign = body.foreign === true;
  if (!title) return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });

  const key = `${foreign}|${title}|${summary}`;
  const hit = cache.get(key);
  if (hit) return NextResponse.json({ analysis: hit });

  const analysis = await singleAnalysis(title, summary, foreign);
  if (!analysis) return NextResponse.json({ error: "Analiz yapılamadı, daha sonra tekrar deneyin." }, { status: 502 });

  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, analysis);
  return NextResponse.json({ analysis });
}
