import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useCashBankAccounts() {
  const {businessId}=useBusiness(); const qc=useQueryClient(); const [page,setPage]=useState(1); const limit=20;
  const q = useQuery({ queryKey:["cashBankAccounts", businessId, page], queryFn: async()=>{
    const res = await api.get("/cash-bank-accounts", {params:{page, limit}});
    const items = res.data?.data ?? []; const meta = res.data?.meta ?? {total: items.length, page, limit, totalPages:1};
    return {data: items.map((r:any)=>({...r, openingBalance: Number(r.openingBalance)||0})), meta};
  }, enabled: !!businessId });
  const create = useMutation({ mutationFn: async(p:{coaId:number; name:string; accountNumber?:string; bankName?:string; openingBalance?:number})=> (await api.post("/cash-bank-accounts", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["cashBankAccounts", businessId]})});
  const update = useMutation({ mutationFn: async({id, ...p}:{id:number}&any)=> (await api.patch(`/cash-bank-accounts/${id}`, p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["cashBankAccounts", businessId]})});
  const remove = useMutation({ mutationFn: async(id:number)=> await api.delete(`/cash-bank-accounts/${id}`), onSuccess:()=>qc.invalidateQueries({queryKey:["cashBankAccounts", businessId]})});
  return { items: q.data?.data??[], meta: q.data?.meta, page, setPage, isLoading: q.isLoading, create, update, remove };
}
