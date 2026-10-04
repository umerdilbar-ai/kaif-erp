"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, FileText, Package } from "lucide-react";
import { SplitPane } from "@/components/shell/SplitPane";
import { EmptyState, ItemPicker, MoneyText } from "@/components/ui-kaif";
import { createClient } from "@/lib/supabase/client";
import type { Invoice } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CartPanel } from "@/components/s3/CartPanel";
import { QuotationView } from "@/components/s3/QuotationView";
import { Tri } from "@/components/s3/Tri";
import { fmtDateTime } from "@/components/s3/bill";
import { S } from "@/components/s3/labels";
import { useCart } from "@/components/s3/useCart";

type QRow = Invoice & { parties: { name: string } | null };

export default function QuotationPage() {
  const cart = useCart();
  const [tab, setTab] = useState<"items" | "saved">("items");
  const [list, setList] = useState<QRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    createClient().from("invoices").select("*, parties(name)").eq("type", "QUOTATION")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setList((data as QRow[]) ?? []));
  }, [reload]);

  const tabBtn = "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2";

  return (
    <SplitPane
      left={
        <div className="space-y-3">
          <div className="flex gap-2 rounded-2xl bg-cream p-1">
            <button type="button" onClick={() => setTab("items")}
              className={cn(tabBtn, tab === "items" ? "bg-brand text-white shadow" : "text-navy")}>
              <Package className="size-7" /> <Tri label={S.items} en={false} />
            </button>
            <button type="button" onClick={() => setTab("saved")}
              className={cn(tabBtn, tab === "saved" ? "bg-brand text-white shadow" : "text-navy")}>
              <FileText className="size-7" /> <Tri label={S.quotations} en={false} />
            </button>
          </div>
          {tab === "items" ? (
            <ItemPicker onPick={(i) => { setOpenId(null); cart.add(i); }}
              priceField={cart.mode === "wholesale" ? "wholesale_price" : "retail_price"} />
          ) : list.length === 0 ? (
            <EmptyState label={S.nothingHere} icon={FileText} />
          ) : (
            <ul className="space-y-2">
              {list.map((q) => (
                <li key={q.id}>
                  <button type="button" onClick={() => setOpenId(q.id)}
                    className={cn("flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left",
                      openId === q.id ? "border-brand bg-brand/5" : "border-transparent bg-cream/60")}>
                    {q.status === "CONVERTED"
                      ? <BadgeCheck className="size-9 shrink-0 text-money-in" />
                      : <FileText className="size-9 shrink-0 text-sky-700" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xl font-bold">
                        #{q.invoice_no} {q.parties?.name ?? q.customer_name ?? ""}
                      </span>
                      <span className="block text-base text-navy/60">{fmtDateTime(q.created_at)}</span>
                    </span>
                    <MoneyText amount={q.total} intent="neutral" className="text-xl" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      }
      right={
        openId ? (
          <QuotationView id={openId} onNew={() => setOpenId(null)} onConverted={() => setReload((r) => r + 1)} />
        ) : (
          <CartPanel type="QUOTATION" cart={cart} onSaved={() => setReload((r) => r + 1)} />
        )
      }
    />
  );
}
