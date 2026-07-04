import { getTranslations } from "next-intl/server";
import { getSnapshot, listQuarters } from "@/lib/repo";
import RunReviewButton from "@/components/RunReviewButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DecisionTabs from "@/components/DecisionTabs";

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
    <div className="space-y-4">
      <DecisionTabs />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <RunReviewButton />
      </div>
      {quarters.length > 0 && (
        <form className="text-sm flex items-center gap-2">
          <label>{t("quarter")}:</label>
          <select name="q" defaultValue={quarter} className="border rounded px-2 py-1 bg-background">
            {quarters.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          <button className="underline" type="submit">
            ↻
          </button>
        </form>
      )}
      {!snap && <p className="text-muted-foreground">{t("noSnapshot")}</p>}
      {snap && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle>{quarter}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ticker")}</TableHead>
                  <TableHead>{t("score")}</TableHead>
                  <TableHead>{t("allocation")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.ticker}>
                    <TableCell>
                      <a className="underline" href={`/stock/${e.ticker}`}>
                        {e.ticker}
                      </a>
                    </TableCell>
                    <TableCell>{e.compositeScore.toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{e.allocationPct.toFixed(1)}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
