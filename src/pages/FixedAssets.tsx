import { useState } from "react";
import { useFixedAssets } from "../hooks/useFixedAssets";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function FixedAssets() {
  const { items, meta, page, setPage, isLoading, create, remove, depreciate } = useFixedAssets();
  const { showToast } = useToasts();
  const [form, setForm] = useState({
    code: "",
    name: "",
    acquisitionDate: todayISO(),
    acquisitionCost: "",
    usefulLifeMonths: "",
    residualValue: "",
  });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim() || !form.acquisitionDate || !form.acquisitionCost || !form.usefulLifeMonths) {
      showToast("Kode, nama, tanggal perolehan, biaya, dan umur manfaat wajib", "err");
      return;
    }
    try {
      await create.mutateAsync({
        code: form.code.trim(),
        name: form.name.trim(),
        acquisitionDate: form.acquisitionDate,
        acquisitionCost: Number(form.acquisitionCost),
        usefulLifeMonths: Number(form.usefulLifeMonths),
        residualValue: form.residualValue ? Number(form.residualValue) : undefined,
      });
      showToast("Aset tetap ditambahkan");
      setForm({ code: "", name: "", acquisitionDate: todayISO(), acquisitionCost: "", usefulLifeMonths: "", residualValue: "" });
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Hapus aset?")) return;
    try {
      await remove.mutateAsync(id);
      showToast("Aset dihapus");
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  async function onDepreciate(id: number) {
    const date = prompt("Tanggal penyusutan (YYYY-MM-DD)", todayISO());
    if (!date) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      showToast("Format tanggal harus YYYY-MM-DD", "err");
      return;
    }
    // BE hanya validasi depreciationDate; nominal auto dihitung backend
    const amountStr = prompt("Nominal penyusutan (kosongkan untuk auto)", "");
    if (amountStr && amountStr.trim() && isNaN(Number(amountStr))) {
      showToast("Nominal tidak valid (akan diabaikan, backend auto)", "err");
      return;
    }
    try {
      await depreciate.mutateAsync({ id, depreciationDate: date });
      showToast("Penyusutan berhasil");
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  if (isLoading) return <p className="empty-text">Memuat...</p>;

  return (
    <div className="panel">
      <h2>Aset Tetap</h2>
      <form onSubmit={onCreate} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="field" placeholder="Kode" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
        <input className="field" placeholder="Nama" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <input className="field" type="date" value={form.acquisitionDate} onChange={(e) => setForm((s) => ({ ...s, acquisitionDate: e.target.value }))} />
        <input className="field" type="number" placeholder="Biaya perolehan" value={form.acquisitionCost} onChange={(e) => setForm((s) => ({ ...s, acquisitionCost: e.target.value }))} />
        <input className="field" type="number" placeholder="Umur manfaat (bulan)" value={form.usefulLifeMonths} onChange={(e) => setForm((s) => ({ ...s, usefulLifeMonths: e.target.value }))} />
        <input className="field" type="number" placeholder="Nilai residu (opsional)" value={form.residualValue} onChange={(e) => setForm((s) => ({ ...s, residualValue: e.target.value }))} />
        <button className="primary-btn" type="submit" disabled={create.isPending}>
          Tambah
        </button>
      </form>

      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Tgl Perolehan</th>
            <th>Biaya</th>
            <th>Umur (bln)</th>
            <th>Nilai Buku</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a: any) => (
            <tr key={a.id}>
              <td>{a.code}</td>
              <td>{a.name}</td>
              <td>{String(a.acquisitionDate).slice(0, 10)}</td>
              <td>{a.acquisitionCost}</td>
              <td>{a.usefulLifeMonths}</td>
              <td>{a.bookValue ?? "-"}</td>
              <td style={{ display: "flex", gap: 8 }}>
                <button className="link-btn" onClick={() => onDepreciate(a.id)} disabled={depreciate.isPending}>
                  Susutkan
                </button>
                <button className="link-btn" onClick={() => onDelete(a.id)}>
                  Hapus
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="empty-text">
                Belum ada aset tetap
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
