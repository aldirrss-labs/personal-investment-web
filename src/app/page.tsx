import { getTranslations } from "next-intl/server";
import { getTransactions, getCachedPrices } from "@/lib/repo";
import { positionsFromTx } from "@/lib/holdings";
import { portfolioSummary, donutData } from "@/lib/portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RefreshPricesButton from "@/components/RefreshPricesButton";
import AllocationDonut from "@/components/AllocationDonut";

export default async function Home() {
  const t = await getTranslations("dashboard");
  const positions = positionsFromTx(await getTransactions());
  const prices = await getCachedPrices(positions.map((p) => p.ticker));
  const s = portfolioSummary(positions, prices);
  const hasPrices = Object.keys(prices).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <RefreshPricesButton />
      </div>

      {!hasPrices && <p className="text-amber-600 text-sm">{t("noPrices")}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("totalValue")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">${s.totalValue.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("pnl")}</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-2xl font-bold ${s.pnlAbs >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            ${s.pnlAbs.toFixed(2)} ({s.pnlPct.toFixed(2)}%)
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("positions")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{positions.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("allocation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AllocationDonut data={donutData(s.rows)} />
        </CardContent>
      </Card>

      <a className="text-sm underline" href="/portfolio">
        {t("viewPortfolio")} &rarr;
      </a>
    </div>
  );
}
