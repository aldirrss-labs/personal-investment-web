import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Topbar() {
  return (
    <header className="flex items-center justify-end gap-3 border-b border-border px-6 py-3">
      <LocaleSwitcher />
      <ThemeToggle />
    </header>
  );
}
