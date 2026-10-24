"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

export default function CatNav() {
  const path = usePathname();
  return (
    <nav aria-label="Kategoriler" className="cat-nav wrap">
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
