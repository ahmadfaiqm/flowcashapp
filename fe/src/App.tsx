import { useMemo, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "./components/Sidebar";
import { LoginScreen } from "./components/LoginScreen";
import { ToastHost } from "./components/ToastHost";
import { Dashboard } from "./pages/Dashboard";
import { ChartOfAccounts } from "./pages/ChartOfAccounts";
import { GeneralJournal } from "./pages/GeneralJournal";
import { Ledger } from "./pages/Ledger";
import { TrialBalance } from "./pages/TrialBalance";
import { IncomeStatement } from "./pages/IncomeStatement";
import { BalanceSheet } from "./pages/BalanceSheet";
import { Profile } from "./pages/Profile";
import { Products } from "./pages/Products";
import { Customers } from "./pages/Customers";
import { Suppliers } from "./pages/Suppliers";
import { Taxes } from "./pages/Taxes";
import { CashBankAccounts } from "./pages/CashBankAccounts";
import { SalesInvoices } from "./pages/SalesInvoices";
import { Receipts } from "./pages/Receipts";
import { StockMovements } from "./pages/StockMovements";
import { PurchaseInvoices } from "./pages/PurchaseInvoices";
import { PurchasePayments } from "./pages/PurchasePayments";
import { CashBankTransfers } from "./pages/CashBankTransfers";
import { FixedAssets } from "./pages/FixedAssets";
import { AssetDepreciations } from "./pages/AssetDepreciations";
import { ReportsFull } from "./pages/ReportsFull";
import { Users } from "./pages/Users";
import { Worksheet } from "./pages/Worksheet";
import { CapitalChange } from "./pages/CapitalChange";
import { Periods } from "./pages/Periods";
import { PrefixSettings } from "./pages/PrefixSettings";
import { useToasts } from "./hooks/useToasts";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { BusinessProvider, useBusiness } from "./hooks/useBusiness";
import { useAccounts } from "./hooks/useAccounts";
import { useJournals } from "./hooks/useJournals";
import { computeAccountBalances, computeMonthlyData, computeNetIncome, computeTotals } from "./utils/accounting";
import { api, getApiErrorMessage } from "./lib/api";
import type { Category, JournalLine, PageKey } from "./types";

function Placeholder({ t }: { t: string }) {
  return (
    <div className="panel">
      <p className="empty-text">{t} — coming soon</p>
    </div>
  );
}

function AppInner() {
  const { isAuthenticated, user, logout } = useAuth();
  const { businesses, businessId, business, selectBusiness, createBusiness, updateBusiness, uploadBusinessLogo, deleteBusinessLogo, isLoading: bizLoading } = useBusiness() as ReturnType<typeof useBusiness> & { updateBusiness: (id: number, p: { businessName: string }) => Promise<unknown> };
  const { accounts, isLoading: accLoading, create: createAccount, remove: removeAccount } = useAccounts();
  const { journals: entries, isLoading: jouLoading, create: createJournal, remove: removeJournal } = useJournals();
  const [page, setPage] = useState<PageKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, showToast } = useToasts();

  const companyName = business?.businessName ?? "Usaha Saya";

  const balances = useMemo(() => computeAccountBalances(accounts, entries), [accounts, entries]);
  const netIncome = useMemo(() => computeNetIncome(accounts, balances), [accounts, balances]);
  const totals = useMemo(() => computeTotals(accounts, balances, netIncome), [accounts, balances, netIncome]);
  const monthlyData = useMemo(() => computeMonthlyData(accounts, entries), [accounts, entries]);

  async function handleAddAccount(input: { code: string; name: string; category: Category }): Promise<boolean> {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) {
      showToast("Kode dan nama akun wajib diisi", "err");
      return false;
    }
    try {
      await createAccount.mutateAsync({ code, name, category: input.category });
      showToast("Akun ditambahkan");
      return true;
    } catch (e) {
      showToast(getApiErrorMessage(e), "err");
      return false;
    }
  }

  async function handleDeleteAccount(id: string) {
    const used = entries.some((e) => e.lines.some((l) => l.accountId === id));
    if (used) {
      showToast("Akun tidak bisa dihapus karena sudah dipakai di jurnal", "err");
      return;
    }
    try {
      await removeAccount.mutateAsync(id);
      showToast("Akun dihapus");
    } catch (e) {
      showToast(getApiErrorMessage(e), "err");
    }
  }

  async function handleAddEntry(input: { date: string; desc: string; lines: JournalLine[]; isAdjustment?: boolean; adjustmentType?: string }): Promise<boolean> {
    if (!input.date || !input.desc.trim()) {
      showToast("Tanggal dan keterangan wajib diisi", "err");
      return false;
    }
    const validLines = input.lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
    const totalDebit = validLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = validLines.reduce((s, l) => s + l.credit, 0);
    if (validLines.length < 2) {
      showToast("Minimal dua baris akun dengan nominal", "err");
      return false;
    }
    if (totalDebit !== totalCredit || totalDebit === 0) {
      showToast("Total debit dan kredit harus sama dan lebih dari nol", "err");
      return false;
    }
    if (input.isAdjustment && !input.adjustmentType) {
      showToast("Tipe penyesuaian wajib dipilih", "err");
      return false;
    }
    try {
      await createJournal.mutateAsync({ date: input.date, desc: input.desc.trim(), lines: validLines, isAdjustment: input.isAdjustment, adjustmentType: input.adjustmentType });
      showToast(input.isAdjustment ? "Jurnal penyesuaian disimpan" : "Transaksi disimpan");
      return true;
    } catch (e) {
      showToast(getApiErrorMessage(e), "err");
      return false;
    }
  }

  function handleLogout() {
    logout();
    setPage("dashboard");
  }

  function handleResetData() {
    showToast("Reset tidak tersedia di mode backend (data disimpan di PostgreSQL)");
  }

  async function updateProfile(newName: string) {
    if (!businessId || !newName.trim()) return;
    try {
      await updateBusiness(businessId, { businessName: newName.trim() });
      showToast("Nama bisnis diperbarui");
    } catch (e) {
      showToast(getApiErrorMessage(e), "err");
    }
  }

  async function changePassword(current: string, next: string, confirm: string): Promise<boolean> {
    if (next.length < 6) {
      showToast("Kata sandi baru minimal 6 karakter", "err");
      return false;
    }
    if (next !== confirm) {
      showToast("Konfirmasi kata sandi tidak cocok", "err");
      return false;
    }
    try {
      await api.post("/auth/change-password", { currentPassword: current, newPassword: next, confirmPassword: confirm });
      showToast("Kata sandi berhasil diganti");
      return true;
    } catch (e) {
      showToast(getApiErrorMessage(e), "err");
      return false;
    }
  }

  async function handleDeleteEntry(id: string) {
    try {
      await removeJournal.mutateAsync(id);
      showToast("Transaksi dihapus");
    } catch (e) {
      showToast(getApiErrorMessage(e), "err");
    }
  }

  if (!isAuthenticated || !user) return <LoginScreen />;

  // business loading / picker
  if (bizLoading && !businessId) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <p className="empty-text">Memuat bisnis...</p>
        </div>
      </div>
    );
  }

  if (!businessId) {
    // still no business selected (edge)
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ maxWidth: 420 }}>
          <h1 className="auth-title">Pilih Bisnis</h1>
          <p className="auth-subtitle">Buat atau pilih bisnis untuk melanjutkan</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {businesses.map((b) => (
              <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className="primary-btn"
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}
                  onClick={() => selectBusiness(b.id)}
                >
                  {b.logoUrl ? <img src={b.logoUrl} alt="" width={24} height={24} style={{ borderRadius: 4 }} /> : null}
                  <span>
                    {b.businessName} #{b.id}
                  </span>
                </button>
                <label className="link-btn" title="Ubah logo">
                  Logo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={async (ev) => {
                      const file = ev.target.files?.[0];
                      if (!file) return;
                      try {
                        await uploadBusinessLogo(b.id, file);
                        showToast("Logo diperbarui");
                      } catch (e) {
                        showToast(getApiErrorMessage(e), "err");
                      }
                      ev.target.value = "";
                    }}
                  />
                </label>
                {b.logoUrl ? (
                  <button
                    className="link-btn"
                    onClick={async () => {
                      try {
                        await deleteBusinessLogo(b.id);
                        showToast("Logo dihapus");
                      } catch (e) {
                        showToast(getApiErrorMessage(e), "err");
                      }
                    }}
                  >
                    Hapus
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget as HTMLFormElement);
              const nm = String(fd.get("bizName") || "").trim();
              if (!nm) return;
              try {
                await createBusiness({ businessName: nm });
                showToast("Bisnis dibuat");
              } catch (e) {
                showToast(getApiErrorMessage(e), "err");
              }
            }}
            style={{ marginTop: 16, display: "flex", gap: 8 }}
          >
            <input name="bizName" className="field" placeholder="Nama bisnis baru" style={{ flex: 1 }} />
            <button type="submit" className="primary-btn">
              Buat
            </button>
          </form>
          <button className="link-btn" style={{ marginTop: 12 }} onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </div>
    );
  }

  const isDataLoading = accLoading || jouLoading;

  return (
    <div className="app">
      <Sidebar
        page={page}
        onNavigate={setPage}
        companyName={companyName}
        onCompanyNameChange={updateProfile}
        username={user.email}
        onLogout={handleLogout}
        onReset={handleResetData}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
      <header className="mobile-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen((o) => !o)} aria-label="Buka menu" aria-expanded={sidebarOpen}>
          <span className="hamburger-icon" />
        </button>
        <span className="mobile-header-title">Buku Akuntansi</span>
        <span className="mobile-header-company">{companyName}</span>
      </header>
      <main className="main">
        {isDataLoading ? (
          <p className="empty-text">Memuat data...</p>
        ) : (
          <>
            {page === "dashboard" && <Dashboard totals={totals} netIncome={netIncome} monthlyData={monthlyData} entries={entries} companyName={companyName} />}
            {page === "accounts" && <ChartOfAccounts accounts={accounts} balances={balances} onAdd={handleAddAccount} onDelete={handleDeleteAccount} />}
            {page === "journal" && <GeneralJournal accounts={accounts} entries={entries} onAdd={handleAddEntry} onDelete={handleDeleteEntry} />}
            {page === "ledger" && <Ledger accounts={accounts} entries={entries} />}
            {page === "trial" && <TrialBalance accounts={accounts} balances={balances} />}
            {page === "income" && <IncomeStatement accounts={accounts} balances={balances} netIncome={netIncome} />}
            {page === "balance" && <BalanceSheet accounts={accounts} balances={balances} netIncome={netIncome} totals={totals} />}
            {page === "profile" && (
              <Profile
                companyName={companyName}
                username={user.email}
                accountsCount={accounts.length}
                entriesCount={entries.length}
                onUpdateProfile={updateProfile}
                onChangePassword={changePassword}
              />
            )}
            {page === "products" && <Products />}
            {page === "customers" && <Customers />}
            {page === "suppliers" && <Suppliers />}
            {page === "taxes" && <Taxes />}
            {page === "cashBank" && <CashBankAccounts />}
            {page === "transfers" && <CashBankTransfers />}
            {page === "stock" && <StockMovements />}
            {page === "salesInvoices" && <SalesInvoices />}
            {page === "receipts" && <Receipts />}
            {page === "purchaseInvoices" && <PurchaseInvoices />}
            {page === "purchasePayments" && <PurchasePayments />}
            {page === "fixedAssets" && <FixedAssets />}
            {page === "depreciations" && <AssetDepreciations />}
            {page === "reportsFull" && <ReportsFull />}
            {page === "users" && <Users />}
            {page === "worksheet" && <Worksheet />}
            {page === "capitalChange" && <CapitalChange />}
            {page === "periods" && <Periods />}
            {page === "prefixSettings" && <PrefixSettings />}
          </>
        )}
        {businesses.length > 1 && (
          <div className="panel" style={{ marginTop: 12 }}>
            <label className="field-label">Ganti Bisnis</label>
            <select className="field" value={String(businessId)} onChange={(e) => selectBusiness(Number(e.target.value))}>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.businessName} (#{b.id})
                </option>
              ))}
            </select>
          </div>
        )}
      </main>
      <ToastHost toasts={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BusinessProvider>
          <AppInner />
        </BusinessProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
