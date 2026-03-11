"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BreakdownPoint, TrendPoint } from "@/lib/dashboard/types";

const PIE_COLORS = ["#8F6A4A", "#C47A3A", "#6E7C45", "#4D648D", "#B15E6C", "#9B9387"];

export function TrendLineChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6DED2" />
        <XAxis dataKey="label" stroke="#8B8175" />
        <YAxis stroke="#8B8175" />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#8F6A4A" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BreakdownBarChart({ data }: { data: BreakdownPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6DED2" />
        <XAxis dataKey="label" stroke="#8B8175" interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis stroke="#8B8175" />
        <Tooltip />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`${entry.label}-${entry.value}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BreakdownDonutChart({ data }: { data: BreakdownPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`${entry.label}-${entry.value}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
