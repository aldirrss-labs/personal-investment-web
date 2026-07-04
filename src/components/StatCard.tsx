"use client";
import { motion } from "motion/react";

const ACCENTS = {
  blue: { border: "border-l-blue-500", text: "text-blue-600", bg: "bg-blue-500/10" },
  green: { border: "border-l-green-500", text: "text-green-600", bg: "bg-green-500/10" },
  red: { border: "border-l-red-500", text: "text-red-600", bg: "bg-red-500/10" },
  violet: { border: "border-l-violet-500", text: "text-violet-600", bg: "bg-violet-500/10" },
} as const;

export function StatCard({
  label,
  value,
  icon,
  accent,
  index = 0,
}: {
  label: string;
  value: React.ReactNode;
  // Elemen JSX yang sudah dirender (mis. `<DollarSign className="size-5" />`),
  // BUKAN referensi komponen — referensi komponen (fungsi) tidak bisa dikirim
  // dari Server Component ke Client Component lintas boundary RSC.
  icon: React.ReactNode;
  accent: keyof typeof ACCENTS;
  index?: number;
}) {
  const a = ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className={`rounded-xl border border-l-4 ${a.border} bg-card text-card-foreground shadow p-5 flex items-center gap-4`}
    >
      <div className={`rounded-full p-3 ${a.bg} ${a.text}`}>{icon}</div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </motion.div>
  );
}
