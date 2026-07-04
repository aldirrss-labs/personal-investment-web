"use client";
import { useTheme } from "next-themes";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Validated categorical palette (dataviz skill): fixed hue order, not cycled by rank.
// Passes CVD-separation + lightness-band checks for light and dark surfaces.
const COLORS_LIGHT = [
  "#2a78d6", // blue
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
  "#e87ba4", // magenta
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

export default function AllocationDonut({ data }: { data: Array<{ name: string; value: number }> }) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? COLORS_DARK : COLORS_LIGHT;
  if (data.every((d) => d.value === 0)) return null;
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Legend />
          <Tooltip formatter={(v) => (typeof v === "number" ? v.toFixed(2) : String(v))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
