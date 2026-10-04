"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { NumPad } from "@/components/ui-kaif";
import type { Label } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Big number box. Typing works (keyboard), and tapping the keypad icon opens a NumPad sheet
 * for touch users. Value is kept as a string.
 */
export function NumField({
  label,
  value,
  onChange,
  allowDecimal = true,
  prefix,
  className,
}: {
  label?: Label;
  value: string;
  onChange: (v: string) => void;
  allowDecimal?: boolean;
  prefix?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex flex-wrap items-baseline gap-x-2 text-navy">
          <span className="text-lg font-bold">{label.roman}</span>
          <span className="font-urdu text-base" dir="rtl">{label.ur}</span>
          <span className="text-sm opacity-60">{label.en}</span>
        </div>
      )}
      <button type="button" onClick={() => setOpen(true)}
        className="flex h-16 w-full items-center gap-2 rounded-2xl border-2 border-brand/30 bg-white px-4 text-left text-2xl font-bold tabular-nums">
        {prefix && <span className="text-lg text-navy/50">{prefix}</span>}
        <span className={cn(!value && "text-navy/30")}>{value || "0"}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 min-[900px]:items-center"
          onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {label && <p className="text-center text-xl font-bold">{label.roman} <span className="font-urdu">{label.ur}</span></p>}
            <input inputMode="decimal" autoFocus value={value}
              onChange={(e) => {
                const v = e.target.value.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, "");
                onChange(v);
              }}
              onKeyDown={(e) => e.key === "Enter" && setOpen(false)}
              className="h-16 w-full rounded-2xl border-2 border-brand bg-cream/40 px-4 text-right text-3xl font-bold tabular-nums" />
            <NumPad value={value} onChange={onChange} allowDecimal={allowDecimal} />
            <button type="button" onClick={() => setOpen(false)}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-money-in text-2xl font-bold text-white">
              <Check className="size-7" /> OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
