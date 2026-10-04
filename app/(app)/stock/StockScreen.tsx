"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Boxes, List, Minus, Package, Plus, Scale, Undo2, X, Zap } from "lucide-react";
import type { Category, Item, Location, StockTransaction, StockTxType } from "@/lib/types";
import type { Label } from "@/lib/labels";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SplitPane } from "@/components/shell/SplitPane";
import { BigButton, EmptyState, ItemPicker, PageTitle, useDing } from "@/components/ui-kaif";
import { ChipSelect, L, NumField, Tri, sb, useToast } from "@/components/s2";

type Tx = StockTransaction & {
  items: { name: string } | null;
  invoices: { invoice_no: number; type: string } | null;
  from: { name: string } | null;
  to: { name: string } | null;
};
type Action = "DAMAGE" | "RETURN" | "ADJUSTMENT" | "TRANSFER";

const TYPE_LABEL: Record<StockTxType, Label> = {
  SALE: L.sale, PURCHASE: L.purchase, DAMAGE: L.damage, RETURN_IN: L.returnIn,
  RETURN_OUT: L.returnOut, ADJUSTMENT: L.adjustment, TRANSFER: L.transfer,
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function StockScreen() {
  const ding = useDing();
  const { show, toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [locs, setLocs] = useState<Location[]>([]);
  const [sel, setSel] = useState<Item | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);

  const [action, setAction] = useState<Action | null>(null);
  const [qty, setQty] = useState("");
  const [sign, setSign] = useState<1 | -1>(1);
  const [toLoc, setToLoc] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const loadItems = useCallback(async () => {
    const [i, c, l] = await Promise.all([
      sb().from("items").select("*").eq("is_active", true).order("name"),
      sb().from("categories").select("*").order("name"),
      sb().from("locations").select("*").order("name"),
    ]);
    const list = (i.data as Item[]) ?? [];
    setItems(list);
    setCats((c.data as Category[]) ?? []);
    setLocs((l.data as Location[]) ?? []);
    setSel((s) => (s ? list.find((x) => x.id === s.id) ?? null : null));
  }, []);

  const loadTxs = useCallback(async (itemId: string | null) => {
    let query = sb().from("stock_transactions")
      .select("*, items(name), invoices(invoice_no, type), from:locations!from_location_id(name), to:locations!to_location_id(name)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (itemId) query = query.eq("item_id", itemId);
    const { data, error } = await query;
    if (error) show(error.message, "err");
    setTxs((data as unknown as Tx[]) ?? []);
  }, [show]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadTxs(sel?.id ?? null); }, [sel?.id, loadTxs]);

  function open(a: Action) {
    setAction(a);
    setQty("");
    setNotes("");
    setToLoc(null);
    setSign(a === "DAMAGE" ? -1 : 1);
  }

  async function submit() {
    if (!sel || !action) return;
    const n = Number(qty);
    if (action !== "TRANSFER" && !n) return show("Tadaad likho / Enter quantity", "err");
    if (action === "TRANSFER" && !toLoc) return show("Jagah chuno / Pick location", "err");
    const p_type =
      action === "RETURN" ? (sign > 0 ? "RETURN_IN" : "RETURN_OUT") : action;
    const p_quantity = action === "TRANSFER" ? 0 : action === "DAMAGE" ? -Math.abs(n) : sign * Math.abs(n);
    setBusy(true);
    const { error } = await sb().rpc("adjust_stock", {
      p_item_id: sel.id, p_quantity, p_type, p_notes: notes.trim() || null,
      p_to_location_id: action === "TRANSFER" ? toLoc : null,
    });
    setBusy(false);
    if (error) return show(error.message, "err");
    ding();
    show(`${L.saved.roman} ✓`);
    setAction(null);
    await loadItems();
    loadTxs(sel.id);
  }

  const locName = (id: string | null) => locs.find((l) => l.id === id)?.name ?? "—";

  const left = (
    <div className="space-y-3">
      <PageTitle label={L.stock} />
      <BigButton variant={sel ? "neutral" : "in"} icon={List} label={L.allItems}
        onClick={() => { setSel(null); setAction(null); }} className="w-full" />
      <ItemPicker items={items} categories={cats} onPick={(i) => { setSel(i); setAction(null); }} />
    </div>
  );

  const actions: { a: Action; label: Label; icon: typeof Zap; variant: "out" | "pending" | "neutral" | "in" }[] = [
    { a: "DAMAGE", label: L.damage, icon: Zap, variant: "out" },
    { a: "RETURN", label: L.returnLbl, icon: Undo2, variant: "pending" },
    { a: "ADJUSTMENT", label: L.adjustment, icon: Scale, variant: "neutral" },
    { a: "TRANSFER", label: L.transfer, icon: ArrowLeftRight, variant: "neutral" },
  ];

  const right = (
    <div className="space-y-4">
      {sel ? (
        <div className="flex items-center gap-4 rounded-2xl bg-cream/70 p-4">
          {sel.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sel.photo_url} alt="" className="size-20 rounded-xl object-cover" />
          ) : <Package className="size-16 text-bronze" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-extrabold">{sel.name}</p>
            <p className="text-lg text-navy/70">{L.location.roman}: {locName(sel.location_id)}</p>
          </div>
          <div className={cn("rounded-2xl px-4 py-2 text-center text-white",
            Number(sel.current_stock) < Number(sel.min_stock_alert) ? "bg-money-out" : "bg-money-in")}>
            <p className="text-3xl font-extrabold tabular-nums">{formatQty(sel.current_stock)}</p>
            <p className="text-sm">{L.stock.roman}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-brand"><Boxes className="size-10" /><Tri label={L.allItems} /></div>
      )}

      {sel && (
        <div className="grid grid-cols-2 gap-3 min-[1200px]:grid-cols-4">
          {actions.map(({ a, label, icon, variant }) => (
            <BigButton key={a} variant={variant} icon={icon} label={label} onClick={() => open(a)}
              className={cn(action === a && "ring-4 ring-navy/40")} />
          ))}
        </div>
      )}

      {sel && action && (
        <div className="space-y-3 rounded-2xl border-2 border-brand/30 p-4">
          <div className="flex items-center justify-between">
            <Tri label={actions.find((x) => x.a === action)!.label} />
            <button type="button" aria-label="Close" onClick={() => setAction(null)}
              className="flex size-12 items-center justify-center rounded-full bg-cream"><X className="size-6" /></button>
          </div>
          {(action === "RETURN" || action === "ADJUSTMENT") && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSign(1)}
                className={cn("flex min-h-14 items-center justify-center gap-2 rounded-2xl text-xl font-bold",
                  sign > 0 ? "bg-money-in text-white" : "bg-cream text-navy")}>
                <Plus className="size-6" /> {action === "RETURN" ? L.returnIn.roman : "Zyada"}
              </button>
              <button type="button" onClick={() => setSign(-1)}
                className={cn("flex min-h-14 items-center justify-center gap-2 rounded-2xl text-xl font-bold",
                  sign < 0 ? "bg-money-out text-white" : "bg-cream text-navy")}>
                <Minus className="size-6" /> {action === "RETURN" ? L.returnOut.roman : "Kam"}
              </button>
            </div>
          )}
          {action === "TRANSFER" ? (
            <ChipSelect allowNone={false} options={locs.filter((l) => l.id !== sel.location_id)} value={toLoc} onChange={setToLoc}
              onCreate={async (name) => {
                const { data, error } = await sb().from("locations").insert({ name }).select().single<Location>();
                if (error) { show(error.message, "err"); return null; }
                setLocs((l) => [...l, data]);
                return data;
              }} />
          ) : (
            <NumField label={L.quantity} value={qty} onChange={setQty} />
          )}
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={`${L.notes.roman} / ${L.notes.en}`}
            className="h-14 w-full rounded-2xl border-2 border-brand/30 px-4 text-xl" />
          <BigButton variant={action === "DAMAGE" || sign < 0 ? "out" : "in"} label={L.save} disabled={busy} onClick={submit} className="w-full" />
        </div>
      )}

      {txs.length === 0 ? <EmptyState label={L.nothingHere} /> : (
        <ul className="divide-y divide-navy/10">
          {txs.map((t) => {
            const q = Number(t.quantity);
            return (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  {!sel && <p className="truncate text-xl font-bold">{t.items?.name}</p>}
                  <p className="text-lg font-semibold">
                    {TYPE_LABEL[t.type].roman} <span className="font-urdu text-base font-normal">{TYPE_LABEL[t.type].ur}</span>
                    {t.invoices && <span className="ml-2 rounded-full bg-navy/10 px-2 text-base">#{t.invoices.invoice_no}</span>}
                  </p>
                  <p className="text-base text-navy/60">
                    {fmtDate(t.created_at)}
                    {t.type === "TRANSFER" && ` · ${t.from?.name ?? "—"} → ${t.to?.name ?? "—"}`}
                    {t.notes && ` · ${t.notes}`}
                  </p>
                </div>
                {t.type === "TRANSFER" ? (
                  <ArrowLeftRight className="size-8 text-navy/50" />
                ) : (
                  <span className={cn("text-2xl font-extrabold tabular-nums", q > 0 ? "text-money-in" : q < 0 ? "text-money-out" : "text-navy")}>
                    {q > 0 ? "+" : ""}{formatQty(q)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {toast}
    </div>
  );

  return <SplitPane left={left} right={right} />;
}
