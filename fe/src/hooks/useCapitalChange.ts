import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";

export interface CapitalChangeParams {
  from?: string;
  to?: string;
}

export interface CapitalMovementItem {
  id: number;
  date: string;
  type: string;
  amount: number | string;
  description?: string | null;
}

export interface CapitalChangeData {
  period: { from?: string; to?: string };
  modalAwal: number;
  setoran: number;
  prive: number;
  labaBersih: number;
  modalAkhir: number;
  movements: CapitalMovementItem[];
}

export function useCapitalChange(params?: CapitalChangeParams) {
  const { businessId } = useBusiness();
  const { from, to } = params ?? {};
  return useQuery({
    queryKey: ["capital-change", businessId, from, to],
    queryFn: async (): Promise<CapitalChangeData> => {
      const res = await api.get("/reports/capital-change", { params: { from, to } });
      return res.data?.data;
    },
    enabled: !!businessId,
  });
}
