import { getTranslations } from "next-intl/server";
import {
  getGroupWeights,
  getCaps,
  getAiLanguage,
  getAiModels,
  getProviderOrder,
  getCompaniesWithSector,
} from "@/lib/repo";
import { DEFAULT_WEIGHTS } from "@/lib/settings";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const weights = await getGroupWeights();
  const caps = await getCaps();
  const language = await getAiLanguage();
  const models = await getAiModels();
  const order = (await getProviderOrder()) ?? [];
  const companies = await getCompaniesWithSector();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SettingsForm
        initialWeights={{ ...DEFAULT_WEIGHTS, ...weights }}
        initialPerStock={caps.perStock}
        initialSectorCaps={caps.perSector}
        initialLanguage={language}
        initialModels={models}
        initialOrder={order}
        companies={companies}
      />
    </div>
  );
}
