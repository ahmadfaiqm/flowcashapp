import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../lib/api";

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    const mail = email.trim().toLowerCase();
    if (!mail || !mail.includes("@")) {
      setError("Email wajib diisi dengan format valid");
      return;
    }
    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter (sesuai backend)");
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        if (password !== confirm) {
          setError("Konfirmasi kata sandi tidak cocok");
          setBusy(false);
          return;
        }
        const displayName = name.trim() || mail.split("@")[0];
        await register(displayName, mail, password);
      } else {
        await login(mail, password);
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
      setBusy(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">§</div>
          <h1 className="auth-title">Buku Akuntansi</h1>
        </div>
        <p className="auth-subtitle">
          {isRegister
            ? "Buat akun baru untuk memulai pembukuan"
            : "Masuk untuk melanjutkan pembukuan Anda"}
        </p>

        <form onSubmit={submit} className="auth-form">
          {isRegister && (
            <div className="form-field">
              <label className="field-label">Nama lengkap</label>
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Anda"
                autoComplete="name"
              />
            </div>
          )}
          <div className="form-field">
            <label className="field-label">Email</label>
            <input
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@contoh.id"
              autoComplete="email"
            />
          </div>
          <div className="form-field">
            <label className="field-label">Kata sandi</label>
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </div>
          {isRegister && (
            <div className="form-field">
              <label className="field-label">Konfirmasi kata sandi</label>
              <input
                type="password"
                className="field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="primary-btn" style={{ width: "100%", padding: "10px 16px" }} disabled={busy}>
            {busy ? "Memproses..." : isRegister ? "Daftar" : "Masuk"}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(isRegister ? "login" : "register");
            setError("");
          }}
        >
          {isRegister ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
        </button>
        <p className="auth-note">
          Terhubung ke backend. Bisnis akan dibuat otomatis "Usaha Saya".
        </p>
      </div>
    </div>
  );
}
