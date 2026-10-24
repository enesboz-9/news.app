// Haber başlıklarını konulara ayırır. Anahtar kelimeye dayalıdır (API çağrısı yok, hız sınırına takılmaz).
export const TOPICS: { name: string; keys: string[] }[] = [
  { name: "Ekonomi & Piyasa", keys: ["ekonomi", "enflasyon", "faiz", "dolar", "euro", "borsa", "bist", "merkez bankası", "altın", "döviz", "zam ", "maaş", "vergi", "bütçe", "ihracat", "ithalat", "yatırım", "piyasa", "asgari ücret", "emekli", "kredi", "banka", "akaryakıt", "benzin", "motorin", "petrol", "inflation", "stock", "market", "economy", "oil price", "interest rate"] },
  { name: "Siyaset", keys: ["cumhurbaşkan", "erdoğan", "meclis", "tbmm", "chp", "akp", "mhp", "dem parti", "iyi parti", "bakan ", "bakanı", "seçim", "belediye başkan", "kanun", "milletvekili", "parti", "hükümet", "election", "parliament", "minister", "senate"] },
  { name: "Dünya", keys: ["abd", "rusya", "ukrayna", "israil", "gazze", "iran", "çin ", "nato", "putin", "trump", "suriye", "avrupa", "filistin", "savaş", "ukraine", "russia", "china", "israel", "gaza", "war ", "u.s.", "european"] },
  { name: "Spor", keys: ["maç", "galatasaray", "fenerbahçe", "beşiktaş", "trabzonspor", "futbol", "basketbol", "voleybol", "lig ", "gol ", "transfer", "teknik direktör", "şampiyon", "olimpiyat", "milli takım", "football", "match", "nba", "uefa"] },
  { name: "Asayiş & Adalet", keys: ["gözaltı", "tutuklan", "cinayet", "saldırı", "operasyon", "mahkeme", "hakim", "savcı", "dava", "soruşturma", "yaralan", "hayatını kaybet", "kaza", "polis", "jandarma", "hapis", "ceza", "arrest", "court", "killed", "police"] },
  { name: "Afet & Hava", keys: ["deprem", "afad", "yangın", "sel ", "fırtına", "hava durumu", "meteoroloji", "kar yağ", "sağanak", "heyelan", "earthquake", "storm", "wildfire", "flood"] },
  { name: "Sağlık", keys: ["sağlık", "hastane", "hastalık", "aşı", "kanser", "doktor", "ilaç", "virüs", "grip", "salgın", "health", "disease", "vaccine", "cancer"] },
  { name: "Teknoloji", keys: ["yapay zek", "teknoloji", "apple", "iphone", "google", "microsoft", "yazılım", "siber", "uygulama", "telefon", "robot", "openai", "tesla", "uzay", "nasa", "chip", " ai ", "software", "cyber"] },
  { name: "Eğitim", keys: ["okul", "öğrenci", "üniversite", "yks", "lgs", "öğretmen", "meb", "sınav", "eğitim", "ösym", "school", "student", "university"] },
  { name: "Kültür & Yaşam", keys: ["film", "dizi", "konser", "sanat", "festival", "müzik", "sinema", "sergi", "tiyatro", "kitap", "turizm", "tatil", "yemek", "movie", "music", "album"] },
];

export const OTHER_TOPIC = "Diğer gelişmeler";

export function topicOf(title: string): string {
  const t = ` ${title.toLocaleLowerCase("tr")} `;
  let best = OTHER_TOPIC;
  let bestHits = 0;
  for (const tp of TOPICS) {
    const hits = tp.keys.filter((k) => t.includes(k)).length;
    if (hits > bestHits) { bestHits = hits; best = tp.name; }
  }
  return best;
}

// Zamana göre başlık: İstanbul saatine göre bugün/dün ayrımı yapılır.
const ist = (ms: number) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(ms);
export const TIME_ORDER = ["Son 3 saat", "Bugün", "Dün", "Daha eski"];
export function timeBucket(iso: string, now: number): string {
  const ts = Date.parse(iso);
  if (now - ts <= 3 * 3600_000) return "Son 3 saat";
  if (ist(ts) === ist(now)) return "Bugün";
  if (ist(ts) === ist(now - 86400_000)) return "Dün";
  return "Daha eski";
}
