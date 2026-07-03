"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { locales, type Locale } from "@/i18n/config";
import { setUserLocale } from "@/i18n/locale-actions";

export default function LocaleSwitcher() {
  const t = useTranslations("language");
  const current = useLocale();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-gray-500">{t("label")}:</span>
      <select
        className="border rounded px-2 py-1"
        defaultValue={current}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() => setUserLocale(e.target.value as Locale))
        }
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {t(l)}
          </option>
        ))}
      </select>
    </label>
  );
}
