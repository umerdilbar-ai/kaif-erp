"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, CheckCircle2, Plus, Printer } from "lucide-react";
import { BigButton, MoneyText, useDing } from "@/components/ui-kaif";
import { createClient } from "@/lib/supabase/client";
import type { ConvertQuotationArgs, Invoice } from "@/lib/types";
import { S } from "./labels";
import { BillView } from "./BillView";
import { NumSheet } from "./Sheet";
import { Tri } from "./Tri";
import { loadBill, type Bill } from "./bill";
import { openWhenReady } from "./openWhenReady";
import { num } from "./useCart";

/** A saved quotation with "Pukka Bill Banao" (convert_quotation). */
export function QuotationView({ id, onNew, onConverted }: { id: string; onNew: () => void; onConverted: () => void }) {
  const ding = useDing();
  const [bill, setBill] = useState<Bill | null>(null);
  const [paid, setPaid] = useState<string | null>(null);
  const [editPaid, setEditPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBill(null);
    setPaid(null);
    setError(null);
    loadBill(createClient(), id).then(setBill);
  }, [id]);

  if (!bill) return <p className="p-6 text-2xl text-navy/50">…</p>;
  const total = num(bill.inv.total);
  const paidN = paid === null ? total : Math.min(num(paid), total);
  const baaqi = total - paidN;
  const creditNoParty = baaqi > 0 && !bill.inv.party_id;
  const done = bill.inv.status === "CONVERTED";

  async function convert() {
    if (creditNoParty || busy || done) return;
    setBusy(true);
    setError(null);
    try {
      await openWhenReady(async () => {
        const { data, error } = await createClient()
          .rpc("convert_quotation", { p_quotation_id: id, p_paid: paidN } satisfies ConvertQuotationArgs)
          .single<Invoice>();
        if (error || !data) throw new Error(error?.message ?? "Failed");
        ding();
        setBill(await loadBill(createClient(), id));
        onConverted();
        return `/print/${data.id}`;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <BigButton icon={Plus} label={S.newQuotation} onClick={onNew} className="flex-1" />
        <a href={`/print/${id}`} target="_blank"
          className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-cream px-4 text-navy">
          <Printer className="size-7" /> <Tri label={S.print} en={false} className="text-lg" />
        </a>
      </div>
      <BillView bill={bill} />
      {done ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-money-in p-4 text-white">
          <span className="flex items-center gap-3">
            <BadgeCheck className="size-10" />
            <Tri label={S.converted} className="text-2xl" />
          </span>
          {bill.inv.converted_to && (
            <a href={`/print/${bill.inv.converted_to}`} target="_blank"
              className="flex min-h-14 items-center gap-2 rounded-xl bg-white px-4 text-lg font-bold text-money-in">
              <Printer className="size-6" /> {S.print.roman}
            </a>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditPaid(true)}
              className="flex flex-1 items-center justify-between rounded-2xl border-2 border-money-in bg-white px-4 py-2">
              <Tri label={S.received} en={false} className="text-xl" />
              <MoneyText amount={paidN} intent="in" className="text-3xl" />
            </button>
            {paid !== null && (
              <button type="button" onClick={() => setPaid(null)} className="rounded-2xl bg-money-in px-3 text-white">
                <Tri label={S.full} en={false} />
              </button>
            )}
          </div>
          {baaqi > 0 && (
            <div className="flex items-center justify-between rounded-2xl bg-pending px-4 py-2 text-white">
              <Tri label={S.baaqi} en={false} className="text-2xl" />
              <MoneyText amount={baaqi} intent="neutral" className="text-4xl text-white" />
            </div>
          )}
          {creditNoParty && (
            <p className="flex items-center gap-2 rounded-2xl bg-amber-100 p-3 text-xl font-bold text-pending">
              <AlertTriangle className="size-8 shrink-0" /> <Tri label={S.needParty} />
            </p>
          )}
          {error && <p className="rounded-2xl bg-red-100 p-3 text-lg font-bold text-money-out">{error}</p>}
          <BigButton variant="in" icon={CheckCircle2} label={S.pukkaBill} onClick={convert}
            disabled={creditNoParty || busy} className="min-h-24 w-full text-3xl" />
        </>
      )}
      {editPaid && (
        <NumSheet title={S.received} value={String(paidN)} onClose={() => setEditPaid(false)} onDone={setPaid} />
      )}
    </div>
  );
}
