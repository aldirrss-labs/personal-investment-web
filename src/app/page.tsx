import { getTranslations } from "next-intl/server";
import { DollarSign, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { getTransactions, getCachedPrices } from "@/lib/repo";
import { positionsFromTx } from "@/lib/holdings";
import { portfolioSummary, donutData } from "@/lib/portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import RefreshPricesButton from "@/components/RefreshPricesButton";
import AllocationDonut from "@/components/AllocationDonut";

export default async function Home() {
  const t = await getTranslations("dashboard");
  const positions = positionsFromTx(await getTransactions());
  const prices = await getCachedPrices(positions.map((p) => p.ticker));
  const s = portfolioSummary(positions, prices);
  const hasPrices = Object.keys(prices).length > 0;
  const pnlPositive = s.pnlAbs >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <RefreshPricesButton />
      </div>

      {!hasPrices && <p className="text-amber-600 text-sm">{t("noPrices")}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          index={0}
          label={t("totalValue")}
          value={`$${s.totalValue.toFixed(2)}`}
          icon={<DollarSign className="size-5" />}
          accent="blue"
        />
        <StatCard
          index={1}
          label={t("pnl")}
          value={`$${s.pnlAbs.toFixed(2)} (${s.pnlPct.toFixed(2)}%)`}
          icon={pnlPositive ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
          accent={pnlPositive ? "green" : "red"}
        />
        <StatCard
          index={2}
          label={t("positions")}
          value={positions.length}
          icon={<Layers className="size-5" />}
          accent="violet"
        />
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
