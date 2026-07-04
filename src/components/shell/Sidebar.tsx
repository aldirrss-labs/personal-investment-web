"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const GROUPS = [
  {
    key: "stocks",
    collapsible: false,
    items: [
      { href: "/", key: "dashboard" },
      { href: "/portfolio", key: "portfolio" },
    ],
  },
  {
    key: "decisions",
    collapsible: true,
    items: [
      { href: "/recommendation", key: "recommendation" },
      { href: "/review", key: "review" },
      { href: "/compare", key: "compare" },
    ],
  },
  { key: "config", collapsible: false, items: [{ href: "/settings", key: "settings" }] },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const path = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ decisions: true });

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4 hidden md:block">
      <div className="font-bold mb-4">Investment SPK</div>
      <nav className="space-y-4">
        {GROUPS.map((g) => {
          const isOpen = !g.collapsible || openGroups[g.key];
          return (
            <div key={g.key}>
              <button
                type="button"
                className="w-full text-left text-xs uppercase text-muted-foreground mb-1 flex items-center justify-between"
                onClick={() => g.collapsible && setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))}
              >
                <span>{t(g.key)}</span>
                {g.collapsible && <span>{isOpen ? "▾" : "▸"}</span>}
              </button>
              {isOpen && (
                <ul className="space-y-1">
                  {g.items.map((it) => (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={`block rounded px-2 py-1 text-sm ${
                          path === it.href
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        {t(it.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
