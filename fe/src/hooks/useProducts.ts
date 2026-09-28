import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapProduct } from "../utils/mappers";
import type { Product } from "../types/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useProducts(searchInit="") {
  const { businessId } = useBusiness(); const qc = useQueryClient();
  const [page, setPage] = useState(1); const [search, setSearch] = useState(searchInit); const limit=20;
  const q = useQuery({
    queryKey:["products", businessId, page, limit, search],
    queryFn: async()=>{
      const res = await api.get("/products", {params:{page, limit, search: search||undefined}});
      const items: any[] = res.data?.data ?? []; const meta = res.data?.meta ?? {total: items.length, page, limit, totalPages:1};
      return {data: items.map(mapProduct) as Product[], meta};
    },
    enabled: !!businessId,
  });
  const create = useMutation({ mutationFn: async(p:{sku:string;name:string;unit?:string;purchasePrice?:number;sellingPrice?:number})=> (await api.post("/products", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["products", businessId]})});
  const update = useMutation({ mutationFn: async({id, ...p}:{id:number}&Record<string,unknown>)=> (await api.patch(`/products/${id}`, p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["products", businessId]})});
  const remove = useMutation({ mutationFn: async(id:number)=> await api.delete(`/products/${id}`), onSuccess:()=>qc.invalidateQueries({queryKey:["products", businessId]})});
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, search, setSearch, isLoading: q.isLoading, error: q.error, create, update, remove, refetch: q.refetch };
}
