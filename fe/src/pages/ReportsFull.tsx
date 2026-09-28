import { useState } from "react";
import {
  useProfitLoss,
  useSalesReport,
  usePurchaseReport,
  useStockReport,
  useArReport,
  useApReport,
  useBalanceSheetReport,
  useCashFlowReport,
  useFixedAssetReport,
} from "../hooks/useReportsFull";
import { formatRupiah, formatDate } from "../utils/format";

type TabKey = "profit-loss" | "sales" | "purchase" | "stock" | "ar" | "ap" | "balance-sheet" | "cash-flow" | "fixed-assets";

const TABS: { key: TabKey; label: string }[] = [
  { key: "profit-loss", label: "Laba Rugi" },
  { key: "sales", label: "Penjualan" },
  { key: "purchase", label: "Pembelian" },
  { key: "stock", label: "Stok" },
  { key: "ar", label: "Piutang" },
  { key: "ap", label: "Utang" },
  { key: "balance-sheet", label: "Neraca" },
  { key: "cash-flow", label: "Arus Kas" },
  { key: "fixed-assets", label: "Aset Tetap" },
];

function PeriodBadge({ from, to }: { from?: string | null; to?: string | null }) {
  if (!from && !to) return <span className="empty-text">Semua periode</span>;
  return <span className="empty-text">Periode: {from ? formatDate(from) : "awal"} — {to ? formatDate(to) : "akhir"}</span>;
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>{children}</div>;
}
function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="panel" style={{ textAlign: "center", padding: 16 }}>
      <div className="field-label">{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? "var(--ink)" }}>{formatRupiah(Number(value) || 0)}</div>
    </div>
  );
}

function ProfitLossView({ data }: { data: any }) {
  if (!data) return <p className="empty-text">Tidak ada data</p>;
  const revenue = Number(data.revenue ?? data.revenueJournalTotal ?? data.salesTotal ?? 0);
  const expense = Number(data.expenseTotal ?? data.expenseJournalTotal ?? 0);
  const net = Number(data.netProfit ?? data.profit ?? revenue - expense);
  return (
    <div>
      <PeriodBadge from={data.period?.from} to={data.period?.to} />
      <StatGrid>
        <StatCard label="Pendapatan" value={revenue} color="var(--green)" />
        <StatCard label="Beban" value={expense} color="var(--red)" />
        <div className="panel" style={{ textAlign: "center", padding: 16, background: net >= 0 ? "#dcfce7" : "#fee2e2", borderColor: net >= 0 ? "#16a34a" : "#dc2626" }}>
          <div className="field-label">Laba Bersih</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: net >= 0 ? "#166534" : "#b91c1c" }}>{formatRupiah(net)}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{formatRupiah(revenue)} − {formatRupiah(expense)}</div>
        </div>
      </StatGrid>
      <div className="panel">
        <table className="table">
          <tbody>
            <tr><td>Pendapatan (Jurnal)</td><td className="td-num">{formatRupiah(revenue)}</td></tr>
            <tr><td>Total Beban</td><td className="td-num">{formatRupiah(expense)}</td></tr>
            <tr style={{ fontWeight: 700, background: "#f6f6f6" }}><td>Laba / Rugi Bersih</td><td className="td-num" style={{ color: net >= 0 ? "#166534" : "#b91c1c" }}>{formatRupiah(net)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesView({ data }: { data: any }) {
  if (!data) return <p className="empty-text">Tidak ada data</p>;
  return (
    <div>
      <PeriodBadge from={data.period?.from} to={data.period?.to} />
      <StatGrid>
        <StatCard label="Total Penjualan" value={Number(data.total ?? 0)} />
        <StatCard label="Terbayar" value={Number(data.paidAmount ?? 0)} color="var(--green)" />
        <StatCard label="Jumlah Faktur" value={Number(data.count ?? data.items?.length ?? 0)} />
      </StatGrid>
      {data.items?.length ? (
        <div className="panel"><div className="table-wrap"><table><thead><tr><th>No Faktur</th><th>Tanggal</th><th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>Dibayar</th><th>Status</th></tr></thead><tbody>{data.items.map((it: any) => (
          <tr key={it.id ?? it.invoiceNo}><td className="td-mono">{it.invoiceNo ?? it.id}</td><td>{it.invoiceDate ? formatDate(String(it.invoiceDate).slice(0, 10)) : "-"}</td><td className="td-num">{formatRupiah(Number(it.totalAmount ?? 0))}</td><td className="td-num">{formatRupiah(Number(it.paidAmount ?? 0))}</td><td><span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 99, background: "#e0e7ff" }}>{it.status}</span></td></tr>
        ))}</tbody></table></div>{data.meta && <p className="empty-text" style={{ marginTop: 8 }}>Hal {data.meta.page} dari {data.meta.totalPages} — {data.meta.total} data</p>}</div>
      ) : <p className="empty-text">Tidak ada faktur pada periode ini</p>}
    </div>
  );
}

function PurchaseView({ data }: { data: any }) {
  if (!data) return <p className="empty-text">Tidak ada data</p>;
  return (
    <div>
      <PeriodBadge from={data.period?.from} to={data.period?.to} />
      <StatGrid>
        <StatCard label="Total Pembelian" value={Number(data.total ?? 0)} />
        <StatCard label="Terbayar" value={Number(data.paidAmount ?? 0)} color="var(--green)" />
        <StatCard label="Jumlah Faktur" value={Number(data.count ?? data.items?.length ?? 0)} />
      </StatGrid>
      {data.items?.length ? (
        <div className="panel"><div className="table-wrap"><table><thead><tr><th>No Faktur</th><th>Tanggal</th><th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>Dibayar</th><th>Status</th></tr></thead><tbody>{data.items.map((it: any) => (
          <tr key={it.id ?? it.invoiceNo}><td className="td-mono">{it.invoiceNo ?? it.id}</td><td>{it.invoiceDate ? formatDate(String(it.invoiceDate).slice(0, 10)) : "-"}</td><td className="td-num">{formatRupiah(Number(it.totalAmount ?? 0))}</td><td className="td-num">{formatRupiah(Number(it.paidAmount ?? 0))}</td><td>{it.status}</td></tr>
        ))}</tbody></table></div>{data.meta && <p className="empty-text">Hal {data.meta.page} — {data.meta.total} data</p>}</div>
      ) : <p className="empty-text">Tidak ada faktur pembelian</p>}
    </div>
  );
}

function StockView({ data }: { data: any }) {
  if (!data) return <p className="empty-text">Tidak ada data</p>;
  return (
    <div>
      <StatGrid>
        <StatCard label="Jenis Produk" value={Number(data.count ?? 0)} />
        <StatCard label="Total Stok" value={Number(data.totalStock ?? 0)} />
        <StatCard label="Stok Menipis" value={Number(data.lowStock ?? 0)} color={Number(data.lowStock) > 0 ? "var(--red)" : undefined} />
      </StatGrid>
      {data.items?.length ? (
        <div className="panel"><div className="table-wrap"><table><thead><tr><th>SKU</th><th>Nama</th><th style={{ textAlign: "right" }}>Stok</th><th style={{ textAlign: "right" }}>Min</th><th>Harga Beli</th></tr></thead><tbody>{data.items.map((p: any) => (
          <tr key={p.id}><td className="td-mono">{p.sku}</td><td>{p.name}</td><td className="td-num" style={{ color: Number(p.stock) <= Number(p.minimumStock) ? "var(--red)" : undefined }}>{p.stock}</td><td className="td-num">{p.minimumStock}</td><td className="td-num">{formatRupiah(Number(p.purchasePrice ?? 0))}</td></tr>
        ))}</tbody></table></div></div>
      ) : null}
    </div>
  );
}

function ArView({ data }: { data: any }) {
  if (!data) return <p className="empty-text">Tidak ada data</p>;
  return (
    <div>
      <PeriodBadge from={data.period?.from} to={data.period?.to} />
      <StatGrid>
        <StatCard label="Total Penjualan" value={Number(data.salesTotal ?? 0)} />
        <StatCard label="Total Diterima" value={Number(data.receiptTotal ?? 0)} color="var(--green)" />
        <StatCard label="Piutang Outstanding" value={Number(data.outstanding ?? data.receivable ?? 0)} color="var(--red)" />
      </StatGrid>
      <div className="panel"><p className="empty-text">{Number(data.outstandingCount ?? 0)} faktur belum lunas</p></div>
    </div>
  );
}

function ApView({ data }: { data: any }) {
  if (!data) return <p className="empty-text">Tidak ada data</p>;
  return (
    <div>
      <PeriodBadge from={data.period?.from} to={data.period?.to} />
      <StatGrid>
        <StatCard label="Total Pembelian" value={Number(data.purchaseTotal ?? 0)} />
        <StatCard label="Total Dibayar" value={Number(data.paymentTotal ?? 0)} color="var(--green)" />
        <StatCard label="Utang Outstanding" value={Number(data.outstanding ?? data.payable ?? 0)} color="var(--red)" />
      </StatGrid>
      <div className="panel"><p className="empty-text">{Number(data.outstandingCount ?? 0)} faktur belum lunas</p></div>
    </div>
  );
}

function BalanceSheetView({ data }: { data: any }) {
  if (!data) return <p className="empty-text">Tidak ada data</p>;
  const totals = data.totals ?? { assets: data.totalAssets ?? 0, liabilities: data.totalLiabilities ?? 0, equity: data.totalEquity ?? 0, balanced: false };
  const assets = data.assets?.details ?? data.details?.filter((d: any) => d.accountType === "Asset") ?? [];
  const liabs = data.liabilities?.details ?? data.details?.filter((d: any) => d.accountType === "Liability") ?? [];
  const equity = data.equity?.details ?? data.details?.filter((d: any) => d.accountType === "Equity") ?? [];
  const bal = totals.balanced ?? Math.abs(Number(totals.assets ?? 0) - (Number(totals.liabilities ?? 0) + Number(totals.equity ?? 0))) < 0.01;
  return (
    <div>
      <PeriodBadge from={data.period?.from} to={data.period?.to} />
      <StatGrid>
        <StatCard label="Total Aset" value={Number(totals.assets ?? 0)} />
        <StatCard label="Total Kewajiban" value={Number(totals.liabilities ?? 0)} />
        <StatCard label="Total Ekuitas" value={Number(totals.equity ?? 0)} />
      </StatGrid>
      <div className="panel" style={{ background: bal ? "#dcfce7" : "#fee2e2", borderColor: bal ? "#16a34a" : "#dc2626", textAlign: "center", fontWeight: 600, color: bal ? "#166534" : "#b91c1c" }}>
        {bal ? "✓ Seimbang" : "✗ Tidak Seimbang"} — Aset {formatRupiah(Number(totals.assets))} = Kewajiban {formatRupiah(Number(totals.liabilities))} + Ekuitas {formatRupiah(Number(totals.equity))} {data.equity?.netIncome !== undefined && ` (Laba ${formatRupiah(Number(data.equity.netIncome))})`}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {[
          { title: "Aset", rows: assets },
          { title: "Kewajiban", rows: liabs },
          { title: "Ekuitas", rows: equity },
        ].map((sec) => (
          <div key={sec.title} className="panel">
            <h3 className="panel-title">{sec.title}</h3>
            {sec.rows.length === 0 ? <p className="empty-text">Tidak ada</p> : (
              <table className="table"><thead><tr><th>Kode</th><th>Akun</th><th style={{ textAlign: "right" }}>Saldo</th></tr></thead><tbody>{sec.rows.map((r: any) => (
                <tr key={r.coaId ?? r.code}><td className="td-mono">{r.code}</td><td>{r.name ?? r.code}{r.isContra ? " (kontra)" : ""}</td><td className="td-num">{formatRupiah(Number(r.net ?? r.balance ?? 0))}</td></tr>
              ))}</tbody></table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CashFlowView({ data }: { data: any }) {
  if (!data) return <p className="empty-text">Tidak ada data</p>;
  const inAmt = Number(data.cashIn ?? data.receiptTotal ?? 0);
  const outAmt = Number(data.cashOut ?? data.paymentTotal ?? 0);
  const net = Number(data.netCashFlow ?? data.net ?? inAmt - outAmt);
  return (
    <div>
      <PeriodBadge from={data.period?.from} to={data.period?.to} />
      <StatGrid>
        <StatCard label="Kas Masuk" value={inAmt} color="var(--green)" />
        <StatCard label="Kas Keluar" value={outAmt} color="var(--red)" />
        <div className="panel" style={{ textAlign: "center", padding: 16, background: net >= 0 ? "#dcfce7" : "#fee2e2" }}>
          <div className="field-label">Arus Kas Bersih</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: net >= 0 ? "#166534" : "#b91c1c" }}>{formatRupiah(net)}</div>
        </div>
      </StatGrid>
      <div className="panel"><table className="table"><tbody>
        <tr><td>Penerimaan (receipts)</td><td className="td-num">{formatRupiah(inAmt)} ({Number(data.receiptsCount ?? data.receipts?._count?._all ?? 0)} transaksi)</td></tr>
        <tr><td>Pembayaran (payments)</td><td className="td-num">{formatRupiah(outAmt)} ({Number(data.paymentsCount ?? data.payments?._count?._all ?? 0)} transaksi)</td></tr>
        <tr style={{ fontWeight: 700 }}><td>Bersih</td><td className="td-num">{formatRupiah(net)}</td></tr>
      </tbody></table></div>
    </div>
  );
}

function FixedAssetsView({ data }: { data: any }) {
  if (!data) return <p className="empty-text">Tidak ada data</p>;
  const t = data.totals ?? {};
  return (
    <div>
      <PeriodBadge from={data.period?.from} to={data.period?.to} />
      <StatGrid>
        <StatCard label="Jumlah Aset" value={Number(t.count ?? data.count ?? 0)} />
        <StatCard label="Perolehan" value={Number(t.totalAcquisitionCost ?? data.totalAcquisitionCost ?? 0)} />
        <StatCard label="Akumulasi Penyusutan" value={Number(t.totalAccumulatedDepreciation ?? data.totalAccumulatedDepreciation ?? 0)} color="var(--red)" />
        <StatCard label="Nilai Buku" value={Number(t.totalBookValue ?? data.totalBookValue ?? 0)} color="var(--green)" />
      </StatGrid>
      {data.assets?.length || data.items?.length ? (
        <div className="panel">
          <h3 className="panel-title">Daftar Aset</h3>
          <div className="table-wrap"><table><thead><tr><th>Kode</th><th>Nama</th><th style={{ textAlign: "right" }}>Perolehan</th><th style={{ textAlign: "right" }}>Akumulasi</th><th style={{ textAlign: "right" }}>Nilai Buku</th></tr></thead><tbody>{(data.assets ?? data.items ?? []).map((a: any) => (
            <tr key={a.id ?? a.code}><td className="td-mono">{a.code}</td><td>{a.name}</td><td className="td-num">{formatRupiah(Number(a.acquisitionCost ?? 0))}</td><td className="td-num">{formatRupiah(Number(a.accumulatedDepreciation ?? 0))}</td><td className="td-num">{formatRupiah(Number(a.bookValue ?? 0))}</td></tr>
          ))}</tbody></table></div>
        </div>
      ) : <p className="empty-text">Belum ada aset tetap</p>}
      {data.depreciations?.length ? (
        <div className="panel">
          <h3 className="panel-title">Penyusutan Periode Ini — {formatRupiah(Number(t.periodDepreciationTotal ?? 0))}</h3>
          <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Aset</th><th style={{ textAlign: "right" }}>Nominal</th></tr></thead><tbody>{data.depreciations.map((d: any) => (
            <tr key={d.id}><td>{d.depreciationDate ? formatDate(String(d.depreciationDate).slice(0, 10)) : "-"}</td><td>{d.fixedAsset?.name ?? d.fixedAssetId}</td><td className="td-num">{formatRupiah(Number(d.depreciationAmount ?? 0))}</td></tr>
          ))}</tbody></table></div>
        </div>
      ) : null}
    </div>
  );
}

export function ReportsFull() {
  const [tab, setTab] = useState<TabKey>("profit-loss");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = from || to ? { from: from || undefined, to: to || undefined } : undefined;

  const qProfit = useProfitLoss(tab === "profit-loss" ? (params as { from?: string; to?: string }) : undefined);
  const qSales = useSalesReport(tab === "sales" ? params : undefined);
  const qPurchase = usePurchaseReport(tab === "purchase" ? params : undefined);
  const qStock = useStockReport(tab === "stock" ? params : undefined);
  const qAr = useArReport(tab === "ar" ? params : undefined);
  const qAp = useApReport(tab === "ap" ? params : undefined);
  const qBalance = useBalanceSheetReport(tab === "balance-sheet" ? params : undefined);
  const qCash = useCashFlowReport(tab === "cash-flow" ? params : undefined);
  const qFixed = useFixedAssetReport(tab === "fixed-assets" ? params : undefined);

  function renderContent() {
    const loading = (q: any) => q.isLoading && <p className="empty-text">Memuat...</p>;
    const err = (q: any) => q.error && <p className="empty-text" style={{ color: "var(--red)" }}>Gagal memuat: {String((q.error as Error)?.message ?? q.error)}</p>;
    switch (tab) {
      case "profit-loss": return loading(qProfit) || err(qProfit) || <ProfitLossView data={qProfit.data} />;
      case "sales": return loading(qSales) || err(qSales) || <SalesView data={qSales.data} />;
      case "purchase": return loading(qPurchase) || err(qPurchase) || <PurchaseView data={qPurchase.data} />;
      case "stock": return loading(qStock) || err(qStock) || <StockView data={qStock.data} />;
      case "ar": return loading(qAr) || err(qAr) || <ArView data={qAr.data} />;
      case "ap": return loading(qAp) || err(qAp) || <ApView data={qAp.data} />;
      case "balance-sheet": return loading(qBalance) || err(qBalance) || <BalanceSheetView data={qBalance.data} />;
      case "cash-flow": return loading(qCash) || err(qCash) || <CashFlowView data={qCash.data} />;
      case "fixed-assets": return loading(qFixed) || err(qFixed) || <FixedAssetsView data={qFixed.data} />;
      default: return null;
    }
  }

  return (
    <div className="panel">
      <h2>Laporan</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "primary-btn" : "link-btn"} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="field-label">Dari</span>
          <input className="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="field-label">Sampai</span>
          <input className="field" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {(from || to) && <button className="link-btn" onClick={() => { setFrom(""); setTo(""); }}>Reset</button>}
      </div>
      <div style={{ marginTop: 12 }}>{renderContent()}</div>
    </div>
  );
}
