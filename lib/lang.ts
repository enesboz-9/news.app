const TR_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
const TR_WORDS = new Set(["ve", "ile", "için", "bir", "bu", "da", "de", "den", "nin", "nın", "şu", "o", "ne"]);

// Hafif dil tespiti: Türkçe değilse "en" kabul edilir.
export function detectLang(text: string): "tr" | "en" {
  if (TR_CHARS.test(text)) return "tr";
  const words = new Set(text.toLowerCase().split(/\s+/));
  let hits = 0;
  for (const w of TR_WORDS) if (words.has(w)) hits++;
  return hits >= 2 ? "tr" : "en";
}
