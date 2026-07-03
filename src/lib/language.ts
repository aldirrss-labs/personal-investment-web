export type AiLanguageSetting = "follow_ui" | "en" | "id";
export type ResolvedLanguage = "en" | "id";

/**
 * Tentukan bahasa reasoning AI. "follow_ui" memakai locale UI aktif;
 * selain itu override eksplisit menang.
 */
export function resolveAiLanguage(
  setting: AiLanguageSetting,
  uiLocale: ResolvedLanguage,
): ResolvedLanguage {
  return setting === "follow_ui" ? uiLocale : setting;
}

/** Instruksi bahasa yang disisipkan ke prompt AI (dipakai di Fase 2). */
export function aiLanguageInstruction(lang: ResolvedLanguage): string {
  return lang === "id"
    ? "Respond in Indonesian (Bahasa Indonesia)."
    : "Respond in English.";
}
