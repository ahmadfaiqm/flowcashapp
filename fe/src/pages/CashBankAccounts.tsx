import { useState } from "react";
import { useCashBankAccounts } from "../hooks/useCashBankAccounts";
import { useAccounts } from "../hooks/useAccounts";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";

export function CashBankAccounts() {
  const { items, meta, page, setPage, create, remove, isLoading } = useCashBankAccounts();
  const { accounts } = useAccounts();
  const { showToast } = useToasts();
  const [form, setForm] = useState({ coaId: "", name: "", accountNumber: "", bankName: "", openingBalance: "" });

  const assetAccounts = accounts.filter((a) => a.category === "Aset");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.coaId || !form.name.trim()) {
      showToast("CoA dan nama wajib", "err");
      return;
    }
    try {
      await create.mutateAsync({
        coaId: Number(form.coaId),
        name: form.name.trim(),
        accountNumber: form.accountNumber || undefined,
        bankName: form.bankName || undefined,
        openingBalance: Number(form.openingBalance) || 0,
      });
      showToast("Akun kas/bank ditambahkan");
      setForm({ coaId: "", name: "", accountNumber: "", bankName: "", openingBalance: "" });
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Hapus?")) return;
    try {
      await remove.mutateAsync(id);
      showToast("Dihapus");
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  if (isLoading) return <p className="empty-text">Memuat...</p>;

  return (
    <div className="panel">
      <h2>Kas & Bank</h2>
      <form onSubmit={onCreate} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select className="field" value={form.coaId} onChange={(e) => setForm((s) => ({ ...s, coaId: e.target.value }))}>
          <option value="">Pilih CoA (Aset)</option>
          {assetAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>
        <input className="field" placeholder="Nama" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <input className="field" placeholder="No. Rekening" value={form.accountNumber} onChange={(e) => setForm((s) => ({ ...s, accountNumber: e.target.value }))} />
        <input className="field" placeholder="Bank" value={form.bankName} onChange={(e) => setForm((s) => ({ ...s, bankName: e.target.value }))} />
        <input className="field" type="number" placeholder="Saldo awal" value={form.openingBalance} onChange={(e) => setForm((s) => ({ ...s, openingBalance: e.target.value }))} />
        <button className="primary-btn" type="submit" disabled={create.isPending}>
          Tambah
        </button>
      </form>
      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Nama</th>
            <th>No. Rekening</th>
            <th>Bank</th>
            <th>Saldo Awal</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a: any) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.accountNumber ?? "-"}</td>
              <td>{a.bankName ?? "-"}</td>
              <td>{a.openingBalance}</td>
              <td>
                <button className="link-btn" onClick={() => onDelete(a.id)}>
                  Hapus
                </button>
              </td>
            </tr>
          ))}
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
