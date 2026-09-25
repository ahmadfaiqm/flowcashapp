import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";

export interface CapitalMovement {
  id: number;
  businessId: number;
  date: string;
  type: string;
  amount: number | string;
  description?: string | null;
  journalId?: number | null;
}

export function useCapitalMovements(params?: { from?: string; to?: string }) {
  const { businessId } = useBusiness();
  return useQuery({
    queryKey: ["capital-movements", businessId, params],
    queryFn: async (): Promise<CapitalMovement[]> => {
      const res = await api.get("/capital-movements", { params });
      return res.data?.data ?? [];
    },
    enabled: !!businessId,
  });
}

export function useCreateCapitalMovement() {
  const { businessId } = useBusiness();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { date: string; type: string; amount: number; description?: string }) => {
      const res = await api.post("/capital-movements", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital-movements", businessId] });
      qc.invalidateQueries({ queryKey: ["capital-change", businessId] });
      qc.invalidateQueries({ queryKey: ["worksheet", businessId] });
      qc.invalidateQueries({ queryKey: ["reports", businessId] });
      qc.invalidateQueries({ queryKey: ["journals", businessId] });
      qc.invalidateQueries({ queryKey: ["dashboard", businessId] });
    },
  });
}
