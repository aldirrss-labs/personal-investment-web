"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { removeTransaction } from "@/app/portfolio/actions";

export default function DeleteTransactionButton({ id }: { id: string }) {
  const t = useTranslations("portfolio");
  const [isPending, start] = useTransition();
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (confirm(t("confirmDelete"))) {
          start(async () => {
            await removeTransaction(id);
          });
        }
      }}
    >
      {t("delete")}
    </Button>
  );
}
