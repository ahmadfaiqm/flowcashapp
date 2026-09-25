import type { Account, AccountBalance, NetIncome, Totals } from "../types";
import { formatRupiah } from "../utils/format";
import { useCapitalChange } from "../hooks/useCapitalChange";

interface BalanceSheetProps {
  accounts: Account[];
  balances: Record<string, AccountBalance>;
  netIncome: NetIncome;
  totals: Totals;
}

function findAcc(accounts: Account[], codes: string[]) {
  return accounts.find((a) => codes.includes(a.code));
}

export function BalanceSheet({ accounts, balances, netIncome, totals }: BalanceSheetProps) {
  const aset = accounts.filter((a) => a.category === "Aset");
  const kewajiban = accounts.filter((a) => a.category === "Kewajiban");
  const ekuitas = accounts.filter((a) => a.category === "Ekuitas");
  const seimbang = Math.round(totals.aset) === Math.round(totals.kewajiban + totals.ekuitas);

  const { data: cc } = useCapitalChange();

  const modalAcc = findAcc(accounts, ["3110", "3101"]);
  const priveAcc = findAcc(accounts, ["3111", "3102"]);
  const labaDitahanAcc = findAcc(accounts, ["3120"]);
  const ikhtisarAcc = findAcc(accounts, ["3130"]);

  const modalBal = modalAcc ? (balances[modalAcc.id]?.balance || 0) : 0;
  const priveBal = priveAcc ? (balances[priveAcc.id]?.balance || 0) : 0;
  const labaDitahanBal = labaDitahanAcc ? (balances[labaDitahanAcc.id]?.balance || 0) : 0;
  const ikhtisarBal = ikhtisarAcc ? (balances[ikhtisarAcc.id]?.balance || 0) : 0;

  // CapitalChange breakdown prefers backend data if available, else local balances
  const modalAwal = cc?.modalAwal ?? modalBal;
  const setoran = cc?.setoran ?? 0;
  const prive = cc?.prive ?? priveBal;
  // prive is stored positive in capitalChange (amount withdrawn), display as negative
  const labaTahunBerjalan = cc?.labaBersih ?? netIncome.laba;
  const modalAkhir = cc?.modalAkhir ?? totals.ekuitas;

  const totalEkuitasRinci = modalAwal + setoran - prive + labaDitahanBal + labaTahunBerjalan + (ikhtisarBal !== 0 ? ikhtisarBal : 0);
  // For display, if backend cc exists, trust modalAkhir; otherwise compute

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Neraca</h1>
        <p className="page-subtitle">Posisi aset, kewajiban, dan ekuitas</p>
      </div>

      <div className="balance-grid">
        <div className="panel">
          <h2 className="panel-title">Aset</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                {aset.map((a) => (
                  <tr key={a.id}>
                    <td data-label="Nama akun">{a.name} <span className="td-mono" style={{ color: "var(--muted)", fontSize: 11 }}> {a.code}</span></td>
                    <td className="td-num" data-label="Saldo">{formatRupiah(balances[a.id]?.balance || 0)}</td>
                  </tr>
                ))}
                <tr>
                  <td data-label="Keterangan" style={{ fontWeight: 500, borderTop: "2px solid var(--ink)" }}>Total aset</td>
                  <td className="td-num" data-label="Total" style={{ fontWeight: 500, borderTop: "2px solid var(--ink)" }}>
                    {formatRupiah(totals.aset)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="panel">
            <h2 className="panel-title">Kewajiban</h2>
            <div className="table-wrap">
              <table>
                <tbody>
                  {kewajiban.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Nama akun">{a.name} <span className="td-mono" style={{ color: "var(--muted)", fontSize: 11 }}> {a.code}</span></td>
                      <td className="td-num" data-label="Saldo">{formatRupiah(balances[a.id]?.balance || 0)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td data-label="Keterangan" style={{ fontWeight: 500, borderTop: "1px solid var(--line)" }}>Total kewajiban</td>
                    <td className="td-num" data-label="Total" style={{ fontWeight: 500, borderTop: "1px solid var(--line)" }}>
                      {formatRupiah(totals.kewajiban)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <h2 className="panel-title">Ekuitas</h2>
            <div className="table-wrap">
              <table>
                <tbody>
                  {ekuitas.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Nama akun">{a.name} <span className="td-mono" style={{ color: "var(--muted)", fontSize: 11 }}> {a.code}</span></td>
                      <td className="td-num" data-label="Saldo">{formatRupiah(balances[a.id]?.balance || 0)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td data-label="Nama akun">Laba tahun berjalan</td>
                    <td className="td-num" data-label="Saldo">{formatRupiah(netIncome.laba)}</td>
                  </tr>
                  <tr>
                    <td data-label="Keterangan" style={{ fontWeight: 500, borderTop: "1px solid var(--line)" }}>Total ekuitas</td>
                    <td className="td-num" data-label="Total" style={{ fontWeight: 500, borderTop: "1px solid var(--line)" }}>
                      {formatRupiah(totals.ekuitas)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel-title">Rincian Modal (SAK) — 3110 · 3111 · 3120 · Laba</h2>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
          {cc ? `Periode: ${cc.period.from ?? "awal"} s.d. ${cc.period.to ?? "akhir"}` : "Rincian berdasarkan saldo akun lokal (backend capital-change belum tersedia)"}
        </p>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr>
                <td data-label="Keterangan">3110 Modal {modalAcc ? `(${modalAcc.code} ${modalAcc.name})` : ""}</td>
                <td className="td-num" data-label="Saldo">{formatRupiah(modalAwal)}</td>
              </tr>
              {setoran !== 0 && (
                <tr>
                  <td data-label="Keterangan">Setoran tambahan (periode berjalan)</td>
                  <td className="td-num" data-label="Saldo" style={{ color: "var(--green)" }}>+ {formatRupiah(setoran)}</td>
                </tr>
              )}
              <tr>
                <td data-label="Keterangan">3111 Prive {priveAcc ? `(${priveAcc.code} ${priveAcc.name})` : ""} {prive !== 0 ? "— contra ekuitas (negatif)" : ""}</td>
                <td className="td-num" data-label="Saldo" style={{ color: prive !== 0 ? "var(--red)" : undefined }}>
                  {prive !== 0 ? `- ${formatRupiah(prive)}` : formatRupiah(0)}
                </td>
              </tr>
              <tr>
                <td data-label="Keterangan">3120 Laba Ditahan {labaDitahanAcc ? `(${labaDitahanAcc.code})` : ""}</td>
                <td className="td-num" data-label="Saldo">{formatRupiah(labaDitahanBal)}</td>
              </tr>
              {ikhtisarAcc && ikhtisarBal !== 0 && (
                <tr>
                  <td data-label="Keterangan">3130 Ikhtisar Laba Rugi ({ikhtisarAcc.code})</td>
                  <td className="td-num" data-label="Saldo">{formatRupiah(ikhtisarBal)}</td>
                </tr>
              )}
              <tr>
                <td data-label="Keterangan">Laba tahun berjalan</td>
                <td className="td-num" data-label="Saldo" style={{ color: labaTahunBerjalan >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500 }}>
                  {formatRupiah(labaTahunBerjalan)}
                </td>
              </tr>
              <tr>
                <td data-label="Keterangan" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>Total Ekuitas (rincian)</td>
                <td className="td-num" data-label="Total" style={{ fontWeight: 600, borderTop: "2px solid var(--ink)" }}>
                  {formatRupiah(cc ? modalAkhir : totalEkuitasRinci)}
                </td>
              </tr>
              {!cc && (
                <tr>
                  <td colSpan={2} style={{ fontSize: 11, color: "var(--muted)", paddingTop: 6 }}>
                    Rumus: Modal Awal + Setoran − Prive + Laba Ditahan + Laba Berjalan {ikhtisarBal !== 0 ? "+ Ikhtisar" : ""} = Total Ekuitas. Jika backend capital-change tersedia, modal akhir diambil dari sana.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {cc && (
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
            Cross-check: Modal Awal {formatRupiah(modalAwal)} + Setoran {formatRupiah(setoran)} − Prive {formatRupiah(prive)} + Laba {formatRupiah(labaTahunBerjalan)} = {formatRupiah(modalAkhir)} (modal akhir)
          </p>
        )}
      </div>

      <div className="panel">
        <div className="grand-total-row">
          <span className="grand-total-label">Aset vs kewajiban + ekuitas</span>
          <span className="grand-total-value" style={{ color: seimbang ? "var(--green)" : "var(--red)" }}>
            {formatRupiah(totals.aset)} {seimbang ? "=" : "≠"} {formatRupiah(totals.kewajiban + totals.ekuitas)}
          </span>
        </div>
        {!seimbang && (
          <p style={{ fontSize: 12, color: "var(--red)", marginTop: 6 }}>
            Neraca tidak seimbang — selisih {formatRupiah(Math.abs(totals.aset - (totals.kewajiban + totals.ekuitas)))}. Periksa jurnal atau periode closing.
          </p>
        )}
      </div>
    </div>
  );
}
