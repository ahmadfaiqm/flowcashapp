import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
export function useCashBankTransfers() {
  const {businessId}=useBusiness(); const qc=useQueryClient();
  const q = useQuery({ queryKey:["cashBankTransfers", businessId], queryFn: async()=>{ const res=await api.get("/cash-bank-transfers"); return res.data?.data ?? []; }, enabled: !!businessId });
  const transfer = useMutation({ mutationFn: async(p:{fromAccountId:number; toAccountId:number; amount:number; transferDate:string; notes?:string})=> {
    const payload = { sourceAccountId: p.fromAccountId, destinationAccountId: p.toAccountId, amount: p.amount, transferDate: p.transferDate, notes: p.notes };
    return (await api.post("/cash-bank-transfers", payload)).data?.data;
  }, onSuccess:()=>{ qc.invalidateQueries({queryKey:["cashBankTransfers", businessId]}); qc.invalidateQueries({queryKey:["cashBankAccounts", businessId]}); }});
  return { items: q.data ?? [], isLoading: q.isLoading, transfer };
}
