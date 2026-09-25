import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";

export interface DashboardSummary {
  sales: { total: number; count: number };
  purchases: { total: number; count: number };
  receipts: { total: number; count: number };
  payments: { total: number; count: number };
  profit: number;
  revenue: number;
  expense: number;
  omzet: number;
  cashBankTotal: number;
  // compat
  [k: string]: unknown;
}

export function useDashboard() {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["dashboard", businessId],
    queryFn: async (): Promise<DashboardSummary | null> => {
      const res = await api.get("/dashboard");
      return res.data?.data ?? null;
    },
    enabled: !!businessId,
  });
}
