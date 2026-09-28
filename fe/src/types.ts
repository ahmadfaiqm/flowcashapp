export type Category = "Aset" | "Kewajiban" | "Ekuitas" | "Pendapatan" | "Beban";

export interface Account {
  id: string;
  code: string;
  name: string;
  category: Category;
  isContra?: boolean;
  normalBalance?: "debit" | "credit" | string | null;
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  desc: string;
  lines: JournalLine[];
}

export interface UserRecord {
  passwordHash: string;
  displayName: string;
}

export interface AuthSession {
  username: string;
  displayName: string;
}

export interface CompanyData {
  companyName: string;
  accounts: Account[];
  entries: JournalEntry[];
}

export type PageKey =
  | "dashboard" | "accounts" | "journal" | "ledger" | "trial" | "income" | "balance" | "profile"
  | "products" | "customers" | "suppliers" | "taxes" | "cashBank" | "transfers" | "stock" | "salesInvoices" | "receipts" | "purchaseInvoices" | "purchasePayments" | "fixedAssets" | "depreciations" | "reportsFull" | "users"
  | "worksheet" | "capitalChange" | "periods" | "prefixSettings";

export interface AccountBalance {
  debit: number;
  credit: number;
  balance: number;
}

export interface NetIncome {
  pendapatan: number;
  beban: number;
  laba: number;
}

export interface Totals {
  aset: number;
  kewajiban: number;
  ekuitas: number;
}

export interface MonthlyPoint {
  key: string;
  label: string;
  pendapatan: number;
  beban: number;
}

export interface LedgerRow {
  date: string;
  desc: string;
  debit: number;
  credit: number;
  running: number;
}
