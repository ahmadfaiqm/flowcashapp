import { useEffect, useState } from "react";
import type { PageKey } from "../types";

const NAV_GROUPS: { key: string; label: string; children: { key: PageKey; label: string }[] }[] = [
  {
    key: "accounting",
    label: "Akuntansi",
    children: [
      { key: "journal", label: "Jurnal Umum" },
      { key: "ledger", label: "Buku Besar" },
      { key: "trial", label: "Neraca Saldo" },
      { key: "income", label: "Laba Rugi" },
      { key: "balance", label: "Neraca" },
    ],
  },
  {
    key: "master",
    label: "Master Data",
    children: [
      { key: "products", label: "Produk" },
      { key: "customers", label: "Pelanggan" },
      { key: "suppliers", label: "Supplier" },
      { key: "taxes", label: "Pajak" },
      { key: "cashBank", label: "Kas & Bank" },
    ],
  },
  {
    key: "sales",
    label: "Penjualan",
    children: [
      { key: "salesInvoices", label: "Faktur Jual" },
      { key: "receipts", label: "Pelunasan" },
      { key: "stock", label: "Stok" },
    ],
  },
  {
    key: "purchase",
    label: "Pembelian",
    children: [
      { key: "purchaseInvoices", label: "Faktur Beli" },
      { key: "purchasePayments", label: "Pembayaran Beli" },
      { key: "transfers", label: "Transfer Kas" },
    ],
  },
  {
    key: "asset",
    label: "Aset & Laporan",
    children: [
      { key: "fixedAssets", label: "Aset Tetap" },
      { key: "depreciations", label: "Penyusutan" },
      { key: "reportsFull", label: "Laporan" },
      { key: "users", label: "Pengguna" },
    ],
  },
  {
    key: "sak",
    label: "Laporan SAK",
    children: [
      { key: "worksheet", label: "Neraca Lajur 10 Kolom" },
      { key: "capitalChange", label: "Perubahan Modal" },
      { key: "periods", label: "Periode" },
    ],
  },
];

const FLAT_NAV: { key: PageKey; label: string }[] = [
  { key: "dashboard", label: "Dasbor" },
  { key: "accounts", label: "Daftar Akun" },
  { key: "profile", label: "Profil" },
  { key: "prefixSettings", label: "Prefix Dokumen" },
];

interface SidebarProps {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  companyName: string;
  onCompanyNameChange: (name: string) => void;
  username: string;
  onLogout: () => void;
  onReset: () => void;
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  page,
  onNavigate,
  companyName,
  onCompanyNameChange,
  username,
  onLogout,
  onReset,
  open = false,
  onClose,
}: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("ak.sidebarGroups") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ak.sidebarGroups", JSON.stringify(openGroups));
    } catch {
      // ignore storage errors
    }
  }, [openGroups]);

  function handleNavigate(key: PageKey) {
    onNavigate(key);
    onClose?.();
  }

  function toggleGroup(key: string) {
    setOpenGroups((s) => ({ ...s, [key]: !s[key] }));
  }

  return (
    <aside className={`sidebar${open ? " open" : ""}`} aria-label="Navigasi utama">
      <button className="sidebar-close" onClick={onClose} aria-label="Tutup menu">
        ✕
      </button>
      <div className="brand">
        <div className="brand-mark">§</div>
        <input
          className="brand-input"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          aria-label="Nama usaha"
        />
      </div>
      <nav className="nav">
        {FLAT_NAV.map((n) => (
          <button
            key={n.key}
            className={`nav-item${page === n.key ? " active" : ""}`}
            onClick={() => handleNavigate(n.key)}
          >
            {n.label}
          </button>
        ))}
        {NAV_GROUPS.map((g) => (
          <div key={g.key} className="nav-group">
            <button
              className="nav-item nav-group-toggle"
              onClick={() => toggleGroup(g.key)}
              aria-expanded={!!openGroups[g.key]}
            >
              <span>{g.label}</span>
              <span className="nav-group-chevron" aria-hidden="true">
                {openGroups[g.key] ? "▾" : "▸"}
              </span>
            </button>
            {openGroups[g.key] && (
              <div className="nav-group-children">
                {g.children.map((c) => (
                  <button
                    key={c.key}
                    className={`nav-item sub${page === c.key ? " active" : ""}`}
                    onClick={() => handleNavigate(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="sidebar-user">
        <span className="sidebar-user-label">Masuk sebagai {username}</span>
        <button className="link-btn-light" onClick={onLogout}>
          Keluar
        </button>
      </div>
      <button className="reset-btn" onClick={onReset}>
        Reset ke data contoh
      </button>
    </aside>
  );
}
