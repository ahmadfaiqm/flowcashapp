import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapCoAToAccount, categoryToAccountType, type BackendCoA } from "../utils/mappers";
import type { Account, Category } from "../types";
import { useBusiness } from "./useBusiness";

export function useAccounts() {
  const { businessId } = useBusiness();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["accounts", businessId],
    queryFn: async (): Promise<Account[]> => {
      const res = await api.get("/chart-of-accounts", { params: { limit: 200 } });
      const items: BackendCoA[] = res.data?.data ?? [];
      return items.map(mapCoAToAccount);
    },
    enabled: !!businessId,
  });

  const create = useMutation({
    mutationFn: async (input: { code: string; name: string; category: Category }) => {
      const payload = { code: input.code, name: input.name, accountType: categoryToAccountType(input.category) };
      const res = await api.post("/chart-of-accounts", payload);
      return res.data?.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts", businessId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/chart-of-accounts/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts", businessId] }),
  });

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    remove,
  };
}
