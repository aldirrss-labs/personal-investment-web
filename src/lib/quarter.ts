export function currentQuarter(d: { year: number; month: number }): string {
  const q = Math.floor((d.month - 1) / 3) + 1;
  return `${d.year}Q${q}`;
}
