"use client";

import { useEffect, useState } from "react";
import { FileText, MessageCircle, Printer, ReceiptText, Truck } from "lucide-react";
import { SplitPane } from "@/components/shell/SplitPane";
import { EmptyState, MoneyText, PageTitle } from "@/components/ui-kaif";
import { createClient } from "@/lib/supabase/client";
import type { Invoice, InvoiceType, Party } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BillView } from "@/components/s3/BillView";
import { Tri } from "@/components/s3/Tri";
import { fmtDateTime, loadBill, TYPE_LABEL, waLink, type Bill } from "@/components/s3/bill";
import { addDays, dayEndISO, dayStartISO, today } from "@/components/s3/dates";
import { S } from "@/components/s3/labels";
import { openWhenReady } from "@/components/s3/openWhenReady";

type Row = Invoice & { parties: { name: string } | null };
const TYPE_ICON = { SALE: ReceiptText, PURCHASE: Truck, QUOTATION: FileText };
const TYPE_COLOR = { SALE: "text-money-in", PURCHASE: "text-money-out", QUOTATION: "text-sky-700" };

export default function InvoicesPage() {
  const [type, setType] = useState<InvoiceType | "ALL">("ALL");
  const [from, setFrom] = useState(addDays(today(), -30));
  const [to, setTo] = useState(today());
  const [partyId, setPartyId] = useState("");
  const [parties, setParties] = useState<Party[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [bill, setBill] = useState<Bill | null>(null);

  useEffect(() => {
    createClient().from("parties").select("*").order("name").then(({ data }) => setParties((data as Party[]) ?? []));
  }, []);

  useEffect(() => {
    let q = createClient().from("invoices").select("*, parties(name)");
    if (type !== "ALL") q = q.eq("type", type);
    if (partyId) q = q.eq("party_id", partyId);
    if (from) q = q.gte("created_at", dayStartISO(from));
    if (to) q = q.lt("created_at", dayEndISO(to));
    q.order("created_at", { ascending: false }).limit(300).then(({ data }) => setRows((data as Row[]) ?? []));
  }, [type, from, to, partyId]);

  const open = (id: string) => loadBill(createClient(), id).then(setBill);
  const whatsapp = (id: string) =>
    openWhenReady(async () => {
      const b = await loadBill(createClient(), id);
      return b && waLink(b);
    });

  const chip = "min-h-12 shrink-0 rounded-full px-4 text-lg font-semibold";
  const field = "h-14 w-full rounded-2xl border-2 border-brand/30 bg-white px-3 text-lg";

  return (
    <SplitPane
      left={
        <div className="space-y-3">
          <PageTitle label={S.invoices} />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["ALL", "SALE", "PURCHASE", "QUOTATION"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={cn(chip, type === t ? "bg-brand text-white" : "bg-cream text-navy")}>
                {t === "ALL" ? S.all.roman : TYPE_LABEL[t].roman}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-base">
              {S.from.roman} / {S.from.en}
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
            </label>
            <label className="text-base">
              {S.to.roman} / {S.to.en}
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
            </label>
          </div>
          <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className={field}>
            <option value="">{S.parties.roman} — {S.all.roman}</option>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {rows.length === 0 && <EmptyState label={S.nothingHere} icon={ReceiptText} />}
          <ul className="space-y-2">
            {rows.map((r) => {
              const Icon = TYPE_ICON[r.type];
              const due = Number(r.balance_due);
              return (
                <li key={r.id}
                  className={cn("flex items-center gap-2 rounded-2xl border-2 p-2",
                    bill?.inv.id === r.id ? "border-brand bg-brand/5" : "border-transparent bg-cream/60")}>
                  <button type="button" onClick={() => open(r.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <Icon className={cn("size-9 shrink-0", TYPE_COLOR[r.type])} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-bold">
                        #{r.invoice_no} {r.parties?.name ?? r.customer_name ?? ""}
                      </span>
                      <span className="block text-sm text-navy/60">{fmtDateTime(r.created_at)}</span>
                    </span>
                    <span className="text-right">
                      <MoneyText amount={r.total} intent="neutral" className="block text-lg" />
                      {due > 0 && <MoneyText amount={due} intent="pending" className="block text-sm" />}
                    </span>
                  </button>
                  <a href={`/print/${r.id}`} target="_blank" aria-label="Print"
                    className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white text-navy shadow-sm">
                    <Printer className="size-7" />
                  </a>
                  <button type="button" aria-label="WhatsApp" onClick={() => whatsapp(r.id)}
                    className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm">
                    <MessageCircle className="size-7" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      }
      right={
        bill ? (
          <div className="space-y-4">
            <BillView bill={bill} />
            <div className="grid grid-cols-2 gap-3">
              <a href={`/print/${bill.inv.id}`} target="_blank"
                className="flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-brand text-white">
                <Printer className="size-9" /> <Tri label={S.print} en={false} className="text-xl" />
              </a>
              <a href={waLink(bill)} target="_blank" rel="noreferrer"
                className="flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-[#25D366] text-white">
                <MessageCircle className="size-9" /> <Tri label={S.whatsapp} en={false} className="text-xl" />
              </a>
            </div>
          </div>
        ) : (
          <EmptyState label={S.nothingHere} icon={ReceiptText} />
        )
      }
    />
  );
}
