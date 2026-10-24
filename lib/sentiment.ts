export type Sentiment = "pozitif" | "negatif" | "nötr";

const POZITIF = [
  "artış","yükseliş","rekor","büyüme","kazanç","başarı","olumlu","iyileşme","gelişme","atılım","zirve","güçlü",
  "pozitif","kâr","yükseldi","arttı","açıldı","imzalandı","onaylandı","rise","gain","record","growth","success",
  "win"," up ","boost","breakthrough","surge","rally","profit","positive","strong",
];
const NEGATIF = [
  "düşüş","gerileme","kayıp","kriz","uyarı","tehlike","endişe","alarm","negatif","zayıf","çöküş","sert","baskı",
  "geriledi","düştü","azaldı","iptal","yasaklandı","soruşturma","dava","deprem","sel","yangın","kaza","ölü","yaralı",
  "saldırı","fall","drop","loss","crisis","warning","danger","concern","crash","weak","decline","risk","threat",
  "attack","death","bomb","war","conflict",
];

// Anahtar kelime tabanlı, API çağrısı yapmayan hızlı sınıflandırma.
export function quickSentiment(title: string): Sentiment {
  const t = ` ${title.toLocaleLowerCase("tr")} `;
  const p = POZITIF.filter((k) => t.includes(k)).length;
  const n = NEGATIF.filter((k) => t.includes(k)).length;
  if (p > n) return "pozitif";
  if (n > p) return "negatif";
  return "nötr";
}

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  pozitif: "▲ POZİTİF",
  negatif: "▼ NEGATİF",
  nötr: "● NÖTR",
};
