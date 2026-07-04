"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { runReview } from "@/app/review/actions";

export default function RunReviewButton() {
  const t = useTranslations("review");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await runReview();
            setMsg(r.aiUnavailable ? t("aiUnavailable") : `${t("quarter")}: ${r.quarter}`);
          })
        }
      >
        {isPending ? t("running") : t("run")}
      </Button>
      {msg && <p className="text-sm text-amber-600">{msg}</p>}
    </div>
  );
}
