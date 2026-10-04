"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Percent, Save, TrendingUp, X } from "lucide-react";
import type { Category, Item } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SplitPane } from "@/components/shell/SplitPane";
import { BigButton, EmptyState, PageTitle, SearchBox, useDing } from "@/components/ui-kaif";
import { L, NumField, Tri, sb, useToast } from "@/components/s2";

type PriceKey = "retail_price" | "wholesale_price" | "min_price";
type Draft = Record<PriceKey, string>;
const KEYS: { key: PriceKey; label: typeof L.retail }[] = [
  { key: "retail_price", label: L.retail },
  { key: "wholesale_price", label: L.wholesale },
  { key: "min_price", label: L.minPrice },
];

export function RateListScreen() {
  const ding = useDing();
  const { show, toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState<"pct" | "rs">("pct");
  const [by, setBy] = useState("");
  const [fields, setFields] = useState<PriceKey[]>(["retail_price", "wholesale_price"]);

  const load = useCallback(async () => {
    const [i, c] = await Promise.all([
      sb().from("items").select("*").eq("is_active", true).order("name"),
      sb().from("categories").select("*").order("name"),
    ]);
    setItems((i.data as Item[]) ?? []);
    setCats((c.data as Category[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => (!cat || i.category_id === cat) && (!s || i.name.toLowerCase().includes(s)));
  }, [items, cat, q]);

  const val = (i: Item, k: PriceKey) => drafts[i.id]?.[k] ?? String(i[k] ?? 0);
  const changedIds = useMemo(
    () => items.filter((i) => drafts[i.id] && KEYS.some(({ key }) => Number(drafts[i.id][key]) !== Number(i[key]))).map((i) => i.id),
    [items, drafts]
  );

  const base = (i: Item, d: Record<string, Draft>): Draft =>
    d[i.id] ?? { retail_price: String(i.retail_price ?? 0), wholesale_price: String(i.wholesale_price ?? 0), min_price: String(i.min_price ?? 0) };

  function edit(i: Item, k: PriceKey, v: string) {
    const clean = v.replace(/[^0-9.]/g, "");
    setDrafts((d) => ({
      ...d,
      [i.id]: { ...base(i, d), [k]: clean },
    }));
  }

  function applyIncrease() {
    const n = Number(by);
    if (!n || !fields.length) return show("Raqam likho / Enter amount", "err");
    setDrafts((d) => {
      const next = { ...d };
      for (const i of list) {
        const cur: Draft = { ...base(i, d) };
        for (const k of fields) {
          const old = Number(cur[k] || 0);
          cur[k] = String(Math.round(mode === "pct" ? old * (1 + n / 100) : old + n));
        }
        next[i.id] = cur;
      }
      return next;
    });
    setBulk(true);
    show(`${list.length} ✓ — ${L.saveAll.roman} dabao`);
  }

  async function saveAll() {
    if (!changedIds.length) return;
    setBusy(true);
    const results = await Promise.all(
      changedIds.map((id) => {
        const d = drafts[id];
        return sb().from("items").update({
          retail_price: Number(d.retail_price || 0),
          wholesale_price: Number(d.wholesale_price || 0),
          min_price: Number(d.min_price || 0),
        }).eq("id", id);
      })
    );
    setBusy(false);
    const err = results.find((r) => r.error)?.error;
    if (err) return show(err.message, "err");
    ding();
    show(`${changedIds.length} ${L.saved.roman} ✓`);
    setDrafts({});
    setBulk(false);
    load();
  }

  const chip = "min-h-12 shrink-0 rounded-full px-5 text-lg font-semibold";

  const left = (
    <div className="space-y-4">
      <PageTitle label={L.rateList} />
      <SearchBox value={q} onChange={setQ} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setCat(null)} className={cn(chip, !cat ? "bg-brand text-white" : "bg-cream text-navy")}>Sab / All</button>
        {cats.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)}
            className={cn(chip, cat === c.id ? "bg-brand text-white" : "bg-cream text-navy")}>{c.name}</button>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border-2 border-pending/40 bg-pending/5 p-4">
        <div className="flex items-center gap-2 text-pending"><TrendingUp className="size-8" /><Tri label={L.increase} /></div>
        <p className="text-base text-navy/70">{list.length} {L.items.roman} ({cat ? cats.find((c) => c.id === cat)?.name : "Sab"})</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode("pct")}
            className={cn(chip, "flex flex-1 items-center justify-center gap-1", mode === "pct" ? "bg-pending text-white" : "bg-white text-navy")}>
            <Percent className="size-5" /> %
          </button>
          <button type="button" onClick={() => setMode("rs")}
            className={cn(chip, "flex-1", mode === "rs" ? "bg-pending text-white" : "bg-white text-navy")}>Rs</button>
        </div>
        <NumField value={by} onChange={setBy} prefix={mode === "pct" ? "%" : "Rs"} />
        <div className="flex flex-wrap gap-2">
          {KEYS.map(({ key, label }) => {
            const on = fields.includes(key);
            return (
              <button key={key} type="button"
                onClick={() => setFields((f) => (on ? f.filter((x) => x !== key) : [...f, key]))}
                className={cn(chip, on ? "bg-navy text-white" : "bg-white text-navy/60")}>
                {on ? "✓ " : ""}{label.roman}
              </button>
            );
          })}
        </div>
        <BigButton variant="pending" icon={TrendingUp} label={L.increase} onClick={applyIncrease} className="w-full" />
      </div>
    </div>
  );

  const right = (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <BigButton variant={bulk ? "out" : "neutral"} icon={bulk ? X : Pencil}
          label={bulk ? L.cancel : L.bulkEdit}
          onClick={() => { if (bulk) setDrafts({}); setBulk(!bulk); }} />
        {bulk && (
          <BigButton variant="in" icon={Save} disabled={busy || !changedIds.length} onClick={saveAll} className="flex-1">
            <span className="flex flex-col items-center leading-tight">
              <span>{L.saveAll.roman} ({changedIds.length})</span>
              <span className="font-urdu text-base font-normal">{L.saveAll.ur}</span>
            </span>
          </BigButton>
        )}
      </div>
      {list.length === 0 ? <EmptyState label={L.nothingHere} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-lg">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b-2 border-brand/30 text-left">
                <th className="p-2"><Tri label={L.item} small /></th>
                {KEYS.map(({ key, label }) => (
                  <th key={key} className="p-2 text-right"><span className="block font-bold">{label.roman}</span><span className="font-urdu text-base font-normal">{label.ur}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((i) => {
                const changed = changedIds.includes(i.id);
                return (
                  <tr key={i.id} className={cn("border-b border-navy/10", changed && "bg-pending/10")}>
                    <td className="p-2 font-bold">{i.name}</td>
                    {KEYS.map(({ key }) => (
                      <td key={key} className="p-1 text-right tabular-nums">
                        {bulk ? (
                          <input inputMode="decimal" value={val(i, key)} onChange={(e) => edit(i, key, e.target.value)}
                            className={cn("h-12 w-24 rounded-xl border-2 px-2 text-right text-lg font-bold",
                              Number(val(i, key)) !== Number(i[key]) ? "border-pending bg-white" : "border-navy/15 bg-cream/40")} />
                        ) : (
                          <span className={cn("font-bold", key === "min_price" && "text-money-out")}>{formatPKR(i[key])}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {toast}
    </div>
  );

  return <SplitPane left={left} right={right} />;
}
