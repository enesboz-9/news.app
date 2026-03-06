"""
╔══════════════════════════════════════════════════════════════╗
║           AI HABER TERMİNALİ - app.py                       ║
║   Python + Streamlit + Groq API (Llama 3.1) ile            ║
║   Kişiselleştirilmiş Haber Analiz Uygulaması               ║
╚══════════════════════════════════════════════════════════════╝
"""

import streamlit as st
import feedparser
import time
import re
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from groq import Groq

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
# ÖZELLEŞTİRİLMİŞ CSS — Terminal / Cyberpunk Karanlık Tema
# ──────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700;900&display=swap');

/* Ana arka plan */
.stApp {
    background-color: #060a0f;
    background-image:
        radial-gradient(ellipse at 20% 50%, rgba(0,255,140,0.04) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(0,180,255,0.04) 0%, transparent 60%);
    font-family: 'Exo 2', sans-serif;
}

/* Sidebar */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0a1628 0%, #060a0f 100%);
    border-right: 1px solid rgba(0,255,140,0.2);
}
[data-testid="stSidebar"] * { font-family: 'Exo 2', sans-serif; }

/* Başlık bloğu */
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
.terminal-header h1 {
    color: #00ff8c;
    font-size: 1.8rem;
    margin: 0;
    letter-spacing: 3px;
    text-shadow: 0 0 20px rgba(0,255,140,0.5);
}
.terminal-header p {
    color: #5a8a7a;
    font-size: 0.75rem;
    margin: 4px 0 0;
    letter-spacing: 2px;
}

/* Haber kartı */
.news-card {
    background: linear-gradient(135deg, #0d1f3c 0%, #0a1628 100%);
    border: 1px solid rgba(0,180,255,0.15);
    border-left: 3px solid #00b4ff;
    border-radius: 4px;
    padding: 16px 20px;
    margin-bottom: 14px;
    transition: all 0.2s ease;
    position: relative;
}
.news-card:hover {
    border-left-color: #00ff8c;
    background: linear-gradient(135deg, #0f2444 0%, #0d1a30 100%);
    transform: translateX(3px);
}
.news-card-title {
    font-family: 'Exo 2', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    color: #e8f4f8;
    margin-bottom: 6px;
    line-height: 1.4;
}
.news-card-meta {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.7rem;
    color: #3a6080;
    margin-bottom: 8px;
    letter-spacing: 1px;
}
.news-card-meta span { color: #00b4ff; }
.news-card-summary {
    font-size: 0.82rem;
    color: #7a9ab0;
    line-height: 1.6;
    margin-bottom: 10px;
}

/* AI özet kutusu */
.ai-summary-box {
    background: rgba(0,255,140,0.04);
    border: 1px solid rgba(0,255,140,0.2);
    border-radius: 4px;
    padding: 14px 18px;
    margin: 16px 0;
}
.ai-summary-box h3 {
    font-family: 'Share Tech Mono', monospace;
    color: #00ff8c;
    font-size: 0.85rem;
    letter-spacing: 2px;
    margin-bottom: 10px;
}
.ai-summary-box p, .ai-summary-box li {
    color: #a0c8b0;
    font-size: 0.85rem;
    line-height: 1.7;
}

/* Günün özeti büyük kutu */
.daily-digest {
    background: linear-gradient(135deg, rgba(0,255,140,0.06) 0%, rgba(0,180,255,0.04) 100%);
    border: 1px solid rgba(0,255,140,0.25);
    border-top: 3px solid #00ff8c;
    border-radius: 6px;
    padding: 24px 28px;
    margin-bottom: 28px;
}
.daily-digest h2 {
    font-family: 'Share Tech Mono', monospace;
    color: #00ff8c;
    font-size: 1rem;
    letter-spacing: 3px;
    margin-bottom: 16px;
    text-shadow: 0 0 10px rgba(0,255,140,0.4);
}

/* Sayaç badge */
.badge {
    display: inline-block;
    background: rgba(0,180,255,0.15);
    border: 1px solid rgba(0,180,255,0.4);
    color: #00b4ff;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.65rem;
    padding: 2px 8px;
    border-radius: 2px;
    letter-spacing: 1px;
    margin-left: 8px;
}

/* Boş durum */
.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #3a6080;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.85rem;
    letter-spacing: 2px;
}

/* Tab stilleri */
.stTabs [data-baseweb="tab-list"] {
    gap: 2px;
    background: transparent;
    border-bottom: 1px solid rgba(0,180,255,0.2);
}
.stTabs [data-baseweb="tab"] {
    background: rgba(0,20,40,0.5);
    border: 1px solid rgba(0,180,255,0.1);
    border-bottom: none;
    color: #3a6080;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.75rem;
    letter-spacing: 1px;
    padding: 8px 16px;
    border-radius: 3px 3px 0 0;
}
.stTabs [aria-selected="true"] {
    background: rgba(0,255,140,0.08) !important;
    border-color: rgba(0,255,140,0.3) !important;
    color: #00ff8c !important;
}

/* Streamlit elemanları */
div[data-testid="stMetricValue"] { color: #00ff8c; font-family: 'Share Tech Mono', monospace; }
.stButton button {
    background: transparent;
    border: 1px solid rgba(0,255,140,0.3);
    color: #00ff8c;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 1px;
    padding: 4px 14px;
    border-radius: 2px;
    transition: all 0.2s;
}
.stButton button:hover {
    background: rgba(0,255,140,0.1);
    border-color: #00ff8c;
    box-shadow: 0 0 12px rgba(0,255,140,0.2);
}
.stTextInput input {
    background: #0a1628 !important;
    border: 1px solid rgba(0,180,255,0.3) !important;
    color: #e8f4f8 !important;
    font-family: 'Share Tech Mono', monospace !important;
    font-size: 0.8rem !important;
}
.stMultiSelect > div { background: #0a1628 !important; border-color: rgba(0,180,255,0.3) !important; }

/* Alert kutuları */
.stAlert { border-radius: 3px; font-family: 'Exo 2', sans-serif; }

/* Spinner */
.stSpinner > div { border-top-color: #00ff8c !important; }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: #060a0f; }
::-webkit-scrollbar-thumb { background: rgba(0,255,140,0.3); border-radius: 2px; }
</style>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────
# KATEGORİLER VE RSS BESLEMELERİ TANIMI
# ──────────────────────────────────────────────────────────────
CATEGORIES = {
    "📈 Borsa İstanbul": [
        "https://feeds.bbci.co.uk/turkce/ekonomi/rss.xml",
        "https://www.haberturk.com/rss/ekonomi.xml",
    ],
    "🌍 Global Ekonomi": [
        "https://feeds.bbci.co.uk/news/business/rss.xml",
        "https://www.reuters.com/rssFeed/businessNews",
    ],
    "🛡️ Savunma Sanayii": [
        "https://www.defenseone.com/rss/all/",
        "https://breakingdefense.com/feed/",
    ],
    "💻 Yazılım Dünyası": [
        "https://techcrunch.com/feed/",
        "https://www.theverge.com/rss/index.xml",
    ],
    "⚡ Elektrik-Elektronik": [
        "https://spectrum.ieee.org/rss/fulltext",
        "https://www.eetimes.com/rss/",
    ],
    "🤖 Yapay Zeka": [
        "https://techcrunch.com/category/artificial-intelligence/feed/",
        "https://venturebeat.com/category/ai/feed/",
    ],
    "🚀 Uzay Bilimleri": [
        "https://www.space.com/feeds/all",
        "https://spacenews.com/feed/",
    ],
    "⚽ Spor": [
        "https://feeds.bbci.co.uk/sport/rss.xml",
        "https://www.goal.com/feeds/tr/news",
    ],
    "🏥 Sağlık": [
        "https://feeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC",
        "https://www.medicalnewstoday.com/rss",
    ],
    "🇹🇷 Türkiye Gündemi": [
        "https://www.trthaber.com/sondakika.rss",
        "https://www.sabah.com.tr/rss/anasayfa.xml",
    ],
}

# ──────────────────────────────────────────────────────────────
# YARDIMCI FONKSİYONLAR
# ──────────────────────────────────────────────────────────────

def parse_entry_time(entry) -> datetime | None:
    """RSS girdisindeki zaman damgasını datetime nesnesine dönüştürür."""
    for attr in ("published_parsed", "updated_parsed", "created_parsed"):
        t = getattr(entry, attr, None)
        if t:
            try:
                return datetime(*t[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    return None


def clean_html(text: str) -> str:
    """HTML etiketlerini ve fazla boşlukları temizler."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:300]


def fetch_feed(url: str, cutoff: datetime) -> list[dict]:
    """
    Verilen RSS URL'sini çeker ve son 24 saat içindeki haberleri döndürür.
    Ağ veya ayrıştırma hatalarında boş liste döner.
    """
    try:
        feed = feedparser.parse(url)
        items = []
        for entry in feed.entries[:20]:          # Maksimum 20 girdi kontrol et
            pub = parse_entry_time(entry)
            if pub and pub >= cutoff:
                summary_raw = getattr(entry, "summary", "") or getattr(entry, "description", "")
                items.append({
                    "title":   clean_html(getattr(entry, "title", "Başlık Yok")),
                    "link":    getattr(entry, "link", "#"),
                    "summary": clean_html(summary_raw),
                    "source":  feed.feed.get("title", url),
                    "published": pub,
                })
        return items
    except Exception:
        return []


@st.cache_data(ttl=1800, show_spinner=False)   # 30 dakika önbellek
def fetch_all_news(selected_categories: tuple) -> dict[str, list[dict]]:
    """
    Seçili kategorilerin tüm RSS beslemelerini ThreadPoolExecutor ile
    paralel olarak çeker. Sonuçları kategorilere göre döndürür.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    result: dict[str, list[dict]] = {}
    urls_map: dict[str, str] = {}          # url → kategori adı

    for cat in selected_categories:
        result[cat] = []
        for url in CATEGORIES.get(cat, []):
            urls_map[url] = cat

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_feed, url, cutoff): (url, cat)
                   for url, cat in urls_map.items()}
        for future in as_completed(futures):
            _, cat = futures[future]
            try:
                items = future.result()
                result[cat].extend(items)
            except Exception:
                pass

    # Her kategoriyi en yeni haber önce olacak şekilde sırala
    for cat in result:
        result[cat].sort(key=lambda x: x["published"], reverse=True)

    return result


def groq_daily_digest(client: Groq, headlines: list[str], category: str) -> str:
    """
    Verilen haber başlıklarını Groq API'ye (Llama 3.1) göndererek
    3-4 maddelik Türkçe bir 'Günün Özeti' raporu oluşturur.
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
            model="llama-3.1-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=400,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"⚠️ Groq API hatası: {str(e)}"


def groq_single_analysis(client: Groq, title: str, summary: str) -> str:
    """Tek bir haber için kısa AI analizi üretir."""
    prompt = f"""Bu haberi 2-3 cümleyle Türkçe olarak analiz et. 
Ne anlama geliyor, neden önemli ve olası sonuçları ne olabilir?

Başlık: {title}
Özet: {summary}

Sadece analizi yaz, başlık veya giriş cümlesi ekleme."""
    try:
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"⚠️ Analiz yapılamadı: {str(e)}"


# ──────────────────────────────────────────────────────────────
# GROQ API KEY — Streamlit Secrets'dan okunur (kullanıcıya gösterilmez)
# Streamlit Cloud > App Settings > Secrets bölümüne:
#   GROQ_API_KEY = "gsk_..."  ekleyin.
# ──────────────────────────────────────────────────────────────
try:
    api_key = st.secrets["GROQ_API_KEY"]
except (KeyError, FileNotFoundError):
    api_key = None

# ──────────────────────────────────────────────────────────────
# SIDEBAR — Ayarlar ve Seçimler
# ──────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style="font-family:'Share Tech Mono',monospace; color:#00ff8c;
                font-size:1.1rem; letter-spacing:3px; padding:8px 0 4px;
                border-bottom:1px solid rgba(0,255,140,0.2); margin-bottom:16px;">
    ⚡ TERMINAL CONFIG
    </div>
    """, unsafe_allow_html=True)

    # API bağlantı durumu — key gösterilmez, sadece aktif/pasif bilgisi
    if api_key:
        st.markdown(
            '<p style="color:#00ff8c;font-size:0.7rem;font-family:\'Share Tech Mono\','
            'monospace;margin-bottom:4px;">✓ GROQ BAĞLANTI AKTİF</p>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            '<p style="color:#ff6060;font-size:0.7rem;font-family:\'Share Tech Mono\','
            'monospace;margin-bottom:4px;">✗ GROQ_API_KEY BULUNAMADI</p>',
            unsafe_allow_html=True,
        )
        st.caption("Streamlit Cloud → App Settings → Secrets bölümüne GROQ_API_KEY ekleyin.")

    st.markdown(
        '<div style="border-top:1px solid rgba(0,180,255,0.15);margin:12px 0;"></div>',
        unsafe_allow_html=True,
    )

    # Kategori seçimi
    st.markdown('<p style="color:#5a8a7a;font-size:0.75rem;letter-spacing:1px;font-family:\'Share Tech Mono\',monospace;">KATEGORİ SEÇİMİ</p>', unsafe_allow_html=True)
    default_cats = ["🤖 Yapay Zeka", "💻 Yazılım Dünyası", "🌍 Global Ekonomi"]
    selected = st.multiselect(
        "Kategoriler",
        options=list(CATEGORIES.keys()),
        default=default_cats,
        label_visibility="collapsed",
    )

    st.markdown('<div style="border-top:1px solid rgba(0,180,255,0.15);margin:16px 0;"></div>', unsafe_allow_html=True)

    # Yenile butonu
    if st.button("⟳  HABERLERİ YENİLE", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

    # Günün özeti butonu
    show_digest = st.toggle("🤖 Günün Özetini Göster", value=True)

    st.markdown('<div style="border-top:1px solid rgba(0,180,255,0.15);margin:16px 0;"></div>', unsafe_allow_html=True)
    st.markdown('<p style="color:#1a3a5a;font-size:0.65rem;font-family:\'Share Tech Mono\',monospace;line-height:1.8;">SON 24 SAAT FİLTRE AKTİF<br>KAYNAK: RSS BESLEMELERİ<br>AI: LLAMA-3.1-70B</p>', unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────
# ANA BAŞLIK
# ──────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="terminal-header">
    <h1>⚡ AI HABER TERMİNALİ</h1>
    <p>SISTEM ZAMANI: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')} &nbsp;|&nbsp;
       SON 24 SAAT &nbsp;|&nbsp; {len(selected)} KATEGORİ SEÇİLİ</p>
</div>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────
# GİRİŞ DOĞRULAMA
# ──────────────────────────────────────────────────────────────
if not selected:
    st.markdown('<div class="empty-state">[ KATEGORİ SEÇİLMEDİ — SOL MENÜDEN EN AZ 1 KATEGORİ SEÇİN ]</div>', unsafe_allow_html=True)
    st.stop()

# Groq istemcisi — Streamlit Secrets'daki GROQ_API_KEY ile başlatılır
groq_client = None
if api_key:
    try:
        groq_client = Groq(api_key=api_key)
    except Exception as e:
        st.error(f"Groq bağlantısı kurulamadı: {e}", icon="🔴")
elif show_digest:
    st.warning("⚠️  AI özet özelliği devre dışı — GROQ_API_KEY secrets'a eklenmemiş. Haberler normal görüntüleniyor.", icon="⚠️")

# ──────────────────────────────────────────────────────────────
# HABERLERİ ÇEKME
# ──────────────────────────────────────────────────────────────
with st.spinner("📡 RSS beslemeleri taranıyor..."):
    all_news = fetch_all_news(tuple(sorted(selected)))

# Toplam haber sayısı
total_news = sum(len(v) for v in all_news.values())

# Metrik satırı
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("📰 Toplam Haber", total_news)
with col2:
    st.metric("📂 Kategori", len(selected))
with col3:
    active_cats = sum(1 for v in all_news.values() if v)
    st.metric("✅ Aktif Kaynak", active_cats)
with col4:
    st.metric("⏱ Zaman Penceresi", "Son 24 Saat")

st.markdown('<div style="border-top:1px solid rgba(0,180,255,0.1);margin:16px 0 24px;"></div>', unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────
# KATEGORİ TABLARI
# ──────────────────────────────────────────────────────────────
if not any(all_news.values()):
    st.markdown('<div class="empty-state">[ SON 24 SAATTE HABER BULUNAMADI — BAĞLANTI KONTROLÜ YAPINIZ ]</div>', unsafe_allow_html=True)
    st.stop()

# Sadece haberi olan kategorileri sekme olarak göster
active_cats_list = [c for c in selected if all_news.get(c)]
tab_labels = [f"{cat} ({len(all_news[cat])})" for cat in active_cats_list]

if not tab_labels:
    st.info("Seçili kategorilerde son 24 saatte haber bulunamadı.")
    st.stop()

tabs = st.tabs(tab_labels)

for tab, category in zip(tabs, active_cats_list):
    news_items = all_news[category]

    with tab:
        # ── GÜNÜN ÖZETİ ──────────────────────────────────────
        if show_digest and groq_client and news_items:
            with st.spinner(f"🤖 {category} için AI analizi yapılıyor..."):
                headlines = [item["title"] for item in news_items]
                digest = groq_daily_digest(groq_client, headlines, category)

            st.markdown(f"""
            <div class="daily-digest">
                <h2>◈ GÜNÜN ÖZETİ &nbsp;—&nbsp; {category.split(' ', 1)[-1].upper()}</h2>
            """, unsafe_allow_html=True)

            # Markdown madde işaretlerini koru
            for line in digest.split("\n"):
                if line.strip():
                    st.markdown(f'<p style="color:#a0c8b0;font-size:0.88rem;line-height:1.8;margin:6px 0;">{"" if line.startswith("•") else ""}{line}</p>', unsafe_allow_html=True)

            st.markdown("</div>", unsafe_allow_html=True)

        elif show_digest and not groq_client:
            st.markdown('<div style="color:#3a6080;font-family:\'Share Tech Mono\',monospace;font-size:0.75rem;padding:10px;border:1px dashed rgba(0,180,255,0.2);margin-bottom:20px;">[ AI ÖZETİ İÇİN API KEY GEREKLİ ]</div>', unsafe_allow_html=True)

        # ── HABER LİSTESİ ─────────────────────────────────────
        for idx, item in enumerate(news_items):
            time_str = item["published"].strftime("%d.%m %H:%M")
            source_str = item["source"][:30] if item["source"] else "?"

            st.markdown(f"""
            <div class="news-card">
                <div class="news-card-meta">
                    <span>▸ {source_str}</span> &nbsp;|&nbsp; {time_str} UTC
                </div>
                <div class="news-card-title">{item['title']}</div>
                <div class="news-card-summary">{item['summary'] or 'Özet mevcut değil.'}</div>
            </div>
            """, unsafe_allow_html=True)

            # Haber bağlantısı ve AI Analizi yan yana butonlar
            btn_col1, btn_col2, _ = st.columns([1, 1.5, 4])
            with btn_col1:
                st.link_button("↗ HABERE GİT", item["link"])
            with btn_col2:
                btn_key = f"ai_{category}_{idx}"
                if groq_client:
                    if st.button("🤖 AI ANALİZ", key=btn_key):
                        with st.spinner("Analiz yapılıyor..."):
                            analysis = groq_single_analysis(
                                groq_client, item["title"], item["summary"]
                            )
                        st.markdown(f"""
                        <div class="ai-summary-box">
                            <h3>◈ AI ANALİZİ</h3>
                            <p>{analysis}</p>
                        </div>
                        """, unsafe_allow_html=True)
                else:
                    st.markdown('<span style="color:#1a3a5a;font-size:0.7rem;font-family:\'Share Tech Mono\',monospace;">[ API KEY YOK ]</span>', unsafe_allow_html=True)

        # Kategori boşluk
        st.markdown("<br>", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────
# ALT BİLGİ
# ──────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="text-align:center; margin-top:40px; padding:20px 0;
            border-top:1px solid rgba(0,180,255,0.1);
            font-family:'Share Tech Mono',monospace; font-size:0.65rem;
            color:#1a3a5a; letter-spacing:2px;">
    AI HABER TERMİNALİ &nbsp;|&nbsp; GROQ LLAMA-3.1-70B &nbsp;|&nbsp;
    {datetime.now().strftime('%Y')} &nbsp;|&nbsp;
    ÖNBELLEK: 30 DK &nbsp;|&nbsp; {total_news} HABER İŞLENDİ
</div>
""", unsafe_allow_html=True)
