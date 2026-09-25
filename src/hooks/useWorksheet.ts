import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";

export interface WorksheetParams {
  from?: string;
  to?: string;
}

export interface WorksheetRow {
  code: string;
  name: string;
  accountType: string;
  isContra: boolean;
  trial: { debit: number; credit: number; balance: number };
  adjustment: { debit: number; credit: number };
  adjusted: { debit: number; credit: number };
  income: { debit: number; credit: number };
  balanceSheet: { debit: number; credit: number };
}

export interface WorksheetTotals {
  trialDebit: number;
  trialCredit: number;
  adjustmentDebit: number;
  adjustmentCredit: number;
  adjustedDebit: number;
  adjustedCredit: number;
  incomeDebit: number;
  incomeCredit: number;
  balanceDebit: number;
  balanceCredit: number;
  netIncome: number;
}

export interface WorksheetData {
  period: { from?: string; to?: string };
  rows: WorksheetRow[];
  totals: WorksheetTotals;
}

export function useWorksheet(params?: WorksheetParams) {
  const { businessId } = useBusiness();
  const { from, to } = params ?? {};
  return useQuery({
    queryKey: ["worksheet", businessId, from, to],
    queryFn: async (): Promise<WorksheetData> => {
      const res = await api.get("/reports/worksheet", { params: { from, to } });
      return res.data?.data;
    },
    enabled: !!businessId,
  });
}

export function useAdjustedTrialBalance(params?: WorksheetParams) {
  const { businessId } = useBusiness();
  const { from, to } = params ?? {};
  return useQuery({
    queryKey: ["adjusted-trial-balance", businessId, from, to],
    queryFn: async () => {
      const res = await api.get("/reports/adjusted-trial-balance", { params: { from, to } });
      return res.data?.data;
    },
    enabled: !!businessId,
  });
}
