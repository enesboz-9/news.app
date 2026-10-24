"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";

export default function CatNav() {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  const [edge, setEdge] = useState({ left: false, right: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  // Etkin kategori görünür alana kaydırılır; kenar solmaları kaydırma durumuna göre değişir.
  useEffect(() => {
    const el = ref.current;
    el?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [path, update]);

  return (
    <nav
      ref={ref}
      aria-label="Kategoriler"
      className={`cat-nav wrap${edge.left ? " fade-l" : ""}${edge.right ? " fade-r" : ""}`}
      onScroll={update}
    >
      {CATEGORIES.map((c) => {
        const href = `/kategori/${c.slug}`;
        return (
          <Link key={c.slug} href={href} aria-current={path === href ? "page" : undefined}>
            {c.emoji} {c.name}
          </Link>
        );
      })}
    </nav>
  );
}
