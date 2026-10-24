import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>
          {SITE_NAME} haberleri RSS beslemelerinden derler; her haberin telifi ilgili yayıncıya aittir ve haberler
          kaynağa bağlantı verir. Özetler yapay zekâ ile üretilir ve hata içerebilir.
        </p>
        <p>
          Geliştirici: <a href="https://bnovative.com.tr/cv.html">Enes Boz</a> ·{" "}
          <a href="https://bnovative.com.tr/">B-Novative</a> · <Link href="/hakkinda">Hakkında</Link>
        </p>
      </div>
    </footer>
  );
}
