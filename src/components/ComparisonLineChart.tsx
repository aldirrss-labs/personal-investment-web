"use client";
import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Sama dengan AllocationDonut.tsx: palet kategorikal tervalidasi (skill dataviz),
// fixed hue order, tidak di-cycle.
const COLORS_LIGHT = [
  "#2a78d6",
  "#1baf7a",
  "#eda100",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#e87ba4",
];
const COLORS_DARK = [
  "#3987e5",
  "#199e70",
  "#c98500",
  "#008300",
  "#9085e9",
  "#e66767",
  "#d55181",
];

export default function ComparisonLineChart({
  data,
  tickers,
}: {
  data: Array<Record<string, number | string>>;
  tickers: string[];
}) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? COLORS_DARK : COLORS_LIGHT;
  if (data.length === 0) return null;
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="quarter" />
          <YAxis />
          <Tooltip />
          <Legend />
          {tickers.map((t, i) => (
            <Line
              key={t}
              type="monotone"
              dataKey={t}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
