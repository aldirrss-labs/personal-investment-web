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

function nowWibForInput(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default function LogDcaForm() {
  const t = useTranslations("portfolio");
  const td = useTranslations("dashboard");
  const [isPending, start] = useTransition();
  const [budget, setBudget] = useState(0);
  const [datetimeLocal, setDatetimeLocal] = useState(nowWibForInput());
  const [rows, setRows] = useState<DcaSuggestion[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end flex-wrap">
        <label className="text-sm">
          {t("budgetUsd")}
          <Input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-32"
          />
        </label>
        <label className="text-sm">
          {t("purchaseDatetime")}
          <Input
            type="datetime-local"
            value={datetimeLocal}
            onChange={(e) => setDatetimeLocal(e.target.value)}
          />
        </label>
        <Button
          disabled={isPending || budget <= 0}
          onClick={() => start(async () => setRows(await previewDca(budget)))}
        >
          {t("preview")}
        </Button>
      </div>

      {rows.length > 0 && (
        <>
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
                        next[i] = { ...r, suggestedQty: Number(e.target.value) };
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
                        next[i] = { ...r, price: Number(e.target.value) };
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
                await confirmDca(
                  rows.map((r) => ({ ticker: r.ticker, qty: r.suggestedQty, price: r.price })),
                  datetimeLocal,
                );
                setMsg(t("saved"));
                setRows([]);
                setBudget(0);
              })
            }
          >
            {t("confirmSave")}
          </Button>
        </>
      )}
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
    </div>
  );
}
