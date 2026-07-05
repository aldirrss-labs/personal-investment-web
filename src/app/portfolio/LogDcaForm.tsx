"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { previewDca, confirmDca } from "./actions";
import { formatWibForInput } from "@/lib/wib";

type Row = {
  ticker: string;
  allocationPct: number;
  suggestedUsd: number;
  isManual: boolean;
  qty: string;
  price: string;
  datetime: string;
};

export default function LogDcaForm() {
  const t = useTranslations("portfolio");
  const td = useTranslations("dashboard");
  const [isPending, start] = useTransition();
  const [budgetStr, setBudgetStr] = useState("");
  const [datetimeLocal, setDatetimeLocal] = useState(formatWibForInput(new Date()));
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  const [manualTicker, setManualTicker] = useState("");
  const [manualQtyStr, setManualQtyStr] = useState("");
  const [manualPriceStr, setManualPriceStr] = useState("");
  const [manualDatetime, setManualDatetime] = useState(datetimeLocal);

  const budget = Number(budgetStr) || 0;
  const manualQty = Number(manualQtyStr) || 0;

  function addManualRow() {
    const ticker = manualTicker.trim().toUpperCase();
    if (!ticker || manualQty <= 0) return;
    setRows((prev) => {
      if (prev.some((r) => r.ticker === ticker)) return prev;
      return [
        ...prev,
        {
          ticker,
          allocationPct: 0,
          suggestedUsd: 0,
          isManual: true,
          qty: manualQtyStr,
          price: manualPriceStr || "0",
          datetime: manualDatetime,
        },
      ];
    });
    setManualTicker("");
    setManualQtyStr("");
    setManualPriceStr("");
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm max-w-xs">
        {t("purchaseDatetime")}
        <Input
          type="datetime-local"
          value={datetimeLocal}
          onChange={(e) => setDatetimeLocal(e.target.value)}
        />
      </label>
      <p className="text-xs text-muted-foreground max-w-md -mt-3">{t("purchaseDatetimeHint")}</p>

      <div className="grid gap-3 md:grid-cols-2 md:items-stretch">
        <div className="rounded-md border p-3 space-y-2">
          <p className="text-sm font-medium">{t("autoAllocate")}</p>
          <p className="text-xs text-muted-foreground">{t("autoAllocateHint")}</p>
          <div className="flex gap-2 items-end flex-wrap pt-1">
            <label className="text-sm">
              {t("budgetUsd")}
              <Input
                inputMode="decimal"
                value={budgetStr}
                onChange={(e) => setBudgetStr(e.target.value)}
                className="w-36"
              />
            </label>
            <Button
              disabled={isPending || budget <= 0}
              onClick={() =>
                start(async () => {
                  try {
                    setError(null);
                    const result = await previewDca(budget);
                    const newRows: Row[] = result.map((s) => ({
                      ticker: s.ticker,
                      allocationPct: s.allocationPct,
                      suggestedUsd: s.suggestedUsd,
                      isManual: false,
                      qty: String(s.suggestedQty),
                      price: String(s.price),
                      datetime: datetimeLocal,
                    }));
                    setRows((prev) => [
                      ...prev.filter((r) => !newRows.some((n) => n.ticker === r.ticker)),
                      ...newRows,
                    ]);
                  } catch {
                    setError(t("error"));
                  } finally {
                    setHasPreviewed(true);
                  }
                })
              }
            >
              {t("preview")}
            </Button>
          </div>
        </div>

        <div className="relative rounded-md border border-dashed p-3 space-y-2">
          <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border bg-background px-2 text-[10px] font-semibold tracking-wide text-muted-foreground md:-left-3 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
            {t("or")}
          </span>
          <p className="text-sm font-medium">{t("manualAdd")}</p>
          <p className="text-xs text-muted-foreground">{t("manualHint")}</p>
          <div className="flex gap-2 items-end flex-wrap pt-1">
            <label className="text-sm">
              {td("ticker")}
              <Input
                value={manualTicker}
                onChange={(e) => setManualTicker(e.target.value)}
                className="w-28 uppercase"
                placeholder="TSLA"
              />
            </label>
            <label className="text-sm">
              {td("qty")}
              <Input
                inputMode="decimal"
                value={manualQtyStr}
                onChange={(e) => setManualQtyStr(e.target.value)}
                className="w-32"
              />
            </label>
            <label className="text-sm">
              {td("price")}
              <Input
                inputMode="decimal"
                value={manualPriceStr}
                onChange={(e) => setManualPriceStr(e.target.value)}
                className="w-32"
              />
            </label>
            <label className="text-sm">
              {t("datetimeWib")}
              <Input
                type="datetime-local"
                value={manualDatetime}
                onChange={(e) => setManualDatetime(e.target.value)}
                className="w-60"
              />
            </label>
            <Button
              variant="outline"
              disabled={!manualTicker.trim() || manualQty <= 0}
              onClick={addManualRow}
            >
              {t("addManual")}
            </Button>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("rowsToSave")} ({rows.length})
          </p>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{td("ticker")}</TableHead>
                  <TableHead>{t("allocationPct")}</TableHead>
                  <TableHead>{t("suggestedUsd")}</TableHead>
                  <TableHead>{td("qty")}</TableHead>
                  <TableHead>{td("price")}</TableHead>
                  <TableHead>{t("datetimeWib")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.ticker}>
                    <TableCell className="font-medium">{r.ticker}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.isManual ? "—" : `${r.allocationPct.toFixed(1)}%`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.isManual ? "—" : `$${r.suggestedUsd.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        value={r.qty}
                        onChange={(e) => updateRow(i, { qty: e.target.value })}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        value={r.price}
                        onChange={(e) => updateRow(i, { price: e.target.value })}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="datetime-local"
                        value={r.datetime}
                        onChange={(e) => updateRow(i, { datetime: e.target.value })}
                        className="w-60"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button
            disabled={isPending}
            onClick={() =>
              start(async () => {
                try {
                  setError(null);
                  await confirmDca(
                    rows.map((r) => ({
                      ticker: r.ticker,
                      qty: Number(r.qty) || 0,
                      price: Number(r.price) || 0,
                      datetimeLocal: r.datetime,
                    })),
                  );
                  setMsg(t("saved"));
                  setRows([]);
                  setBudgetStr("");
                  setHasPreviewed(false);
                } catch {
                  setError(t("error"));
                }
              })
            }
          >
            {t("confirmSave")}
          </Button>
        </div>
      )}
      {hasPreviewed && rows.length === 0 && !error && (
        <p className="text-sm">{t("noAllocation")}</p>
      )}
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
