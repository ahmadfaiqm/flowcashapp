import { useState } from "react";
import { useWorksheet } from "../hooks/useWorksheet";
import { formatRupiah } from "../utils/format";

export function Worksheet() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);
  const { data, isLoading, error, refetch } = useWorksheet({ from: from || undefined, to: to || undefined });

  function exportCsv() {
    if (!data) return;
    const header = [
      "Kode",
      "Nama",
      "NS Debit",
      "NS Kredit",
      "Penyesuaian Debit",
      "Penyesuaian Kredit",
      "NSD Debit",
      "NSD Kredit",
      "L/R Debit",
      "L/R Kredit",
      "Neraca Debit",
      "Neraca Kredit",
    ];
    const rows = data.rows.map((r) =>
      [
        r.code,
        `"${r.name.replace(/"/g, '""')}"`,
        r.trial.debit,
        r.trial.credit,
        r.adjustment.debit,
        r.adjustment.credit,
        r.adjusted.debit,
        r.adjusted.credit,
        r.income.debit,
        r.income.credit,
        r.balanceSheet.debit,
        r.balanceSheet.credit,
      ].join(",")
    );
    const totals = data.totals;
    const footer = [
      "TOTAL",
      "",
      totals.trialDebit,
      totals.trialCredit,
      totals.adjustmentDebit,
      totals.adjustmentCredit,
      totals.adjustedDebit,
      totals.adjustedCredit,
      totals.incomeDebit,
      totals.incomeCredit,
      totals.balanceDebit,
      totals.balanceCredit,
    ].join(",");
    const csv = [header.join(","), ...rows, footer].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neraca-lajur-${from || "awal"}-${to || "akhir"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = data?.totals;
  const balancedTrial = totals ? totals.trialDebit === totals.trialCredit : true;
  const balancedAdj = totals ? totals.adjustmentDebit === totals.adjustmentCredit : true;
  const balancedNSD = totals ? totals.adjustedDebit === totals.adjustedCredit : true;
  const crossCheck = totals ? totals.incomeCredit - totals.incomeDebit : 0;
  const labaMatch = totals ? crossCheck === totals.netIncome : true;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Neraca Lajur 10 Kolom</h1>
        <p className="page-subtitle">NS — Penyesuaian — NSD — Laba/Rugi — Neraca</p>
      </div>

      <div className="panel" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="field-label">Dari</span>
          <input type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="field-label">Sampai</span>
          <input type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="primary-btn" onClick={() => refetch()}>
          Tampilkan
        </button>
        {(from || to) && (
          <button
            className="link-btn"
            onClick={() => {
              setFrom(firstDay);
              setTo(lastDay);
            }}
          >
            Reset
          </button>
        )}
        <button className="link-btn" onClick={exportCsv} disabled={!data}>
          Export CSV
        </button>
      </div>

      {isLoading ? (
        <p className="empty-text">Memuat neraca lajur...</p>
      ) : error ? (
        <p className="empty-text" style={{ color: "var(--red)" }}>
          Gagal memuat: {String((error as Error)?.message ?? error)}
        </p>
      ) : !data || data.rows.length === 0 ? (
        <p className="empty-text">Tidak ada data untuk periode ini.</p>
      ) : (
        <>
          <div className="panel">
            <div className="table-wrap" style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 1100 }}>
                <thead>
                  <tr>
                    <th rowSpan={2}>Kode</th>
                    <th rowSpan={2}>Nama Akun</th>
                    <th colSpan={2} style={{ textAlign: "center" }}>
                      Neraca Saldo
                    </th>
                    <th colSpan={2} style={{ textAlign: "center" }}>
                      Penyesuaian
                    </th>
                    <th colSpan={2} style={{ textAlign: "center" }}>
                      NSD
                    </th>
                    <th colSpan={2} style={{ textAlign: "center" }}>
                      Laba Rugi
                    </th>
                    <th colSpan={2} style={{ textAlign: "center" }}>
                      Neraca
                    </th>
                  </tr>
                  <tr>
                    <th style={{ textAlign: "right" }}>D</th>
                    <th style={{ textAlign: "right" }}>K</th>
                    <th style={{ textAlign: "right" }}>D</th>
                    <th style={{ textAlign: "right" }}>K</th>
                    <th style={{ textAlign: "right" }}>D</th>
                    <th style={{ textAlign: "right" }}>K</th>
                    <th style={{ textAlign: "right" }}>D</th>
                    <th style={{ textAlign: "right" }}>K</th>
                    <th style={{ textAlign: "right" }}>D</th>
                    <th style={{ textAlign: "right" }}>K</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.code}>
                      <td className="td-mono" data-label="Kode">
                        {r.code}
                      </td>
                      <td data-label="Nama">{r.name}</td>
                      <td className="td-num" data-label="NS D">
                        {r.trial.debit ? formatRupiah(r.trial.debit) : ""}
                      </td>
                      <td className="td-num" data-label="NS K">
                        {r.trial.credit ? formatRupiah(r.trial.credit) : ""}
                      </td>
                      <td className="td-num" data-label="Adj D">
                        {r.adjustment.debit ? formatRupiah(r.adjustment.debit) : ""}
                      </td>
                      <td className="td-num" data-label="Adj K">
                        {r.adjustment.credit ? formatRupiah(r.adjustment.credit) : ""}
                      </td>
                      <td className="td-num" data-label="NSD D">
                        {r.adjusted.debit ? formatRupiah(r.adjusted.debit) : ""}
                      </td>
                      <td className="td-num" data-label="NSD K">
                        {r.adjusted.credit ? formatRupiah(r.adjusted.credit) : ""}
                      </td>
                      <td className="td-num" data-label="L/R D">
                        {r.income.debit ? formatRupiah(r.income.debit) : ""}
                      </td>
                      <td className="td-num" data-label="L/R K">
                        {r.income.credit ? formatRupiah(r.income.credit) : ""}
                      </td>
                      <td className="td-num" data-label="Neraca D">
                        {r.balanceSheet.debit ? formatRupiah(r.balanceSheet.debit) : ""}
                      </td>
                      <td className="td-num" data-label="Neraca K">
                        {r.balanceSheet.credit ? formatRupiah(r.balanceSheet.credit) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      TOTAL
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      {formatRupiah(totals!.trialDebit)}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      {formatRupiah(totals!.trialCredit)}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      {formatRupiah(totals!.adjustmentDebit)}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      {formatRupiah(totals!.adjustmentCredit)}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      {formatRupiah(totals!.adjustedDebit)}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      {formatRupiah(totals!.adjustedCredit)}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      {formatRupiah(totals!.incomeDebit)}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      {formatRupiah(totals!.incomeCredit)}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      {formatRupiah(totals!.balanceDebit)}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                      {formatRupiah(totals!.balanceCredit)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 600 }}>
                      Laba Bersih
                    </td>
                    <td colSpan={4}></td>
                    <td colSpan={2}></td>
                    <td className="td-num" style={{ fontWeight: 600, color: "var(--green)" }}>
                      {totals!.netIncome >= 0 ? "" : formatRupiah(Math.abs(totals!.netIncome))}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, color: "var(--green)" }}>
                      {totals!.netIncome >= 0 ? formatRupiah(totals!.netIncome) : ""}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, color: "var(--green)" }}>
                      {totals!.netIncome >= 0 ? formatRupiah(totals!.netIncome) : ""}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, color: "var(--green)" }}>
                      {totals!.netIncome < 0 ? formatRupiah(Math.abs(totals!.netIncome)) : ""}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="panel">
            <h3 className="panel-title">Cross-check</h3>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
              <span style={{ color: balancedTrial ? "var(--green)" : "var(--red)" }}>
                NS: {formatRupiah(totals!.trialDebit)} {balancedTrial ? "=" : "≠"} {formatRupiah(totals!.trialCredit)}
              </span>
              <span style={{ color: balancedAdj ? "var(--green)" : "var(--red)" }}>
                Penyesuaian: {formatRupiah(totals!.adjustmentDebit)} {balancedAdj ? "=" : "≠"} {formatRupiah(totals!.adjustmentCredit)}
              </span>
              <span style={{ color: balancedNSD ? "var(--green)" : "var(--red)" }}>
                NSD: {formatRupiah(totals!.adjustedDebit)} {balancedNSD ? "=" : "≠"} {formatRupiah(totals!.adjustedCredit)}
              </span>
              <span style={{ color: labaMatch ? "var(--green)" : "var(--red)" }}>
                Laba: {formatRupiah(totals!.netIncome)} {labaMatch ? "(match)" : "(mismatch L/R)"}
              </span>
              <span>
                Neraca seimbang: {formatRupiah(totals!.balanceDebit + (totals!.netIncome >= 0 ? 0 : Math.abs(totals!.netIncome)))} vs{" "}
                {formatRupiah(totals!.balanceCredit + (totals!.netIncome >= 0 ? totals!.netIncome : 0))}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
