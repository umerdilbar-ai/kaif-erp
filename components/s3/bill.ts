import type { SupabaseClient } from "@supabase/supabase-js";
import type { Invoice, InvoiceItem, InvoiceType, Party } from "@/lib/types";
import { formatPKR, formatQty } from "@/lib/format";
import { S } from "./labels";

export interface Bill { inv: Invoice; lines: InvoiceItem[]; party: Party | null }

export async function loadBill(sb: SupabaseClient, id: string): Promise<Bill | null> {
  const { data: inv } = await sb.from("invoices").select("*").eq("id", id).maybeSingle<Invoice>();
  if (!inv) return null;
  const [{ data: lines }, { data: party }] = await Promise.all([
    sb.from("invoice_items").select("*").eq("invoice_id", id).order("created_at"),
    inv.party_id
      ? sb.from("parties").select("*").eq("id", inv.party_id).maybeSingle<Party>()
      : Promise.resolve({ data: null }),
  ]);
  return { inv, lines: (lines as InvoiceItem[]) ?? [], party: (party as Party | null) ?? null };
}

export const TYPE_LABEL: Record<InvoiceType, { roman: string; en: string; ur: string }> = {
  SALE: S.bill,
  PURCHASE: S.purchase,
  QUOTATION: S.quotation,
};

export const billName = (b: Bill) => b.party?.name ?? b.inv.customer_name ?? "Walk-in";

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** "0300-1234567" -> "923001234567". Returns null when there is no usable number. */
export function to92(phone: string | null | undefined): string | null {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("0092")) d = d.slice(2);
  if (d.startsWith("0")) d = "92" + d.slice(1);
  else if (d.length === 10 && d.startsWith("3")) d = "92" + d;
  return d.length >= 11 ? d : null;
}

/** Plain-text bill for WhatsApp. */
export function billText(b: Bill): string {
  const { inv, lines } = b;
  const out = [
    "*KAIF*",
    `${TYPE_LABEL[inv.type].en} #${inv.invoice_no}`,
    fmtDateTime(inv.created_at),
    `${S.customer.roman}: ${billName(b)}`,
    "------------------------",
    ...lines.map((l) => `${l.item_name}\n  ${formatQty(l.quantity)} x ${formatPKR(l.unit_price)} = ${formatPKR(l.line_total)}`),
    "------------------------",
  ];
  if (Number(inv.discount)) out.push(`${S.subtotal.roman}: ${formatPKR(inv.subtotal)}`, `${S.discount.roman}: -${formatPKR(inv.discount)}`);
  out.push(`*${S.total.roman}: ${formatPKR(inv.total)}*`);
  if (inv.type !== "QUOTATION") {
    out.push(`${S.paid.roman}: ${formatPKR(inv.paid)}`);
    if (Number(inv.balance_due) > 0) out.push(`*${S.baaqi.roman}: ${formatPKR(inv.balance_due)}*`);
  }
  out.push("", `${S.thanks.roman} - KAIF`);
  return out.join("\n");
}

export function waLink(b: Bill): string {
  return `https://wa.me/${to92(b.party?.phone) ?? ""}?text=${encodeURIComponent(billText(b))}`;
}
