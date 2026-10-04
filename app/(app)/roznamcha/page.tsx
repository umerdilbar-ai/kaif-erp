"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownCircle, ArrowUpCircle, BookOpen, HandCoins, Pencil, Receipt, ReceiptText, Send, Sunrise, Sunset, Truck,
  type LucideIcon,
} from "lucide-react";
import { SplitPane } from "@/components/shell/SplitPane";
import { EmptyState, MoneyText, PageTitle } from "@/components/ui-kaif";
import { createClient } from "@/lib/supabase/client";
import type { Label } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { NumSheet } from "@/components/s3/Sheet";
import { Tri } from "@/components/s3/Tri";
import { loadLedger, type CashDayRow, type CashKind } from "@/components/s3/cash";
import { addDays, dayLabel, timeLabel, today } from "@/components/s3/dates";
import { S } from "@/components/s3/labels";
import { num } from "@/components/s3/useCart";

const KIND: Record<CashKind, { label: Label; icon: LucideIcon }> = {
  SALE: { label: S.bill, icon: ReceiptText },
  PURCHASE: { label: S.purchase, icon: Truck },
  RECEIPT: { label: S.cashIn, icon: HandCoins },
  PAYMENT: { label: S.payment, icon: Send },
  EXPENSE: { label: S.expense, icon: Receipt },
};

export default function RoznamchaPage() {
  const [rows, setRows] = useState<CashDayRow[]>([]);
  const [sel, setSel] = useState(today());
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const t = today();
    loadLedger(createClient(), addDays(t, -13), t)
      .then((r) => setRows(r.reverse()))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function saveOpening(v: string) {
    const { error } = await createClient().from("cash_days")
      .upsert({ day: sel, opening_cash: num(v) }, { onConflict: "day" });
    if (error) return setError(error.message);
    load();
  }

  const row = rows.find((r) => r.day === sel);

  return (
    <SplitPane
      left={
        <div className="space-y-3">
          <PageTitle label={S.roznamcha} />
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.day}>
                <button type="button" onClick={() => setSel(r.day)}
                  className={cn("flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left",
                    sel === r.day ? "border-brand bg-brand/5" : "border-transparent bg-cream/60")}>
                  <BookOpen className="size-8 shrink-0 text-navy/60" />
                  <span className="flex-1 text-xl font-bold">
                    {r.day === today() ? S.today.roman : dayLabel(r.day)}
                  </span>
                  <MoneyText amount={r.closing} className="text-2xl" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      }
      right={
        !row ? (
          <EmptyState label={S.nothingHere} icon={BookOpen} />
        ) : (
          <div className="space-y-4">
            <p className="text-2xl font-bold text-brand">{dayLabel(row.day)}</p>
            {error && <p className="rounded-2xl bg-red-100 p-3 text-lg font-bold text-money-out">{error}</p>}

            <button type="button" onClick={() => setEditing(true)}
              className="flex w-full items-center gap-4 rounded-2xl bg-cream p-4 text-left">
              <Sunrise className="size-12 shrink-0 text-bronze" />
              <span className="flex-1">
                <Tri label={S.subahCash} className="text-xl" />
                {!row.fixed && <span className="block text-sm text-navy/60">({S.fromYesterday.roman})</span>}
              </span>
              <MoneyText amount={row.opening} intent="neutral" className="text-5xl" />
              <Pencil className="size-8 shrink-0 text-brand" />
            </button>

            <div className="grid gap-3 min-[600px]:grid-cols-2">
              <div className="rounded-2xl bg-green-50 p-4">
                <span className="flex items-center gap-2 text-money-in">
                  <ArrowDownCircle className="size-10" /> <Tri label={S.cashInDay} className="text-xl" />
                </span>
                <MoneyText amount={row.in} intent="in" className="mt-2 block text-5xl" />
              </div>
              <div className="rounded-2xl bg-red-50 p-4">
                <span className="flex items-center gap-2 text-money-out">
                  <ArrowUpCircle className="size-10" /> <Tri label={S.cashOutDay} className="text-xl" />
                </span>
                <MoneyText amount={row.out} intent="out" className="mt-2 block text-5xl" />
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-navy p-4 text-white">
              <Sunset className="size-12 shrink-0" />
              <Tri label={S.closing} className="flex-1 text-2xl" />
              <span className={cn("text-6xl font-extrabold tabular-nums", row.closing < 0 && "text-red-300")}>
                {row.closing < 0 ? "-" : ""}Rs {Math.abs(row.closing).toLocaleString("en-PK")}
              </span>
            </div>

            {row.entries.length === 0 && <EmptyState label={S.nothingHere} />}
            <ul className="space-y-2">
              {row.entries.map((e) => {
                const k = KIND[e.kind];
                const isIn = e.dir === "in";
                const body = (
                  <>
                    <k.icon className={cn("size-9 shrink-0", isIn ? "text-money-in" : "text-money-out")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-bold">{k.label.roman} #{e.no} {e.who}</span>
                      <span className="block truncate text-sm text-navy/60">
                        {timeLabel(e.at)}{e.note ? ` · ${e.note}` : ""}
                      </span>
                    </span>
                    <MoneyText amount={isIn ? e.amount : -e.amount} className="text-xl" />
                  </>
                );
                const cls = cn("flex items-center gap-3 rounded-2xl p-3", isIn ? "bg-green-50" : "bg-red-50");
                return (
                  <li key={e.id}>
                    {e.invoiceId ? (
                      <a href={`/print/${e.invoiceId}`} target="_blank" className={cls}>{body}</a>
                    ) : (
                      <div className={cls}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>

            {editing && (
              <NumSheet title={S.subahCash} value={String(row.opening)} onClose={() => setEditing(false)} onDone={saveOpening} />
            )}
          </div>
        )
      }
    />
  );
}
