export function createKeyPool(keys: string[]): { size: number; next(): string } {
  const clean = keys.map((k) => k.trim()).filter(Boolean);
  if (clean.length === 0) throw new Error("empty key pool");
  let i = 0;
  return {
    size: clean.length,
    next() {
      const k = clean[i % clean.length];
      i++;
      return k;
    },
  };
}

/** Parse daftar key dari env comma-separated, dengan fallback ke key tunggal. */
export function keysFromEnv(pluralVar: string, singularVar?: string): string[] {
  const plural = (process.env[pluralVar] ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (plural.length > 0) return plural;
  const single = (singularVar ? process.env[singularVar] : "")?.trim();
  return single ? [single] : [];
}
