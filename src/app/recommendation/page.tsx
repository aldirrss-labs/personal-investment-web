import { getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";

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
    <main className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <LocaleSwitcher />
      </div>
      {data.activeCaps.length > 0 && (
        <p className="text-sm text-amber-600">
          {t("activeCaps")}: {data.activeCaps.join(", ")}
        </p>
      )}
      <table className="w-full max-w-lg text-left">
        <thead>
          <tr>
            <th>{t("ticker")}</th>
            <th>{t("score")}</th>
            <th>{t("allocation")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tk) => (
            <tr key={tk} className="border-t">
              <td className="py-1">{tk}</td>
              <td>{data.scores[tk]?.toFixed(1)}</td>
              <td>{data.allocation[tk].toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
