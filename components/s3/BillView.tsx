import { MoneyText } from "@/components/ui-kaif";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { S } from "./labels";
import { Tri } from "./Tri";
import { billName, fmtDateTime, TYPE_LABEL, type Bill } from "./bill";

/** On-screen bill: header, lines, totals. */
export function BillView({ bill }: { bill: Bill }) {
  const { inv, lines } = bill;
  const due = Number(inv.balance_due);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-3xl font-extrabold text-brand">
          {TYPE_LABEL[inv.type].roman} #{inv.invoice_no}
        </p>
        <p className="text-lg text-navy/70">{fmtDateTime(inv.created_at)}</p>
      </div>
      <p className="text-2xl font-bold">{billName(bill)}</p>
      <ul className="divide-y rounded-2xl bg-cream/60 px-3">
        {lines.map((l) => (
          <li key={l.id} className="flex items-center gap-3 py-2 text-lg">
            <span className="min-w-0 flex-1 font-semibold">{l.item_name}</span>
            <span className="tabular-nums text-navy/70">{formatQty(l.quantity)} ×</span>
            <MoneyText amount={l.unit_price} intent="neutral" className="font-normal" />
            <MoneyText amount={l.line_total} intent="neutral" className="w-28 text-right" />
          </li>
        ))}
      </ul>
      <div className="space-y-1 rounded-2xl bg-cream p-3 text-xl">
        {Number(inv.discount) > 0 && (
          <>
            <Line label={<Tri label={S.subtotal} en={false} />} amount={<MoneyText amount={inv.subtotal} intent="neutral" />} />
            <Line label={<Tri label={S.discount} en={false} />} amount={<MoneyText amount={-inv.discount} intent="out" />} />
          </>
        )}
        <Line label={<Tri label={S.total} en={false} className="text-2xl" />}
          amount={<MoneyText amount={inv.total} intent="neutral" className="text-3xl" />} />
        {inv.type !== "QUOTATION" && (
          <>
            <Line label={<Tri label={S.paid} en={false} />} amount={<MoneyText amount={inv.paid} intent="in" />} />
            <Line label={<Tri label={S.baaqi} en={false} />}
              amount={<MoneyText amount={due} intent={due > 0 ? "pending" : "neutral"} className={cn(due > 0 && "text-3xl")} />} />
          </>
        )}
      </div>
    </div>
  );
}

function Line({ label, amount }: { label: React.ReactNode; amount: React.ReactNode }) {
  return <div className="flex items-center justify-between">{label}{amount}</div>;
}
