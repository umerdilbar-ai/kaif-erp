"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

/** Big on-screen keypad. Controlled: pass the current string value, receive the next one. */
export function NumPad({
  value,
  onChange,
  allowDecimal = true,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  allowDecimal?: boolean;
  className?: string;
}) {
  function press(k: string) {
    if (k === "back") return onChange(value.slice(0, -1));
    if (k === ".") {
      if (!allowDecimal || value.includes(".")) return;
      return onChange(value === "" ? "0." : value + ".");
    }
    onChange(value === "0" ? k : value + k);
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", allowDecimal ? "." : "", "0", "back"];
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {keys.map((k, i) =>
        k === "" ? (
          <span key={i} />
        ) : (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className={cn(
              "flex min-h-16 items-center justify-center rounded-xl text-3xl font-bold shadow-sm active:scale-95",
              k === "back" ? "bg-red-100 text-money-out" : "bg-cream text-navy"
            )}
          >
            {k === "back" ? <Delete className="size-8" /> : k}
          </button>
        )
      )}
    </div>
  );
}
