import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapJournalToEntry, type BackendJournal } from "../utils/mappers";
import type { JournalEntry, JournalLine } from "../types";
import { useBusiness } from "./useBusiness";

export function useJournals() {
  const { businessId } = useBusiness();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["journals", businessId],
    queryFn: async (): Promise<JournalEntry[]> => {
      const res = await api.get("/journals", { params: { limit: 200 } });
      const items: BackendJournal[] = res.data?.data ?? [];
      return items.map(mapJournalToEntry);
    },
    enabled: !!businessId,
  });

  const create = useMutation({
    mutationFn: async (input: { date: string; desc: string; lines: JournalLine[]; isAdjustment?: boolean; adjustmentType?: string }) => {
      const payload: Record<string, unknown> = {
        journalDate: input.date,
        description: input.desc,
        status: "posted" as const,
        isAdjustment: !!input.isAdjustment,
        lines: input.lines.map((l) => ({
          coaId: Number(l.accountId),
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      };
      if (input.adjustmentType) payload.adjustmentType = input.adjustmentType;
      const res = await api.post("/journals", payload);
      return res.data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journals", businessId] });
      qc.invalidateQueries({ queryKey: ["dashboard", businessId] });
      qc.invalidateQueries({ queryKey: ["reports", businessId] });
      qc.invalidateQueries({ queryKey: ["worksheet", businessId] });
      qc.invalidateQueries({ queryKey: ["capital-change", businessId] });
      qc.invalidateQueries({ queryKey: ["adjusted-trial-balance", businessId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/journals/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journals", businessId] });
      qc.invalidateQueries({ queryKey: ["dashboard", businessId] });
      qc.invalidateQueries({ queryKey: ["reports", businessId] });
      qc.invalidateQueries({ queryKey: ["worksheet", businessId] });
      qc.invalidateQueries({ queryKey: ["capital-change", businessId] });
    },
  });

  return {
    journals: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    remove,
  };
}
