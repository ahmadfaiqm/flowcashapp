import type { Account, AccountBalance, NetIncome } from "../types";
import { formatRupiah } from "../utils/format";
import { getHppBalance } from "../utils/accounting";

interface IncomeStatementProps {
  accounts: Account[];
  balances: Record<string, AccountBalance>;
  netIncome: NetIncome;
  periodLabel?: string;
}

export function IncomeStatement({ accounts, balances, netIncome, periodLabel }: IncomeStatementProps) {
  const pendapatan = [...accounts].filter((a) => a.category === "Pendapatan").sort((a, b) => a.code.localeCompare(b.code));
  const bebanAll = [...accounts].filter((a) => a.category === "Beban").sort((a, b) => a.code.localeCompare(b.code));

  const hppAcc = accounts.find((a) => a.code === "5010" || a.code === "5101" || a.name.toLowerCase().includes("hpp"));
  const hppBal = hppAcc ? getHppBalance(accounts, balances) : 0;
  const bebanLain = hppAcc ? bebanAll.filter((a) => a.id !== hppAcc.id) : bebanAll;

  const hasHpp = !!hppAcc;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Laporan Laba Rugi</h1>
        <p className="page-subtitle">
          Pendapatan dikurangi beban periode berjalan{periodLabel ? ` — ${periodLabel}` : ""}
        </p>
      </div>

      <div className="panel">
        <h2 className="panel-title">Pendapatan</h2>
        <div className="table-wrap">
          <table>
            <tbody>
              {pendapatan.length === 0 ? (
                <tr>
                  <td colSpan={2} className="empty-text" style={{ textAlign: "center" }}>Belum ada akun pendapatan</td>
                </tr>
              ) : (
                pendapatan.map((a) => (
                  <tr key={a.id}>
                    <td data-label="Nama akun">{a.name} <span className="td-mono" style={{ color: "var(--muted)", fontSize: 11 }}>{a.code}</span></td>
                    <td className="td-num" data-label="Saldo">{formatRupiah(balances[a.id]?.balance || 0)}</td>
                  </tr>
                ))
              )}
              <tr>
                <td data-label="Keterangan" style={{ fontWeight: 500, borderTop: "1px solid var(--line)" }}>Total pendapatan</td>
                <td className="td-num" data-label="Total" style={{ fontWeight: 500, borderTop: "1px solid var(--line)" }}>
                  {formatRupiah(netIncome.pendapatan)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel-title">Beban {hasHpp ? "— termasuk HPP (5010)" : ""}</h2>
        <div className="table-wrap">
          <table>
            <tbody>
              {hasHpp && hppAcc && (
                <>
                  <tr style={{ background: "var(--bg-soft, #f9fafb)" }}>
                    <td data-label="Nama akun">
                      <strong>{hppAcc.name}</strong> <span className="td-mono" style={{ color: "var(--muted)", fontSize: 11 }}>{hppAcc.code} — HPP</span>
                    </td>
                    <td className="td-num" data-label="Saldo" style={{ fontWeight: 500 }}>{formatRupiah(hppBal)}</td>
                  </tr>
                  {hppBal === 0 && (
                    <tr>
                      <td colSpan={2} style={{ fontSize: 11, color: "var(--muted)", paddingTop: 0 }}>
                        HPP 5010 muncul di sini. Jika penjualan tercatat, pastikan jurnal HPP (Persediaan → HPP) sudah dibuat atau penyesuaian manual telah diinput.
                      </td>
                    </tr>
                  )}
                </>
              )}
              {!hasHpp && (
                <tr>
                  <td colSpan={2} style={{ fontSize: 11, color: "var(--muted)" }}>
                    Akun HPP (5010) belum ada. Tambah akun dengan kode 5010 kategori Beban untuk menampilkan HPP sesuai SAK.
                  </td>
                </tr>
              )}
              {bebanLain.map((a) => (
                <tr key={a.id}>
                  <td data-label="Nama akun">{a.name} <span className="td-mono" style={{ color: "var(--muted)", fontSize: 11 }}>{a.code}</span></td>
                  <td className="td-num" data-label="Saldo">{formatRupiah(balances[a.id]?.balance || 0)}</td>
                </tr>
              ))}
              <tr>
                <td data-label="Keterangan" style={{ fontWeight: 500, borderTop: "1px solid var(--line)" }}>Total beban {hasHpp ? "(termasuk HPP)" : ""}</td>
                <td className="td-num" data-label="Total" style={{ fontWeight: 500, borderTop: "1px solid var(--line)" }}>
                  {formatRupiah(netIncome.beban)}
                </td>
              </tr>
              {hasHpp && (
                <tr>
                  <td data-label="Keterangan" style={{ fontSize: 12, color: "var(--muted)" }}>Beban di luar HPP</td>
                  <td className="td-num" data-label="Saldo" style={{ fontSize: 12, color: "var(--muted)" }}>
                    {formatRupiah(netIncome.beban - hppBal)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="grand-total-row">
          <span className="grand-total-label">{netIncome.laba >= 0 ? "Laba bersih" : "Rugi bersih"}</span>
          <span className="grand-total-value" style={{ color: netIncome.laba >= 0 ? "var(--green)" : "var(--red)" }}>
            {formatRupiah(Math.abs(netIncome.laba))}
          </span>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
          Laba = Total Pendapatan {formatRupiah(netIncome.pendapatan)} − Total Beban {formatRupiah(netIncome.beban)}
        </p>
      </div>
    </div>
  );
}
