import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapTax } from "../utils/mappers";
import type { Tax } from "../types/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useTaxes(searchInit="") {
  const { businessId } = useBusiness(); const qc = useQueryClient();
  const [page, setPage] = useState(1); const [search, setSearch] = useState(searchInit); const limit=20;
  const q = useQuery({
    queryKey:["taxes", businessId, page, limit, search],
    queryFn: async()=>{
      const res = await api.get("/taxes", {params:{page, limit, search: search||undefined}});
      const items: any[] = res.data?.data ?? []; const meta = res.data?.meta ?? {total: items.length, page, limit, totalPages:1};
      return {data: items.map(mapTax) as Tax[], meta};
    },
    enabled: !!businessId,
  });
  const create = useMutation({ mutationFn: async(p:{code:string;name:string;rate:number})=> (await api.post("/taxes", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["taxes", businessId]})});
  const update = useMutation({ mutationFn: async({id, ...p}:{id:number}&Record<string,unknown>)=> (await api.patch(`/taxes/${id}`, p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["taxes", businessId]})});
  const remove = useMutation({ mutationFn: async(id:number)=> await api.delete(`/taxes/${id}`), onSuccess:()=>qc.invalidateQueries({queryKey:["taxes", businessId]})});
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, search, setSearch, isLoading: q.isLoading, error: q.error, create, update, remove, refetch: q.refetch };
}
