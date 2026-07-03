import { getTranslations } from "next-intl/server";
import { getSnapshot, listQuarters } from "@/lib/repo";
import RunReviewButton from "@/components/RunReviewButton";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const t = await getTranslations("review");
  const quarters = await listQuarters();
  const quarter = searchParams.q ?? quarters[0];
  const snap = quarter ? await getSnapshot(quarter) : null;
  const entries = (snap?.entries ?? []).slice().sort((a, b) => b.allocationPct - a.allocationPct);

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <RunReviewButton />
      {quarters.length > 0 && (
        <form className="text-sm">
          <label>{t("quarter")}: </label>
          <select name="q" defaultValue={quarter} className="border rounded px-2 py-1">
            {quarters.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          <button className="ml-2 underline" type="submit">
            ↻
          </button>
        </form>
      )}
      {!snap && <p className="text-gray-500">{t("noSnapshot")}</p>}
      {snap && (
        <table className="w-full max-w-lg text-left">
          <thead>
            <tr>
              <th>{t("ticker")}</th>
              <th>{t("score")}</th>
              <th>{t("allocation")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.ticker} className="border-t">
                <td className="py-1">
                  <a className="text-blue-600 underline" href={`/stock/${e.ticker}`}>
                    {e.ticker}
                  </a>
                </td>
                <td>{e.compositeScore.toFixed(1)}</td>
                <td>{e.allocationPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
