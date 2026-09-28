import { useState } from "react";
import type { Account, AccountBalance } from "../types";
import { CATEGORY_INFO } from "../utils/accounting";
import { formatRupiah } from "../utils/format";
import { useWorksheet } from "../hooks/useWorksheet";

interface TrialBalanceProps {
  accounts: Account[];
  balances: Record<string, AccountBalance>;
}

export function TrialBalance({ accounts, balances }: TrialBalanceProps) {
  const [tab, setTab] = useState<"ns" | "nsd">("nsd");
  const { data: ws, isLoading: wsLoading } = useWorksheet();

  const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code));
  let totalDebit = 0;
  let totalCredit = 0;
  const rows = sorted
    .map((a) => {
      const bal = balances[a.id]?.balance || 0;
      const normal = CATEGORY_INFO[a.category].normal;
      const debit = normal === "debit" ? Math.max(bal, 0) : Math.max(-bal, 0);
      const credit = normal === "kredit" ? Math.max(bal, 0) : Math.max(-bal, 0);
      totalDebit += debit;
      totalCredit += credit;
      return { a, debit, credit };
    })
    .filter((r) => r.debit !== 0 || r.credit !== 0);

  // NSD derived from worksheet adjusted balances
  const nsdRows = ws?.rows
    ? [...ws.rows]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((r) => ({ code: r.code, name: r.name, debit: r.adjusted.debit, credit: r.adjusted.credit }))
        .filter((r) => r.debit !== 0 || r.credit !== 0)
    : [];
  const nsdTotalDebit = ws?.totals?.adjustedDebit ?? 0;
  const nsdTotalCredit = ws?.totals?.adjustedCredit ?? 0;
  const nsdBalanced = nsdTotalDebit === nsdTotalCredit;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Neraca Saldo</h1>
        <p className="page-subtitle">Ringkasan saldo akhir seluruh akun</p>
      </div>

      <div className="panel" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, border: "1px solid var(--line)", borderRadius: 8, padding: 4 }}>
          <button
            onClick={() => setTab("ns")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 13,
              background: tab === "ns" ? "var(--ink)" : "transparent",
              color: tab === "ns" ? "#fff" : "var(--ink)",
            }}
          >
            NS (Sebelum Penyesuaian)
          </button>
          <button
            onClick={() => setTab("nsd")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 13,
              background: tab === "nsd" ? "var(--ink)" : "transparent",
              color: tab === "nsd" ? "#fff" : "var(--ink)",
            }}
          >
            NSD (Setelah Penyesuaian)
          </button>
        </div>
        {tab === "nsd" && ws?.period && (ws.period.from || ws.period.to) && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Periode: {ws.period.from ?? "awal"} s.d. {ws.period.to ?? "akhir"}
          </span>
        )}
      </div>

      {tab === "ns" ? (
        <div className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama akun</th>
                  <th style={{ textAlign: "right" }}>Debit</th>
                  <th style={{ textAlign: "right" }}>Kredit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ a, debit, credit }) => (
                  <tr key={a.id}>
                    <td className="td-mono" data-label="Kode">{a.code}</td>
                    <td data-label="Nama akun">{a.name}</td>
                    <td className="td-num" data-label="Debit">{debit > 0 ? formatRupiah(debit) : ""}</td>
                    <td className="td-num" data-label="Kredit">{credit > 0 ? formatRupiah(credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} data-label="Total" style={{ fontWeight: 500, borderTop: "2px solid var(--ink)" }}>
                    Total
                  </td>
                  <td className="td-num" data-label="Total Debit" style={{ fontWeight: 500, borderTop: "2px solid var(--ink)" }}>
                    {formatRupiah(totalDebit)}
                  </td>
                  <td className="td-num" data-label="Total Kredit" style={{ fontWeight: 500, borderTop: "2px solid var(--ink)" }}>
                    {formatRupiah(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p style={{ fontSize: 12, color: totalDebit === totalCredit ? "var(--green)" : "var(--red)", marginTop: 8 }}>
            NS: {formatRupiah(totalDebit)} {totalDebit === totalCredit ? "=" : "≠"} {formatRupiah(totalCredit)}{" "}
            {totalDebit === totalCredit ? "— seimbang" : "— tidak seimbang, periksa kembali entri jurnal."}
          </p>
        </div>
      ) : (
        <div className="panel">
          {wsLoading ? (
            <p className="empty-text">Memuat NSD...</p>
          ) : !ws || nsdRows.length === 0 ? (
            <>
              <p className="empty-text">NSD belum tersedia. Pastikan ada jurnal posted untuk periode ini.</p>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama akun</th>
                      <th style={{ textAlign: "right" }}>Debit</th>
                      <th style={{ textAlign: "right" }}>Kredit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ a, debit, credit }) => (
                      <tr key={a.id} style={{ opacity: 0.6 }}>
                        <td className="td-mono">{a.code}</td>
                        <td>{a.name} (NS fallback)</td>
                        <td className="td-num">{debit > 0 ? formatRupiah(debit) : ""}</td>
                        <td className="td-num">{credit > 0 ? formatRupiah(credit) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama akun</th>
                      <th style={{ textAlign: "right" }}>Debit (NSD)</th>
                      <th style={{ textAlign: "right" }}>Kredit (NSD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nsdRows.map((r) => (
                      <tr key={r.code}>
                        <td className="td-mono" data-label="Kode">{r.code}</td>
                        <td data-label="Nama akun">{r.name}</td>
                        <td className="td-num" data-label="Debit">{r.debit > 0 ? formatRupiah(r.debit) : ""}</td>
                        <td className="td-num" data-label="Kredit">{r.credit > 0 ? formatRupiah(r.credit) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} data-label="Total" style={{ fontWeight: 500, borderTop: "2px solid var(--ink)" }}>
                        Total NSD
                      </td>
                      <td className="td-num" data-label="Total Debit" style={{ fontWeight: 500, borderTop: "2px solid var(--ink)" }}>
                        {formatRupiah(nsdTotalDebit)}
                      </td>
                      <td className="td-num" data-label="Total Kredit" style={{ fontWeight: 500, borderTop: "2px solid var(--ink)" }}>
                        {formatRupiah(nsdTotalCredit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p style={{ fontSize: 12, color: nsdBalanced ? "var(--green)" : "var(--red)", marginTop: 8 }}>
                NSD: {formatRupiah(nsdTotalDebit)} {nsdBalanced ? "=" : "≠"} {formatRupiah(nsdTotalCredit)}{" "}
                {nsdBalanced ? "— seimbang" : "— tidak seimbang, periksa jurnal penyesuaian."}
              </p>
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                NS: {formatRupiah(totalDebit)} {totalDebit === totalCredit ? "=" : "≠"} {formatRupiah(totalCredit)} — perbandingan NS vs NSD menunjukkan dampak penyesuaian.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
