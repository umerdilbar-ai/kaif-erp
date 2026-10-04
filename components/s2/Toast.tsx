"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tiny toast: `show("text", "ok" | "err")`, render `{toast}` anywhere. */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const show = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    setMsg({ text, kind });
    setTimeout(() => setMsg(null), kind === "err" ? 5000 : 2200);
  }, []);
  const toast = msg && (
    <div className={cn(
      "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl px-6 py-4 text-xl font-bold text-white shadow-xl",
      msg.kind === "ok" ? "bg-money-in" : "bg-money-out"
    )}>
      {msg.kind === "ok" ? <CheckCircle2 className="size-8" /> : <AlertTriangle className="size-8" />}
      {msg.text}
    </div>
  );
  return { show, toast };
}
