import { getTranslations } from "next-intl/server";
import { getAllSnapshotsWithEntries, getAllAiAnalyses } from "@/lib/repo";
import { buildComparisonRows, topTickersByLatestAllocation, chartSeries } from "@/lib/compare";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ComparisonLineChart from "@/components/ComparisonLineChart";

export default async function ComparePage() {
  const t = await getTranslations("compare");
  const snapshots = await getAllSnapshotsWithEntries();
  const analyses = await getAllAiAnalyses();
  const rows = buildComparisonRows(snapshots, analyses);
  const quarterCount = snapshots.length;
  const tickers = Object.keys(rows).sort();

  if (quarterCount < 2) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("insufficientData")}</p>
      </div>
    );
  }

  const topTickers = topTickersByLatestAllocation(rows, 7);
  const series = chartSeries(rows, topTickers);
  const quarters = Array.from(new Set(snapshots.map((s) => s.quarter))).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {quarterCount >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("trend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ComparisonLineChart data={series} tickers={topTickers} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ticker")}</TableHead>
                {quarters.map((q) => (
                  <TableHead key={q}>{q}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickers.map((ticker) => (
                <TableRow key={ticker}>
                  <TableCell>
                    <a className="underline" href={`/stock/${ticker}`}>
                      {ticker}
                    </a>
                  </TableCell>
                  {quarters.map((q) => {
                    const cell = rows[ticker].find((c) => c.quarter === q);
                    return (
                      <TableCell key={q}>
                        {cell ? (
                          <div className="text-xs space-y-0.5">
                            <div>
                              {t("score")}: {cell.compositeScore.toFixed(1)}
                            </div>
                            <div>
                              {t("allocation")}: {cell.allocationPct.toFixed(1)}%
                            </div>
                            {cell.decision && (
                              <div>
                                {t("decision")}: {cell.decision}
                              </div>
                            )}
                            {cell.moatLabel && (
                              <div>
                                {t("moat")}: {cell.moatLabel}
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
