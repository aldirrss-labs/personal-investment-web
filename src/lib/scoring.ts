export type Direction = "benefit" | "cost";
export type Criterion = { key: string; group: string; direction: Direction };
export type GroupWeights = Record<string, number>;

export function normalize(
  values: Record<string, number>,
  direction: Direction,
): Record<string, number> {
  const nums = Object.values(values);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(values)) {
    if (max === min) {
      out[k] = 1;
      continue;
    }
    const b = (v - min) / (max - min);
    out[k] = direction === "benefit" ? b : 1 - b;
  }
  return out;
}

export function compositeScores(input: {
  criteria: Criterion[];
  raw: Record<string, Record<string, number>>;
  groupWeights: GroupWeights;
}): Record<string, number> {
  const { criteria, raw, groupWeights } = input;
  const tickers = Object.keys(raw);

  // normalisasi tiap kriteria lintas ticker
  const normByKey: Record<string, Record<string, number>> = {};
  for (const c of criteria) {
    const vals: Record<string, number> = {};
    for (const t of tickers) vals[t] = raw[t][c.key];
    normByKey[c.key] = normalize(vals, c.direction);
  }

  // kelompokkan kriteria per group
  const groups: Record<string, Criterion[]> = {};
  for (const c of criteria) (groups[c.group] ??= []).push(c);

  const totalWeight = Object.values(groupWeights).reduce((s, w) => s + w, 0);
  const scores: Record<string, number> = {};
  for (const t of tickers) {
    let acc = 0;
    for (const [group, crits] of Object.entries(groups)) {
      const w = groupWeights[group] ?? 0;
      const groupAvg =
        crits.reduce((s, c) => s + normByKey[c.key][t], 0) / crits.length;
      acc += (w / totalWeight) * groupAvg;
    }
    scores[t] = acc * 100;
  }
  return scores;
}
