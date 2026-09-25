import { useCallback, useRef, useState } from "react";

export interface ToastMessage {
  id: number;
  text: string;
  tone: "ok" | "err";
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  return { toasts, showToast };
}
