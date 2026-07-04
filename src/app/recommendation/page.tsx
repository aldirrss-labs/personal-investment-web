import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DecisionTabs from "@/components/DecisionTabs";

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
  const t = await getTranslations("recommendation");
  const data = await getData();
  const rows = Object.keys(data.allocation).sort(
    (a, b) => data.allocation[b] - data.allocation[a],
  );
  return (
    <div className="space-y-4">
      <DecisionTabs />
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {data.activeCaps.length > 0 && (
        <div className="flex gap-2">
          {data.activeCaps.map((c) => (
            <Badge key={c} variant="secondary">
              {c}
            </Badge>
          ))}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("allocation")}</CardTitle>
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
              {rows.map((tk) => (
                <TableRow key={tk}>
                  <TableCell>
                    <a className="underline" href={`/stock/${tk}`}>
                      {tk}
                    </a>
                  </TableCell>
                  <TableCell>{data.scores[tk]?.toFixed(1)}</TableCell>
                  <TableCell>{data.allocation[tk].toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
