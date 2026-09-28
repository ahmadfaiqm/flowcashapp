import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapSupplier } from "../utils/mappers";
import type { Supplier } from "../types/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useSuppliers(searchInit="") {
  const { businessId } = useBusiness(); const qc = useQueryClient();
  const [page, setPage] = useState(1); const [search, setSearch] = useState(searchInit); const limit=20;
  const q = useQuery({
    queryKey:["suppliers", businessId, page, limit, search],
    queryFn: async()=>{
      const res = await api.get("/suppliers", {params:{page, limit, search: search||undefined}});
      const items: any[] = res.data?.data ?? []; const meta = res.data?.meta ?? {total: items.length, page, limit, totalPages:1};
      return {data: items.map(mapSupplier) as Supplier[], meta};
    },
    enabled: !!businessId,
  });
  const create = useMutation({ mutationFn: async(p:{code:string;name:string;phone?:string;address?:string})=> (await api.post("/suppliers", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["suppliers", businessId]})});
  const update = useMutation({ mutationFn: async({id, ...p}:{id:number}&Record<string,unknown>)=> (await api.patch(`/suppliers/${id}`, p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["suppliers", businessId]})});
  const remove = useMutation({ mutationFn: async(id:number)=> await api.delete(`/suppliers/${id}`), onSuccess:()=>qc.invalidateQueries({queryKey:["suppliers", businessId]})});
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, search, setSearch, isLoading: q.isLoading, error: q.error, create, update, remove, refetch: q.refetch };
}
