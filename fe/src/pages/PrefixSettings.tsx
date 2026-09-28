import { useEffect, useState } from "react";
import { useBusiness } from "../hooks/useBusiness";
import { useToasts } from "../hooks/useToasts";
import { DEFAULT_PREFIXES, PREFIX_LABELS, getPrefixes, setPrefixes, validatePrefix, type PrefixKey } from "../utils/prefix";

const KEYS: PrefixKey[] = ["SI", "PB", "RC", "PP"];

export function PrefixSettings() {
  const { businessId } = useBusiness();
  const { showToast } = useToasts();
  const [form, setForm] = useState<Record<PrefixKey, string>>(DEFAULT_PREFIXES);
  const [errors, setErrors] = useState<Partial<Record<PrefixKey, string>>>({});

  useEffect(() => {
    setForm(getPrefixes(businessId as number | null));
  }, [businessId]);

  function onChange(key: PrefixKey, val: string) {
    const up = val.toUpperCase().slice(0, 10);
    setForm((s) => ({ ...s, [key]: up }));
    const msg = validatePrefix(up);
    setErrors((e) => ({ ...e, [key]: msg ?? undefined }));
  }

  function handleSave() {
    const nextErrors: Partial<Record<PrefixKey, string>> = {};
    for (const k of KEYS) {
      const msg = validatePrefix(form[k]);
      if (msg) nextErrors[k] = msg;
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      showToast("Perbaiki prefix yang error", "err");
      return;
    }
    setPrefixes(businessId as number | null, form);
    showToast("Prefix disimpan");
  }

  function handleReset() {
    setForm({ ...DEFAULT_PREFIXES });
    setErrors({});
    setPrefixes(businessId as number | null, DEFAULT_PREFIXES);
    showToast("Prefix direset ke default");
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pengaturan Prefix</h1>
      </div>

      <div className="panel">

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {KEYS.map((key) => (
            <label key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="field-label">
                {PREFIX_LABELS[key]} <span className="td-mono" style={{ opacity: 0.6 }}>({key})</span>
              </span>
              <input
                className="field"
                value={form[key]}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={DEFAULT_PREFIXES[key]}
                maxLength={10}
                style={{ textTransform: "uppercase", borderColor: errors[key] ? "var(--red)" : undefined }}
              />
              {errors[key] ? (
                <span style={{ color: "var(--red)", fontSize: 12 }}>{errors[key]}</span>
              ) : (
                <span className="empty-text" style={{ fontSize: 12 }}>
                  Preview: <code className="td-mono">{form[key] || DEFAULT_PREFIXES[key]}001</code> · Default: <code>{DEFAULT_PREFIXES[key]}</code>
                </span>
              )}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button className="primary-btn" onClick={handleSave}>Simpan</button>
          <button className="link-btn" onClick={handleReset}>Reset Default</button>
        </div>
      </div>
    </div>
  );
}
