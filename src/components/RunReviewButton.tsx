"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { runReview } from "@/app/review/actions";

export default function RunReviewButton() {
  const t = useTranslations("review");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await runReview();
            setMsg(r.aiUnavailable ? t("aiUnavailable") : `${t("quarter")}: ${r.quarter}`);
          })
        }
      >
        {isPending ? t("running") : t("run")}
      </button>
      {msg && <p className="text-sm text-amber-600">{msg}</p>}
    </div>
  );
}
