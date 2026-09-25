import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyPoint } from "../types";
import { formatRupiah } from "../utils/format";

export function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return <p className="empty-text">Belum ada transaksi untuk ditampilkan.</p>;
  }
  return (
    <div className="chart-wrap">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: "var(--font-sans)", fontSize: 12, fill: "var(--text-muted)" }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (v / 1000000).toFixed(0) + "jt"}
          />
          <Tooltip
            formatter={(v: number) => formatRupiah(v)}
            contentStyle={{ fontFamily: "var(--font-sans)", fontSize: 12, border: "1px solid var(--line)", borderRadius: 2 }}
          />
          <Legend wrapperStyle={{ fontFamily: "var(--font-sans)", fontSize: 12 }} />
          <Bar dataKey="pendapatan" name="Pendapatan" fill="var(--bronze)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="beban" name="Beban" fill="var(--ink-light)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
