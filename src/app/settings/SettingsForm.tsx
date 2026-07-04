"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
      <section>
        <h2 className="font-semibold">{t("weights")}</h2>
        {(["fundamental", "moat", "technical", "diversification"] as const).map((k) => (
          <label key={k} className="block text-sm">
            {t(k)}:{" "}
            <input
              type="number"
              className="border rounded px-2 py-1 w-24"
              value={w[k]}
              onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })}
            />
          </label>
        ))}
      </section>

      <section>
        <h2 className="font-semibold">{t("perStockCap")}</h2>
        <input
          type="number"
          className="border rounded px-2 py-1 w-24"
          value={perStock}
          onChange={(e) => setPerStock(Number(e.target.value))}
        />
      </section>

      <section>
        <h2 className="font-semibold">{t("sectors")}</h2>
        <button
          className="text-blue-600 underline text-sm"
          disabled={isPending}
          onClick={() => start(async () => setSectors(await fetchAllSectors()))}
        >
          {t("fetchAll")}
        </button>
        <ul className="text-sm mt-1">
          {sectors.map((s) => (
            <li key={s.ticker}>
              {s.ticker}: {s.sector ?? "—"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">{t("sectorCaps")}</h2>
        {sectorNames.map((name) => (
          <label key={name} className="block text-sm">
            {name}:{" "}
            <input
              type="number"
              className="border rounded px-2 py-1 w-24"
              value={caps[name] ?? 50}
              onChange={(e) => setCaps({ ...caps, [name]: Number(e.target.value) })}
            />
          </label>
        ))}
      </section>

      <section>
        <h2 className="font-semibold">{t("ai")}</h2>
        <label className="block text-sm">
          {t("language")}:{" "}
          <select
            className="border rounded px-2 py-1"
            value={lang}
            onChange={(e) => setLang(e.target.value as Props["initialLanguage"])}
          >
            <option value="follow_ui">follow_ui</option>
            <option value="en">en</option>
            <option value="id">id</option>
          </select>
        </label>
        <button
          className="text-blue-600 underline text-sm"
          disabled={isPending}
          onClick={() => start(async () => setOpts(await refreshModels()))}
        >
          {t("refreshModels")}
        </button>
        {(["gemini", "groq", "openrouter"] as const).map((prov) => (
          <label key={prov} className="block text-sm">
            {prov} {t("model")}:{" "}
            <select
              className="border rounded px-2 py-1"
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
        <p className="text-xs text-gray-400 mt-1">{t("providerOrder")}: {order.join(" → ")}</p>
      </section>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
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
      </button>
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
    </div>
  );
}
