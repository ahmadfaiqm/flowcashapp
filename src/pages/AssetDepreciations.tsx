import { useState } from "react";
import { useAssetDepreciations } from "../hooks/useAssetDepreciations";
import { useFixedAssets } from "../hooks/useFixedAssets";

export function AssetDepreciations() {
  const [page, setPage] = useState(1);
  const [filterAssetId, setFilterAssetId] = useState("");
  const q = useAssetDepreciations(page, 20);
  const { items: assets } = useFixedAssets();
  const items: any[] = (q.data as any)?.data ?? [];
  const meta: any = (q.data as any)?.meta;
  const isLoading = q.isLoading;

  const filtered = filterAssetId ? items.filter((d: any) => String(d.fixedAssetId) === filterAssetId) : items;

  if (isLoading) return <p className="empty-text">Memuat...</p>;

  return (
    <div className="panel">
      <h2>Penyusutan Aset</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <select className="field" value={filterAssetId} onChange={(e) => setFilterAssetId(e.target.value)}>
          <option value="">Semua aset</option>
          {assets.map((a: any) => (
            <option key={a.id} value={String(a.id)}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Aset</th>
            <th>Tanggal</th>
            <th>Nominal</th>
            <th>Akumulasi</th>
            <th>Nilai Buku</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d: any) => (
            <tr key={d.id}>
              <td>{d.id}</td>
              <td>{d.fixedAssetId}</td>
              <td>{String(d.depreciationDate).slice(0, 10)}</td>
              <td>{d.depreciationAmount}</td>
              <td>{d.accumulatedAmount ?? "-"}</td>
              <td>{d.bookValue ?? "-"}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-text">
                Belum ada penyusutan
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
