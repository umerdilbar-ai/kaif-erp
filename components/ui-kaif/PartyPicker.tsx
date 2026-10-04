"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Party, PartyType } from "@/lib/types";
import { L } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { SearchBox } from "./SearchBox";
import { MoneyText } from "./MoneyText";
import { EmptyState } from "./EmptyState";

/**
 * Search + tap to pick a party. Loads parties itself unless `parties` is passed.
 * Balance shown in amber (pending udhaar). `type` filters CUSTOMER/SUPPLIER.
 */
export function PartyPicker({
  type,
  selectedId,
  onPick,
  parties: given,
}: {
  type?: PartyType;
  selectedId?: string | null;
  onPick: (party: Party) => void;
  parties?: Party[];
}) {
  const [loaded, setLoaded] = useState<Party[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (given) return;
    let query = createClient().from("parties").select("*").order("name");
    if (type) query = query.eq("type", type);
    query.then(({ data }) => setLoaded((data as Party[]) ?? []));
  }, [given, type]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (given ?? loaded)
      .filter((p) => !type || p.type === type)
      .filter((p) => !s || p.name.toLowerCase().includes(s) || (p.phone ?? "").includes(s));
  }, [given, loaded, q, type]);

  return (
    <div className="space-y-3">
      <SearchBox value={q} onChange={setQ} />
      {list.length === 0 && <EmptyState label={L.nothingHere} />}
      <ul className="space-y-2">
        {list.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left active:scale-[0.99]",
                selectedId === p.id ? "border-brand bg-brand/5" : "border-transparent bg-cream/60"
              )}
            >
              <User className="size-9 shrink-0 text-brand" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xl font-bold">{p.name}</span>
                {p.phone && <span className="block text-base text-navy/60">{p.phone}</span>}
              </span>
              {Number(p.balance) !== 0 && (
                <span className="text-right">
                  <MoneyText amount={p.balance} intent="pending" abs className="block text-xl" />
                  <span className="text-sm text-pending">
                    {Number(p.balance) > 0 ? L.lena.roman : L.dena.roman}
                  </span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
