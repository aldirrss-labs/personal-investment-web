"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const GROUPS = [
  {
    key: "stocks",
    items: [
      { href: "/", key: "dashboard", activePaths: ["/"] },
      { href: "/portfolio", key: "portfolio", activePaths: ["/portfolio"] },
    ],
  },
  {
    key: "decisions",
    items: [
      {
        href: "/recommendation",
        key: "decisions",
        // Halaman ini menaungi 3 route yang saling terhubung lewat DecisionTabs
        // di dalam halamannya sendiri — sidebar cukup 1 pintu masuk, tidak perlu
        // daftar terpisah yang menduplikasi tab strip tersebut.
        activePaths: ["/recommendation", "/review", "/compare"],
      },
    ],
  },
  {
    key: "config",
    items: [{ href: "/settings", key: "settings", activePaths: ["/settings"] }],
  },
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
                      it.activePaths.includes(path)
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
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
