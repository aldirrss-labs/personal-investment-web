"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const TABS = [
  { href: "/recommendation", key: "recommendation" },
  { href: "/review", key: "review" },
  { href: "/compare", key: "compare" },
];

export default function DecisionTabs() {
  const t = useTranslations("nav");
  const path = usePathname();
  return (
    <div className="flex gap-2 border-b border-border pb-2 mb-4">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-3 py-1.5 rounded-t text-sm ${
            path === tab.href
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50"
          }`}
        >
          {t(tab.key)}
        </Link>
      ))}
    </div>
  );
}
