"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileText, Printer, ReceiptText } from "lucide-react";
import { BigButton, PageTitle, useDing } from "@/components/ui-kaif";
import { createClient } from "@/lib/supabase/client";
import type { CreateInvoiceArgs, Invoice } from "@/lib/types";
import { S } from "./labels";
import { Cart } from "./Cart";
import { openWhenReady } from "./openWhenReady";
import { Tri } from "./Tri";
import { num, type Cart as CartState } from "./useCart";

/** Right pane of /sale and /quotation: title, cart, giant SAVE & PRINT. */
export function CartPanel({
  type,
  cart,
  onSaved,
}: {
  type: "SALE" | "QUOTATION";
  cart: CartState;
  onSaved?: () => void;
}) {
  const ding = useDing();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSale = type === "SALE";
  const { totals } = cart;

  const empty = cart.lines.length === 0 || cart.lines.some((l) => num(l.qty) <= 0);
  const creditNoParty = isSale && totals.baaqi > 0 && !cart.party;

  async function save() {
    if (empty || creditNoParty || busy) return;
    setBusy(true);
    setError(null);
    try {
      await openWhenReady(async () => {
        const { data, error } = await createClient()
          .rpc("create_invoice", {
            p_type: type,
            p_party_id: cart.party?.id ?? null,
            p_customer_name: cart.party?.name ?? (cart.walkIn.trim() || "Walk-in"),
            p_discount: totals.discount,
            p_paid: isSale ? Math.min(totals.paid, totals.total) : 0,
            p_items: cart.rpcItems(),
            p_notes: null,
          } satisfies CreateInvoiceArgs)
          .single<Invoice>();
        if (error || !data) throw new Error(error?.message ?? "Save failed");
        ding();
        cart.clear();
        onSaved?.();
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
      <PageTitle
        label={isSale ? S.sale : S.quotation}
        right={
          <Link href="/invoices" className="flex min-h-14 items-center gap-2 rounded-2xl bg-cream px-4 text-navy">
            {isSale ? <ReceiptText className="size-7" /> : <FileText className="size-7" />}
            <Tri label={S.invoices} en={false} />
          </Link>
        }
      />
      <Cart cart={cart} showPaid={isSale} />
      {creditNoParty && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-100 p-3 text-xl font-bold text-pending">
          <AlertTriangle className="size-8 shrink-0" />
          <Tri label={S.needParty} />
        </p>
      )}
      {error && <p className="rounded-2xl bg-red-100 p-3 text-lg font-bold text-money-out">{error}</p>}
      <BigButton variant="in" icon={Printer} label={S.savePrint} onClick={save}
        disabled={empty || creditNoParty || busy}
        className="min-h-24 w-full text-3xl" />
    </div>
  );
}
