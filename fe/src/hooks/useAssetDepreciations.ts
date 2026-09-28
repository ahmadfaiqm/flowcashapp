import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
export function useAssetDepreciations(page=1, limit=20){
  const {businessId}=useBusiness();
  return useQuery({ queryKey:["assetDepreciations", businessId, page], queryFn: async()=>{ const res=await api.get("/asset-depreciations",{params:{page, limit}}); return {data: res.data?.data ?? [], meta: res.data?.meta}; }, enabled: !!businessId });
}
