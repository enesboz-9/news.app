export type Category = {
  slug: string;
  name: string;
  emoji: string;
  market?: boolean; // piyasa etkisi etiketi gösterilir
  windowHours?: number; // haber penceresi (varsayılan 24 saat)
  description: string;
  feeds: string[];
};

// Not: Kapanmış olduğu bilinen Reuters RSS adresleri çıkarıldı.
// Çalışmayan bir besleme sessizce atlanır, diğerleri etkilenmez.
export const CATEGORIES: Category[] = [
  {
    slug: "turkiye-gundemi", name: "Türkiye Gündemi", emoji: "🇹🇷",
    description: "Türkiye'nin son 24 saatteki gündemi: son dakika gelişmeleri, önemli haberler ve yapay zekâ destekli günlük özet.",
    feeds: [
      "https://www.trthaber.com/sondakika.rss",
      "https://www.sabah.com.tr/rss/anasayfa.xml",
      "https://www.hurriyet.com.tr/rss/anasayfa",
      "https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml",
      "https://www.cumhuriyet.com.tr/rss/son_dakika.xml",
      "https://www.ntv.com.tr/son-dakika.rss",
      "https://www.haberturk.com/rss/anasayfa.xml",
      "https://www.sozcu.com.tr/feed/",
    ],
  },
  {
    slug: "borsa-istanbul", name: "Borsa İstanbul", emoji: "📈",
    market: true,
    description: "Borsa İstanbul, piyasalar ve ekonomi haberleri ile yapay zekâ destekli günlük özet.",
    feeds: [
      "https://feeds.bbci.co.uk/turkce/ekonomi/rss.xml",
      "https://www.haberturk.com/rss/ekonomi.xml",
      "https://www.bloomberght.com/rss",
      "https://www.dunya.com/rss/anasayfa",
    ],
  },
  {
    slug: "spor", name: "Spor", emoji: "⚽",
    description: "Futbol ve diğer spor dallarından son 24 saatin haberleri ve günlük özet.",
    feeds: [
      "https://feeds.bbci.co.uk/sport/rss.xml",
      "https://www.fanatik.com.tr/rss/gundem.xml",
      "https://www.sporx.com/rss/haberler.xml",
      "https://www.ntvspor.net/rss",
    ],
  },
  {
    slug: "global-ekonomi", name: "Global Ekonomi", emoji: "🌍",
    market: true,
    description: "Küresel ekonomi ve iş dünyasından son haberler, günlük yapay zekâ özetiyle.",
    feeds: [
      "https://feeds.bbci.co.uk/news/business/rss.xml",
      "https://www.ekonomim.com/rss",
    ],
  },
  {
    slug: "ekonomi-finans", name: "Ekonomi & Finans", emoji: "💰",
    market: true,
    description: "Türkiye ekonomisi, finans ve iş dünyası haberleri ile günlük özet.",
    feeds: [
      "https://www.bloomberght.com/rss",
      "https://www.haberturk.com/rss/ekonomi.xml",
      "https://www.dunya.com/rss/anasayfa",
      "https://www.sabah.com.tr/rss/ekonomi.xml",
      "https://www.hurriyet.com.tr/rss/ekonomi",
    ],
  },
  {
    slug: "savunma-sanayii", name: "Savunma Sanayii", emoji: "🛡️",
    description: "Savunma sanayii ve güvenlik alanından güncel haberler ve günlük özet.",
    feeds: [
      "https://www.defenseone.com/rss/all/",
      "https://breakingdefense.com/feed/",
      "https://www.savunmasanayii.com/tr/rss",
    ],
  },
  {
    slug: "yapay-zeka", name: "Yapay Zeka", emoji: "🤖",
    description: "Yapay zekâ dünyasından son 24 saatin gelişmeleri ve günlük özet.",
    feeds: [
      "https://techcrunch.com/category/artificial-intelligence/feed/",
      "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
      "https://venturebeat.com/category/ai/feed/",
      "https://webrazzi.com/kategori/yapay-zeka/feed/",
    ],
  },
  {
    slug: "yazilim-dunyasi", name: "Yazılım Dünyası", emoji: "💻",
    description: "Yazılım ve teknoloji dünyasından güncel haberler ile günlük özet.",
    feeds: [
      "https://techcrunch.com/feed/",
      "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
      "https://www.theverge.com/rss/index.xml",
      "https://webrazzi.com/feed/",
      "https://www.donanimhaber.com/rss/tum/",
    ],
  },
  {
    slug: "bilim-teknoloji", name: "Bilim & Teknoloji", emoji: "🔬",
    description: "Türkiye'den bilim ve teknoloji haberleri, günlük yapay zekâ özetiyle.",
    feeds: [
      "https://webrazzi.com/feed/",
      "https://www.donanimhaber.com/rss/tum/",
      "https://chip.com.tr/feed/",
      "https://www.ntv.com.tr/teknoloji.rss",
      "https://shiftdelete.net/feed",
    ],
  },
  {
    slug: "uzay-bilimleri", name: "Uzay Bilimleri", emoji: "🚀",
    description: "Uzay ve astronomi haberleri, günlük özet.",
    feeds: ["https://www.space.com/feeds/all", "https://spacenews.com/feed/"],
  },
  {
    slug: "saglik", name: "Sağlık", emoji: "🏥",
    description: "Sağlık ve tıp dünyasından son haberler. Bu içerik tıbbi tavsiye değildir.",
    feeds: [
      "https://feeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC",
      "https://www.medicalnewstoday.com/rss",
      "https://www.sabah.com.tr/rss/saglik.xml",
    ],
  },
  {
    slug: "oyun-dunyasi", name: "Oyun Dünyası", emoji: "🎮",
    description: "Video oyunları ve oyun endüstrisinden güncel haberler.",
    feeds: [
      "https://www.ign.com/articles.rss",
      "https://kotaku.com/rss",
      "https://www.eurogamer.net/rss/newsfeed",
      "https://www.oyungezer.com.tr/feed/",
    ],
  },
  {
    slug: "cevre-enerji", name: "Çevre & Enerji", emoji: "🌿",
    description: "Çevre, iklim ve enerji haberleri, günlük özet.",
    feeds: [
      "https://www.theguardian.com/environment/rss",
      "https://cleantechnica.com/feed/",
    ],
  },
  {
    slug: "dunya-gundemi", name: "Dünya Gündemi", emoji: "📡",
    description: "Dünyadan son 24 saatin önemli haberleri ve günlük özet.",
    feeds: [
      "https://feeds.bbci.co.uk/news/world/rss.xml",
      "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
      "https://www.aljazeera.com/xml/rss/all.xml",
      "https://feeds.bbci.co.uk/turkce/rss.xml",
    ],
  },
  {
    slug: "siyaset", name: "Siyaset", emoji: "🏛️",
    description: "Türkiye siyasetinden güncel haberler, günlük özet.",
    feeds: [
      "https://www.trthaber.com/sondakika.rss",
      "https://www.hurriyet.com.tr/rss/siyaset",
      "https://www.milliyet.com.tr/rss/rssNew/siyasetRss.xml",
      "https://www.sabah.com.tr/rss/siyaset.xml",
    ],
  },
  {
    slug: "otomotiv", name: "Otomotiv", emoji: "🚗",
    windowHours: 72,
    description: "Otomotiv dünyasından yeni modeller ve sektör haberleri.",
    feeds: [
      "https://news.google.com/rss/search?q=otomobil+when:3d&hl=tr&gl=TR&ceid=TR:tr",
      "https://www.otomobiltutkusu.com/feed/",
      "https://www.autocarblog.com/feed/",
      "https://www.motortrend.com/rss/all/",
    ],
  },
  {
    slug: "turizm-seyahat", name: "Turizm & Seyahat", emoji: "✈️",
    description: "Turizm ve seyahat haberleri, günlük özet.",
    feeds: [
      "https://www.hurriyet.com.tr/rss/seyahat",
      "https://www.sabah.com.tr/rss/yasam.xml",
      "https://www.traveller.com.au/rss",
    ],
  },
  {
    slug: "dunya-basini", name: "Dünya Basını", emoji: "📰",
    description: "Dünya basınından öne çıkan haberler ve günlük özet.",
    feeds: [
      "https://feeds.bbci.co.uk/news/rss.xml",
      "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
      "https://www.theguardian.com/world/rss",
    ],
  },
  {
    slug: "kultur-sanat", name: "Kültür & Sanat", emoji: "🎬",
    windowHours: 72,
    description: "Kültür, sanat ve müzik dünyasından güncel haberler.",
    feeds: [
      "https://news.google.com/rss/search?q=k%C3%BClt%C3%BCr+sanat+when:3d&hl=tr&gl=TR&ceid=TR:tr",
      "https://www.hurriyet.com.tr/rss/kultur-sanat",
      "https://www.milliyet.com.tr/rss/rssNew/sanatRss.xml",
      "https://pitchfork.com/rss/news/feed.xml",
    ],
  },
];

export const HOME_SLUGS = ["turkiye-gundemi", "yapay-zeka", "borsa-istanbul", "spor", "bilim-teknoloji", "dunya-gundemi"];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
