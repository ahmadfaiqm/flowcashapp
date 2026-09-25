import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
import { getPrefix } from "../utils/prefix";
export function useSalesInvoices() {
  const { businessId } = useBusiness();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;
  const q = useQuery({
    queryKey: ["salesInvoices", businessId, page],
    queryFn: async () => {
      const res = await api.get("/sales-invoices", { params: { page, limit } });
      return { data: res.data?.data ?? [], meta: res.data?.meta };
    },
    enabled: !!businessId,
  });
  const create = useMutation({
    mutationFn: async (p: { customerId?: number; invoiceDate: string; dueDate?: string; notes?: string; lines: { productId: number; quantity: number; unitPrice: number }[] }) => {
      const payload = { ...p, prefix: getPrefix(businessId, "SI") };
      return (await api.post("/sales-invoices", payload)).data?.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salesInvoices", businessId] }),
  });
  const getById = (id: number) =>
    useQuery({
      queryKey: ["salesInvoice", businessId, id],
      queryFn: async () => (await api.get(`/sales-invoices/${id}`)).data?.data,
      enabled: !!businessId && !!id,
    });
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, isLoading: q.isLoading, create, getById };
}
