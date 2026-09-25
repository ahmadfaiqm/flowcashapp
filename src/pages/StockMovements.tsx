import { useState } from "react";
import { useStockMovements } from "../hooks/useStockMovements";
import { useProducts } from "../hooks/useProducts";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";

export function StockMovements() {
  const { items, meta, page, setPage, isLoading, createAdjustment } = useStockMovements();
  const { items: products } = useProducts();
  const { showToast } = useToasts();
  const [form, setForm] = useState({ productId: "", quantity: "", unitCost: "", movementType: "in", notes: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productId || !form.quantity) {
      showToast("Produk dan qty wajib", "err");
      return;
    }
    try {
      let qty = Number(form.quantity);
      if (form.movementType === "out") qty = -Math.abs(qty);
      if (form.movementType === "in") qty = Math.abs(qty);
      if (qty === 0) { showToast("Qty tidak boleh 0", "err"); return; }
      await createAdjustment.mutateAsync({
        productId: Number(form.productId),
        quantity: qty,
        unitCost: form.unitCost ? Number(form.unitCost) : undefined,
        movementType: form.movementType,
        notes: form.notes || undefined,
      });
      showToast("Pergerakan stok dibuat");
      setForm({ productId: "", quantity: "", unitCost: "", movementType: "in", notes: "" });
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  if (isLoading) return <p className="empty-text">Memuat...</p>;

  return (
    <div className="panel">
      <h2>Stok</h2>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select className="field" value={form.productId} onChange={(e) => setForm((s) => ({ ...s, productId: e.target.value }))}>
          <option value="">Pilih Produk</option>
          {products.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.sku} - {p.name} (stok {p.stock})
            </option>
          ))}
        </select>
        <input
          className="field"
          type="number"
          placeholder="Qty"
          value={form.quantity}
          onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))}
        />
        <input
          className="field"
          type="number"
          placeholder="Unit cost"
          value={form.unitCost}
          onChange={(e) => setForm((s) => ({ ...s, unitCost: e.target.value }))}
        />
        <select className="field" value={form.movementType} onChange={(e) => setForm((s) => ({ ...s, movementType: e.target.value }))}>
          <option value="in">in</option>
          <option value="out">out</option>
          <option value="adjustment">adjustment</option>
        </select>
        <input className="field" placeholder="Catatan" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
        <button className="primary-btn" type="submit" disabled={createAdjustment.isPending}>
          Simpan
        </button>
      </form>

      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Produk</th>
            <th>Qty</th>
            <th>Tipe</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m: any) => (
            <tr key={m.id}>
              <td>{String(m.movementDate ?? m.createdAt ?? "").slice(0, 10)}</td>
              <td>{m.product?.name ?? m.productId}</td>
              <td>{m.quantity}</td>
              <td>{m.movementType}</td>
              <td>{m.notes ?? "-"}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-text">
                Belum ada pergerakan
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
