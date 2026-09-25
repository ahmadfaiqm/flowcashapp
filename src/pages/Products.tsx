import { useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";

export function Products() {
  const { items, meta, page, setPage, search, setSearch, create, remove, isLoading } = useProducts();
  const { showToast } = useToasts();
  const [form, setForm] = useState({ sku: "", name: "", unit: "", purchasePrice: "", sellingPrice: "" });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sku.trim() || !form.name.trim()) {
      showToast("SKU dan nama wajib", "err");
      return;
    }
    try {
      await create.mutateAsync({
        sku: form.sku.trim(),
        name: form.name.trim(),
        unit: form.unit || undefined,
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
      });
      showToast("Produk ditambahkan");
      setForm({ sku: "", name: "", unit: "", purchasePrice: "", sellingPrice: "" });
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
      <h2>Produk</h2>
      <form onSubmit={onCreate} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="field" placeholder="SKU" value={form.sku} onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))} />
        <input className="field" placeholder="Nama" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <input className="field" placeholder="Unit" value={form.unit} onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))} />
        <input className="field" type="number" placeholder="Harga beli" value={form.purchasePrice} onChange={(e) => setForm((s) => ({ ...s, purchasePrice: e.target.value }))} />
        <input className="field" type="number" placeholder="Harga jual" value={form.sellingPrice} onChange={(e) => setForm((s) => ({ ...s, sellingPrice: e.target.value }))} />
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
            <th>SKU</th>
            <th>Nama</th>
            <th>Stok</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p: any) => (
            <tr key={p.id}>
              <td>{p.sku}</td>
              <td>{p.name}</td>
              <td>{p.stock}</td>
              <td>
                <button className="link-btn" onClick={() => onDelete(p.id)}>
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
