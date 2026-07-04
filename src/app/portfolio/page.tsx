import { getTranslations } from "next-intl/server";
import { getTransactions, getCachedPrices, getAllTransactions } from "@/lib/repo";
import { positionsFromTx } from "@/lib/holdings";
import { portfolioSummary } from "@/lib/portfolio";
import { formatWib } from "@/lib/wib";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LogDcaForm from "./LogDcaForm";
import DeleteTransactionButton from "@/components/DeleteTransactionButton";

export default async function PortfolioPage() {
  const t = await getTranslations("portfolio");
  const td = await getTranslations("dashboard");
  const positions = positionsFromTx(await getTransactions());
  const prices = await getCachedPrices(positions.map((p) => p.ticker));
  const s = portfolioSummary(positions, prices);
  const transactions = await getAllTransactions();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("holdings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td("ticker")}</TableHead>
                <TableHead>{td("qty")}</TableHead>
                <TableHead>{td("avgCost")}</TableHead>
                <TableHead>{td("price")}</TableHead>
                <TableHead>{td("value")}</TableHead>
                <TableHead>{td("pnl")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.rows.map((r) => (
                <TableRow key={r.ticker}>
                  <TableCell>
                    <a className="underline" href={`/stock/${r.ticker}`}>
                      {r.ticker}
                    </a>
                  </TableCell>
                  <TableCell>{r.qty}</TableCell>
                  <TableCell>${r.avgCost.toFixed(2)}</TableCell>
                  <TableCell>${r.price.toFixed(2)}</TableCell>
                  <TableCell>${r.value.toFixed(2)}</TableCell>
                  <TableCell>{r.pnlPct.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("logDca")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LogDcaForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td("ticker")}</TableHead>
                <TableHead>{td("qty")}</TableHead>
                <TableHead>{td("price")}</TableHead>
                <TableHead>{t("datetimeWib")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{tx.ticker}</TableCell>
                  <TableCell>{tx.qty}</TableCell>
                  <TableCell>${tx.price.toFixed(2)}</TableCell>
                  <TableCell>{formatWib(tx.date)}</TableCell>
                  <TableCell>
                    <DeleteTransactionButton id={tx.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
