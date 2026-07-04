import { getTranslations } from "next-intl/server";
import { getAiAnalysis, listQuarters } from "@/lib/repo";
import { AI_CRITERIA } from "@/lib/ai/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function StockCard({ params }: { params: { ticker: string } }) {
  const t = await getTranslations("stock");
  const ticker = params.ticker.toUpperCase();
  const quarters = await listQuarters();
  const quarter = quarters[0];
  const ai = quarter ? await getAiAnalysis(ticker, quarter) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {ticker} — {t("title")}
      </h1>
      {!ai && <p className="text-amber-600">{t("aiUnavailable")}</p>}
      {ai && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {ticker}
              <Badge>{ai.decision}</Badge>
              <Badge variant="secondary">{(ai.criteria as any).moat?.label} moat</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              <b>{t("reason")}:</b> {ai.reason}
            </p>
            <div>
              <b>{t("confidence")}:</b>
              <div className="h-2 w-40 rounded bg-muted mt-1">
                <div
                  className="h-2 rounded bg-blue-600"
                  style={{ width: `${ai.confidence * 100}%` }}
                />
              </div>
            </div>
            <div>
              <b>{t("criteria")}:</b>
              <div className="flex flex-wrap gap-2 mt-1">
                {AI_CRITERIA.map((k) => {
                  const c = (ai.criteria as any)[k];
                  return (
                    <Badge key={k} variant="outline">
                      {k}: {c?.score}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div>
              <b>{t("risks")}:</b>
              <ul className="list-disc ml-6">
                {(ai.keyRisks as string[]).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              {ai.provider} · {ai.model} · {quarter}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
