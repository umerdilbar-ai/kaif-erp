"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileDown, MessageCircle, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPKR, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Tri } from "@/components/s3/Tri";
import { billName, fmtDateTime, loadBill, TYPE_LABEL, waLink, type Bill } from "@/components/s3/bill";
import { S } from "@/components/s3/labels";

type Paper = 80 | 58;
const PAPER_KEY = "kaif-paper";

export default function PrintPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null | undefined>(undefined);
  const [paper, setPaper] = useState<Paper>(80);
  const [pdfHint, setPdfHint] = useState(false);
  const printed = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(PAPER_KEY) === "58") setPaper(58);
    } catch {}
    loadBill(createClient(), id).then(setBill);
  }, [id]);

  useEffect(() => {
    if (!bill || printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [bill]);

  function pick(p: Paper) {
    setPaper(p);
    try {
      localStorage.setItem(PAPER_KEY, String(p));
    } catch {}
  }

  if (bill === undefined) return <p className="p-8 text-2xl">…</p>;
  if (bill === null) return <p className="p-8 text-2xl">{S.nothingHere.roman}</p>;

  const { inv, lines } = bill;
  const small = paper === 58;
  const tool = "flex min-h-14 items-center gap-2 rounded-2xl px-4 text-lg font-bold";

  return (
    <div className="min-h-dvh bg-cream print:bg-white">
      <style>{`@page { size: ${paper}mm auto; margin: 0; } @media print { html, body { background: #fff !important; } }`}</style>

      <div className="flex flex-wrap items-center justify-center gap-2 p-3 print:hidden">
        <button type="button" onClick={() => (history.length > 1 ? router.back() : router.push("/sale"))}
          className={cn(tool, "bg-white text-navy")}>
          <ArrowLeft className="size-7" /> {S.back.roman}
        </button>
        <div className="flex gap-1 rounded-2xl bg-white p-1">
          <span className="self-center px-2 text-base text-navy/60">{S.paper.roman}</span>
          {([80, 58] as const).map((p) => (
            <button key={p} type="button" onClick={() => pick(p)}
              className={cn("rounded-xl px-4 text-lg font-bold", paper === p ? "bg-brand text-white" : "text-navy")}>
              {p}mm
            </button>
          ))}
        </div>
        <button type="button" onClick={() => window.print()} className={cn(tool, "bg-brand text-white")}>
          <Printer className="size-7" /> {S.print.roman}
        </button>
        <button type="button" onClick={() => { setPdfHint(true); window.print(); }} className={cn(tool, "bg-navy text-white")}>
          <FileDown className="size-7" /> {S.savePdf.roman}
        </button>
        <a href={waLink(bill)} target="_blank" rel="noreferrer" className={cn(tool, "bg-[#25D366] text-white")}>
          <MessageCircle className="size-7" /> {S.whatsapp.roman}
        </a>
      </div>
      {pdfHint && (
        <p className="mx-auto mb-3 max-w-md rounded-2xl bg-white p-3 text-center text-navy print:hidden">
          <Tri label={S.pdfHint} className="text-lg" />
        </p>
      )}

      <div
        className="mx-auto bg-white font-mono text-black shadow print:shadow-none"
        style={{ width: `${paper}mm`, padding: small ? "2mm" : "3mm", fontSize: small ? "10px" : "12px", lineHeight: 1.35 }}
      >
        <div className="text-center">
          <div style={{ fontSize: small ? "22px" : "28px" }} className="font-extrabold tracking-widest">KAIF</div>
          <div>Kaif Pipes &amp; Small Inventory Solutions</div>
          <div className="mt-1 font-bold">{TYPE_LABEL[inv.type].en.toUpperCase()} #{inv.invoice_no}</div>
          <div>{fmtDateTime(inv.created_at)}</div>
        </div>
        <div className="mt-1">{S.customer.en}: <b>{billName(bill)}</b></div>
        <Dash />
        {lines.map((l) => (
          <div key={l.id} className="mb-1">
            <div className="font-bold">{l.item_name}</div>
            <div className="flex justify-between">
              <span>{formatQty(l.quantity)} x {formatPKR(l.unit_price)}</span>
              <span>{formatPKR(l.line_total)}</span>
            </div>
          </div>
        ))}
        <Dash />
        <Row k="Subtotal" v={formatPKR(inv.subtotal)} />
        {Number(inv.discount) > 0 && <Row k="Discount" v={`-${formatPKR(inv.discount)}`} />}
        <div style={{ fontSize: small ? "13px" : "16px" }}><Row k="TOTAL" v={formatPKR(inv.total)} bold /></div>
        {inv.type !== "QUOTATION" && (
          <>
            <Row k="Paid" v={formatPKR(inv.paid)} />
            <Row k="Baaqi" v={formatPKR(inv.balance_due)} bold={Number(inv.balance_due) > 0} />
          </>
        )}
        <Dash />
        <div className="text-center">{S.thanks.roman} / Thank you</div>
      </div>
    </div>
  );
}

function Dash() {
  return <div className="my-1 border-t border-dashed border-black" />;
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between", bold && "font-bold")}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
