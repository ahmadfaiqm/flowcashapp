import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
import { getPrefix } from "../utils/prefix";
export function usePurchasePayments() {
  const { businessId } = useBusiness();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;
  const q = useQuery({
    queryKey: ["purchasePayments", businessId, page],
    queryFn: async () => {
      const res = await api.get("/purchase-payments", { params: { page, limit } });
      return { data: res.data?.data ?? [], meta: res.data?.meta };
    },
    enabled: !!businessId,
  });
  const create = useMutation({
    mutationFn: async (p: { purchaseInvoiceId?: number; supplierId?: number; paymentDate: string; amount: number; paymentMethod: string; cashBankAccountId?: number; notes?: string }) => {
      const payload = { ...p, prefix: getPrefix(businessId, "PP") };
      return (await api.post("/purchase-payments", payload)).data?.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchasePayments", businessId] }),
  });
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, isLoading: q.isLoading, create };
}
