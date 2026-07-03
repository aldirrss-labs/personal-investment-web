export const locales = ["id", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "id";
export const LOCALE_COOKIE = "locale";

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "id" || v === "en";
}
