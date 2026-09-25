import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface AppUser {
  id: number;
  name: string;
  email: string;
}

export function useUsers() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return (res.data?.data ?? []) as AppUser[];
    },
  });
  const create = useMutation({
    mutationFn: async (p: { name: string; email: string; password: string }) =>
      (await api.post("/users", p)).data?.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  return { items: q.data ?? [], isLoading: q.isLoading, error: q.error, create, refetch: q.refetch };
}
