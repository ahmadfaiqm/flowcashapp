import { useState } from "react";
import { usePurchasePayments } from "../hooks/usePurchasePayments";
import { useSuppliers } from "../hooks/useSuppliers";
import { usePurchaseInvoices } from "../hooks/usePurchaseInvoices";
import { useCashBankAccounts } from "../hooks/useCashBankAccounts";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function PurchasePayments() {
  const { items, meta, page, setPage, create, isLoading } = usePurchasePayments();
  const { items: suppliers } = useSuppliers();
  const { items: invoices } = usePurchaseInvoices();
  const { items: accounts } = useCashBankAccounts();
  const { showToast } = useToasts();
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("");
  const [cashBankAccountId, setCashBankAccountId] = useState("");
  const [notes, setNotes] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentDate || !amount) {
      showToast("Tanggal dan nominal wajib", "err");
      return;
    }
    try {
      await create.mutateAsync({
        paymentDate,
        amount: Number(amount),
        paymentMethod,
        supplierId: supplierId ? Number(supplierId) : undefined,
        purchaseInvoiceId: purchaseInvoiceId ? Number(purchaseInvoiceId) : undefined,
        cashBankAccountId: cashBankAccountId ? Number(cashBankAccountId) : undefined,
        notes: notes || undefined,
      });
      showToast("Pembayaran beli dibuat");
      setPaymentDate(todayISO());
      setAmount("");
      setPaymentMethod("cash");
      setSupplierId("");
      setPurchaseInvoiceId("");
      setCashBankAccountId("");
      setNotes("");
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  if (isLoading) return <p className="empty-text">Memuat...</p>;

  return (
    <div className="panel">
      <h2>Pembayaran Beli</h2>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="field" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        <input className="field" type="number" placeholder="Nominal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select className="field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="cash">cash</option>
          <option value="bank_transfer">bank_transfer</option>
          <option value="e_wallet">e_wallet</option>
          <option value="other">other</option>
        </select>
        <select className="field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Pilih Supplier (opsional)</option>
          {suppliers.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.code} - {c.name}
            </option>
          ))}
        </select>
        <select className="field" value={purchaseInvoiceId} onChange={(e) => setPurchaseInvoiceId(e.target.value)}>
          <option value="">Pilih Faktur (opsional)</option>
          {invoices.map((inv: any) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoiceNo ?? inv.id} - {String(inv.invoiceDate).slice(0, 10)}
            </option>
          ))}
        </select>
        <select className="field" value={cashBankAccountId} onChange={(e) => setCashBankAccountId(e.target.value)}>
          <option value="">Pilih Kas/Bank (opsional)</option>
          {accounts.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input className="field" placeholder="Catatan" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="primary-btn" type="submit" disabled={create.isPending}>
          Buat Pembayaran
        </button>
      </form>

      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th>Nominal</th>
            <th>Metode</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r: any) => (
            <tr key={r.id}>
              <td>{r.paymentNo ?? r.id}</td>
              <td>{String(r.paymentDate).slice(0, 10)}</td>
              <td>{r.amount}</td>
              <td>{r.paymentMethod}</td>
              <td>{r.notes ?? "-"}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-text">
                Belum ada pembayaran
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {meta && (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Prev
          </button>
          <span>
            {page}/{meta.totalPages} ({meta.total})
          </span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
