import type { Metadata } from "next";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hakkında",
  description: "haberAI nedir, haberleri nereden alır, yapay zekâ özetleri nasıl üretilir.",
  alternates: { canonical: "/hakkinda" },
};

export default function About() {
  return (
    <article className="prose">
      <h1>{SITE_NAME} hakkında</h1>
      <p>
        {SITE_NAME}, {SITE_TAGLINE.toLowerCase()}dur. Türkiye ve dünyadan yayıncıların herkese açık RSS beslemelerini
        tarar, son 24 saatin haberlerini kategorilere ayırır ve her kategori için yapay zekâ ile kısa bir günlük özet
        üretir.
      </p>
      <h2>Haberler nereden geliyor?</h2>
      <p>
        Haberler yayıncıların RSS beslemelerinden alınır. Sitede yalnızca başlık, kısa özet ve kaynağa bağlantı
        gösterilir; haberin tamamı için ilgili yayıncının sitesine yönlendirilirsiniz. Haberlerin telifi
        yayıncılara aittir.
      </p>
      <h2>Yapay zekâ özetleri</h2>
      <p>
        Günlük özetler ve isteğe bağlı analizler Groq üzerinde çalışan açık kaynaklı bir dil modeli ile üretilir. Yapay zekâ hata
        yapabilir; önemli konularda haberin kaynağını kontrol edin. Sağlık ve finans içerikleri tavsiye niteliği taşımaz.
      </p>
      <h2>Gizlilik</h2>
      <p>Hesap oluşturmanız gerekmez. Favorileriniz yalnızca kendi tarayıcınızda saklanır.</p>
      <h2>Geliştirici</h2>
      <p>
        Proje, <a href="https://bnovative.com.tr/">B-Novative</a> kurucusu{" "}
        <a href="https://bnovative.com.tr/cv.html">Enes Boz</a> tarafından geliştirilmiştir. İletişim:{" "}
        <a href="mailto:bnovative.destek@gmail.com">bnovative.destek@gmail.com</a>
      </p>
    </article>
  );
}
