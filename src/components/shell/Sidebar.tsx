"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const GROUPS = [
  {
    key: "stocks",
    items: [
      { href: "/", key: "dashboard" },
      { href: "/recommendation", key: "recommendation" },
      { href: "/review", key: "review" },
      { href: "/compare", key: "compare" },
    ],
  },
  { key: "config", items: [{ href: "/settings", key: "settings" }] },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const path = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4 hidden md:block">
      <div className="font-bold mb-4">Investment SPK</div>
      <nav className="space-y-4">
        {GROUPS.map((g) => (
          <div key={g.key}>
            <div className="text-xs uppercase text-muted-foreground mb-1">{t(g.key)}</div>
            <ul className="space-y-1">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={`block rounded px-2 py-1 text-sm ${
                      path === it.href ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    }`}
                  >
                    {t(it.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
