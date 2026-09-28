import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";

export interface AccountingPeriod {
  id: number;
  businessId: number;
  year: number;
  month: number;
  status: string;
  closedAt?: string | null;
}

export function usePeriods() {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["periods", businessId],
    queryFn: async (): Promise<AccountingPeriod[]> => {
      const res = await api.get("/periods");
      return res.data?.data ?? [];
    },
    enabled: !!businessId,
  });
}

export function useClosePeriod() {
  const { businessId } = useBusiness();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { year: number; month: number }) => {
      const res = await api.post("/periods/close", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periods", businessId] });
      qc.invalidateQueries({ queryKey: ["worksheet", businessId] });
      qc.invalidateQueries({ queryKey: ["periods"] });
    },
  });
}
