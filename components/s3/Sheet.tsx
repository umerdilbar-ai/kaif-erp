"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Label } from "@/lib/labels";
import { BigButton, NumPad } from "@/components/ui-kaif";
import { S } from "./labels";
import { Tri } from "./Tri";

/** Full-screen overlay with a big close button. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: Label;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 min-[600px]:items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <Tri label={title} className="text-2xl text-brand" />
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex size-14 items-center justify-center rounded-full bg-cream text-navy">
            <X className="size-8" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** NumPad in a sheet. Starts empty (shows the old value faintly); OK with nothing typed keeps the old value. */
export function NumSheet({
  title,
  value,
  onDone,
  onClose,
  allowDecimal = true,
}: {
  title: Label;
  value: string;
  onDone: (v: string) => void;
  onClose: () => void;
  allowDecimal?: boolean;
}) {
  const [draft, setDraft] = useState("");
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="mb-3 rounded-2xl bg-cream px-4 py-3 text-right text-5xl font-extrabold tabular-nums">
        {draft || <span className="text-navy/30">{value || "0"}</span>}
      </div>
      <NumPad value={draft} onChange={setDraft} allowDecimal={allowDecimal} />
      <BigButton variant="in" icon={Check} label={S.ok} className="mt-3 w-full"
        onClick={() => { onDone(draft === "" ? value : draft); onClose(); }} />
    </Sheet>
  );
}
