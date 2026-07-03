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
