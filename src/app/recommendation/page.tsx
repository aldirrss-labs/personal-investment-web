async function getData() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/recommendation`, { cache: "no-store" });
  return res.json() as Promise<{
    scores: Record<string, number>;
    allocation: Record<string, number>;
    activeCaps: string[];
  }>;
}

export default async function RecommendationPage() {
  const data = await getData();
  const rows = Object.keys(data.allocation).sort(
    (a, b) => data.allocation[b] - data.allocation[a],
  );
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Rekomendasi Alokasi DCA</h1>
      {data.activeCaps.length > 0 && (
        <p className="text-sm text-amber-600">
          Cap aktif: {data.activeCaps.join(", ")}
        </p>
      )}
      <table className="w-full max-w-lg text-left">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Skor</th>
            <th>Alokasi %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t} className="border-t">
              <td className="py-1">{t}</td>
              <td>{data.scores[t]?.toFixed(1)}</td>
              <td>{data.allocation[t].toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
