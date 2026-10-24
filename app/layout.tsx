import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} – ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description:
    "haberAI, güncel haberleri kategorilere ayıran ve yapay zekâ ile özetleyen akıllı haber platformudur. Türkiye ve dünyadan son 24 saatin haberleri, günlük özet ve AI analizi.",
  applicationName: SITE_NAME,
  authors: [{ name: "Enes Boz", url: "https://bnovative.com.tr/cv.html" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} – ${SITE_TAGLINE}`,
    description: "Türkiye ve dünyadan son 24 saatin haberleri, kategori bazlı günlük yapay zekâ özetiyle.",
  },
  twitter: { card: "summary" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#060a0f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Header />
        <main className="wrap">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
