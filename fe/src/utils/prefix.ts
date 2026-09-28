export type PrefixKey = "SI" | "RC" | "PB" | "PP";

export const DEFAULT_PREFIXES: Record<PrefixKey, string> = {
  SI: "SI",
  PB: "PB",
  RC: "RC",
  PP: "PP",
};

export const PREFIX_LABELS: Record<PrefixKey, string> = {
  SI: "Faktur Jual",
  RC: "Pelunasan (Receipt)",
  PB: "Faktur Beli",
  PP: "Pembayaran Beli",
};

function storageKey(businessId?: number | null) {
  return `akuntansi.prefix.${businessId ?? "global"}`;
}

export function getPrefixes(businessId?: number | null): Record<PrefixKey, string> {
  try {
    const raw = localStorage.getItem(storageKey(businessId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<PrefixKey, string>>;
      return {
        SI: (parsed.SI?.trim().toUpperCase() || DEFAULT_PREFIXES.SI),
        PB: (parsed.PB?.trim().toUpperCase() || DEFAULT_PREFIXES.PB),
        RC: (parsed.RC?.trim().toUpperCase() || DEFAULT_PREFIXES.RC),
        PP: (parsed.PP?.trim().toUpperCase() || DEFAULT_PREFIXES.PP),
      };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFIXES };
}

export function setPrefixes(businessId: number | null | undefined, prefixes: Record<PrefixKey, string>) {
  const cleaned: Record<PrefixKey, string> = {
    SI: sanitize(prefixes.SI) || DEFAULT_PREFIXES.SI,
    PB: sanitize(prefixes.PB) || DEFAULT_PREFIXES.PB,
    RC: sanitize(prefixes.RC) || DEFAULT_PREFIXES.RC,
    PP: sanitize(prefixes.PP) || DEFAULT_PREFIXES.PP,
  };
  localStorage.setItem(storageKey(businessId), JSON.stringify(cleaned));
  return cleaned;
}

export function getPrefix(businessId: number | null | undefined, key: PrefixKey): string {
  return getPrefixes(businessId as number | null)[key];
}

function sanitize(v: string): string {
  // allow A-Z, 0-9, -, _, max 10, uppercase, no spaces
  return v.trim().toUpperCase().replace(/[^A-Z0-9-_]/g, "").slice(0, 10);
}

export function validatePrefix(v: string): string | null {
  if (!v.trim()) return "Prefix tidak boleh kosong";
  if (v.trim().length > 10) return "Maks 10 karakter";
  if (!/^[A-Za-z0-9-_]+$/.test(v.trim())) return "Hanya huruf, angka, - dan _";
  return null;
}
