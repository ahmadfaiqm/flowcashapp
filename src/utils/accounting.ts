import type {
  Account,
  AccountBalance,
  Category,
  JournalEntry,
  LedgerRow,
  MonthlyPoint,
  NetIncome,
  Totals,
} from "../types";
import { monthLabel } from "./format";

export const CATEGORY_INFO: Record<Category, { normal: "debit" | "kredit" }> = {
  Aset: { normal: "debit" },
  Kewajiban: { normal: "kredit" },
  Ekuitas: { normal: "kredit" },
  Pendapatan: { normal: "kredit" },
  Beban: { normal: "debit" },
};

export const CATEGORIES: Category[] = ["Aset", "Kewajiban", "Ekuitas", "Pendapatan", "Beban"];

export function getAccountNormal(account: Account): "debit" | "kredit" {
  if (account.normalBalance) {
    const nb = String(account.normalBalance).toLowerCase();
    if (nb === "debit") return "debit";
    if (nb === "credit" || nb === "kredit") return "kredit";
  }
  const base = CATEGORY_INFO[account.category]?.normal ?? "debit";
  if (account.isContra) return base === "debit" ? "kredit" : "debit";
  return base;
}

export function seedAccounts(): Account[] {
  return [
    { id: "a1101", code: "1101", name: "Kas", category: "Aset" },
    { id: "a1102", code: "1102", name: "Bank", category: "Aset" },
    { id: "a1103", code: "1103", name: "Piutang Usaha", category: "Aset" },
    { id: "a1104", code: "1104", name: "Persediaan Barang Dagang", category: "Aset" },
    { id: "a1105", code: "1105", name: "Perlengkapan", category: "Aset" },
    { id: "a1201", code: "1201", name: "Peralatan", category: "Aset" },
    { id: "a1202", code: "1202", name: "Akumulasi Penyusutan Peralatan", category: "Aset", isContra: true, normalBalance: "credit" },
    { id: "a2101", code: "2101", name: "Utang Usaha", category: "Kewajiban" },
    { id: "a2102", code: "2102", name: "Utang Bank", category: "Kewajiban" },
    { id: "a3101", code: "3101", name: "Modal Pemilik", category: "Ekuitas" },
    { id: "a3102", code: "3102", name: "Prive", category: "Ekuitas", isContra: true, normalBalance: "debit" },
    { id: "a4101", code: "4101", name: "Pendapatan Penjualan", category: "Pendapatan" },
    { id: "a4102", code: "4102", name: "Pendapatan Jasa", category: "Pendapatan" },
    { id: "a5101", code: "5101", name: "Beban Gaji", category: "Beban" },
    { id: "a5102", code: "5102", name: "Beban Sewa", category: "Beban" },
    { id: "a5103", code: "5103", name: "Beban Listrik dan Air", category: "Beban" },
    { id: "a5104", code: "5104", name: "Beban Perlengkapan", category: "Beban" },
    { id: "a5105", code: "5105", name: "Beban Penyusutan", category: "Beban" },
    { id: "a5106", code: "5106", name: "Beban Lain-lain", category: "Beban" },
  ];
}

export function seedEntries(): JournalEntry[] {
  return [
    {
      id: "e1",
      date: "2026-08-01",
      desc: "Setoran modal awal pemilik",
      lines: [
        { accountId: "a1102", debit: 50000000, credit: 0 },
        { accountId: "a3101", debit: 0, credit: 50000000 },
      ],
    },
    {
      id: "e2",
      date: "2026-08-03",
      desc: "Pembelian peralatan tunai",
      lines: [
        { accountId: "a1201", debit: 12000000, credit: 0 },
        { accountId: "a1102", debit: 0, credit: 12000000 },
      ],
    },
    {
      id: "e3",
      date: "2026-08-07",
      desc: "Pendapatan jasa diterima tunai",
      lines: [
        { accountId: "a1101", debit: 4500000, credit: 0 },
        { accountId: "a4102", debit: 0, credit: 4500000 },
      ],
    },
    {
      id: "e4",
      date: "2026-08-10",
      desc: "Pembayaran sewa kantor bulan Agustus",
      lines: [
        { accountId: "a5102", debit: 2000000, credit: 0 },
        { accountId: "a1102", debit: 0, credit: 2000000 },
      ],
    },
    {
      id: "e5",
      date: "2026-08-15",
      desc: "Pembayaran gaji karyawan",
      lines: [
        { accountId: "a5101", debit: 6000000, credit: 0 },
        { accountId: "a1101", debit: 0, credit: 6000000 },
      ],
    },
    {
      id: "e6",
      date: "2026-08-20",
      desc: "Penjualan barang dagang secara kredit",
      lines: [
        { accountId: "a1103", debit: 8500000, credit: 0 },
        { accountId: "a4101", debit: 0, credit: 8500000 },
      ],
    },
    {
      id: "e7",
      date: "2026-08-25",
      desc: "Pembayaran listrik dan air",
      lines: [
        { accountId: "a5103", debit: 850000, credit: 0 },
        { accountId: "a1102", debit: 0, credit: 850000 },
      ],
    },
  ];
}

export function computeAccountBalances(
  accounts: Account[],
  entries: JournalEntry[]
): Record<string, AccountBalance> {
  const totals: Record<string, { debit: number; credit: number }> = {};
  accounts.forEach((a) => {
    totals[a.id] = { debit: 0, credit: 0 };
  });
  entries.forEach((e) =>
    e.lines.forEach((l) => {
      if (!totals[l.accountId]) totals[l.accountId] = { debit: 0, credit: 0 };
      totals[l.accountId].debit += Number(l.debit) || 0;
      totals[l.accountId].credit += Number(l.credit) || 0;
    })
  );
  const result: Record<string, AccountBalance> = {};
  accounts.forEach((a) => {
    const t = totals[a.id] || { debit: 0, credit: 0 };
    const normal = getAccountNormal(a);
    const balance = normal === "debit" ? t.debit - t.credit : t.credit - t.debit;
    result[a.id] = { ...t, balance };
  });
  return result;
}

export function computeNetIncome(
  accounts: Account[],
  balances: Record<string, AccountBalance>
): NetIncome {
  let pendapatan = 0;
  let beban = 0;
  accounts.forEach((a) => {
    const bal = balances[a.id]?.balance || 0;
    if (a.category === "Pendapatan") pendapatan += bal;
    if (a.category === "Beban") beban += bal;
  });
  return { pendapatan, beban, laba: pendapatan - beban };
}

export function computeTotals(
  accounts: Account[],
  balances: Record<string, AccountBalance>,
  netIncome: NetIncome
): Totals {
  let aset = 0;
  let kewajiban = 0;
  let ekuitasDasar = 0;
  accounts.forEach((a) => {
    const bal = balances[a.id]?.balance || 0;
    const isContra = !!a.isContra;
    if (a.category === "Aset") aset += isContra ? -bal : bal;
    if (a.category === "Kewajiban") kewajiban += isContra ? -bal : bal;
    if (a.category === "Ekuitas") ekuitasDasar += isContra ? -bal : bal;
  });
  return { aset, kewajiban, ekuitas: ekuitasDasar + netIncome.laba };
}

export function getHppBalance(
  accounts: Account[],
  balances: Record<string, AccountBalance>
): number {
  const hpp = accounts.find((a) => a.code === "5010" || a.code === "5101" || a.name.toLowerCase().includes("hpp"));
  if (!hpp) return 0;
  return balances[hpp.id]?.balance || 0;
}

export function computeMonthlyData(accounts: Account[], entries: JournalEntry[]): MonthlyPoint[] {
  const byId: Record<string, Account> = {};
  accounts.forEach((a) => (byId[a.id] = a));
  const map: Record<string, MonthlyPoint> = {};
  entries.forEach((e) => {
    const key = e.date.slice(0, 7);
    if (!map[key]) map[key] = { key, label: monthLabel(e.date), pendapatan: 0, beban: 0 };
    e.lines.forEach((l) => {
      const acc = byId[l.accountId];
      if (!acc) return;
      if (acc.category === "Pendapatan")
        map[key].pendapatan += (Number(l.credit) || 0) - (Number(l.debit) || 0);
      if (acc.category === "Beban")
        map[key].beban += (Number(l.debit) || 0) - (Number(l.credit) || 0);
    });
  });
  return Object.values(map).sort((x, y) => x.key.localeCompare(y.key));
}

export function computeLedgerRows(
  accounts: Account[],
  entries: JournalEntry[],
  accountId: string
): LedgerRow[] {
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return [];
  const normal = getAccountNormal(account);
  let running = 0;
  const list: LedgerRow[] = [];
  entries
    .filter((e) => e.lines.some((l) => l.accountId === accountId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((e) => {
      e.lines
        .filter((l) => l.accountId === accountId)
        .forEach((l) => {
          const debit = Number(l.debit) || 0;
          const credit = Number(l.credit) || 0;
          running += normal === "debit" ? debit - credit : credit - debit;
          list.push({ date: e.date, desc: e.desc, debit, credit, running });
        });
    });
  return list;
}
