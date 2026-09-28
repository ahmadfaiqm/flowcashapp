import { useState } from "react";
import type { Account, JournalEntry, JournalLine } from "../types";
import { formatDate, formatRupiah } from "../utils/format";

interface DraftLine {
  accountId: string;
  debit: string;
  credit: string;
}

function emptyLine(): DraftLine {
  return { accountId: "", debit: "", credit: "" };
}

interface GeneralJournalProps {
  accounts: Account[];
  entries: JournalEntry[];
  onAdd: (input: { date: string; desc: string; lines: JournalLine[]; isAdjustment?: boolean; adjustmentType?: string }) => Promise<boolean>;
  onDelete: (id: string) => void;
}

export function GeneralJournal({ accounts, entries, onAdd, onDelete }: GeneralJournalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [desc, setDesc] = useState("");
  const [isAdjustment, setIsAdjustment] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState("other");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  function updateLine(idx: number, field: "accountId" | "debit" | "credit", value: string) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const journalLines: JournalLine[] = lines.map((l) => ({
      accountId: l.accountId,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
    }));
    const ok = await onAdd({
      date,
      desc,
      lines: journalLines,
      isAdjustment,
      adjustmentType: isAdjustment ? adjustmentType : undefined,
    });
    if (ok) {
      setDesc("");
      setLines([emptyLine(), emptyLine()]);
      setIsAdjustment(false);
      setAdjustmentType("other");
    }
  }

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Jurnal Umum</h1>
        <p className="page-subtitle">Catat transaksi dengan mekanisme debit dan kredit</p>
      </div>

      <form onSubmit={submit} className="panel">
        <div className="journal-head-row">
          <div className="form-field">
            <label className="field-label">Tanggal</label>
            <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label className="field-label">Keterangan</label>
            <input
              className="field"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Contoh: Pembayaran sewa bulan ini"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={isAdjustment} onChange={(e) => setIsAdjustment(e.target.checked)} />
            Jurnal Penyesuaian
          </label>
          {isAdjustment && (
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="field-label" style={{ margin: 0 }}>
                Tipe
              </span>
              <select className="field" value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)} style={{ minWidth: 180 }}>
                <option value="supplies">supplies</option>
                <option value="depreciation">depreciation</option>
                <option value="prepaidExpense">prepaidExpense</option>
                <option value="unearnedRevenue">unearnedRevenue</option>
                <option value="accruedExpense">accruedExpense</option>
                <option value="accruedRevenue">accruedRevenue</option>
                <option value="other">other</option>
              </select>
            </label>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Akun</th>
                <th style={{ textAlign: "right" }}>Debit</th>
                <th style={{ textAlign: "right" }}>Kredit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td data-label="Akun">
                    <select className="field" value={l.accountId} onChange={(e) => updateLine(idx, "accountId", e.target.value)}>
                      <option value="">Pilih akun</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Debit">
                    <input
                      type="number"
                      min="0"
                      className="field"
                      style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}
                      value={l.debit}
                      placeholder="0"
                      onChange={(e) => updateLine(idx, "debit", e.target.value)}
                      disabled={Number(l.credit) > 0}
                    />
                  </td>
                  <td data-label="Kredit">
                    <input
                      type="number"
                      min="0"
                      className="field"
                      style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}
                      value={l.credit}
                      placeholder="0"
                      onChange={(e) => updateLine(idx, "credit", e.target.value)}
                      disabled={Number(l.debit) > 0}
                    />
                  </td>
                  <td data-label="Aksi" style={{ textAlign: "right" }}>
                    {lines.length > 2 && (
                      <button type="button" className="link-btn" onClick={() => removeLine(idx)}>
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td data-label="">
                  <button type="button" className="link-btn" onClick={addLine}>
                    + Tambah baris
                  </button>
                </td>
                <td className="td-num" data-label="Total Debit" style={{ borderTop: "2px solid var(--ink)" }}>
                  {formatRupiah(totalDebit)}
                </td>
                <td className="td-num" data-label="Total Kredit" style={{ borderTop: "2px solid var(--ink)" }}>
                  {formatRupiah(totalCredit)}
                </td>
                <td data-label=""></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="journal-footer">
          <span style={{ fontSize: 13, color: balanced ? "var(--green)" : "var(--red)" }}>
            {balanced ? "Seimbang, siap disimpan" : `Selisih ${formatRupiah(Math.abs(totalDebit - totalCredit))}`}
          </span>
          <button type="submit" className="primary-btn">
            {isAdjustment ? "Simpan Penyesuaian" : "Simpan transaksi"}
          </button>
        </div>
      </form>

      <div className="panel">
        <h2 className="panel-title">Riwayat transaksi</h2>
        {sorted.length === 0 ? (
          <p className="empty-text">Belum ada transaksi.</p>
        ) : (
          sorted.map((e) => (
            <div key={e.id} className="journal-entry-card">
              <div className="journal-entry-head">
                <div>
                  <div className="journal-entry-date">{formatDate(e.date)}</div>
                  <div className="journal-entry-desc">{e.desc}</div>
                </div>
                <button className="link-btn" onClick={() => onDelete(e.id)}>
                  Hapus
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <tbody>
                    {e.lines.map((l, i) => {
                      const acc = accounts.find((a) => a.id === l.accountId);
                      return (
                        <tr key={i}>
                          <td data-label="Akun" style={{ paddingLeft: Number(l.debit) > 0 ? 0 : 24 }}>
                            {acc ? `${acc.code} ${acc.name}` : "Akun tidak ditemukan"}
                          </td>
                          <td className="td-num" data-label="Debit">{Number(l.debit) > 0 ? formatRupiah(l.debit) : ""}</td>
                          <td className="td-num" data-label="Kredit">{Number(l.credit) > 0 ? formatRupiah(l.credit) : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
