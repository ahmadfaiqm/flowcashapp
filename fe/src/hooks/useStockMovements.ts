import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useStockMovements() {
  const {businessId}=useBusiness(); const qc=useQueryClient(); const [page,setPage]=useState(1); const limit=20;
  const q = useQuery({ queryKey:["stockMovements", businessId, page], queryFn: async()=>{ const res=await api.get("/stock-movements",{params:{page, limit}}); return {data: res.data?.data ?? [], meta: res.data?.meta}; }, enabled: !!businessId });
  const createAdjustment = useMutation({ mutationFn: async(p:{productId:number; quantity:number; unitCost?:number; movementType?:string; notes?:string})=> {
    const payload = { productId: p.productId, quantity: p.quantity, unitCost: p.unitCost, notes: p.notes };
    return (await api.post("/stock-movements", payload)).data?.data;
  }, onSuccess:()=>qc.invalidateQueries({queryKey:["stockMovements", businessId]})});
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, isLoading: q.isLoading, createAdjustment };
}
