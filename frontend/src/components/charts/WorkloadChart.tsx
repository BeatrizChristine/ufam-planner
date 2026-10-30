"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const data = [
  { period: "1º", hours: 300 },
  { period: "2º", hours: 360 },
  { period: "3º", hours: 330 },
  { period: "4º", hours: 390 },
  { period: "5º", hours: 285 },
  { period: "6º", hours: 240 },
];

export function WorkloadChart() {
  return (
    <div className="h-44 w-full" aria-label="Carga horária por período">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="24%">
          <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: "#84938c", fontSize: 11 }} />
          <Tooltip cursor={{ fill: "#f0f7f3" }} contentStyle={{ borderRadius: 12, border: "1px solid #e4ebe7", fontSize: 12 }} />
          <Bar dataKey="hours" fill="#009b63" radius={[6, 6, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

