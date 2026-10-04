"use client";

import { useState } from "react";
import { Banknote, CheckCircle2, Clock, HandCoins, Package, Plus, Save, Trash2, Truck, User } from "lucide-react";
import type { CreateInvoiceArgs, Invoice, Item, Party } from "@/lib/types";
import { formatPKR, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SplitPane } from "@/components/shell/SplitPane";
import { BigButton, EmptyState, ItemPicker, MoneyText, PageTitle, PartyPicker, useDing } from "@/components/ui-kaif";
import { L, NumField, Tri, sb, useToast } from "@/components/s2";

type Line = { item: Item; qty: string; rate: string };
type Pay = "FULL" | "PART" | "UDHAAR";

export function PurchaseScreen() {
  const ding = useDing();
  const { show, toast } = useToast();
  const [supplier, setSupplier] = useState<Party | null>(null);
  const [picking, setPicking] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [pay, setPay] = useState<Pay>("FULL");
  const [paidPart, setPaidPart] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ inv: Invoice; items: Item[]; lines: Line[] } | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.rate || 0), 0);
  const paid = pay === "FULL" ? total : pay === "PART" ? Math.min(Number(paidPart || 0), total) : 0;

  function add(item: Item) {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.item.id === item.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: String(Number(l.qty || 0) + 1) } : l));
      return [...ls, { item, qty: "1", rate: item.cost_price ? String(item.cost_price) : "" }];
    });
  }
  const patch = (idx: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === idx ? { ...l, ...p } : l)));

  async function save() {
    const valid = lines.filter((l) => Number(l.qty) > 0);
    if (!valid.length) return show("Cheez daalo / Add items", "err");
    if (pay !== "FULL" && !supplier) return show("Udhaar ke liye Bapaari chuno / Pick supplier", "err");
    setBusy(true);
    const args: CreateInvoiceArgs = {
      p_type: "PURCHASE", p_party_id: supplier?.id ?? null, p_customer_name: supplier?.name ?? null,
      p_discount: 0, p_paid: paid,
      p_items: valid.map((l) => ({ item_id: l.item.id, quantity: Number(l.qty), unit_price: Number(l.rate || 0) })),
      p_notes: null,
    };
    const { data: inv, error } = await sb().rpc("create_invoice", args).single<Invoice>();
    if (error) { setBusy(false); return show(error.message, "err"); }
    const { data: fresh } = await sb().from("items").select("*").in("id", valid.map((l) => l.item.id));
    setBusy(false);
    ding();
    setDone({ inv, items: (fresh as Item[]) ?? [], lines: valid });
  }

  function reset() {
    setDone(null);
    setLines([]);
    setSupplier(null);
    setPicking(true);
    setPay("FULL");
    setPaidPart("");
    setPickerKey((k) => k + 1); // reload picker stock
  }

  if (done) {
    return (
      <SplitPane
        left={<PageTitle label={L.purchase} />}
        right={
          <div className="space-y-5 text-center">
            <CheckCircle2 className="mx-auto size-28 text-money-in" />
            <p className="text-4xl font-extrabold text-money-in">{L.saved.roman}</p>
            <p className="text-xl">{L.invoiceNo.roman} {done.inv.invoice_no} · <MoneyText amount={done.inv.total} intent="neutral" /></p>
            {Number(done.inv.balance_due) > 0 && (
              <p className="text-xl text-money-out">{L.dena.roman}: <MoneyText amount={done.inv.balance_due} intent="out" /></p>
            )}
            <ul className="space-y-2 text-left">
              {done.lines.map((l) => {
                const it = done.items.find((x) => x.id === l.item.id);
                return (
                  <li key={l.item.id} className="flex items-center gap-3 rounded-2xl bg-cream/70 p-3">
                    <Package className="size-10 text-bronze" />
                    <span className="flex-1 text-xl font-bold">{l.item.name}</span>
                    <span className="text-xl font-bold text-money-in">+{formatQty(Number(l.qty))}</span>
                    <span className="rounded-full bg-money-in px-3 py-1 text-xl font-extrabold text-white">
                      {L.newStock.roman}: {formatQty(it?.current_stock)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <BigButton variant="in" icon={Plus} label={L.another} onClick={reset} className="w-full" />
          </div>
        }
      />
    );
  }

  const payBtn = (p: Pay, label: typeof L.naqd, Icon: typeof Banknote, color: string) => (
    <button type="button" onClick={() => setPay(p)}
      className={cn("flex min-h-20 flex-col items-center justify-center rounded-2xl border-4 px-2 font-bold active:scale-95",
        pay === p ? `${color} border-transparent text-white` : "border-navy/10 bg-white text-navy")}>
      <Icon className="size-8" />
      <span className="text-lg">{label.roman}</span>
      <span className="font-urdu text-base font-normal">{label.ur}</span>
    </button>
  );

  const left = (
    <div className="space-y-3">
      <PageTitle label={L.purchase} />
      <ItemPicker key={pickerKey} onPick={add} priceField="cost_price" />
    </div>
  );

  const right = (
    <div className="space-y-4">
      {/* Supplier */}
      {supplier && !picking ? (
        <div className="flex items-center gap-3 rounded-2xl bg-cream/70 p-4">
          <Truck className="size-10 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-extrabold">{supplier.name}</p>
            {Number(supplier.balance) < 0 ? (
              <p className="text-lg text-money-out">{L.dena.roman}: <MoneyText amount={supplier.balance} abs intent="out" /></p>
            ) : Number(supplier.balance) > 0 ? (
              <p className="text-lg text-pending">{L.lena.roman}: <MoneyText amount={supplier.balance} intent="pending" /></p>
            ) : <p className="text-lg text-navy/60">{L.clear.roman}</p>}
          </div>
          <button type="button" onClick={() => setPicking(true)} className="min-h-12 rounded-xl bg-white px-4 text-lg font-bold text-brand">
            {L.edit.roman}
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border-2 border-brand/30 p-3">
          <div className="flex items-center gap-2 text-brand"><User className="size-7" /><Tri label={L.bapaari} small /></div>
          <div className="max-h-80 overflow-y-auto">
            <PartyPicker type="SUPPLIER" selectedId={supplier?.id} onPick={(p) => { setSupplier(p); setPicking(false); }} />
          </div>
        </div>
      )}

      {/* Lines */}
      {lines.length === 0 ? (
        <EmptyState label={L.pickItem} icon={Package} />
      ) : (
        <ul className="space-y-3">
          {lines.map((l, idx) => (
            <li key={l.item.id} className="space-y-2 rounded-2xl bg-cream/60 p-3">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-xl font-bold">{l.item.name}</span>
                <MoneyText amount={Number(l.qty || 0) * Number(l.rate || 0)} intent="neutral" className="text-xl" />
                <button type="button" aria-label="Remove" onClick={() => setLines((ls) => ls.filter((_, j) => j !== idx))}
                  className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-money-out"><Trash2 className="size-6" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField label={L.quantity} value={l.qty} onChange={(v) => patch(idx, { qty: v })} />
                <NumField label={L.price} prefix="Rs" value={l.rate} onChange={(v) => patch(idx, { rate: v })} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between rounded-2xl bg-navy p-4 text-white">
        <Tri label={L.total} />
        <span className="text-4xl font-extrabold tabular-nums">{formatPKR(total)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {payBtn("FULL", L.pooraCash, Banknote, "bg-money-in")}
        {payBtn("PART", L.kuchCash, HandCoins, "bg-pending")}
        {payBtn("UDHAAR", L.udhaar, Clock, "bg-money-out")}
      </div>
      {pay === "PART" && <NumField label={L.paid} prefix="Rs" value={paidPart} onChange={setPaidPart} />}
      {pay !== "FULL" && total > 0 && (
        <p className="text-center text-xl font-bold text-money-out">
          {L.dena.roman}: <MoneyText amount={total - paid} intent="out" />
        </p>
      )}

      <BigButton variant="in" icon={Save} label={L.save} disabled={busy || !lines.length} onClick={save} className="w-full" />
      {toast}
    </div>
  );

  return <SplitPane left={left} right={right} />;
}
