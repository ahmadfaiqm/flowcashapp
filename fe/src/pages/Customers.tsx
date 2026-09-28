import { useState } from "react";
import { useCustomers } from "../hooks/useCustomers";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";

export function Customers() {
  const { items, meta, page, setPage, search, setSearch, create, remove, isLoading } = useCustomers();
  const { showToast } = useToasts();
  const [form, setForm] = useState({ code: "", name: "", phone: "", address: "", creditLimit: "" });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      showToast("Kode dan nama wajib", "err");
      return;
    }
    try {
      await create.mutateAsync({
        code: form.code.trim(),
        name: form.name.trim(),
        phone: form.phone || undefined,
        address: form.address || undefined,
        creditLimit: Number(form.creditLimit) || 0,
      });
      showToast("Pelanggan ditambahkan");
      setForm({ code: "", name: "", phone: "", address: "", creditLimit: "" });
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
      <h2>Pelanggan</h2>
      <form onSubmit={onCreate} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="field" placeholder="Kode" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
        <input className="field" placeholder="Nama" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <input className="field" placeholder="Telepon" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
        <input className="field" placeholder="Alamat" value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} />
        <input className="field" type="number" placeholder="Limit kredit" value={form.creditLimit} onChange={(e) => setForm((s) => ({ ...s, creditLimit: e.target.value }))} />
        <button className="primary-btn" type="submit" disabled={create.isPending}>
          Tambah
        </button>
      </form>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input className="field" placeholder="Cari" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Telepon</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c: any) => (
            <tr key={c.id}>
              <td>{c.code}</td>
              <td>{c.name}</td>
              <td>{c.phone ?? "-"}</td>
              <td>
                <button className="link-btn" onClick={() => onDelete(c.id)}>
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
