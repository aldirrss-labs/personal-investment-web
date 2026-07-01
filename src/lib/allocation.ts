export type Caps = { perStock: number; perSector: Record<string, number> };
export type AllocInput = {
  scores: Record<string, number>;
  sectors: Record<string, string>;
  caps: Caps;
  aggressiveness: number;
};
export type AllocResult = {
  allocation: Record<string, number>;
  activeCaps: string[];
};

const EPS = 1e-9;

function renormalize(w: Record<string, number>): Record<string, number> {
  const total = Object.values(w).reduce((s, v) => s + v, 0);
  const out: Record<string, number> = {};
  for (const k of Object.keys(w)) out[k] = total === 0 ? 0 : (w[k] / total) * 100;
  return out;
}

/**
 * Bagikan `freed` ke daftar `targets`. Proporsional terhadap bobot mereka;
 * jika total bobot target 0 (mis. semua sudah di-floor ke 0), bagi rata.
 */
function redistribute(
  w: Record<string, number>,
  targets: string[],
  freed: number,
): void {
  if (targets.length === 0 || freed <= EPS) return;
  const targetSum = targets.reduce((s, t) => s + w[t], 0);
  if (targetSum > EPS) {
    for (const t of targets) w[t] += freed * (w[t] / targetSum);
  } else {
    const each = freed / targets.length;
    for (const t of targets) w[t] += each;
  }
}

export function recommendAllocation(input: AllocInput): AllocResult {
  const { scores, sectors, caps, aggressiveness } = input;
  const tickers = Object.keys(scores);
  const activeCaps: string[] = [];
  if (tickers.length === 0) return { allocation: {}, activeCaps };

  const n = tickers.length;
  const baseline = 100 / n;
  const mean = tickers.reduce((s, t) => s + scores[t], 0) / n;

  // baseline + tilt (floor ke 0)
  let w: Record<string, number> = {};
  for (const t of tickers) {
    w[t] = Math.max(0, baseline * (1 + (aggressiveness * (scores[t] - mean)) / 100));
  }
  w = renormalize(w);

  const markCap = (label: string) => {
    if (!activeCaps.includes(label)) activeCaps.push(label);
  };

  // clamp gabungan (saham + sektor) sampai stabil
  for (let iter = 0; iter < 200; iter++) {
    let changed = false;

    // cap per saham
    const over = tickers.filter((t) => w[t] > caps.perStock + EPS);
    if (over.length > 0) {
      let freed = 0;
      for (const t of over) {
        freed += w[t] - caps.perStock;
        w[t] = caps.perStock;
        markCap(`stock:${t}`);
      }
      const under = tickers.filter((t) => w[t] < caps.perStock - EPS);
      redistribute(w, under, freed);
      changed = true;
    }

    // cap per sektor
    for (const [sec, cap] of Object.entries(caps.perSector)) {
      const members = tickers.filter((t) => sectors[t] === sec);
      const secSum = members.reduce((s, t) => s + w[t], 0);
      if (secSum > cap + EPS && secSum > 0) {
        const scale = cap / secSum;
        let freed = 0;
        for (const t of members) {
          const nw = w[t] * scale;
          freed += w[t] - nw;
          w[t] = nw;
        }
        markCap(`sector:${sec}`);
        const others = tickers.filter((t) => !members.includes(t));
        redistribute(w, others, freed);
        changed = true;
      }
    }

    if (!changed) break;
  }

  return { allocation: w, activeCaps };
}
