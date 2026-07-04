"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { fetchAndCachePrices } from "@/app/dashboard/actions";

export default function RefreshPricesButton() {
  const t = useTranslations("dashboard");
  const [isPending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        start(async () => {
          await fetchAndCachePrices();
        })
      }
    >
      {t("refreshPrices")}
    </Button>
  );
}
