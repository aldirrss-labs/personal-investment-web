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
import type { DcaSuggestion } from "@/lib/dca";
import { formatWibForInput } from "@/lib/wib";

export default function LogDcaForm() {
  const t = useTranslations("portfolio");
  const td = useTranslations("dashboard");
  const [isPending, start] = useTransition();
  const [budget, setBudget] = useState(0);
  const [datetimeLocal, setDatetimeLocal] = useState(formatWibForInput(new Date()));
  const [rows, setRows] = useState<DcaSuggestion[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  const [manualTicker, setManualTicker] = useState("");
  const [manualQty, setManualQty] = useState(0);
  const [manualPrice, setManualPrice] = useState(0);

  function addManualRow() {
    const ticker = manualTicker.trim().toUpperCase();
    if (!ticker || manualQty <= 0) return;
    setRows((prev) => {
      if (prev.some((r) => r.ticker === ticker)) return prev;
      return [
        ...prev,
        { ticker, allocationPct: 0, suggestedUsd: manualQty * manualPrice, suggestedQty: manualQty, price: manualPrice },
      ];
    });
    setManualTicker("");
    setManualQty(0);
    setManualPrice(0);
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm max-w-[220px]">
        {t("purchaseDatetime")}
        <Input
          type="datetime-local"
          value={datetimeLocal}
          onChange={(e) => setDatetimeLocal(e.target.value)}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2 md:items-stretch">
        <div className="rounded-md border p-3 space-y-2">
          <p className="text-sm font-medium">{t("autoAllocate")}</p>
          <p className="text-xs text-muted-foreground">{t("autoAllocateHint")}</p>
          <div className="flex gap-2 items-end flex-wrap pt-1">
            <label className="text-sm">
              {t("budgetUsd")}
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || 0)}
                className="w-32"
              />
            </label>
            <Button
              disabled={isPending || budget <= 0}
              onClick={() =>
                start(async () => {
                  try {
                    setError(null);
                    const result = await previewDca(budget);
                    setRows((prev) => [
                      ...prev.filter((r) => !result.some((n) => n.ticker === r.ticker)),
                      ...result,
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
                className="w-24 uppercase"
                placeholder="TSLA"
              />
            </label>
            <label className="text-sm">
              {td("qty")}
              <Input
                type="number"
                step="0.0001"
                value={manualQty || ""}
                onChange={(e) => setManualQty(Number(e.target.value) || 0)}
                className="w-20"
              />
            </label>
            <label className="text-sm">
              {td("price")}
              <Input
                type="number"
                step="0.01"
                value={manualPrice || ""}
                onChange={(e) => setManualPrice(Number(e.target.value) || 0)}
                className="w-20"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td("ticker")}</TableHead>
                <TableHead>{t("allocationPct")}</TableHead>
                <TableHead>{t("suggestedUsd")}</TableHead>
                <TableHead>{td("qty")}</TableHead>
                <TableHead>{td("price")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.ticker}>
                  <TableCell>{r.ticker}</TableCell>
                  <TableCell>{r.allocationPct.toFixed(1)}%</TableCell>
                  <TableCell>${r.suggestedUsd.toFixed(2)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      value={r.suggestedQty}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...r, suggestedQty: Number(e.target.value) || 0 };
                        setRows(next);
                      }}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={r.price}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...r, price: Number(e.target.value) || 0 };
                        setRows(next);
                      }}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            disabled={isPending}
            onClick={() =>
              start(async () => {
                try {
                  setError(null);
                  await confirmDca(
                    rows.map((r) => ({ ticker: r.ticker, qty: r.suggestedQty, price: r.price })),
                    datetimeLocal,
                  );
                  setMsg(t("saved"));
                  setRows([]);
                  setBudget(0);
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
