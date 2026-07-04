"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveSettings, fetchAllSectors, refreshModels } from "./actions";

type Weights = { fundamental: number; moat: number; technical: number; diversification: number };
type Models = { gemini?: string; groq?: string; openrouter?: string };

type Props = {
  initialWeights: Weights;
  initialPerStock: number;
  initialSectorCaps: Record<string, number>;
  initialLanguage: "follow_ui" | "en" | "id";
  initialModels: Models;
  initialOrder: string[];
  companies: Array<{ ticker: string; sector: string | null }>;
};

export default function SettingsForm(p: Props) {
  const t = useTranslations("settings");
  const [isPending, start] = useTransition();
  const [w, setW] = useState<Weights>(p.initialWeights);
  const [perStock, setPerStock] = useState(p.initialPerStock);
  const [lang, setLang] = useState(p.initialLanguage);
  const [models, setModels] = useState<Models>(p.initialModels);
  const [order] = useState(p.initialOrder.length ? p.initialOrder : ["gemini", "groq", "openrouter"]);
  const [sectors, setSectors] = useState(p.companies);
  const [caps, setCaps] = useState<Record<string, number>>(p.initialSectorCaps);
  const [opts, setOpts] = useState<{ gemini: string[]; groq: string[]; openrouter: string[] }>({
    gemini: [],
    groq: [],
    openrouter: [],
  });
  const [msg, setMsg] = useState<string | null>(null);

  const sectorNames = Array.from(new Set(sectors.map((s) => s.sector).filter(Boolean) as string[]));

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-6 space-y-2">
          <h2 className="font-semibold">{t("weights")}</h2>
          {(["fundamental", "moat", "technical", "diversification"] as const).map((k) => (
            <label key={k} className="block text-sm">
              {t(k)}:{" "}
              <Input
                type="number"
                className="inline-block w-24"
                value={w[k]}
                onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })}
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardContent className="pt-6 space-y-2">
          <h2 className="font-semibold">{t("perStockCap")}</h2>
          <Input
            type="number"
            className="w-24"
            value={perStock}
            onChange={(e) => setPerStock(Number(e.target.value))}
          />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-violet-500">
        <CardContent className="pt-6 space-y-2">
          <h2 className="font-semibold">{t("sectors")}</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => start(async () => setSectors(await fetchAllSectors()))}
          >
            {t("fetchAll")}
          </Button>
          <ul className="text-sm mt-1">
            {sectors.map((s) => (
              <li key={s.ticker}>
                {s.ticker}: {s.sector ?? "—"}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="pt-6 space-y-2">
          <h2 className="font-semibold">{t("sectorCaps")}</h2>
          {sectorNames.map((name) => (
            <label key={name} className="block text-sm">
              {name}:{" "}
              <Input
                type="number"
                className="inline-block w-24"
                value={caps[name] ?? 50}
                onChange={(e) => setCaps({ ...caps, [name]: Number(e.target.value) })}
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-indigo-500">
        <CardContent className="pt-6 space-y-2">
          <h2 className="font-semibold">{t("ai")}</h2>
          <label className="block text-sm">
            {t("language")}:{" "}
            <select
              className="border rounded px-2 py-1 bg-background"
              value={lang}
              onChange={(e) => setLang(e.target.value as Props["initialLanguage"])}
            >
              <option value="follow_ui">follow_ui</option>
              <option value="en">en</option>
              <option value="id">id</option>
            </select>
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => start(async () => setOpts(await refreshModels()))}
          >
            {t("refreshModels")}
          </Button>
          {(["gemini", "groq", "openrouter"] as const).map((prov) => (
            <label key={prov} className="block text-sm">
              {prov} {t("model")}:{" "}
              <select
                className="border rounded px-2 py-1 bg-background"
                value={models[prov] ?? ""}
                onChange={(e) => setModels({ ...models, [prov]: e.target.value })}
              >
                <option value="">(env default)</option>
                {opts[prov].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                {models[prov] && !opts[prov].includes(models[prov] as string) && (
                  <option value={models[prov]}>{models[prov]}</option>
                )}
              </select>
            </label>
          ))}
          <p className="text-xs text-muted-foreground mt-1">
            {t("providerOrder")}: {order.join(" → ")}
          </p>
        </CardContent>
      </Card>

      <Button
        disabled={isPending}
        onClick={() =>
          start(async () => {
            await saveSettings({
              weights: w,
              perStock,
              sectorCaps: caps,
              aiLanguage: lang,
              models,
              providerOrder: order,
            });
            setMsg(t("saved"));
          })
        }
      >
        {t("save")}
      </Button>
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
    </div>
  );
}
