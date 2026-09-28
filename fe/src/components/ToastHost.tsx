import type { ToastMessage } from "../hooks/useToasts";

export function ToastHost({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.tone === "err" ? " err" : ""}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
