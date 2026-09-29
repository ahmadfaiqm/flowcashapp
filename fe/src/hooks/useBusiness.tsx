import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "../lib/api";
import { useAuth } from "./useAuth";

export interface Business {
  id: number;
  businessName: string;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
  baseCurrency?: string;
  ownerUserId?: number;
  logoUrl?: string | null;
}

const BID_KEY = "akuntansi.businessId";

interface BusinessContextValue {
  businesses: Business[];
  businessId: number | null;
  business: Business | null;
  isLoading: boolean;
  error: string | null;
  selectBusiness: (id: number) => void;
  createBusiness: (payload: { businessName: string; address?: string }) => Promise<Business>;
  updateBusiness: (businessId: number, payload: { businessName: string }) => Promise<Business>;
  uploadBusinessLogo: (businessId: number, file: File) => Promise<Business>;
  deleteBusinessLogo: (businessId: number) => Promise<Business>;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

async function fetchBusinesses(): Promise<Business[]> {
  const res = await api.get("/businesses");
  const data = res.data?.data;
  if (Array.isArray(data)) return data;
  return [];
}

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [businessId, setBusinessId] = useState<number | null>(() => {
    const raw = localStorage.getItem(BID_KEY);
    return raw ? Number(raw) : null;
  });
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["businesses"],
    queryFn: fetchBusinesses,
    enabled: isAuthenticated,
  });

  // auto-select / auto-create logic
  useEffect(() => {
    if (!isAuthenticated) {
      setBusinessId(null);
      localStorage.removeItem(BID_KEY);
      return;
    }
    if (q.isSuccess) {
      const list = q.data ?? [];
      if (list.length === 0) {
        // auto create default business
        api
          .post("/businesses", { businessName: "Usaha Saya" })
          .then((res) => {
            const created = res.data?.data?.business ?? res.data?.data;
            const id = created?.id;
            if (id) {
              setBusinessId(id);
              localStorage.setItem(BID_KEY, String(id));
              qc.invalidateQueries({ queryKey: ["businesses"] });
            }
          })
          .catch((e) => setError(getApiErrorMessage(e)));
        return;
      }
      if (list.length === 1 && !businessId) {
        const id = list[0].id;
        setBusinessId(id);
        localStorage.setItem(BID_KEY, String(id));
      } else if (businessId && !list.some((b) => b.id === businessId)) {
        // selected id no longer belongs to user
        const id = list[0].id;
        setBusinessId(id);
        localStorage.setItem(BID_KEY, String(id));
      }
    }
  }, [q.isSuccess, q.data, isAuthenticated, businessId, qc]);

  const selectBusiness = useCallback((id: number) => {
    setBusinessId(id);
    localStorage.setItem(BID_KEY, String(id));
    // clear domain caches when switching business
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["journals"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["suppliers"] });
    qc.invalidateQueries({ queryKey: ["taxes"] });
    qc.invalidateQueries({ queryKey: ["cashBankAccounts"] });
    qc.invalidateQueries({ queryKey: ["cashBankTransfers"] });
    qc.invalidateQueries({ queryKey: ["stockMovements"] });
    qc.invalidateQueries({ queryKey: ["salesInvoices"] });
    qc.invalidateQueries({ queryKey: ["receipts"] });
    qc.invalidateQueries({ queryKey: ["purchaseInvoices"] });
    qc.invalidateQueries({ queryKey: ["purchasePayments"] });
    qc.invalidateQueries({ queryKey: ["fixedAssets"] });
    qc.invalidateQueries({ queryKey: ["assetDepreciations"] });
    qc.invalidateQueries({ queryKey: ["users"] });
  }, [qc]);

  const createMut = useMutation({
    mutationFn: async (payload: { businessName: string; address?: string }) => {
      const res = await api.post("/businesses", payload);
      return res.data?.data?.business ?? res.data?.data;
    },
    onSuccess: (biz: Business) => {
      qc.invalidateQueries({ queryKey: ["businesses"] });
      if (biz?.id) selectBusiness(biz.id);
    },
  });

  const createBusiness = useCallback(
    async (payload: { businessName: string; address?: string }) => {
      const biz = await createMut.mutateAsync(payload);
      return biz;
    },
    [createMut]
  );

  const updateBusiness = useCallback(
    async (businessId: number, payload: { businessName: string }) => {
      const res = await api.patch(`/businesses/${businessId}`, payload);
      qc.invalidateQueries({ queryKey: ["businesses"] });
      return res.data?.data;
    },
    [qc]
  );

  const uploadBusinessLogo = useCallback(
    async (businessId: number, file: File) => {
      const form = new FormData();
      form.append("logo", file);
      const res = await api.post(`/businesses/${businessId}/logo`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      qc.invalidateQueries({ queryKey: ["businesses"] });
      return res.data?.data;
    },
    [qc]
  );

  const deleteBusinessLogo = useCallback(
    async (businessId: number) => {
      const res = await api.delete(`/businesses/${businessId}/logo`);
      qc.invalidateQueries({ queryKey: ["businesses"] });
      return res.data?.data;
    },
    [qc]
  );

  const business = useMemo(() => {
    if (!businessId) return null;
    return (q.data ?? []).find((b) => b.id === businessId) ?? null;
  }, [q.data, businessId]);

  // keep localStorage in sync when businessId changes via effect above
  useEffect(() => {
    if (businessId) localStorage.setItem(BID_KEY, String(businessId));
  }, [businessId]);

  const value: BusinessContextValue = {
    businesses: q.data ?? [],
    businessId,
    business,
    isLoading: q.isLoading || createMut.isPending,
    error: error || (q.error ? getApiErrorMessage(q.error) : null),
    selectBusiness,
    createBusiness,
    updateBusiness,
    uploadBusinessLogo,
    deleteBusinessLogo,
  } as BusinessContextValue & { updateBusiness: typeof updateBusiness };

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be inside BusinessProvider");
  return ctx;
}
