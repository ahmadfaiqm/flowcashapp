import { useState } from "react";
import { usePurchaseInvoices } from "../hooks/usePurchaseInvoices";
import { useSuppliers } from "../hooks/useSuppliers";
import { useProducts } from "../hooks/useProducts";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";

type Line = { productId: string; quantity: string; unitPrice: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function PurchaseInvoices() {
  const { items, meta, page, setPage, create, isLoading } = usePurchaseInvoices();
  const { items: suppliers } = useSuppliers();
  const { items: products } = useProducts();
  const { showToast } = useToasts();
  const [supplierId, setSupplierId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1", unitPrice: "" }]);

  function addLine() {
    setLines((s) => [...s, { productId: "", quantity: "1", unitPrice: "" }]);
  }
  function removeLine(idx: number) {
    setLines((s) => s.filter((_, i) => i !== idx));
  }
  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((s) => s.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceDate) {
      showToast("Tanggal faktur wajib", "err");
      return;
    }
    const parsedLines = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) || 0 }));
    if (parsedLines.length === 0) {
      showToast("Minimal satu baris produk", "err");
      return;
    }
    try {
      await create.mutateAsync({
        supplierId: supplierId ? Number(supplierId) : undefined,
        invoiceDate,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        lines: parsedLines,
      });
      showToast("Faktur beli dibuat");
      setSupplierId("");
      setInvoiceDate(todayISO());
      setDueDate("");
      setNotes("");
      setLines([{ productId: "", quantity: "1", unitPrice: "" }]);
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  if (isLoading) return <p className="empty-text">Memuat...</p>;

  return (
    <div className="panel">
      <h2>Faktur Beli</h2>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select className="field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Pilih Supplier (opsional)</option>
            {suppliers.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
          <input className="field" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          <input className="field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="Jatuh tempo" />
        </div>
        <input className="field" placeholder="Catatan" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div>
          <h4 style={{ margin: "8px 0" }}>Baris Produk</h4>
          {lines.map((line, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <select className="field" value={line.productId} onChange={(e) => updateLine(idx, { productId: e.target.value })}>
                <option value="">Pilih Produk</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
              <input
                className="field"
                type="number"
                placeholder="Qty"
                value={line.quantity}
                onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                style={{ width: 90 }}
              />
              <input
                className="field"
                type="number"
                placeholder="Harga satuan"
                value={line.unitPrice}
                onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                style={{ width: 140 }}
              />
              <button type="button" className="link-btn" onClick={() => removeLine(idx)} disabled={lines.length <= 1}>
                Hapus
              </button>
            </div>
          ))}
          <button type="button" className="link-btn" onClick={addLine}>
            + Tambah Baris
          </button>
        </div>
        <button className="primary-btn" type="submit" disabled={create.isPending} style={{ alignSelf: "flex-start" }}>
          Buat Faktur
        </button>
      </form>

      <table className="table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th>Supplier</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((inv: any) => (
            <tr key={inv.id}>
              <td>{inv.invoiceNo ?? inv.id}</td>
              <td>{String(inv.invoiceDate).slice(0, 10)}</td>
              <td>{inv.supplier?.name ?? inv.supplierId ?? "-"}</td>
              <td>{inv.totalAmount ?? "-"}</td>
              <td>{inv.status ?? "-"}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-text">
                Belum ada faktur
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
