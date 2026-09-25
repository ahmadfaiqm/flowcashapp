import { useState } from "react";

interface ProfileProps {
  companyName: string;
  username: string;
  accountsCount: number;
  entriesCount: number;
  onUpdateProfile: (displayName: string) => void;
  onChangePassword: (current: string, next: string, confirm: string) => Promise<boolean>;
}

function initials(text: string): string {
  const parts = text.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function Profile({
  companyName,
  username,
  accountsCount,
  entriesCount,
  onUpdateProfile,
  onChangePassword,
}: ProfileProps) {
  const [displayName, setDisplayName] = useState(companyName);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  function submitProfile(ev: React.FormEvent) {
    ev.preventDefault();
    if (!displayName.trim()) return;
    onUpdateProfile(displayName.trim());
  }

  async function submitPassword(ev: React.FormEvent) {
    ev.preventDefault();
    setChangingPassword(true);
    const ok = await onChangePassword(current, next, confirm);
    setChangingPassword(false);
    if (ok) {
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Profil</h1>
        <p className="page-subtitle">Kelola informasi akun dan kata sandi Anda</p>
      </div>

      <div className="panel" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--bronze)",
            color: "#211605",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {initials(companyName || username)}
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
            {companyName}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Nama pengguna: {username}</div>
        </div>
      </div>

      <div className="card-grid profile-stats">
        <div className="metric-card">
          <div className="metric-label">Jumlah akun</div>
          <div className="metric-value">{accountsCount}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Jumlah transaksi</div>
          <div className="metric-value">{entriesCount}</div>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel-title">Informasi profil</h2>
        <form onSubmit={submitProfile}>
          <div className="form-field" style={{ maxWidth: 320 }}>
            <label className="field-label">Nama usaha</label>
            <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="submit" className="primary-btn">
              Simpan profil
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2 className="panel-title">Ganti kata sandi</h2>
        <form onSubmit={submitPassword} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 320 }}>
          <div className="form-field">
            <label className="field-label">Kata sandi saat ini</label>
            <input
              type="password"
              className="field"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="form-field">
            <label className="field-label">Kata sandi baru</label>
            <input
              type="password"
              className="field"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="form-field">
            <label className="field-label">Konfirmasi kata sandi baru</label>
            <input
              type="password"
              className="field"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <button type="submit" className="primary-btn" disabled={changingPassword}>
              {changingPassword ? "Memproses..." : "Ganti kata sandi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
