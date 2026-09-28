import { useState } from "react";
import { useCapitalChange } from "../hooks/useCapitalChange";
import { useCapitalMovements, useCreateCapitalMovement } from "../hooks/useCapitalMovements";
import { formatRupiah } from "../utils/format";
import { formatDate } from "../utils/format";
import { getApiErrorMessage } from "../lib/api";
import { useToasts } from "../hooks/useToasts";

export function CapitalChange() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);
  const params = { from: from || undefined, to: to || undefined };
  const { data, isLoading, error } = useCapitalChange(params);
  const { data: movementsData } = useCapitalMovements(params);
  const createMovement = useCreateCapitalMovement();
  const { showToast } = useToasts();

  const [formDate, setFormDate] = useState(today);
  const [formType, setFormType] = useState("additional");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(formAmount);
    if (!formDate || !amount || amount <= 0) {
      showToast("Tanggal dan nominal wajib diisi", "err");
      return;
    }
    try {
      await createMovement.mutateAsync({ date: formDate, type: formType, amount, description: formDesc || undefined });
      showToast(formType === "prive" ? "Prive dicatat" : "Setoran dicatat");
      setFormAmount("");
      setFormDesc("");
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  const movements = data?.movements ?? movementsData ?? [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Laporan Perubahan Modal</h1>
        <p className="page-subtitle">Modal Awal + Setoran − Prive + Laba = Modal Akhir</p>
      </div>

      <div className="panel" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="field-label">Dari</span>
          <input type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="field-label">Sampai</span>
          <input type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {(from || to) && (
          <button
            className="link-btn"
            onClick={() => {
              setFrom(firstDay);
              setTo(lastDay);
            }}
          >
            Reset
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="empty-text">Memuat perubahan modal...</p>
      ) : error ? (
        <p className="empty-text" style={{ color: "var(--red)" }}>
          Gagal memuat: {String((error as Error)?.message ?? error)}
        </p>
      ) : !data ? (
        <p className="empty-text">Tidak ada data.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div className="panel" style={{ textAlign: "center" }}>
              <div className="field-label">Modal Awal</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{formatRupiah(Number(data.modalAwal) || 0)}</div>
            </div>
            <div className="panel" style={{ textAlign: "center", borderColor: "var(--green)" }}>
              <div className="field-label">Setoran</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--green)" }}>+ {formatRupiah(Number(data.setoran) || 0)}</div>
            </div>
            <div className="panel" style={{ textAlign: "center", borderColor: "var(--red)" }}>
              <div className="field-label">Prive</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--red)" }}>- {formatRupiah(Number(data.prive) || 0)}</div>
            </div>
            <div className="panel" style={{ textAlign: "center" }}>
              <div className="field-label">Laba Bersih</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: Number(data.labaBersih) >= 0 ? "var(--green)" : "var(--red)" }}>
                {formatRupiah(Number(data.labaBersih) || 0)}
              </div>
            </div>
            <div className="panel" style={{ textAlign: "center", background: "var(--ink)", color: "#fff" }}>
              <div className="field-label" style={{ color: "#fff", opacity: 0.8 }}>
                Modal Akhir
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{formatRupiah(Number(data.modalAkhir) || 0)}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                {formatRupiah(Number(data.modalAwal) || 0)} + {formatRupiah(Number(data.setoran) || 0)} −{" "}
                {formatRupiah(Number(data.prive) || 0)} + {formatRupiah(Number(data.labaBersih) || 0)}
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 className="panel-title">Pergerakan Modal</h2>
            {movements.length === 0 ? (
              <p className="empty-text">Belum ada pergerakan modal pada periode ini.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Jenis</th>
                      <th style={{ textAlign: "right" }}>Nominal</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td data-label="Tanggal">{formatDate(String(m.date).slice(0, 10))}</td>
                        <td data-label="Jenis">
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 99,
                              fontSize: 12,
                              background:
                                m.type === "prive" ? "#fee2e2" : m.type === "additional" ? "#dcfce7" : "#e0e7ff",
                              color: m.type === "prive" ? "#b91c1c" : m.type === "additional" ? "#166534" : "#3730a3",
                            }}
                          >
                            {m.type === "prive" ? "Prive" : m.type === "additional" ? "Setoran" : m.type}
                          </span>
                        </td>
                        <td className="td-num" data-label="Nominal">
                          {formatRupiah(Number(m.amount) || 0)}
                        </td>
                        <td data-label="Keterangan">{m.description ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <div className="panel">
        <h2 className="panel-title">Tambah Prive / Setoran</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="field-label">Tanggal</span>
            <input type="date" className="field" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="field-label">Jenis</span>
            <select className="field" value={formType} onChange={(e) => setFormType(e.target.value)}>
              <option value="additional">Setoran Modal</option>
              <option value="prive">Prive</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="field-label">Nominal</span>
            <input
              type="number"
              min="0"
              className="field"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0"
              style={{ textAlign: "right" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 180 }}>
            <span className="field-label">Keterangan</span>
            <input className="field" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Opsional" />
          </label>
          <button type="submit" className="primary-btn" disabled={createMovement.isPending}>
            {createMovement.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      </div>
    </div>
  );
}
