# haberAI — AI Destekli Akıllı Haber Platformu (Next.js)

Streamlit sürümünün Next.js ile yeniden yazılmış hâli. Veri tabanı ve hesap yok; Vercel'de çalışır.

## Özellikler
- 20 kategori, her birinin kendi adresi: `/kategori/spor`, `/kategori/yapay-zeka` ...
- Sunucuda üretilen sayfalar (Google içeriği tam görür), 30 dakikada bir yenilenir
- Her kategori için Groq (varsayılan: openai/gpt-oss-120b, `GROQ_MODEL` ile değiştirilebilir) ile **Günün Özeti**
- Haber başına isteğe bağlı **AI Analiz** (`/api/analiz`)
- Sentiment ve dil etiketi, favoriler (yalnızca tarayıcıda saklanır)
- `sitemap.xml`, `robots.txt`, canonical, Open Graph, JSON-LD

## Yerelde çalıştırma
```bash
npm install
cp .env.example .env.local   # GROQ_API_KEY değerini doldur
npm run dev
```

## Vercel'e yayınlama
1. Kodu GitHub'a gönder (yeni bir depo ya da `news.app` içine).
2. vercel.com → Add New → Project → depoyu seç. Framework otomatik "Next.js" seçilir.
3. Environment Variables:
   - `GROQ_API_KEY` = Groq anahtarın
   - `NEXT_PUBLIC_SITE_URL` = `https://haberai.bnovative.com.tr` (`.env.production` içinde zaten tanımlı, Vercel'de ayrıca girmen gerekmez)
4. Project → Settings → Domains → `haberai.bnovative.com.tr` ekle. Vercel'in verdiği CNAME kaydını alan adının DNS panelinde ekle (Metunic ya da DNS'i yönettiğin yer).
   Deploy sonrası.
5. Search Console'a yeni adresi ekle, `sitemap.xml` gönder.

Not: Vercel Hobby planı ticari olmayan kullanım içindir. Reklam eklemeden önce plan/ barındırma kararını gözden geçir.

## Bilmen gerekenler
- **Önbellek ve hız sınırı:** `/api/analiz` için IP başına dakikada 10 istek ve sonuç önbelleği sunucu örneği başına çalışır (veri tabanı yok). Trafik artarsa Vercel KV / Upstash Redis eklenebilir.
- **Telif:** Siteler yalnızca başlık, kısa özet ve kaynak bağlantısı gösterir. Tam metin kopyalamayın.
- **Besleme adresleri:** `lib/categories.ts` içinde. Kapanan bir besleme sessizce atlanır; periyodik kontrol et.
- Orijinal Streamlit sürümündeki sesli dinleme (TTS) ve otomatik çeviri bu sürümde yok.
