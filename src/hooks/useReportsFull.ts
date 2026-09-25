import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";

export function useProfitLoss(params?: { from?: string; to?: string }) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "profit-loss", businessId, params],
    queryFn: async () => (await api.get("/reports/profit-loss", { params })).data?.data,
    enabled: !!businessId,
  });
}

export function useSalesReport(params?: Record<string, unknown>) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "sales", businessId, params],
    queryFn: async () => (await api.get("/reports/sales", { params })).data?.data,
    enabled: !!businessId,
  });
}

export function usePurchaseReport(params?: Record<string, unknown>) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "purchase", businessId, params],
    queryFn: async () => (await api.get("/reports/purchase", { params })).data?.data,
    enabled: !!businessId,
  });
}

export function useStockReport(params?: Record<string, unknown>) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "stock", businessId, params],
    queryFn: async () => (await api.get("/reports/stock", { params })).data?.data,
    enabled: !!businessId,
  });
}

export function useArReport(params?: Record<string, unknown>) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "ar", businessId, params],
    queryFn: async () => (await api.get("/reports/ar", { params })).data?.data,
    enabled: !!businessId,
  });
}

export function useApReport(params?: Record<string, unknown>) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "ap", businessId, params],
    queryFn: async () => (await api.get("/reports/ap", { params })).data?.data,
    enabled: !!businessId,
  });
}

export function useBalanceSheetReport(params?: Record<string, unknown>) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "balance-sheet", businessId, params],
    queryFn: async () => (await api.get("/reports/balance-sheet", { params })).data?.data,
    enabled: !!businessId,
  });
}

export function useCashFlowReport(params?: Record<string, unknown>) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "cash-flow", businessId, params],
    queryFn: async () => (await api.get("/reports/cash-flow", { params })).data?.data,
    enabled: !!businessId,
  });
}

export function useFixedAssetReport(params?: Record<string, unknown>) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "fixed-assets", businessId, params],
    queryFn: async () => (await api.get("/reports/fixed-assets", { params })).data?.data,
    enabled: !!businessId,
  });
}
