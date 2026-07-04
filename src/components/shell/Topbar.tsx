"use client";
import { Menu } from "lucide-react";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useMobileNav } from "./MobileNavContext";

export function Topbar() {
  const { open } = useMobileNav();
  return (
    <header className="flex items-center justify-between md:justify-end gap-3 border-b border-border px-4 md:px-6 py-3">
      <Button variant="ghost" size="sm" className="md:hidden" onClick={open} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
