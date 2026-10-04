"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

/** Big chip choice with an inline "+ Naya" that creates a new option via `onCreate`. */
export function ChipSelect({
  options,
  value,
  onChange,
  onCreate,
  allowNone = true,
}: {
  options: Opt[];
  value: string | null;
  onChange: (id: string | null) => void;
  onCreate?: (name: string) => Promise<Opt | null>;
  allowNone?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const chip = "min-h-12 rounded-full px-5 text-lg font-semibold active:scale-95";

  async function create() {
    if (!onCreate || !name.trim()) return;
    setBusy(true);
    const opt = await onCreate(name.trim());
    setBusy(false);
    if (opt) {
      onChange(opt.id);
      setName("");
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allowNone && (
        <button type="button" onClick={() => onChange(null)}
          className={cn(chip, value === null ? "bg-navy text-white" : "bg-cream text-navy/60")}>
          —
        </button>
      )}
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={cn(chip, value === o.id ? "bg-brand text-white" : "bg-cream text-navy")}>
          {o.name}
        </button>
      ))}
      {onCreate &&
        (adding ? (
          <span className="flex items-center gap-1">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              className="h-12 w-40 rounded-full border-2 border-brand px-4 text-lg" />
            <button type="button" disabled={busy} onClick={create} aria-label="Add"
              className="flex size-12 items-center justify-center rounded-full bg-money-in text-white">
              <Check className="size-6" />
            </button>
            <button type="button" onClick={() => setAdding(false)} aria-label="Cancel"
              className="flex size-12 items-center justify-center rounded-full bg-cream text-navy">
              <X className="size-6" />
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className={cn(chip, "flex items-center gap-1 border-2 border-dashed border-brand text-brand")}>
            <Plus className="size-5" /> Naya
          </button>
        ))}
    </div>
  );
}
