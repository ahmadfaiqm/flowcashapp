export function formatRupiah(n: number): string {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

export function formatDate(d: string): string {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export function monthLabel(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  });
}

export function uid(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 9);
}
