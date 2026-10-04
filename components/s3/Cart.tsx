"use client";

import { useState } from "react";
import { AlertTriangle, Minus, Plus, ShoppingCart, Trash2, User, UserPlus, X } from "lucide-react";
import { EmptyState, MoneyText, PartyPicker } from "@/components/ui-kaif";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { S } from "./labels";
import { NumSheet, Sheet } from "./Sheet";
import { Tri } from "./Tri";
import { num, type Cart as CartState } from "./useCart";

type Edit = { kind: "qty" | "price"; idx: number } | { kind: "discount" } | { kind: "paid" } | null;

/** Cart lines, customer, Retail/Wholesale, discount, total, cash received and Baaqi. */
export function Cart({ cart, showPaid = true }: { cart: CartState; showPaid?: boolean }) {
  const [edit, setEdit] = useState<Edit>(null);
  const [picking, setPicking] = useState(false);
  const { lines, totals, party } = cart;

  const seg = "flex-1 rounded-xl px-3 py-2 text-lg";

  return (
    <div className="space-y-4">
      {/* Customer */}
      {party ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand/5 p-3">
          <User className="size-10 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-bold">{party.name}</p>
            {num(party.balance) !== 0 && (
              <p className="text-base text-pending">
                {num(party.balance) > 0 ? S.lena.roman : S.dena.roman}{" "}
                <MoneyText amount={party.balance} intent="pending" abs />
              </p>
            )}
          </div>
          <button type="button" aria-label="Remove customer" onClick={() => cart.setParty(null)}
            className="flex size-14 items-center justify-center rounded-full bg-red-100 text-money-out">
            <X className="size-8" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 min-[600px]:flex-row">
          <button type="button" onClick={() => setPicking(true)}
            className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-white">
            <UserPlus className="size-8" />
            <Tri label={S.chooseCustomer} en={false} className="text-lg" />
          </button>
          <input value={cart.walkIn} onChange={(e) => cart.setWalkIn(e.target.value)}
            placeholder={`${S.walkIn.roman} / ${S.walkIn.en}`}
            className="h-16 min-w-0 flex-1 rounded-2xl border-2 border-brand/30 bg-white px-4 text-xl focus:border-brand focus:outline-none" />
        </div>
      )}

      {/* Retail / Wholesale */}
      <div className="flex gap-2 rounded-2xl bg-cream p-1">
        {(["retail", "wholesale"] as const).map((m) => (
          <button key={m} type="button" onClick={() => cart.setMode(m)}
            className={cn(seg, cart.mode === m ? "bg-brand text-white shadow" : "text-navy")}>
            <Tri label={m === "retail" ? S.retail : S.wholesale} en={false} />
          </button>
        ))}
      </div>

      {/* Lines */}
      {lines.length === 0 && <EmptyState label={S.emptyCart} icon={ShoppingCart} />}
      <ul className="space-y-2">
        {lines.map((l, idx) => {
          const low = num(l.item.min_price) > 0 && num(l.price) < num(l.item.min_price);
          return (
            <li key={l.item.id}
              className={cn("rounded-2xl border-2 p-3", low ? "border-pending bg-amber-50" : "border-transparent bg-cream/60")}>
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-xl font-bold leading-tight">{l.item.name}</p>
                <MoneyText amount={num(l.qty) * num(l.price)} intent="neutral" className="text-xl" />
                <button type="button" aria-label="Remove" onClick={() => cart.remove(idx)}
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-money-out">
                  <Trash2 className="size-6" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" aria-label="Minus"
                  onClick={() => (num(l.qty) <= 1 ? cart.remove(idx) : cart.update(idx, { qty: String(num(l.qty) - 1) }))}
                  className="flex size-14 items-center justify-center rounded-xl bg-white text-money-out shadow-sm">
                  <Minus className="size-7" />
                </button>
                <button type="button" onClick={() => setEdit({ kind: "qty", idx })}
                  className="min-w-20 rounded-xl bg-white px-3 text-3xl font-extrabold tabular-nums shadow-sm">
                  {l.qty || "0"}
                </button>
                <button type="button" aria-label="Plus" onClick={() => cart.update(idx, { qty: String(num(l.qty) + 1) })}
                  className="flex size-14 items-center justify-center rounded-xl bg-white text-money-in shadow-sm">
                  <Plus className="size-7" />
                </button>
                <span className="text-2xl text-navy/50">×</span>
                <button type="button" onClick={() => setEdit({ kind: "price", idx })}
                  className={cn("rounded-xl border-2 bg-white px-3 text-2xl font-bold tabular-nums shadow-sm",
                    low ? "border-pending text-pending" : "border-transparent")}>
                  {formatPKR(num(l.price))}
                </button>
              </div>
              {low && (
                <p className="mt-2 flex items-center gap-2 text-lg font-bold text-pending">
                  <AlertTriangle className="size-7 shrink-0" />
                  {S.lowRate.roman} <span className="font-urdu font-normal">{S.lowRate.ur}</span>
                  <span className="text-base font-normal">(min {formatPKR(l.item.min_price)})</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Totals */}
      <div className="space-y-2 rounded-2xl bg-cream p-3 text-xl">
        <Row label={<Tri label={S.subtotal} en={false} />} value={<MoneyText amount={totals.subtotal} intent="neutral" />} />
        <button type="button" onClick={() => setEdit({ kind: "discount" })}
          className="flex w-full items-center justify-between rounded-xl bg-white px-3">
          <Tri label={S.discount} en={false} />
          <MoneyText amount={-totals.discount} intent={totals.discount ? "out" : "neutral"} className="text-2xl" />
        </button>
        <Row label={<Tri label={S.total} en={false} className="text-2xl" />}
          value={<MoneyText amount={totals.total} intent="neutral" className="text-4xl" />} />
        {showPaid && (
          <>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEdit({ kind: "paid" })}
                className="flex flex-1 items-center justify-between rounded-xl border-2 border-money-in bg-white px-3">
                <Tri label={S.received} en={false} />
                <MoneyText amount={totals.paid} intent="in" className="text-3xl" />
              </button>
              {cart.paid !== null && (
                <button type="button" onClick={() => cart.setPaid(null)}
                  className="rounded-xl bg-money-in px-3 text-white">
                  <Tri label={S.full} en={false} />
                </button>
              )}
            </div>
            {totals.baaqi >= 0 ? (
              <div className={cn("flex items-center justify-between rounded-xl px-3 py-2",
                totals.baaqi > 0 ? "bg-pending text-white" : "bg-white")}>
                <Tri label={S.baaqi} en={false} className="text-2xl" />
                <span className="text-4xl font-extrabold tabular-nums">{formatPKR(totals.baaqi)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-money-in px-3 py-2 text-white">
                <Tri label={S.change} en={false} className="text-2xl" />
                <span className="text-4xl font-extrabold tabular-nums">{formatPKR(-totals.baaqi)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {edit?.kind === "qty" && (
        <NumSheet title={S.quantity} value={lines[edit.idx]?.qty ?? ""} onClose={() => setEdit(null)}
          onDone={(v) => (num(v) > 0 ? cart.update(edit.idx, { qty: v }) : cart.remove(edit.idx))} />
      )}
      {edit?.kind === "price" && (
        <NumSheet title={S.price} value={lines[edit.idx]?.price ?? ""} onClose={() => setEdit(null)}
          onDone={(v) => cart.update(edit.idx, { price: v })} />
      )}
      {edit?.kind === "discount" && (
        <NumSheet title={S.discount} value={cart.discount} onClose={() => setEdit(null)} onDone={cart.setDiscount} />
      )}
      {edit?.kind === "paid" && (
        <NumSheet title={S.received} value={String(totals.paid)} onClose={() => setEdit(null)} onDone={cart.setPaid} />
      )}
      {picking && (
        <Sheet title={S.chooseCustomer} onClose={() => setPicking(false)}>
          <PartyPicker type="CUSTOMER" onPick={(p) => { cart.setParty(p); setPicking(false); }} />
        </Sheet>
      )}
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return <div className="flex items-center justify-between px-3">{label}{value}</div>;
}
