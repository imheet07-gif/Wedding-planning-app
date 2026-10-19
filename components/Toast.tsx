"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type Kind = "ok" | "error";
type Item = { id: number; text: string; kind: Kind };

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(0);

  const notify = useCallback((text: string, kind: Kind = "ok") => {
    const id = next.current++;
    setItems((cur) => [...cur.slice(-2), { id, text, kind }]);
    setTimeout(() => setItems((cur) => cur.filter((i) => i.id !== id)), kind === "error" ? 6000 : 2200);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+var(--safe-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 print:hidden">
        {items.map((i) => (
          <div key={i.id} className="pointer-events-auto flex max-w-sm animate-pop items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
            {i.kind === "ok" ? <CheckCircle2 size={16} className="shrink-0 text-green-400" /> : <XCircle size={16} className="shrink-0 text-rose-300" />}
            <span>{i.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
