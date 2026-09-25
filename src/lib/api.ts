import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("akuntansi.token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const bid = localStorage.getItem("akuntansi.businessId");
  if (bid) config.headers["X-Business-Id"] = bid;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || "";
      const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/register");
      if (!isAuthRoute) {
        localStorage.removeItem("akuntansi.token");
        localStorage.removeItem("akuntansi.user");
        // keep businessId? clear optionally
        // redirect handled by auth hook
      }
    }
    return Promise.reject(err);
  }
);

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string; details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } } | undefined;
    const base = data?.message || data?.error || err.message;
    if (data?.details) {
      const fieldMsgs = Object.entries(data.details.fieldErrors ?? {}).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ");
      const formMsgs = (data.details.formErrors ?? []).join("; ");
      const extra = [fieldMsgs, formMsgs].filter(Boolean).join("; ");
      if (extra) return `${base}: ${extra}`;
    }
    return base;
  }
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan";
}
