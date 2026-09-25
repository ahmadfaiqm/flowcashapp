import { MonthlyChart } from "../components/MonthlyChart";
import type { JournalEntry, MonthlyPoint, NetIncome, Totals } from "../types";
import { formatDate, formatRupiah } from "../utils/format";

interface DashboardProps {
  totals: Totals;
  netIncome: NetIncome;
  monthlyData: MonthlyPoint[];
  entries: JournalEntry[];
  companyName: string;
}

export function Dashboard({ totals, netIncome, monthlyData, entries, companyName }: DashboardProps) {
  const cards = [
    { label: "Total aset", value: totals.aset, color: "var(--ink)" },
    { label: "Total kewajiban", value: totals.kewajiban, color: "var(--ink)" },
    { label: "Total ekuitas", value: totals.ekuitas, color: "var(--ink)" },
    {
      label: "Laba bersih berjalan",
      value: netIncome.laba,
      color: netIncome.laba >= 0 ? "var(--green)" : "var(--red)",
    },
  ];
  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dasbor</h1>
        <p className="page-subtitle">Ikhtisar keuangan {companyName}</p>
      </div>

      <div className="card-grid">
        {cards.map((c) => (
          <div key={c.label} className="metric-card">
            <div className="metric-label">{c.label}</div>
            <div className="metric-value" style={{ color: c.color }}>
              {formatRupiah(c.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2 className="panel-title">Pendapatan vs beban per bulan</h2>
        <MonthlyChart data={monthlyData} />
      </div>

      <div className="panel">
        <h2 className="panel-title">Transaksi terbaru</h2>
        {recent.length === 0 ? (
          <p className="empty-text">Belum ada transaksi.</p>
        ) : (
          <div className="table-wrap">
            <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th style={{ textAlign: "right" }}>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => {
                const total = e.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
                return (
                  <tr key={e.id}>
                    <td className="td-mono" data-label="Tanggal">{formatDate(e.date)}</td>
                    <td data-label="Keterangan">{e.desc}</td>
                    <td className="td-num" data-label="Nominal">{formatRupiah(total)}</td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
