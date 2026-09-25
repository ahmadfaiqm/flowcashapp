import { useState } from "react";
import { useTaxes } from "../hooks/useTaxes";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";

export function Taxes() {
  const { items, meta, page, setPage, search, setSearch, create, remove, isLoading } = useTaxes();
  const { showToast } = useToasts();
  const [form, setForm] = useState({ code: "", name: "", rate: "" });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      showToast("Kode dan nama wajib", "err");
      return;
    }
    const rateNum = Number(form.rate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      showToast("Rate harus 0-100", "err");
      return;
    }
    try {
      await create.mutateAsync({ code: form.code.trim(), name: form.name.trim(), rate: rateNum });
      showToast("Pajak ditambahkan");
      setForm({ code: "", name: "", rate: "" });
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
      <h2>Pajak</h2>
      <form onSubmit={onCreate} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="field" placeholder="Kode" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
        <input className="field" placeholder="Nama" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <input className="field" type="number" placeholder="Rate 0-100" value={form.rate} onChange={(e) => setForm((s) => ({ ...s, rate: e.target.value }))} />
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
            <th>Rate</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t: any) => (
            <tr key={t.id}>
              <td>{t.code}</td>
              <td>{t.name}</td>
              <td>{t.rate}</td>
              <td>
                <button className="link-btn" onClick={() => onDelete(t.id)}>
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
