import { useEffect, useMemo, useState } from "react";
import type { Account, JournalEntry } from "../types";
import { computeLedgerRows } from "../utils/accounting";
import { formatDate, formatRupiah } from "../utils/format";

interface LedgerProps {
  accounts: Account[];
  entries: JournalEntry[];
}

export function Ledger({ accounts, entries }: LedgerProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");

  useEffect(() => {
    if (!accountId && accounts.length) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const rows = useMemo(() => computeLedgerRows(accounts, entries, accountId), [accounts, entries, accountId]);
  const sortedAccounts = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Buku Besar</h1>
        <p className="page-subtitle">Mutasi dan saldo berjalan per akun</p>
      </div>

      <div className="panel">
        <div className="form-field">
          <label className="field-label">Pilih akun</label>
          <select className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {sortedAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        {rows.length === 0 ? (
          <p className="empty-text">Belum ada mutasi untuk akun ini.</p>
        ) : (
          <div className="table-wrap">
            <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th style={{ textAlign: "right" }}>Debit</th>
                <th style={{ textAlign: "right" }}>Kredit</th>
                <th style={{ textAlign: "right" }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="td-mono" data-label="Tanggal">{formatDate(r.date)}</td>
                  <td data-label="Keterangan">{r.desc}</td>
                  <td className="td-num" data-label="Debit">{r.debit > 0 ? formatRupiah(r.debit) : ""}</td>
                  <td className="td-num" data-label="Kredit">{r.credit > 0 ? formatRupiah(r.credit) : ""}</td>
                  <td className="td-num" data-label="Saldo" style={{ fontWeight: 500 }}>
                    {formatRupiah(r.running)}
                  </td>
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
