"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function PctField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-foreground">{label}</span>
      <div className="relative">
        <Input
          type="number"
          className="pr-7"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          %
        </span>
      </div>
    </label>
  );
}

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
  const weightSum = w.fundamental + w.moat + w.technical + w.diversification;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle>{t("weights")}</CardTitle>
          <CardDescription>
            {t("weightsHint")} {weightSum !== 100 && (
              <span className="text-amber-600">({weightSum}/100)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["fundamental", "moat", "technical", "diversification"] as const).map((k) => (
            <PctField key={k} label={t(k)} value={w[k]} onChange={(v) => setW({ ...w, [k]: v })} />
          ))}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle>{t("perStockCap")}</CardTitle>
          <CardDescription>{t("perStockCapHint")}</CardDescription>
        </CardHeader>
        <CardContent className="max-w-[160px]">
          <PctField label={t("perStockCap")} value={perStock} onChange={setPerStock} />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-violet-500">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>{t("sectors")}</CardTitle>
            <CardDescription>{t("sectorsHint")}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => start(async () => setSectors(await fetchAllSectors()))}
          >
            {t("fetchAll")}
          </Button>
        </CardHeader>
        <CardContent>
          {sectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noSectorYet")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sectors.map((s) => (
                <div
                  key={s.ticker}
                  className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{s.ticker}</span>
                  <Badge variant={s.sector ? "secondary" : "outline"}>
                    {s.sector ?? t("unknownSector")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500">
        <CardHeader>
          <CardTitle>{t("sectorCaps")}</CardTitle>
          <CardDescription>{t("sectorCapsHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {sectorNames.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noSectorYet")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {sectorNames.map((name) => (
                <PctField
                  key={name}
                  label={name}
                  value={caps[name] ?? 50}
                  onChange={(v) => setCaps({ ...caps, [name]: v })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader>
          <CardTitle>{t("ai")}</CardTitle>
          <CardDescription>{t("aiHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm max-w-[220px]">
            <span className="mb-1 block font-medium text-foreground">{t("language")}</span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              value={lang}
              onChange={(e) => setLang(e.target.value as Props["initialLanguage"])}
            >
              <option value="follow_ui">follow_ui</option>
              <option value="en">en</option>
              <option value="id">id</option>
            </select>
          </label>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{t("model")}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => start(async () => setOpts(await refreshModels()))}
            >
              {t("refreshModels")}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(["gemini", "groq", "openrouter"] as const).map((prov) => (
              <label key={prov} className="block text-sm">
                <span className="mb-1 block font-medium capitalize text-foreground">{prov}</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
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
          </div>
          <p className="text-xs text-muted-foreground">
            {t("providerOrder")}: {order.join(" → ")}
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
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
        {msg && <p className="text-sm text-green-600">{msg}</p>}
      </div>
    </div>
  );
}
