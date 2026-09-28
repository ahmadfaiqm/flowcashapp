import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";

export function useProfitLoss() {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "profit-loss", businessId],
    queryFn: async () => {
      const res = await api.get("/reports/profit-loss");
      return res.data?.data;
    },
    enabled: !!businessId,
  });
}

export function useBalanceSheet() {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["reports", "balance-sheet", businessId],
    queryFn: async () => {
      const res = await api.get("/reports/balance-sheet");
      return res.data?.data;
    },
    enabled: !!businessId,
  });
}
