import { useState } from "react";
import { usePeriods, useClosePeriod } from "../hooks/usePeriods";
import { getApiErrorMessage } from "../lib/api";
import { useToasts } from "../hooks/useToasts";

function monthName(m: number): string {
  if (m === 0) return "Tahunan";
  const names = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return names[m] ?? String(m);
}

export function Periods() {
  const { data: periods, isLoading, error } = usePeriods();
  const closePeriod = useClosePeriod();
  const { showToast } = useToasts();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  async function handleClose() {
    const label = month === 0 ? `tahun ${year}` : `${monthName(month)} ${year}`;
    if (!confirm(`Tutup periode ${label}? Jurnal pada periode tersebut tidak bisa ditambah/void.`)) return;
    try {
      await closePeriod.mutateAsync({ year: Number(year), month: Number(month) });
      showToast(`Periode ${label} ditutup`);
    } catch (e) {
      showToast(getApiErrorMessage(e), "err");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Periode Akuntansi</h1>
        <p className="page-subtitle">Tutup periode untuk mengunci jurnal — manual, tidak ada auto-lock</p>
      </div>

      <div className="panel">
        <h2 className="panel-title">Tutup Periode</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="field-label">Tahun</span>
            <input
              type="number"
              className="field"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || 2000)}
              min={2000}
              max={2100}
              style={{ width: 100 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="field-label">Bulan</span>
            <select className="field" value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ minWidth: 140 }}>
              <option value={0}>0 — Tahunan</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} — {monthName(m)}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-btn" onClick={handleClose} disabled={closePeriod.isPending}>
            {closePeriod.isPending ? "Menutup..." : "Tutup Periode"}
          </button>
        </div>
        <p className="empty-text" style={{ marginTop: 8 }}>
          Bulan = 0 untuk closing tahunan (jurnal penutup Revenue→3130→Expense→3120). Bulan 1-12 untuk lock bulanan.
        </p>
      </div>

      <div className="panel">
        <h2 className="panel-title">Daftar Periode</h2>
        {isLoading ? (
          <p className="empty-text">Memuat periode...</p>
        ) : error ? (
          <p className="empty-text" style={{ color: "var(--red)" }}>
            Gagal memuat: {String((error as Error)?.message ?? error)}
          </p>
        ) : !periods || periods.length === 0 ? (
          <p className="empty-text">Belum ada periode tertutup.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tahun</th>
                  <th>Bulan</th>
                  <th>Status</th>
                  <th>Ditutup pada</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Tahun">{p.year}</td>
                    <td data-label="Bulan">
                      {p.month === 0 ? "Tahunan" : `${p.month} — ${monthName(p.month)}`}
                    </td>
                    <td data-label="Status">
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 99,
                          fontSize: 12,
                          background: p.status === "closed" ? "#dcfce7" : "#fef3c7",
                          color: p.status === "closed" ? "#166534" : "#92400e",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td data-label="Ditutup pada">{p.closedAt ? new Date(p.closedAt).toLocaleString("id-ID") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
