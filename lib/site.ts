export const SITE_NAME = "haberAI";
export const SITE_TAGLINE = "AI Destekli Akıllı Haber Platformu";

export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return process.env.NODE_ENV === "production" ? "https://haberai.bnovative.com.tr" : "http://localhost:3000";
}
