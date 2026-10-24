import type { NewsItem } from "./news";

export type FavItem = NewsItem & { category: string; emoji: string };
const KEY = "haberai-favorites";

export function loadFavorites(): FavItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(items: FavItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* depolama kapalıysa sessizce geç */
  }
}

export function isFavorite(link: string): boolean {
  return loadFavorites().some((f) => f.link === link);
}

// Yeni durumu döndürür (true = favoride).
export function toggleFavorite(item: FavItem): boolean {
  const favs = loadFavorites();
  const exists = favs.some((f) => f.link === item.link);
  save(exists ? favs.filter((f) => f.link !== item.link) : [item, ...favs].slice(0, 200));
  return !exists;
}

export function clearFavorites() {
  save([]);
}

export function removeFavorite(link: string) {
  save(loadFavorites().filter((f) => f.link !== link));
}
