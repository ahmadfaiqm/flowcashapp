import { useState } from "react";
import { useUsers } from "../hooks/useUsers";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";

export function Users() {
  const { items, isLoading, create } = useUsers();
  const { showToast } = useToasts();
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      showToast("Nama, email, dan password wajib", "err");
      return;
    }
    if (form.password.length < 6) {
      showToast("Password minimal 6 karakter", "err");
      return;
    }
    try {
      await create.mutateAsync({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      showToast("Pengguna dibuat");
      setForm({ name: "", email: "", password: "" });
    } catch (err) {
      showToast(getApiErrorMessage(err), "err");
    }
  }

  if (isLoading) return <p className="empty-text">Memuat...</p>;

  return (
    <div className="panel">
      <h2>Pengguna</h2>
      <form onSubmit={onCreate} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <input className="field" placeholder="Nama" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <input className="field" placeholder="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
        <input className="field" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
        <button className="primary-btn" type="submit" disabled={create.isPending}>Tambah</button>
      </form>
      <table className="table" style={{ marginTop: 12 }}>
        <thead><tr><th>ID</th><th>Nama</th><th>Email</th></tr></thead>
        <tbody>
          {items.length === 0 ? <tr><td colSpan={3} className="empty-text">Belum ada pengguna</td></tr> : items.map((u) => (
            <tr key={u.id}><td>{u.id}</td><td>{u.name}</td><td>{u.email}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
