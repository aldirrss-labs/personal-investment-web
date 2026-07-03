import { getTranslations } from "next-intl/server";
import { getAiAnalysis, listQuarters } from "@/lib/repo";
import { AI_CRITERIA } from "@/lib/ai/types";

export default async function StockCard({ params }: { params: { ticker: string } }) {
  const t = await getTranslations("stock");
  const ticker = params.ticker.toUpperCase();
  const quarters = await listQuarters();
  const quarter = quarters[0];
  const ai = quarter ? await getAiAnalysis(ticker, quarter) : null;

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">
        {ticker} — {t("title")}
      </h1>
      {!ai && <p className="text-amber-600">{t("aiUnavailable")}</p>}
      {ai && (
        <div className="space-y-3 max-w-2xl">
          <p>
            <b>{t("decision")}:</b> {ai.decision} · <b>{t("confidence")}:</b>{" "}
            {(ai.confidence * 100).toFixed(0)}%
          </p>
          <p>
            <b>{t("reason")}:</b> {ai.reason}
          </p>
          <div>
            <b>{t("criteria")}:</b>
            <ul className="list-disc ml-6">
              {AI_CRITERIA.map((k) => {
                const c = (ai.criteria as any)[k];
                return (
                  <li key={k}>
                    {k}: {c?.label} ({c?.score})
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <b>{t("risks")}:</b>
            <ul className="list-disc ml-6">
              {(ai.keyRisks as string[]).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-gray-400">
            {ai.provider} · {ai.model} · {quarter}
          </p>
        </div>
      )}
    </main>
  );
}
