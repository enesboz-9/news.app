import type { NewsItem } from "./news";

// Önem puanına (eşitlikte daha yeni olana) göre sıralama. Ayrı dosyada tutulur ki istemci bileşenleri
// sunucuya özgü haber çekme kodunu (rss-parser) pakete almak zorunda kalmasın.
export const byScore = (a: NewsItem, b: NewsItem) => (b.score ?? 0) - (a.score ?? 0) || Date.parse(b.published) - Date.parse(a.published);
