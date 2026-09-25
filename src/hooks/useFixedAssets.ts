import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useFixedAssets() {
  const {businessId}=useBusiness(); const qc=useQueryClient(); const [page,setPage]=useState(1); const limit=20;
  const q = useQuery({ queryKey:["fixedAssets", businessId, page], queryFn: async()=>{ const res=await api.get("/fixed-assets",{params:{page, limit}}); const items=res.data?.data ?? []; return {data: items.map((r:any)=>({...r, acquisitionCost:Number(r.acquisitionCost), residualValue:Number(r.residualValue), bookValue:Number(r.bookValue)})), meta: res.data?.meta}; }, enabled: !!businessId });
  const create = useMutation({ mutationFn: async(p:{code:string; name:string; acquisitionDate:string; acquisitionCost:number; usefulLifeMonths:number; residualValue?:number})=> (await api.post("/fixed-assets", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["fixedAssets", businessId]})});
  const update = useMutation({ mutationFn: async({id, ...p}:{id:number}&any)=> (await api.patch(`/fixed-assets/${id}`, p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["fixedAssets", businessId]})});
  const remove = useMutation({ mutationFn: async(id:number)=> await api.delete(`/fixed-assets/${id}`), onSuccess:()=>qc.invalidateQueries({queryKey:["fixedAssets", businessId]})});
  const depreciate = useMutation({ mutationFn: async({id, depreciationDate}:{id:number; depreciationDate:string})=> (await api.post(`/fixed-assets/${id}/depreciate`, {depreciationDate})).data?.data, onSuccess:()=>{ qc.invalidateQueries({queryKey:["fixedAssets", businessId]}); qc.invalidateQueries({queryKey:["assetDepreciations", businessId]}); }});
  const listDepreciations = (assetId:number)=> useQuery({ queryKey:["fixedAssetDepreciations", businessId, assetId], queryFn: async()=> (await api.get(`/fixed-assets/${assetId}/depreciations`)).data?.data ?? [], enabled: !!businessId && !!assetId });
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, isLoading: q.isLoading, create, update, remove, depreciate, listDepreciations };
}
