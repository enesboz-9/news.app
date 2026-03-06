"""
╔══════════════════════════════════════════════════════════════╗
║           AI HABER TERMİNALİ - app.py                       ║
║   Python + Streamlit + Groq API (Llama 3.3) ile            ║
║   Sentiment Analizi | TTS | Favoriler | Kategori Sembolleri ║
╚══════════════════════════════════════════════════════════════╝
"""

import pytz
import streamlit as st
import feedparser
import re
import base64
import io
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from groq import Groq
from gtts import gTTS

# ──────────────────────────────────────────────────────────────
# İSTANBUL SAAT DİLİMİ
# ──────────────────────────────────────────────────────────────
ISTANBUL_TZ = pytz.timezone("Europe/Istanbul")

# ──────────────────────────────────────────────────────────────
# SAYFA YAPILANDIRMASI
# ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="AI Haber Terminali",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ──────────────────────────────────────────────────────────────
# SESSION STATE — Favoriler, AI önbelleği, TTS önbelleği
# ──────────────────────────────────────────────────────────────
if "favorites" not in st.session_state:
    st.session_state.favorites = {}       # link → haber dict
if "ai_analyses" not in st.session_state:
    st.session_state.ai_analyses = {}     # link → analiz metni
if "tts_audio" not in st.session_state:
    st.session_state.tts_audio = {}       # key → base64 ses

# ──────────────────────────────────────────────────────────────
# KATEGORİ SEMBOL HARİTASI — haber kartlarında görünür
# ──────────────────────────────────────────────────────────────
CATEGORY_SYMBOL = {
    "🇹🇷 Türkiye Gündemi":    "🇹🇷",
    "📈 Borsa İstanbul":       "📈",
    "⚽ Spor":                  "⚽",
    "🌍 Global Ekonomi":       "🌍",
    "💰 Ekonomi & Finans TR":  "💰",
    "🛡️ Savunma Sanayii":      "🛡️",
    "🤖 Yapay Zeka":           "🤖",
    "💻 Yazılım Dünyası":      "💻",
    "🔬 Bilim & Teknoloji TR": "🔬",
    "⚡ Elektrik-Elektronik":  "⚡",
    "🚀 Uzay Bilimleri":       "🚀",
    "🏥 Sağlık":               "🏥",
    "🎮 Oyun Dünyası":         "🎮",
    "🌿 Çevre & Enerji":       "🌿",
    "📡 Dünya Gündemi":        "📡",
    "🏛️ Siyaset TR":           "🏛️",
    "🚗 Otomotiv":             "🚗",
    "✈️ Turizm & Seyahat":     "✈️",
    "📰 Dünya Basını":         "📰",
    "🎬 Kültür & Sanat":       "🎬",
}

# ──────────────────────────────────────────────────────────────
# SENTİMENT TANIMLARI — renk, etiket, nokta
# ──────────────────────────────────────────────────────────────
SENTIMENT_STYLES = {
    "pozitif": {
        "label":  "▲ POZİTİF",
        "color":  "#00ff8c",
        "bg":     "rgba(0,255,140,0.08)",
        "border": "rgba(0,255,140,0.4)",
        "dot":    "#00ff8c",
    },
    "negatif": {
        "label":  "▼ NEGATİF",
        "color":  "#ff4d6d",
        "bg":     "rgba(255,77,109,0.08)",
        "border": "rgba(255,77,109,0.4)",
        "dot":    "#ff4d6d",
    },
    "nötr": {
        "label":  "● NÖTR",
        "color":  "#a0b8d0",
        "bg":     "rgba(160,184,208,0.06)",
        "border": "rgba(160,184,208,0.3)",
        "dot":    "#a0b8d0",
    },
}

# ──────────────────────────────────────────────────────────────
# KATEGORİLER VE RSS BESLEMELERİ
# ──────────────────────────────────────────────────────────────
CATEGORIES = {
    "🇹🇷 Türkiye Gündemi": [
        "https://www.trthaber.com/sondakika.rss",
        "https://www.sabah.com.tr/rss/anasayfa.xml",
        "https://www.hurriyet.com.tr/rss/anasayfa",
        "https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml",
        "https://www.cumhuriyet.com.tr/rss/son_dakika.xml",
        "https://www.ntv.com.tr/son-dakika.rss",
        "https://www.haberturk.com/rss/anasayfa.xml",
        "https://www.sozcu.com.tr/feed/",
    ],
    "📈 Borsa İstanbul": [
        "https://feeds.bbci.co.uk/turkce/ekonomi/rss.xml",
        "https://www.haberturk.com/rss/ekonomi.xml",
        "https://www.bloomberght.com/rss",
        "https://www.dunya.com/rss/anasayfa",
    ],
    "⚽ Spor": [
        "https://feeds.bbci.co.uk/sport/rss.xml",
        "https://www.fanatik.com.tr/rss/gundem.xml",
        "https://www.sporx.com/rss/haberler.xml",
        "https://www.ntvspor.net/rss",
    ],
    "🌍 Global Ekonomi": [
        "https://feeds.bbci.co.uk/news/business/rss.xml",
        "https://www.reuters.com/rssFeed/businessNews",
        "https://www.ekonomim.com/rss",
    ],
    "💰 Ekonomi & Finans TR": [
        "https://www.bloomberght.com/rss",
        "https://www.haberturk.com/rss/ekonomi.xml",
        "https://www.dunya.com/rss/anasayfa",
        "https://www.sabah.com.tr/rss/ekonomi.xml",
        "https://www.hurriyet.com.tr/rss/ekonomi",
    ],
    "🛡️ Savunma Sanayii": [
        "https://www.defenseone.com/rss/all/",
        "https://breakingdefense.com/feed/",
        "https://www.savunmasanayii.com/tr/rss",
    ],
    "🤖 Yapay Zeka": [
        "https://techcrunch.com/category/artificial-intelligence/feed/",
        "https://venturebeat.com/category/ai/feed/",
        "https://webrazzi.com/kategori/yapay-zeka/feed/",
    ],
    "💻 Yazılım Dünyası": [
        "https://techcrunch.com/feed/",
        "https://www.theverge.com/rss/index.xml",
        "https://webrazzi.com/feed/",
        "https://www.donanimhaber.com/rss/tum/",
    ],
    "🔬 Bilim & Teknoloji TR": [
        "https://webrazzi.com/feed/",
        "https://www.donanimhaber.com/rss/tum/",
        "https://chip.com.tr/feed/",
        "https://www.ntv.com.tr/teknoloji.rss",
        "https://shiftdelete.net/feed",
    ],
    "⚡ Elektrik-Elektronik": [
        "https://spectrum.ieee.org/rss/fulltext",
        "https://www.eetimes.com/rss/",
        "https://chip.com.tr/feed/",
    ],
    "🚀 Uzay Bilimleri": [
        "https://www.space.com/feeds/all",
        "https://spacenews.com/feed/",
    ],
    "🏥 Sağlık": [
        "https://feeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC",
        "https://www.medicalnewstoday.com/rss",
        "https://www.sabah.com.tr/rss/saglik.xml",
    ],
    "🎮 Oyun Dünyası": [
        "https://www.ign.com/articles.rss",
        "https://kotaku.com/rss",
        "https://www.eurogamer.net/rss/newsfeed",
        "https://www.oyungezer.com.tr/feed/",
    ],
    "🌿 Çevre & Enerji": [
        "https://www.theguardian.com/environment/rss",
        "https://cleantechnica.com/feed/",
    ],
    "📡 Dünya Gündemi": [
        "https://feeds.bbci.co.uk/news/world/rss.xml",
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "https://www.aljazeera.com/xml/rss/all.xml",
        "https://feeds.bbci.co.uk/turkce/rss.xml",
    ],
    "🏛️ Siyaset TR": [
        "https://www.trthaber.com/sondakika.rss",
        "https://www.hurriyet.com.tr/rss/siyaset",
        "https://www.milliyet.com.tr/rss/rssNew/siyasetRss.xml",
        "https://www.sabah.com.tr/rss/siyaset.xml",
    ],
    "🚗 Otomotiv": [
        "https://www.otomobiltutkusu.com/feed/",
        "https://www.autocarblog.com/feed/",
        "https://www.motortrend.com/rss/all/",
    ],
    "✈️ Turizm & Seyahat": [
        "https://www.hurriyet.com.tr/rss/seyahat",
        "https://www.sabah.com.tr/rss/yasam.xml",
        "https://www.traveller.com.au/rss",
    ],
    "📰 Dünya Basını": [
        "https://feeds.bbci.co.uk/news/rss.xml",
        "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
        "https://www.theguardian.com/world/rss",
        "https://feeds.reuters.com/reuters/topNews",
    ],
    "🎬 Kültür & Sanat": [
        "https://www.hurriyet.com.tr/rss/kultur-sanat",
        "https://www.milliyet.com.tr/rss/rssNew/sanatRss.xml",
        "https://pitchfork.com/rss/news/feed.xml",
    ],
}

# ──────────────────────────────────────────────────────────────
# ÖZELLEŞTİRİLMİŞ CSS
# ──────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700;900&display=swap');

.stApp {
    background-color: #060a0f;
    background-image:
        radial-gradient(ellipse at 20% 50%, rgba(0,255,140,0.04) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(0,180,255,0.04) 0%, transparent 60%);
    font-family: 'Exo 2', sans-serif;
}
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0a1628 0%, #060a0f 100%);
    border-right: 1px solid rgba(0,255,140,0.2);
}
[data-testid="stSidebar"] * { font-family: 'Exo 2', sans-serif; }

.terminal-header {
    font-family: 'Share Tech Mono', monospace;
    background: linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%);
    border: 1px solid rgba(0,255,140,0.3);
    border-left: 4px solid #00ff8c;
    padding: 20px 28px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
}
.terminal-header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #00ff8c, transparent);
}
.terminal-header h1 { color: #00ff8c; font-size: 1.8rem; margin: 0; letter-spacing: 3px; text-shadow: 0 0 20px rgba(0,255,140,0.5); }
.terminal-header p  { color: #5a8a7a; font-size: 0.75rem; margin: 4px 0 0; letter-spacing: 2px; }

.news-card {
    background: linear-gradient(135deg, #0d1f3c 0%, #0a1628 100%);
    border: 1px solid rgba(0,180,255,0.15);
    border-left: 3px solid #00b4ff;
    border-radius: 4px;
    padding: 16px 20px;
    margin-bottom: 6px;
    transition: all 0.2s ease;
    position: relative;
}
.news-card:hover {
    border-left-color: #00ff8c;
    background: linear-gradient(135deg, #0f2444 0%, #0d1a30 100%);
    transform: translateX(3px);
}
.news-card-title   { font-family:'Exo 2',sans-serif; font-weight:700; font-size:0.95rem; color:#e8f4f8; margin-bottom:6px; line-height:1.4; }
.news-card-meta    { font-family:'Share Tech Mono',monospace; font-size:0.7rem; color:#3a6080; margin-bottom:8px; letter-spacing:1px; }
.news-card-meta span { color: #00b4ff; }
.news-card-summary { font-size:0.82rem; color:#7a9ab0; line-height:1.6; margin-bottom:6px; }

/* Sentiment badge */
.sentiment-badge {
    display: inline-block;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.62rem;
    letter-spacing: 1.5px;
    padding: 2px 9px;
    border-radius: 2px;
    font-weight: bold;
    vertical-align: middle;
    margin-left: 8px;
}
/* Sentinel nokta */
.s-dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
}

/* AI kutusu */
.ai-summary-box {
    background: rgba(0,255,140,0.04);
    border: 1px solid rgba(0,255,140,0.2);
    border-radius: 4px;
    padding: 14px 18px;
    margin: 10px 0 4px;
}
.ai-summary-box h3 { font-family:'Share Tech Mono',monospace; color:#00ff8c; font-size:0.85rem; letter-spacing:2px; margin-bottom:10px; }
.ai-summary-box p  { color:#a0c8b0; font-size:0.85rem; line-height:1.7; }

/* Günün özeti */
.daily-digest {
    background: linear-gradient(135deg,rgba(0,255,140,0.06) 0%,rgba(0,180,255,0.04) 100%);
    border: 1px solid rgba(0,255,140,0.25);
    border-top: 3px solid #00ff8c;
    border-radius: 6px;
    padding: 24px 28px;
    margin-bottom: 28px;
}
.daily-digest h2 { font-family:'Share Tech Mono',monospace; color:#00ff8c; font-size:1rem; letter-spacing:3px; margin-bottom:16px; text-shadow:0 0 10px rgba(0,255,140,0.4); }

/* Favoriler */
.fav-panel {
    background: linear-gradient(135deg,rgba(255,215,0,0.06) 0%,rgba(255,180,0,0.03) 100%);
    border: 1px solid rgba(255,215,0,0.25);
    border-top: 3px solid #ffd700;
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 28px;
}
.fav-panel-title { font-family:'Share Tech Mono',monospace; color:#ffd700; font-size:0.95rem; letter-spacing:3px; margin-bottom:16px; text-shadow:0 0 10px rgba(255,215,0,0.4); }
.fav-card {
    background: linear-gradient(135deg,#1a1a0a 0%,#0f1208 100%);
    border: 1px solid rgba(255,215,0,0.2);
    border-left: 3px solid #ffd700;
    border-radius: 4px;
    padding: 12px 16px;
    margin-bottom: 10px;
}
.fav-card-title { font-size:0.9rem; color:#e8e4b0; font-weight:700; line-height:1.4; }
.fav-cat-badge  { font-family:'Share Tech Mono',monospace; font-size:0.62rem; color:#b8a040; letter-spacing:1px; margin-bottom:6px; }

/* Audio */
audio { filter:invert(1) hue-rotate(180deg); width:100%; margin-top:6px; height:30px; }

/* Boş */
.empty-state { text-align:center; padding:60px 20px; color:#3a6080; font-family:'Share Tech Mono',monospace; font-size:0.85rem; letter-spacing:2px; }

/* Tabs */
.stTabs [data-baseweb="tab-list"] { gap:2px; background:transparent; border-bottom:1px solid rgba(0,180,255,0.2); }
.stTabs [data-baseweb="tab"] {
    background:rgba(0,20,40,0.5); border:1px solid rgba(0,180,255,0.1); border-bottom:none; color:#3a6080;
    font-family:'Share Tech Mono',monospace; font-size:0.75rem; letter-spacing:1px;
    padding:8px 16px; border-radius:3px 3px 0 0;
}
.stTabs [aria-selected="true"] { background:rgba(0,255,140,0.08)!important; border-color:rgba(0,255,140,0.3)!important; color:#00ff8c!important; }

div[data-testid="stMetricValue"] { color:#00ff8c; font-family:'Share Tech Mono',monospace; }
.stButton button {
    background:transparent; border:1px solid rgba(0,255,140,0.3); color:#00ff8c;
    font-family:'Share Tech Mono',monospace; font-size:0.72rem;
    letter-spacing:1px; padding:4px 14px; border-radius:2px; transition:all 0.2s;
}
.stButton button:hover { background:rgba(0,255,140,0.1); border-color:#00ff8c; box-shadow:0 0 12px rgba(0,255,140,0.2); }
.stMultiSelect > div { background:#0a1628!important; border-color:rgba(0,180,255,0.3)!important; }
.stSpinner > div { border-top-color:#00ff8c!important; }
::-webkit-scrollbar { width:4px; height:4px; }
::-webkit-scrollbar-track { background:#060a0f; }
::-webkit-scrollbar-thumb { background:rgba(0,255,140,0.3); border-radius:2px; }
</style>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────
# YARDIMCI FONKSİYONLAR
# ──────────────────────────────────────────────────────────────

def parse_entry_time(entry) -> datetime | None:
    """RSS girdisinin zaman damgasını UTC datetime nesnesine çevirir."""
    for attr in ("published_parsed", "updated_parsed", "created_parsed"):
        t = getattr(entry, attr, None)
        if t:
            try:
                return datetime(*t[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    return None


def clean_html(text: str) -> str:
    """HTML etiketlerini temizler ve 300 karakterle sınırlar."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:300]


def fetch_feed(url: str, cutoff: datetime) -> list[dict]:
    """
    Belirtilen RSS URL'sini çeker.
    cutoff tarihinden sonraki haberleri liste olarak döndürür.
    """
    try:
        feed = feedparser.parse(url)
        items = []
        for entry in feed.entries[:20]:
            pub = parse_entry_time(entry)
            if pub and pub >= cutoff:
                summary_raw = getattr(entry, "summary", "") or getattr(entry, "description", "")
                items.append({
                    "title":     clean_html(getattr(entry, "title", "Başlık Yok")),
                    "link":      getattr(entry, "link", "#"),
                    "summary":   clean_html(summary_raw),
                    "source":    feed.feed.get("title", url),
                    "published": pub,
                    "sentiment": None,
                })
        return items
    except Exception:
        return []


@st.cache_data(ttl=1800, show_spinner=False)
def fetch_all_news(selected_categories: tuple) -> dict[str, list[dict]]:
    """
    Seçili kategorilerin RSS beslemelerini ThreadPoolExecutor ile
    paralel çeker. Sonuçlar 30 dakika önbellekte tutulur.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    result: dict[str, list[dict]] = {}
    urls_map: dict[str, str] = {}

    for cat in selected_categories:
        result[cat] = []
        for url in CATEGORIES.get(cat, []):
            urls_map[url] = cat

    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(fetch_feed, url, cutoff): (url, cat)
                   for url, cat in urls_map.items()}
        for future in as_completed(futures):
            _, cat = futures[future]
            try:
                result[cat].extend(future.result())
            except Exception:
                pass

    for cat in result:
        result[cat].sort(key=lambda x: x["published"], reverse=True)

    return result


def quick_sentiment(title: str) -> str:
    """
    Anahtar kelime tabanlı hızlı sentiment sınıflandırması.
    API çağrısı yapmadan anında 'pozitif' / 'negatif' / 'nötr' döndürür.
    Borsa haberlerinde yeşil/kırmızı nokta göstermek için kullanılır.
    """
    t = title.lower()
    pozitif = [
        "artış","yükseliş","rekor","büyüme","kazanç","başarı","olumlu","iyileşme",
        "gelişme","atılım","zirve","güçlü","pozitif","kâr","kar","yükseldi","arttı",
        "açıldı","imzalandı","onaylandı","rise","gain","record","growth","success",
        "win"," up ","boost","breakthrough","surge","rally","profit","positive","strong",
    ]
    negatif = [
        "düşüş","gerileme","kayıp","kriz","uyarı","tehlike","endişe","alarm","negatif",
        "zayıf","çöküş","sert","baskı","geriledi","düştü","azaldı","iptal","yasaklandı",
        "soruşturma","dava","deprem","sel","yangın","kaza","ölü","yaralı","saldırı",
        "fall","drop","loss","crisis","warning","danger","concern","crash","weak",
        "decline","risk","threat","attack","death","bomb","war","conflict",
    ]
    p = sum(1 for k in pozitif if k in t)
    n = sum(1 for k in negatif if k in t)
    if p > n:   return "pozitif"
    if n > p:   return "negatif"
    return "nötr"


def groq_daily_digest(client: Groq, headlines: list[str], category: str) -> str:
    """
    Haber başlıklarını Groq Llama-3.3-70b'ye göndererek
    3-4 maddelik Türkçe 'Günün Özeti' raporu oluşturur.
    """
    if not headlines:
        return "Bu kategori için yeterli haber bulunamadı."
    headlines_text = "\n".join(f"- {h}" for h in headlines[:20])
    prompt = f"""Aşağıdaki haber başlıklarını analiz et ve şu kategori için Türkçe,
çarpıcı ve öz bir "Günün Özeti" raporu oluştur: **{category}**

Haber başlıkları:
{headlines_text}

Talimatlar:
- Tam olarak 3-4 madde yaz
- Her madde 1-2 cümle olsun
- Önemli trendleri, öne çıkan gelişmeleri ve dikkat çeken noktaları vurgula
- Teknik jargon kullanma, geniş kitleye hitap et
- Sadece maddeleri yaz, giriş/sonuç cümlesi ekleme
- Her madde • sembolü ile başlasın"""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=400,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"⚠️ Groq API hatası: {str(e)}"


def groq_single_analysis(client: Groq, title: str, summary: str) -> str:
    """Tek bir haber için 2-3 cümlelik Türkçe AI analizi üretir."""
    prompt = f"""Bu haberi 2-3 cümleyle Türkçe olarak analiz et.
Ne anlama geliyor, neden önemli ve olası sonuçları ne olabilir?

Başlık: {title}
Özet: {summary}

Sadece analizi yaz, başlık veya giriş cümlesi ekleme."""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=220,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"⚠️ Analiz yapılamadı: {str(e)}"


def text_to_speech_base64(text: str, lang: str = "tr") -> str | None:
    """
    gTTS ile verilen metni MP3'e dönüştürür ve Base64 string döndürür.
    HTML audio etiketinde data URI olarak kullanılır.
    lang: 'tr' Türkçe, 'en' İngilizce
    """
    try:
        tts = gTTS(text=text[:600], lang=lang, slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")
    except Exception:
        return None


def detect_lang(text: str) -> str:
    """Başlık metnine bakarak TTS dilini otomatik seçer."""
    turkish_chars = set("çğıöşüÇĞİÖŞÜ")
    if any(c in turkish_chars for c in text):
        return "tr"
    tr_words = {"ve","ile","için","bir","bu","da","de","den","nin","nın","bu","şu"}
    if set(text.lower().split()) & tr_words:
        return "tr"
    return "en"


# ──────────────────────────────────────────────────────────────
# API KEY — Streamlit Secrets (kullanıcıya gösterilmez)
# ──────────────────────────────────────────────────────────────
try:
    api_key = st.secrets["GROQ_API_KEY"]
except (KeyError, FileNotFoundError):
    api_key = None

# ──────────────────────────────────────────────────────────────
# SIDEBAR
# ──────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style="font-family:'Share Tech Mono',monospace; color:#00ff8c;
                font-size:1.1rem; letter-spacing:3px; padding:8px 0 4px;
                border-bottom:1px solid rgba(0,255,140,0.2); margin-bottom:16px;">
    ⚡ TERMINAL CONFIG
    </div>
    """, unsafe_allow_html=True)

    if api_key:
        st.markdown('<p style="color:#00ff8c;font-size:0.7rem;font-family:\'Share Tech Mono\',monospace;margin-bottom:4px;">✓ GROQ BAĞLANTI AKTİF</p>', unsafe_allow_html=True)
    else:
        st.markdown('<p style="color:#ff6060;font-size:0.7rem;font-family:\'Share Tech Mono\',monospace;margin-bottom:4px;">✗ GROQ_API_KEY BULUNAMADI</p>', unsafe_allow_html=True)
        st.caption("Streamlit Cloud → Secrets → GROQ_API_KEY ekleyin.")

    st.markdown('<div style="border-top:1px solid rgba(0,180,255,0.15);margin:12px 0;"></div>', unsafe_allow_html=True)

    # Kategori seçimi
    st.markdown('<p style="color:#5a8a7a;font-size:0.75rem;letter-spacing:1px;font-family:\'Share Tech Mono\',monospace;">KATEGORİ SEÇİMİ</p>', unsafe_allow_html=True)
    selected = st.multiselect(
        "Kategoriler",
        options=list(CATEGORIES.keys()),
        default=["🇹🇷 Türkiye Gündemi", "📈 Borsa İstanbul", "⚽ Spor"],
        label_visibility="collapsed",
    )

    st.markdown('<div style="border-top:1px solid rgba(0,180,255,0.15);margin:14px 0;"></div>', unsafe_allow_html=True)

    # Özellik toggle'ları
    show_digest    = st.toggle("🤖 Günün Özetini Göster",  value=True)
    show_sentiment = st.toggle("🎯 Sentiment Analizi",       value=True)
    show_tts       = st.toggle("🔊 Sesli Dinleme (TTS)",     value=False)
    show_favorites = st.toggle("⭐ Favorilerim Paneli",      value=False)

    st.markdown('<div style="border-top:1px solid rgba(0,180,255,0.15);margin:14px 0;"></div>', unsafe_allow_html=True)

    if st.button("⟳  HABERLERİ YENİLE", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

    if st.session_state.favorites:
        if st.button("🗑️  FAVORİLERİ TEMİZLE", use_container_width=True):
            st.session_state.favorites = {}
            st.rerun()

    st.markdown('<div style="border-top:1px solid rgba(0,180,255,0.15);margin:14px 0;"></div>', unsafe_allow_html=True)
    st.markdown(
        f'<p style="color:#1a3a5a;font-size:0.65rem;font-family:\'Share Tech Mono\','
        f'monospace;line-height:1.9;">SON 24 SAAT FİLTRE AKTİF<br>'
        f'KAYNAK: RSS BESLEMELERİ<br>AI: LLAMA-3.3-70B<br>'
        f'SAAT: İSTANBUL (UTC+3)<br>'
        f'⭐ FAVORİ: {len(st.session_state.favorites)} HABER</p>',
        unsafe_allow_html=True,
    )

# ──────────────────────────────────────────────────────────────
# ANA BAŞLIK
# ──────────────────────────────────────────────────────────────
now_ist = datetime.now(ISTANBUL_TZ)
st.markdown(f"""
<div class="terminal-header">
    <h1>⚡ AI HABER TERMİNALİ</h1>
    <p>İSTANBUL: {now_ist.strftime('%d.%m.%Y %H:%M:%S')} (UTC+3)
       &nbsp;|&nbsp; SON 24 SAAT &nbsp;|&nbsp; {len(selected)} KATEGORİ SEÇİLİ</p>
</div>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────
# GİRİŞ DOĞRULAMA
# ──────────────────────────────────────────────────────────────
if not selected:
    st.markdown('<div class="empty-state">[ KATEGORİ SEÇİLMEDİ — SOL MENÜDEN EN AZ 1 KATEGORİ SEÇİN ]</div>', unsafe_allow_html=True)
    st.stop()

groq_client = None
if api_key:
    try:
        groq_client = Groq(api_key=api_key)
    except Exception as e:
        st.error(f"Groq bağlantısı kurulamadı: {e}", icon="🔴")
elif show_digest:
    st.warning("⚠️  AI özet özelliği devre dışı — GROQ_API_KEY secrets'a eklenmemiş.", icon="⚠️")

# ──────────────────────────────────────────────────────────────
# HABERLERİ ÇEKME
# ──────────────────────────────────────────────────────────────
with st.spinner("📡 RSS beslemeleri taranıyor..."):
    all_news = fetch_all_news(tuple(sorted(selected)))

total_news = sum(len(v) for v in all_news.values())

# Metrik satırı
c1, c2, c3, c4 = st.columns(4)
with c1: st.metric("📰 Toplam Haber", total_news)
with c2: st.metric("📂 Kategori",     len(selected))
with c3: st.metric("✅ Aktif Kaynak", sum(1 for v in all_news.values() if v))
with c4: st.metric("⭐ Favori",       len(st.session_state.favorites))

st.markdown('<div style="border-top:1px solid rgba(0,180,255,0.1);margin:16px 0 24px;"></div>', unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────
# FAVORİLER PANELİ
# ──────────────────────────────────────────────────────────────
if show_favorites:
    favs = st.session_state.favorites
    st.markdown('<div class="fav-panel"><div class="fav-panel-title">⭐ FAVORİLERİM</div>', unsafe_allow_html=True)

    if not favs:
        st.markdown('<p style="color:#4a4020;font-family:\'Share Tech Mono\',monospace;font-size:0.75rem;letter-spacing:2px;">[ HENÜZ FAVORİ EKLENMEDİ — HABERLERİN YANINDAKI ☆ FAVORİ BUTONUNU KULLANIN ]</p>', unsafe_allow_html=True)
    else:
        for link, fav_item in list(favs.items()):
            sym   = CATEGORY_SYMBOL.get(fav_item.get("category",""), "📌")
            s_key = fav_item.get("sentiment","nötr")
            s     = SENTIMENT_STYLES.get(s_key, SENTIMENT_STYLES["nötr"])
            pub_str = fav_item["published"].astimezone(ISTANBUL_TZ).strftime("%d.%m %H:%M")
            st.markdown(f"""
            <div class="fav-card">
                <div class="fav-cat-badge">{sym} {fav_item.get('category','')[:35]}
                &nbsp;|&nbsp; {fav_item.get('source','')[:25]}
                &nbsp;|&nbsp; {pub_str} İST</div>
                <div class="fav-card-title">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                    background:{s['dot']};margin-right:6px;vertical-align:middle;
                    box-shadow:0 0 5px {s['dot']};"></span>
                    {fav_item['title']}
                </div>
            </div>
            """, unsafe_allow_html=True)
            fc1, fc2, _ = st.columns([1, 1.1, 5])
            with fc1:
                st.link_button("↗ GİT", link)
            with fc2:
                if st.button("✕ Kaldır", key=f"unfav_{link[-35:]}"):
                    del st.session_state.favorites[link]
                    st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────
# KATEGORİ TABLARI
# ──────────────────────────────────────────────────────────────
if not any(all_news.values()):
    st.markdown('<div class="empty-state">[ SON 24 SAATTE HABER BULUNAMADI — BAĞLANTI KONTROLÜ YAPINIZ ]</div>', unsafe_allow_html=True)
    st.stop()

active_cats_list = [c for c in selected if all_news.get(c)]
tab_labels       = [f"{cat} ({len(all_news[cat])})" for cat in active_cats_list]

if not tab_labels:
    st.info("Seçili kategorilerde son 24 saatte haber bulunamadı.")
    st.stop()

tabs = st.tabs(tab_labels)

for tab, category in zip(tabs, active_cats_list):
    news_items = all_news[category]
    cat_symbol = CATEGORY_SYMBOL.get(category, "📰")

    with tab:
        # ── GÜNÜN ÖZETİ ──────────────────────────────────────
        if show_digest and groq_client and news_items:
            with st.spinner(f"🤖 {category} özeti hazırlanıyor..."):
                digest = groq_daily_digest(groq_client, [i["title"] for i in news_items], category)

            st.markdown(f'<div class="daily-digest"><h2>◈ GÜNÜN ÖZETİ — {cat_symbol} {category.split(" ",1)[-1].upper()}</h2>', unsafe_allow_html=True)
            for line in digest.split("\n"):
                if line.strip():
                    st.markdown(f'<p style="color:#a0c8b0;font-size:0.88rem;line-height:1.8;margin:6px 0;">{line}</p>', unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)

        elif show_digest and not groq_client:
            st.markdown('<div style="color:#3a6080;font-family:\'Share Tech Mono\',monospace;font-size:0.75rem;padding:10px;border:1px dashed rgba(0,180,255,0.2);margin-bottom:20px;">[ AI ÖZETİ İÇİN API KEY GEREKLİ ]</div>', unsafe_allow_html=True)

        # ── HABER LİSTESİ ─────────────────────────────────────
        for idx, item in enumerate(news_items):
            link       = item["link"]
            pub_ist    = item["published"].astimezone(ISTANBUL_TZ)
            time_str   = pub_ist.strftime("%d.%m %H:%M")
            source_str = (item["source"] or "?")[:32]

            # Sentiment (önbellekle)
            if item.get("sentiment") is None:
                item["sentiment"] = quick_sentiment(item["title"])
            s_key = item["sentiment"]
            s     = SENTIMENT_STYLES.get(s_key, SENTIMENT_STYLES["nötr"])

            # Favori durumu
            is_fav = link in st.session_state.favorites

            # Sentiment badge HTML
            if show_sentiment:
                badge_html = (
                    f'<span class="sentiment-badge" '
                    f'style="color:{s["color"]};background:{s["bg"]};border:1px solid {s["border"]};">'
                    f'{s["label"]}</span>'
                )
                dot_html = f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{s["dot"]};margin-right:6px;vertical-align:middle;box-shadow:0 0 5px {s["dot"]};"></span>'
            else:
                badge_html = ""
                dot_html   = ""

            # ── Kart ──
            st.markdown(f"""
            <div class="news-card">
                <div class="news-card-meta">
                    <span>{cat_symbol} {source_str}</span>
                    &nbsp;|&nbsp; {time_str} İST {badge_html}
                </div>
                <div class="news-card-title">{dot_html}{item['title']}</div>
                <div class="news-card-summary">{item['summary'] or 'Özet mevcut değil.'}</div>
            </div>
            """, unsafe_allow_html=True)

            # ── Buton satırı ──
            b1, b2, b3, b4, _ = st.columns([0.9, 1.1, 1.1, 1.3, 3.5])

            with b1:
                st.link_button("↗ GİT", link)

            with b2:
                # ☆ / ★ Favori toggle
                if st.button("★ Kaldır" if is_fav else "☆ Favori", key=f"fav_{category}_{idx}"):
                    if is_fav:
                        del st.session_state.favorites[link]
                    else:
                        st.session_state.favorites[link] = {**item, "category": category}
                    st.rerun()

            with b3:
                # 🤖 AI Analiz
                if groq_client:
                    if st.button("🤖 ANALİZ", key=f"ai_{category}_{idx}"):
                        with st.spinner("AI analiz yapıyor..."):
                            st.session_state.ai_analyses[link] = groq_single_analysis(
                                groq_client, item["title"], item["summary"]
                            )
                else:
                    st.markdown('<span style="color:#1a3a5a;font-size:0.65rem;font-family:\'Share Tech Mono\',monospace;">[KEY YOK]</span>', unsafe_allow_html=True)

            # AI Analiz sonucu
            if link in st.session_state.ai_analyses:
                st.markdown(f"""
                <div class="ai-summary-box">
                    <h3>◈ AI ANALİZİ</h3>
                    <p>{st.session_state.ai_analyses[link]}</p>
                </div>
                """, unsafe_allow_html=True)

            # ── 🔊 TTS ──
            if show_tts:
                with b4:
                    # Analiz varsa onu, yoksa başlık+özeti oku
                    tts_label = "🔊 ANALİZİ DİNLE" if link in st.session_state.ai_analyses else "🔊 DİNLE"
                    tts_cache_key = f"tts_{link}"
                    if st.button(tts_label, key=f"tts_{category}_{idx}"):
                        with st.spinner("🔊 Ses hazırlanıyor..."):
                            if link in st.session_state.ai_analyses:
                                tts_text = st.session_state.ai_analyses[link]
                                tts_lang = "tr"  # AI analizi hep Türkçe
                            else:
                                tts_text = item["title"]
                                if item["summary"]:
                                    tts_text += ". " + item["summary"]
                                tts_lang = detect_lang(item["title"])
                            audio_b64 = text_to_speech_base64(tts_text, lang=tts_lang)
                            if audio_b64:
                                st.session_state.tts_audio[tts_cache_key] = audio_b64

                if tts_cache_key in st.session_state.tts_audio:
                    st.markdown(
                        f'<audio controls autoplay src="data:audio/mp3;base64,'
                        f'{st.session_state.tts_audio[tts_cache_key]}"></audio>',
                        unsafe_allow_html=True,
                    )

            st.markdown('<div style="border-bottom:1px solid rgba(0,100,160,0.1);margin:8px 0 12px;"></div>', unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────
# ALT BİLGİ
# ──────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="text-align:center;margin-top:40px;padding:20px 0;
            border-top:1px solid rgba(0,180,255,0.1);
            font-family:'Share Tech Mono',monospace;font-size:0.65rem;
            color:#1a3a5a;letter-spacing:2px;">
    AI HABER TERMİNALİ &nbsp;|&nbsp; GROQ LLAMA-3.3-70B &nbsp;|&nbsp;
    {datetime.now(ISTANBUL_TZ).strftime('%Y')} &nbsp;|&nbsp;
    ÖNBELLEK: 30 DK &nbsp;|&nbsp; {total_news} HABER &nbsp;|&nbsp;
    ⭐ {len(st.session_state.favorites)} FAVORİ
</div>
""", unsafe_allow_html=True)
