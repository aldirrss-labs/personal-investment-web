import { getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default async function Home() {
  const t = await getTranslations("app");
  return (
    <main className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <LocaleSwitcher />
      </div>
      <p className="text-gray-500">{t("dashboardSubtitle")}</p>
      <a className="block text-blue-600 underline" href="/recommendation">
        {t("viewRecommendation")} &rarr;
      </a>
      <a className="block text-blue-600 underline" href="/review">
        {t("viewReview")} &rarr;
      </a>
      <a className="block text-blue-600 underline" href="/settings">
        {t("viewSettings")} &rarr;
      </a>
    </main>
  );
}
