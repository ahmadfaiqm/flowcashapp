import type { Account, Category, JournalEntry, JournalLine } from "../types";

// Backend enums
export type BackendAccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

const catToBackend: Record<Category, BackendAccountType> = {
  Aset: "Asset",
  Kewajiban: "Liability",
  Ekuitas: "Equity",
  Pendapatan: "Revenue",
  Beban: "Expense",
};
const backendToCat: Record<BackendAccountType, Category> = {
  Asset: "Aset",
  Liability: "Kewajiban",
  Equity: "Ekuitas",
  Revenue: "Pendapatan",
  Expense: "Beban",
};

export function categoryToAccountType(c: Category): BackendAccountType {
  return catToBackend[c];
}
export function accountTypeToCategory(t: BackendAccountType): Category {
  return backendToCat[t] ?? "Aset";
}

export interface BackendCoA {
  id: number;
  businessId: number;
  code: string;
  name: string;
  accountType: BackendAccountType;
  parentId?: number | null;
  isActive: boolean;
  isContra?: boolean;
  normalBalance?: string | null;
}

export interface BackendJournalLine {
  id: number;
  journalId: number;
  coaId: number;
  debit: string | number;
  credit: string | number;
  memo?: string | null;
  coa?: BackendCoA;
}

export interface BackendJournal {
  id: number;
  businessId: number;
  journalNo: string;
  journalDate: string;
  description?: string | null;
  status: string;
  isAdjustment?: boolean;
  adjustmentType?: string | null;
  periodYear?: number | null;
  periodMonth?: number | null;
  lines: BackendJournalLine[];
  createdAt?: string;
  updatedAt?: string;
}

export function mapCoAToAccount(c: BackendCoA): Account {
  return {
    id: String(c.id),
    code: c.code,
    name: c.name,
    category: accountTypeToCategory(c.accountType),
    isContra: !!c.isContra,
    normalBalance: c.normalBalance ?? null,
  };
}

export function mapJournalToEntry(j: BackendJournal): JournalEntry {
  const date = j.journalDate ? String(j.journalDate).slice(0, 10) : "";
  const lines: JournalLine[] = (j.lines || []).map((l) => ({
    accountId: String(l.coaId),
    debit: Number(l.debit) || 0,
    credit: Number(l.credit) || 0,
  }));
  return {
    id: String(j.id),
    date,
    desc: j.description || j.journalNo || "",
    lines,
  };
}

export function toNumber(v: unknown): number {
  return Number(v) || 0;
}
export function toNum(v: unknown): number { return Number(v) || 0; }
export function mapProduct(raw:any): import("../types/api").Product {
  return { id: raw.id, businessId: raw.businessId, sku: raw.sku, name: raw.name, unit: raw.unit, purchasePrice: toNum(raw.purchasePrice), sellingPrice: toNum(raw.sellingPrice), stock: toNum(raw.stock), minimumStock: toNum(raw.minimumStock), isActive: !!raw.isActive };
}
export function mapCustomer(raw:any): import("../types/api").Customer {
  return { id: raw.id, businessId: raw.businessId, code: raw.code, name: raw.name, phone: raw.phone, address: raw.address, creditLimit: toNum(raw.creditLimit), isActive: !!raw.isActive };
}
export function mapSupplier(raw:any): import("../types/api").Supplier {
  return { id: raw.id, businessId: raw.businessId, code: raw.code, name: raw.name, phone: raw.phone, address: raw.address, isActive: !!raw.isActive };
}
export function mapTax(raw:any): import("../types/api").Tax {
  return { id: raw.id, businessId: raw.businessId, code: raw.code, name: raw.name, rate: toNum(raw.rate), isActive: !!raw.isActive };
}
