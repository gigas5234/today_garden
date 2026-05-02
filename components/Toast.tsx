"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type Toast = { id: number; text: string; tone: "success" | "info" | "warn" };

type Ctx = {
  show: (text: string, tone?: Toast["tone"]) => void;
};

const ToastCtx = React.createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);
  // SSR 과 hydration mismatch 를 막기 위해 mount 후에만 portal 렌더
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const show = React.useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }, []);

  const toastNode = mounted
    ? createPortal(
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={"toast toast-" + t.tone}>
              {t.tone === "success" ? "✓ " : t.tone === "warn" ? "⚠ " : ""}
              {t.text}
            </div>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toastNode}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) {
    // 마운트 안 된 환경에서 호출되면 noop
    return { show: () => {} };
  }
  return ctx;
}
