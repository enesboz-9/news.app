import type { NewsItem } from "./news";
import type { Sentiment } from "./sentiment";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Model adı Vercel'de GROQ_MODEL ile değiştirilebilir; Groq model kapatırsa kod değiştirmek gerekmez.
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const REASONING = MODEL.startsWith("openai/gpt-oss");

function parseArray(out: string | null): unknown[] | null {
  if (!out) return null;
  const a = out.indexOf("[");
  const b = out.lastIndexOf("]");
  if (a < 0 || b <= a) return null;
  try {
    const v = JSON.parse(out.slice(a, b + 1));
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

async function chat(prompt: string, temperature: number, maxTokens: number): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature,
          // gpt-oss düşünme jetonları da bu sınıra dahildir; kısa yanıtın kesilmemesi için pay bırakılır.
          max_tokens: REASONING ? maxTokens + 800 : maxTokens,
          ...(REASONING ? { reasoning_effort: "low" } : {}),
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (res.status === 429 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 2000)); // hız sınırı: bir kez bekleyip yeniden dene
        continue;
      }
      if (!res.ok) {
        console.error("Groq hatası", res.status, (await res.text()).slice(0, 300));
        return null;
      }
      const data = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      return text?.trim() || null;
    } catch {
      return null;
    }
  }
  return null;
}

// Türkçe olmayan haberlerin başlık ve özetini toplu çevirir (en çok `max` haber). Hata olursa özgün metin kalır.
export async function translateItems(items: NewsItem[], max = 20): Promise<NewsItem[]> {
  const idx = items.map((it, i) => (it.lang !== "tr" ? i : -1)).filter((i) => i >= 0).slice(0, max);
  if (idx.length === 0) return items;
  const out = items.slice();
  const chunks: number[][] = [];
  for (let i = 0; i < idx.length; i += 10) chunks.push(idx.slice(i, i + 10));
  await Promise.all(
    chunks.map(async (ch) => {
      const list = ch.map((ix, n) => ({ n, t: items[ix].title, s: items[ix].summary.slice(0, 220) }));
      const prompt = `Aşağıdaki yabancı dildeki haber başlıklarını ve özetlerini doğal, akıcı Türkçeye çevir. Kişi, marka ve kurum adlarını değiştirme; anlam ekleme veya çıkarma.

Girdi (JSON):
${JSON.stringify(list)}

Yalnızca şu biçimde bir JSON dizisi döndür, başka hiçbir şey yazma: [{"n":0,"t":"Türkçe başlık","s":"Türkçe özet"}]. Özet boşsa "s" boş olsun.`;
      const arr = parseArray(await chat(prompt, 0.2, 2200));
      if (!arr) return;
      for (const r of arr as { n?: number; t?: string; s?: string }[]) {
        if (typeof r?.n !== "number" || typeof r.t !== "string" || !r.t.trim()) continue;
        const ix = ch[r.n];
        if (ix === undefined || r.t.trim() === items[ix].title) continue;
        const src = items[ix];
        out[ix] = {
          ...src,
          title: r.t.trim(),
          summary: typeof r.s === "string" && r.s.trim() ? r.s.trim() : src.summary,
          titleOriginal: src.title,
          summaryOriginal: src.summary,
        };
      }
    })
  );
  return out;
}

// Başlıkların Borsa İstanbul, piyasalar ve emtialar üzerindeki olası etkisini sınıflandırır. Hata olursa null döner.
export async function marketImpact(headlines: string[]): Promise<Sentiment[] | null> {
  if (headlines.length === 0) return [];
  const list = headlines.map((h, i) => `${i}. ${h}`).join("
");
  const prompt = `Aşağıdaki haber başlıklarının her birini, Borsa İstanbul'u, finansal piyasaları (döviz, tahvil, faiz) ve emtiaları (altın, petrol, gümüş vb.) nasıl etkileyebileceğine göre sınıflandır.
- "pozitif": piyasalar, fiyatlar veya yatırımcı güveni için olumlu
- "negatif": piyasalar, fiyatlar veya yatırımcı güveni için olumsuz
- "nötr": belirgin bir etkisi yok ya da yönü belirsiz
Yalnızca başlıkta geçen bilgiye dayan.

Başlıklar:
${list}

Yalnızca ${headlines.length} elemanlı bir JSON dizisi döndür; sıra korunsun. Örnek: ["pozitif","nötr","negatif"]`;
  const arr = parseArray(await chat(prompt, 0.2, 300));
  if (!arr || arr.length !== headlines.length) return null;
  return arr.map((v) => {
    const t = String(v).toLocaleLowerCase("tr");
    return t.includes("poz") ? "pozitif" : t.includes("neg") ? "negatif" : "nötr";
  });
}

// Kategori için 3-4 maddelik "Günün Özeti". Hata olursa null döner (sayfa özetsiz gösterilir).
export async function dailyDigest(headlines: string[], category: string): Promise<string[] | null> {
  if (headlines.length < 3) return null;
  const list = headlines.slice(0, 20).map((h) => `- ${h}`).join("\n");
  const prompt = `Aşağıdaki haber başlıklarını analiz et ve şu kategori için Türkçe, çarpıcı ve öz bir "Günün Özeti" raporu oluştur: ${category}

Haber başlıkları:
${list}

Talimatlar:
- Tam olarak 3-4 madde yaz
- Her madde 1-2 cümle olsun
- Önemli trendleri, öne çıkan gelişmeleri ve dikkat çeken noktaları vurgula
- Yalnızca başlıklarda geçen bilgileri kullan, bilgi uydurma
- Teknik jargon kullanma, geniş kitleye hitap et
- Sadece maddeleri yaz, giriş/sonuç cümlesi ekleme
- Her madde • sembolü ile başlasın`;
  const out = await chat(prompt, 0.5, 400);
  if (!out) return null;
  const lines = out.split("\n").map((l) => l.replace(/^[•\-*]\s*/, "").trim()).filter(Boolean);
  return lines.length ? lines.slice(0, 4) : null;
}

export async function singleAnalysis(title: string, summary: string, foreign: boolean): Promise<string | null> {
  const prompt = foreign
    ? `Aşağıdaki yabancı dildeki haberi Türkçe olarak çevir ve analiz et.

Başlık: ${title}
Özet: ${summary || "(özet yok)"}

Şu formatta yanıt ver:
🌐 ÇEVİRİ: [Türkçe başlık]
🔍 ANALİZ: [2-3 cümle Türkçe analiz: ne anlama geliyor, neden önemli]

Sadece bu iki bölümü yaz.`
    : `Bu haberi 2-3 cümleyle Türkçe olarak analiz et. Ne anlama geliyor, neden önemli ve olası sonuçları ne olabilir?

Başlık: ${title}
Özet: ${summary}

Sadece analizi yaz, başlık veya giriş cümlesi ekleme.`;
  return chat(prompt, 0.5, 280);
}
