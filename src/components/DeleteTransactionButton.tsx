"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { removeTransaction } from "@/app/portfolio/actions";

export default function DeleteTransactionButton({ id }: { id: string }) {
  const t = useTranslations("portfolio");
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (confirm(t("confirmDelete"))) {
            start(async () => {
              try {
                setError(null);
                await removeTransaction(id);
              } catch {
                setError(t("error"));
              }
            });
          }
        }}
      >
        {t("delete")}
      </Button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
