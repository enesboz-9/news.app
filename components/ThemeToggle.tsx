"use client";

const KEY = "haberai-theme";

// Sol altta sabit, yuvarlak açık/koyu mod düğmesi. Simge CSS ile etkin temaya göre seçilir (güneş: koyudayken, ay: açıktayken).
export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* depolama kapalıysa yalnızca bu oturumda geçerli olur */ }
  }

  return (
    <button type="button" className="theme-fab" onClick={toggle} aria-label="Açık / koyu modu değiştir" title="Açık / koyu mod">
      <svg className="i-sun" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
      </svg>
      <svg className="i-moon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z" />
      </svg>
    </button>
  );
}
