"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { useMobileNav } from "./MobileNavContext";

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

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const path = usePathname();
  return (
    <nav className="space-y-4">
      {GROUPS.map((g) => (
        <div key={g.key}>
          <div className="text-xs uppercase text-muted-foreground mb-1">{t(g.key)}</div>
          <ul className="space-y-1">
            {g.items.map((it) => {
              const active = it.activePaths.includes(path);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-2 rounded px-2 py-1 text-sm border-l-2 transition-colors ${
                      active
                        ? "border-primary bg-accent text-accent-foreground font-medium"
                        : "border-transparent hover:bg-accent/50"
                    }`}
                  >
                    {t(it.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4 hidden md:block">
      <div className="font-bold mb-4">Investment SPK</div>
      <SidebarNav />
    </aside>
  );
}

export function MobileSidebarDrawer() {
  const { isOpen, close } = useMobileNav();
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            key="drawer"
            className="fixed inset-y-0 left-0 z-50 w-64 bg-card p-4 shadow-xl md:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="font-bold mb-4">Investment SPK</div>
            <SidebarNav onNavigate={close} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
