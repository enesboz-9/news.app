const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Model adı Vercel'de GROQ_MODEL ile değiştirilebilir; Groq model kapatırsa kod değiştirmek gerekmez.
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const REASONING = MODEL.startsWith("openai/gpt-oss");

async function chat(prompt: string, temperature: number, maxTokens: number): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
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
      signal: AbortSignal.timeout(20000),
    });
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
