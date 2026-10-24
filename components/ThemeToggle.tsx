"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const KEY = "haberai-theme";
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "Sistem", light: "Açık", dark: "Koyu" };

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const t = localStorage.getItem(KEY);
      if (t === "light" || t === "dark") setTheme(t);
    } catch { /* depolama kapalıysa sistem teması kalır */ }
  }, []);

  function change() {
    const next = NEXT[theme];
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.dataset.theme = next;
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch { /* yok say */ }
  }

  return (
    <button className="theme-btn" onClick={change} aria-label={`Tema: ${LABEL[theme]}. Değiştirmek için tıklayın`}>
      Tema: {LABEL[theme]}
    </button>
  );
}
