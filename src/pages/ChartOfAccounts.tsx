import { useState } from "react";
import { CATEGORIES } from "../utils/accounting";
import type { Account, AccountBalance, Category } from "../types";
import { formatRupiah } from "../utils/format";

interface ChartOfAccountsProps {
  accounts: Account[];
  balances: Record<string, AccountBalance>;
  onAdd: (input: { code: string; name: string; category: Category }) => Promise<boolean>;
  onDelete: (id: string) => void;
}

export function ChartOfAccounts({ accounts, balances, onAdd, onDelete }: ChartOfAccountsProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Aset");

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const ok = await onAdd({ code, name, category });
    if (ok) {
      setCode("");
      setName("");
    }
  }

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: accounts.filter((a) => a.category === cat).sort((a, b) => a.code.localeCompare(b.code)),
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Daftar Akun</h1>
        <p className="page-subtitle">Struktur akun yang digunakan dalam pencatatan</p>
      </div>

      <form onSubmit={submit} className="inline-form">
        <div className="form-field">
          <label className="field-label">Kode</label>
          <input className="field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="1106" />
        </div>
        <div className="form-field grow">
          <label className="field-label">Nama akun</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama akun baru" />
        </div>
        <div className="form-field">
          <label className="field-label">Kategori</label>
          <select className="field" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="primary-btn">
          Tambah akun
        </button>
      </form>

      {grouped.map(({ cat, items }) => (
        <div key={cat} className="panel">
          <h2 className="panel-title">{cat}</h2>
          {items.length === 0 ? (
            <p className="empty-text">Belum ada akun pada kategori ini.</p>
          ) : (
            <div className="table-wrap">
              <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama akun</th>
                  <th style={{ textAlign: "right" }}>Saldo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="td-mono" data-label="Kode">{a.code}</td>
                    <td data-label="Nama akun">{a.name}</td>
                    <td className="td-num" data-label="Saldo">{formatRupiah(balances[a.id]?.balance || 0)}</td>
                    <td data-label="Aksi" style={{ textAlign: "right" }}>
                      <button className="link-btn" onClick={() => onDelete(a.id)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
