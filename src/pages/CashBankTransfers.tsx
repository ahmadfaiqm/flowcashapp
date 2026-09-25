import { useState } from "react";
import { useCashBankTransfers } from "../hooks/useCashBankTransfers";
import { useCashBankAccounts } from "../hooks/useCashBankAccounts";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CashBankTransfers() {
  const { items, isLoading, transfer } = useCashBankTransfers();
  const { items: accounts } = useCashBankAccounts();
  const { showToast } = useToasts();
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [transferDate, setTransferDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromAccountId || !toAccountId || !amount || !transferDate) {
      showToast("Akun asal, tujuan, nominal, dan tanggal wajib", "err");
      return;
    }
    if (fromAccountId === toAccountId) {
      showToast("Akun asal dan tujuan harus berbeda", "err");
      return;
    }
    try {
      await transfer.mutateAsync({
        fromAccountId: Number(fromAccountId),
        toAccountId: Number(toAccountId),
        amount: Number(amount),
        transferDate,
        notes: notes || undefined,
      });
      showToast("Transfer berhasil");
      setFromAccountId("");
      setToAccountId("");
      setAmount("");
      setTransferDate(todayISO());
      setNotes("");
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  if (isLoading) return <p className="empty-text">Memuat...</p>;

  return (
    <div className="panel">
      <h2>Transfer Kas</h2>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select className="field" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)}>
          <option value="">Dari Akun</option>
          {accounts.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.name} {a.accountNumber ? `(${a.accountNumber})` : ""}
            </option>
          ))}
        </select>
        <select className="field" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
          <option value="">Ke Akun</option>
          {accounts.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.name} {a.accountNumber ? `(${a.accountNumber})` : ""}
            </option>
          ))}
        </select>
        <input className="field" type="number" placeholder="Nominal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="field" type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
        <input className="field" placeholder="Catatan" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="primary-btn" type="submit" disabled={transfer.isPending}>
          Transfer
        </button>
      </form>

      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tanggal</th>
            <th>Dari</th>
            <th>Ke</th>
            <th>Nominal</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t: any) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{String(t.transferDate ?? t.createdAt ?? "").slice(0, 10)}</td>
              <td>{t.fromAccount?.name ?? t.fromAccountId ?? "-"}</td>
              <td>{t.toAccount?.name ?? t.toAccountId ?? "-"}</td>
              <td>{t.amount}</td>
              <td>{t.notes ?? "-"}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-text">
                Belum ada transfer
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
