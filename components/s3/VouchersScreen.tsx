"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownCircle, ArrowUpCircle, Coffee, HandCoins, Home, MoreHorizontal, Receipt, Send,
  Truck, User, Users, X, Zap, type LucideIcon,
} from "lucide-react";
import { SplitPane } from "@/components/shell/SplitPane";
import { BigButton, EmptyState, MoneyText, NumPad, PageTitle, PartyPicker, useDing } from "@/components/ui-kaif";
import { createClient } from "@/lib/supabase/client";
import type { Label } from "@/lib/labels";
import type { CreateVoucherArgs, Party, Voucher, VoucherType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { S } from "./labels";
import { Tri } from "./Tri";
import { dayEndISO, dayStartISO, timeLabel, today } from "./dates";
import { num } from "./useCart";

type VRow = Voucher & { parties: { name: string } | null };

const MODES: { type: VoucherType; label: Label; icon: LucideIcon; color: string }[] = [
  { type: "RECEIPT", label: S.cashIn, icon: HandCoins, color: "bg-money-in" },
  { type: "PAYMENT", label: S.payment, icon: Send, color: "bg-money-out" },
  { type: "EXPENSE", label: S.expense, icon: Receipt, color: "bg-red-800" },
];

const CATS: { key: string; label: Label; icon: LucideIcon }[] = [
  { key: "Chai", label: S.chai, icon: Coffee },
  { key: "Tankhwah", label: S.tankhwah, icon: Users },
  { key: "Kiraya", label: S.kiraya, icon: Home },
  { key: "Bijli", label: S.bijli, icon: Zap },
  { key: "Carriage", label: S.carriage, icon: Truck },
  { key: "Other", label: S.other, icon: MoreHorizontal },
];
const CAT_ICON = Object.fromEntries(CATS.map((c) => [c.key, c.icon]));

export function VouchersScreen({ initialMode }: { initialMode: VoucherType | null }) {
  const ding = useDing();
  const [day, setDay] = useState(today());
  const [list, setList] = useState<VRow[]>([]);
  const [mode, setMode] = useState<VoucherType | null>(initialMode);
  const [party, setParty] = useState<Party | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    createClient().from("vouchers").select("*, parties(name)")
      .gte("created_at", dayStartISO(day)).lt("created_at", dayEndISO(day))
      .order("created_at", { ascending: false })
      .then(({ data }) => setList((data as VRow[]) ?? []));
  }, [day]);
  useEffect(load, [load]);

  function reset(m: VoucherType | null = mode) {
    setMode(m);
    setParty(null);
    setCat(null);
    setDesc("");
    setAmount("");
    setError(null);
  }

  const amt = num(amount);
  const needsParty = mode === "RECEIPT" || mode === "PAYMENT";
  const ready = mode && amt > 0 && (needsParty ? !!party : !!cat && (cat !== "Other" || desc.trim()));

  async function save() {
    if (!ready || busy || !mode) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("create_voucher", {
      p_type: mode,
      p_party_id: needsParty ? party!.id : null,
      p_expense_category: mode === "EXPENSE" ? cat : null,
      p_amount: amt,
      p_description: desc.trim() || null,
    } satisfies CreateVoucherArgs);
    setBusy(false);
    if (error) return setError(error.message);
    ding();
    reset();
    if (day === today()) load();
    else setDay(today());
  }

  const totalIn = list.filter((v) => v.type === "RECEIPT").reduce((s, v) => s + num(v.amount), 0);
  const totalOut = list.filter((v) => v.type !== "RECEIPT").reduce((s, v) => s + num(v.amount), 0);
  // Balance after this voucher (BALANCE RULE: receipt lowers, payment raises).
  const after = party ? num(party.balance) + (mode === "RECEIPT" ? -amt : amt) : 0;

  return (
    <SplitPane
      left={
        <div className="space-y-3">
          <PageTitle label={S.vouchers} />
          <div className="flex gap-2">
            <input type="date" value={day} max={today()} onChange={(e) => e.target.value && setDay(e.target.value)}
              className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-brand/30 bg-white px-3 text-xl" />
            <button type="button" onClick={() => setDay(today())}
              className={cn("rounded-2xl px-4", day === today() ? "bg-brand text-white" : "bg-cream text-navy")}>
              <Tri label={S.today} en={false} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-green-50 p-3">
              <ArrowDownCircle className="size-7 text-money-in" />
              <MoneyText amount={totalIn} intent="in" className="block text-2xl" />
            </div>
            <div className="rounded-2xl bg-red-50 p-3">
              <ArrowUpCircle className="size-7 text-money-out" />
              <MoneyText amount={totalOut} intent="out" className="block text-2xl" />
            </div>
          </div>
          {list.length === 0 && <EmptyState label={S.nothingHere} icon={Receipt} />}
          <ul className="space-y-2">
            {list.map((v) => {
              const isIn = v.type === "RECEIPT";
              const Icon = v.type === "EXPENSE" ? CAT_ICON[v.expense_category ?? ""] ?? Receipt : isIn ? ArrowDownCircle : ArrowUpCircle;
              return (
                <li key={v.id} className={cn("flex items-center gap-3 rounded-2xl p-3", isIn ? "bg-green-50" : "bg-red-50")}>
                  <Icon className={cn("size-9 shrink-0", isIn ? "text-money-in" : "text-money-out")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-bold">
                      {v.parties?.name ?? v.expense_category ?? ""}
                    </span>
                    <span className="block truncate text-sm text-navy/60">
                      #{v.voucher_no} · {timeLabel(v.created_at)}{v.description ? ` · ${v.description}` : ""}
                    </span>
                  </span>
                  <MoneyText amount={isIn ? v.amount : -v.amount} className="text-xl" />
                </li>
              );
            })}
          </ul>
        </div>
      }
      right={
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button key={m.type} type="button" onClick={() => reset(m.type)}
                className={cn("flex min-h-32 flex-col items-center justify-center gap-1 rounded-2xl p-2 text-white shadow-sm active:scale-95",
                  m.color, mode && mode !== m.type && "opacity-40", mode === m.type && "ring-4 ring-navy ring-offset-2")}>
                <m.icon className="size-12" />
                <Tri label={m.label} className="items-center text-xl" />
              </button>
            ))}
          </div>

          {needsParty && !party && (
            <PartyPicker type={mode === "RECEIPT" ? "CUSTOMER" : "SUPPLIER"} onPick={setParty} />
          )}

          {needsParty && party && (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand/5 p-3">
              <User className="size-10 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-2xl font-bold">{party.name}</p>
                <p className="text-lg">
                  {mode === "RECEIPT" ? (
                    <>
                      <span className="text-pending">{S.lena.roman} </span>
                      <MoneyText amount={Math.max(num(party.balance), 0)} intent="pending" className="text-2xl" />
                    </>
                  ) : (
                    <>
                      <span className="text-money-out">{S.dena.roman} </span>
                      <MoneyText amount={Math.max(-num(party.balance), 0)} intent="out" className="text-2xl" />
                    </>
                  )}
                </p>
              </div>
              <button type="button" aria-label="Change" onClick={() => setParty(null)}
                className="flex size-14 items-center justify-center rounded-full bg-red-100 text-money-out">
                <X className="size-8" />
              </button>
            </div>
          )}

          {mode === "EXPENSE" && (
            <div className="grid grid-cols-3 gap-2">
              {CATS.map((c) => (
                <button key={c.key} type="button" onClick={() => setCat(c.key)}
                  className={cn("flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl p-2",
                    cat === c.key ? "bg-money-out text-white" : "bg-cream text-navy")}>
                  <c.icon className="size-9" />
                  <Tri label={c.label} en={false} className="items-center" />
                </button>
              ))}
            </div>
          )}

          {mode && (!needsParty || party) && (
            <>
              <input value={desc} onChange={(e) => setDesc(e.target.value)}
                placeholder={`${S.description.roman} / ${S.description.en}${cat === "Other" ? " *" : ""}`}
                className="h-16 w-full rounded-2xl border-2 border-brand/30 bg-white px-4 text-xl focus:border-brand focus:outline-none" />
              <div className="rounded-2xl bg-cream px-4 py-3">
                <Tri label={S.amount} en={false} className="text-base" />
                <p className={cn("text-right text-5xl font-extrabold tabular-nums",
                  mode === "RECEIPT" ? "text-money-in" : "text-money-out")}>
                  Rs {amount || "0"}
                </p>
                {party && amt > 0 && (
                  <p className="text-right text-lg">
                    {S.newBalance.roman}: <MoneyText amount={after} intent="pending" abs />{" "}
                    <span className="text-pending">{after > 0 ? S.lena.roman : after < 0 ? S.dena.roman : ""}</span>
                  </p>
                )}
              </div>
              <NumPad value={amount} onChange={setAmount} />
              {error && <p className="rounded-2xl bg-red-100 p-3 text-lg font-bold text-money-out">{error}</p>}
              <BigButton variant={mode === "RECEIPT" ? "in" : "out"} label={S.save}
                icon={mode === "RECEIPT" ? ArrowDownCircle : ArrowUpCircle}
                disabled={!ready || busy} onClick={save} className="min-h-24 w-full text-3xl" />
            </>
          )}
        </div>
      }
    />
  );
}
